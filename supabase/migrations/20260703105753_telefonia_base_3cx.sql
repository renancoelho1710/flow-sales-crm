create table if not exists public.telefonia_chamadas (
  id uuid primary key default gen_random_uuid(),

  provedor text not null default '3cx',
  provedor_chamada_id text null,
  provedor_evento_id text null,

  usuario_id uuid null references public.usuarios_internos(id) on delete set null,
  ramal text null,

  direcao text not null default 'desconhecida'
    check (direcao in ('entrada', 'saida', 'interna', 'desconhecida')),

  status text not null default 'registrada'
    check (
      status in (
        'registrada',
        'tocando',
        'em_andamento',
        'atendida',
        'perdida',
        'ocupado',
        'falhou',
        'finalizada',
        'cancelada'
      )
    ),

  telefone_cliente text null,
  telefone_normalizado text null,
  nome_cliente text null,

  iniciou_em timestamptz null,
  atendeu_em timestamptz null,
  finalizou_em timestamptz null,

  duracao_segundos integer null default 0,
  tempo_toque_segundos integer null default 0,

  gravacao_url text null,
  observacao text null,

  lead_id uuid null,
  cliente_id uuid null,
  agendamento_id uuid null,
  venda_id uuid null,

  origem_vinculo text null
    check (
      origem_vinculo is null
      or origem_vinculo in ('automatico', 'manual', 'importacao', 'api')
    ),

  dados_brutos jsonb not null default '{}'::jsonb,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint telefonia_chamadas_provedor_chamada_unique
    unique nulls not distinct (provedor, provedor_chamada_id)
);

create table if not exists public.telefonia_classificacoes (
  id uuid primary key default gen_random_uuid(),

  chamada_id uuid not null references public.telefonia_chamadas(id) on delete cascade,

  classificacao text not null
    check (
      classificacao in (
        'atendimento_valido',
        'nao_atendeu',
        'numero_invalido',
        'retorno',
        'agendamento',
        'venda_resgate',
        'outros'
      )
    ),

  observacao text null,
  retorno_em timestamptz null,

  classificado_por uuid null references public.usuarios_internos(id) on delete set null,
  classificado_em timestamptz not null default now(),

  criado_em timestamptz not null default now()
);

create table if not exists public.telefonia_vinculos (
  id uuid primary key default gen_random_uuid(),

  chamada_id uuid not null references public.telefonia_chamadas(id) on delete cascade,

  tipo_vinculo text not null
    check (tipo_vinculo in ('lead', 'cliente', 'agendamento', 'venda')),

  entidade_id uuid not null,

  vinculado_por uuid null references public.usuarios_internos(id) on delete set null,
  vinculado_em timestamptz not null default now(),

  motivo text null,

  criado_em timestamptz not null default now(),

  constraint telefonia_vinculos_unique
    unique (chamada_id, tipo_vinculo, entidade_id)
);

create table if not exists public.telefonia_eventos (
  id uuid primary key default gen_random_uuid(),

  chamada_id uuid null references public.telefonia_chamadas(id) on delete set null,

  provedor text not null default '3cx',
  tipo_evento text not null,
  provedor_evento_id text null,

  usuario_id uuid null references public.usuarios_internos(id) on delete set null,
  ramal text null,

  payload jsonb not null default '{}'::jsonb,

  recebido_em timestamptz not null default now(),
  processado_em timestamptz null,

  sucesso boolean not null default true,
  erro text null,

  criado_em timestamptz not null default now()
);

create index if not exists idx_telefonia_chamadas_usuario_id
  on public.telefonia_chamadas(usuario_id);

create index if not exists idx_telefonia_chamadas_telefone_normalizado
  on public.telefonia_chamadas(telefone_normalizado);

create index if not exists idx_telefonia_chamadas_status
  on public.telefonia_chamadas(status);

create index if not exists idx_telefonia_chamadas_inicio
  on public.telefonia_chamadas(iniciou_em desc);

create index if not exists idx_telefonia_classificacoes_chamada_id
  on public.telefonia_classificacoes(chamada_id);

create index if not exists idx_telefonia_vinculos_chamada_id
  on public.telefonia_vinculos(chamada_id);

