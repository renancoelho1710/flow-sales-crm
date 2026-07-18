import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ConfigNotificacao = {
  tipo: string;
  titulo: string;
  minutos_antes: number;
  ativo: boolean;
  som_ativo: boolean;
  som_volume: number;
  popup_ativo: boolean;
};

type Agendamento = {
  id: string;
  lead_id: string;
  usuario_id: string | null;
  criado_por: string | null;
  status: string;
  inicio: string;
  titulo: string;
  tipo: string;
  confirmacao_status: string | null;
  precisa_confirmar_presenca: boolean | null;
  notificado_confirmacao_em: string | null;
  notificado_chegando_em: string | null;
  notificado_atrasado_em: string | null;
  atendente_resgate_id: string | null;
  atendente_resgate_nome: string | null;
  vendedor_c2s_nome: string | null;
  loja_visita_nome: string | null;
};

type Lead = {
  id: string;
  nome: string;
  telefone: string | null;
  veiculo_interesse: string | null;
};

function minutosAntes(dataIso: string, minutos: number) {
  return new Date(new Date(dataIso).getTime() - minutos * 60 * 1000);
}

function podeDisparar(dataIso: string, minutos: number) {
  return Date.now() >= minutosAntes(dataIso, minutos).getTime();
}

function passouDoHorario(dataIso: string) {
  return Date.now() > new Date(dataIso).getTime();
}

function mesmoDia(dataIso: string) {
  const data = new Date(dataIso);
  const hoje = new Date();

  return (
    data.getFullYear() === hoje.getFullYear() &&
    data.getMonth() === hoje.getMonth() &&
    data.getDate() === hoje.getDate()
  );
}

function formatarHorario(dataIso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dataIso));
}

function textoCliente(lead?: Lead | null) {
  if (!lead) return "Cliente não localizado";
  return `${lead.nome}${lead.telefone ? ` • ${lead.telefone}` : ""}`;
}

function destinoUsuario(agendamento: Agendamento, usuarioAtualId: string) {
  return (
    agendamento.atendente_resgate_id ||
    agendamento.usuario_id ||
    agendamento.criado_por ||
    usuarioAtualId
  );
}

function mensagemConfirmacao(agendamento: Agendamento, lead?: Lead | null) {
  const cliente = textoCliente(lead);
  const horario = formatarHorario(agendamento.inicio);

  if (mesmoDia(agendamento.inicio)) {
    return `Confirmar agenda de hoje: ${cliente}. Está tudo certo para comparecer ainda hoje às ${horario}? Se não estiver, ofereça remarcação.`;
  }

  return `Confirmar presença: ${cliente}. Ligue ou envie mensagem para confirmar se o cliente comparecerá no agendamento de ${horario}.`;
}

function mensagemChegando(agendamento: Agendamento, lead?: Lead | null) {
  const cliente = textoCliente(lead);
  const vendedor = agendamento.vendedor_c2s_nome || "vendedor da carteira C2S não informado";
  const lojaVisita = agendamento.loja_visita_nome || "loja da visita ainda não definida";

  return `Agendamento chegando: ${cliente}. Horário ${formatarHorario(agendamento.inicio)}. Vendedor C2S: ${vendedor}. Loja/visita: ${lojaVisita}.`;
}

function mensagemAtrasado(agendamento: Agendamento, lead?: Lead | null) {
  const cliente = textoCliente(lead);

  return `Agendamento atrasado: ${cliente}. O horário era ${formatarHorario(agendamento.inicio)}. Verifique se compareceu, reagende ou registre o motivo.`;
}

async function jaExisteNotificacao(supabase: any, agendamentoId: string, tipo: string) {
  const { data } = await supabase
    .from("notificacoes_operacionais")
    .select("id")
    .eq("agendamento_id", agendamentoId)
    .eq("tipo", tipo)
    .neq("status", "ignorada")
    .limit(1)
    .maybeSingle();

  return Boolean(data?.id);
}

async function criarNotificacao({
  supabase,
  usuarioId,
  agendamento,
  lead,
  config,
  tipo,
  titulo,
  mensagem,
  prioridade,
}: {
  supabase: any;
  usuarioId: string;
  agendamento: Agendamento;
  lead?: Lead | null;
  config: ConfigNotificacao;
  tipo: string;
  titulo: string;
  mensagem: string;
  prioridade: "baixa" | "normal" | "alta" | "critica";
}) {
  const existe = await jaExisteNotificacao(supabase, agendamento.id, tipo);
  if (existe) return false;

  const { error } = await supabase.from("notificacoes_operacionais").insert({
    usuario_id: usuarioId,
    lead_id: agendamento.lead_id,
    agendamento_id: agendamento.id,
    tipo,
    titulo,
    mensagem,
    prioridade,
    status: "pendente",
    acao_url: `/dashboard/leads/${agendamento.lead_id}`,
    som_ativo: config.som_ativo,
    som_volume: config.som_volume,
    popup_ativo: config.popup_ativo,
    data_disparo: new Date().toISOString(),
  });

  if (error) {
    console.error(`Erro ao criar notificação ${tipo}:`, error);
    return false;
  }

  return true;
}

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, erro: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const { data: usuarioInterno } = await supabase
      .from("usuarios_internos")
      .select("id, nome, perfil, ativo")
      .eq("auth_user_id", user.id)
      .eq("ativo", true)
      .single();

    if (!usuarioInterno) {
      return NextResponse.json(
        { ok: false, erro: "Usuário interno não encontrado ou inativo." },
        { status: 403 }
      );
    }

    const { data: configsData } = await supabase
      .from("notificacoes_configuracoes")
      .select("*")
      .eq("ativo", true);

    const configs = new Map<string, ConfigNotificacao>();
    for (const config of configsData || []) {
      configs.set(config.tipo, config as ConfigNotificacao);
    }

    const inicioBusca = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const fimBusca = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();

    const { data: agendamentosData, error: erroAgendamentos } = await supabase
      .from("lead_agendamentos")
      .select(
        `
        id,
        lead_id,
        usuario_id,
        criado_por,
        status,
        inicio,
        titulo,
        tipo,
        confirmacao_status,
        precisa_confirmar_presenca,
        notificado_confirmacao_em,
        notificado_chegando_em,
        notificado_atrasado_em,
        atendente_resgate_id,
        atendente_resgate_nome,
        vendedor_c2s_nome,
        loja_visita_nome
        `
      )
      .in("status", ["agendado", "confirmado", "remarcado"])
      .gte("inicio", inicioBusca)
      .lte("inicio", fimBusca)
      .order("inicio", { ascending: true })
      .limit(300);

    if (erroAgendamentos) {
      console.error("Erro ao buscar agendamentos para notificações:", erroAgendamentos);

      return NextResponse.json(
        { ok: false, erro: "Não foi possível buscar agendamentos." },
        { status: 500 }
      );
    }

    const agendamentos = (agendamentosData || []) as Agendamento[];
    const leadIds = Array.from(new Set(agendamentos.map((item) => item.lead_id).filter(Boolean)));

    const { data: leadsData } = leadIds.length
      ? await supabase
          .from("leads")
          .select("id, nome, telefone, veiculo_interesse")
          .in("id", leadIds)
      : { data: [] as Lead[] };

    const leadsPorId = new Map<string, Lead>();
    for (const lead of leadsData || []) {
      leadsPorId.set(lead.id, lead as Lead);
    }

    let criadas = 0;
    let confirmacoes = 0;
    let chegando = 0;
    let atrasadas = 0;

    const configConfirmar = configs.get("confirmar_presenca");
    const configChegando = configs.get("agendamento_chegando");
    const configAtrasado = configs.get("agendamento_atrasado");

    for (const agendamento of agendamentos) {
      const lead = leadsPorId.get(agendamento.lead_id);
      const usuarioDestino = destinoUsuario(agendamento, usuarioInterno.id);

      if (
        configConfirmar &&
        agendamento.precisa_confirmar_presenca !== false &&
        (agendamento.confirmacao_status || "pendente") === "pendente" &&
        !agendamento.notificado_confirmacao_em &&
        podeDisparar(agendamento.inicio, configConfirmar.minutos_antes)
      ) {
        const criada = await criarNotificacao({
          supabase,
          usuarioId: usuarioDestino,
          agendamento,
          lead,
          config: configConfirmar,
          tipo: "confirmar_presenca",
          titulo: mesmoDia(agendamento.inicio)
            ? "Confirmar agenda de hoje"
            : "Confirmar presença do cliente",
          mensagem: mensagemConfirmacao(agendamento, lead),
          prioridade: "alta",
        });

        if (criada) {
          criadas++;
          confirmacoes++;

          await supabase
            .from("lead_agendamentos")
            .update({ notificado_confirmacao_em: new Date().toISOString() })
            .eq("id", agendamento.id);
        }
      }

      if (
        configChegando &&
        !agendamento.notificado_chegando_em &&
        !passouDoHorario(agendamento.inicio) &&
        podeDisparar(agendamento.inicio, configChegando.minutos_antes)
      ) {
        const criada = await criarNotificacao({
          supabase,
          usuarioId: usuarioDestino,
          agendamento,
          lead,
          config: configChegando,
          tipo: "agendamento_chegando",
          titulo: "Agendamento chegando",
          mensagem: mensagemChegando(agendamento, lead),
          prioridade: "critica",
        });

        if (criada) {
          criadas++;
          chegando++;

          await supabase
            .from("lead_agendamentos")
            .update({ notificado_chegando_em: new Date().toISOString() })
            .eq("id", agendamento.id);
        }
      }

      if (
        configAtrasado &&
        !agendamento.notificado_atrasado_em &&
        passouDoHorario(agendamento.inicio) &&
        agendamento.status === "agendado"
      ) {
        const criada = await criarNotificacao({
          supabase,
          usuarioId: usuarioDestino,
          agendamento,
          lead,
          config: configAtrasado,
          tipo: "agendamento_atrasado",
          titulo: "Agendamento atrasado",
          mensagem: mensagemAtrasado(agendamento, lead),
          prioridade: "critica",
        });

        if (criada) {
          criadas++;
          atrasadas++;

          await supabase
            .from("lead_agendamentos")
            .update({ notificado_atrasado_em: new Date().toISOString() })
            .eq("id", agendamento.id);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      analisados: agendamentos.length,
      criadas,
      confirmacoes,
      chegando,
      atrasadas,
    });
  } catch (error) {
    console.error("Erro inesperado ao gerar notificações:", error);

    return NextResponse.json(
      { ok: false, erro: "Erro inesperado ao gerar notificações." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