create index if not exists idx_telefonia_eventos_chamada_id
  on public.telefonia_eventos(chamada_id);

create index if not exists idx_telefonia_eventos_recebido_em
  on public.telefonia_eventos(recebido_em desc);

create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_telefonia_chamadas_atualizado_em on public.telefonia_chamadas;

create trigger trg_telefonia_chamadas_atualizado_em
before update on public.telefonia_chamadas
for each row
execute function public.set_atualizado_em();

alter table public.telefonia_chamadas enable row level security;
alter table public.telefonia_classificacoes enable row level security;
alter table public.telefonia_vinculos enable row level security;
alter table public.telefonia_eventos enable row level security;

drop policy if exists "telefonia_chamadas_select" on public.telefonia_chamadas;
drop policy if exists "telefonia_classificacoes_select" on public.telefonia_classificacoes;
drop policy if exists "telefonia_vinculos_select" on public.telefonia_vinculos;
drop policy if exists "telefonia_eventos_select" on public.telefonia_eventos;

create policy "telefonia_chamadas_select"
on public.telefonia_chamadas
for select
using (
  exists (
    select 1
    from public.usuarios_internos u
    where u.auth_user_id = auth.uid()
      and u.ativo = true
      and (
        lower(u.perfil) in ('adm', 'admin', 'suporte', 'gerente', 'supervisor')
        or u.id = telefonia_chamadas.usuario_id
      )
  )
);

create policy "telefonia_classificacoes_select"
on public.telefonia_classificacoes
for select
using (
  exists (
    select 1
    from public.telefonia_chamadas c
    join public.usuarios_internos u on u.auth_user_id = auth.uid()
    where c.id = telefonia_classificacoes.chamada_id
      and u.ativo = true
      and (
        lower(u.perfil) in ('adm', 'admin', 'suporte', 'gerente', 'supervisor')
        or u.id = c.usuario_id
      )
  )
);

create policy "telefonia_vinculos_select"
on public.telefonia_vinculos
for select
using (
  exists (
    select 1
    from public.telefonia_chamadas c
    join public.usuarios_internos u on u.auth_user_id = auth.uid()
    where c.id = telefonia_vinculos.chamada_id
      and u.ativo = true
      and (
        lower(u.perfil) in ('adm', 'admin', 'suporte', 'gerente', 'supervisor')
        or u.id = c.usuario_id
      )
  )
);

create policy "telefonia_eventos_select"
on public.telefonia_eventos
for select
using (
  exists (
    select 1
    from public.usuarios_internos u
    where u.auth_user_id = auth.uid()
      and u.ativo = true
      and lower(u.perfil) in ('adm', 'admin', 'suporte', 'gerente', 'supervisor')
  )
);

drop policy if exists "telefonia_chamadas_insert_gestao" on public.telefonia_chamadas;
drop policy if exists "telefonia_classificacoes_insert" on public.telefonia_classificacoes;
drop policy if exists "telefonia_vinculos_insert" on public.telefonia_vinculos;

create policy "telefonia_chamadas_insert_gestao"
on public.telefonia_chamadas
for insert
with check (
  exists (
    select 1
    from public.usuarios_internos u
    where u.auth_user_id = auth.uid()
      and u.ativo = true
      and lower(u.perfil) in ('adm', 'admin', 'suporte', 'gerente', 'supervisor')
  )
);

create policy "telefonia_classificacoes_insert"
on public.telefonia_classificacoes
for insert
with check (
  exists (
    select 1
    from public.usuarios_internos u
    where u.auth_user_id = auth.uid()
      and u.ativo = true
      and (
        lower(u.perfil) in ('adm', 'admin', 'suporte', 'gerente', 'supervisor')
        or u.id = classificado_por
      )
  )
);

create policy "telefonia_vinculos_insert"
on public.telefonia_vinculos
for insert
with check (
  exists (
    select 1
    from public.usuarios_internos u
    where u.auth_user_id = auth.uid()
      and u.ativo = true
      and lower(u.perfil) in ('adm', 'admin', 'suporte', 'gerente', 'supervisor')
  )
);
