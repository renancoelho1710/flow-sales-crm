"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  ExternalLink,
  X,
} from "lucide-react";

type Notificacao = {
  id: string;
  usuario_id: string;
  lead_id: string | null;
  agendamento_id: string | null;
  tipo: string;
  titulo: string;
  mensagem: string;
  prioridade: "baixa" | "normal" | "alta" | "critica";
  status: "pendente" | "lida" | "resolvida" | "ignorada";
  acao_url: string | null;
  som_ativo: boolean;
  som_volume: number;
  popup_ativo: boolean;
  popup_fechado_em?: string | null;
  popup_fechado_por?: string | null;
  popup_fechado_motivo?: string | null;
  data_disparo: string;
  criado_em: string;
};

type Props = {
  onCountChange?: (total: number) => void;
};

const APP_TITLE = "Flow Sales CRM";

const SONS = {
  popupEntrada: "/sounds/popup-notificacao.mp3",
  popupSugado: "/sounds/whoomp.mp3",
};

function deveVirarPopup(tipo: string) {
  return [
    "confirmar_presenca",
    "agendamento_chegando",
    "agendamento_atrasado",
    "atividade_atrasada",
    "atividade_vencendo",
    "atividade_agendada",
  ].includes(tipo);
}

function prioridadeClasse(prioridade: string) {
  if (prioridade === "critica") return "border-red-200 bg-red-50 text-red-700";
  if (prioridade === "alta") return "border-orange-200 bg-orange-50 text-orange-700";
  if (prioridade === "baixa") return "border-slate-200 bg-slate-50 text-slate-600";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function prioridadeBorda(prioridade: string) {
  if (prioridade === "critica") return "border-l-red-600";
  if (prioridade === "alta") return "border-l-orange-500";
  if (prioridade === "baixa") return "border-l-slate-400";
  return "border-l-blue-600";
}

function prioridadeRing(prioridade: string) {
  if (prioridade === "critica") return "ring-red-100";
  if (prioridade === "alta") return "ring-orange-100";
  if (prioridade === "baixa") return "ring-slate-100";
  return "ring-blue-100";
}

function tipoIcone(tipo: string) {
  if (tipo.includes("atrasado")) return AlertTriangle;
  if (tipo.includes("chegando") || tipo.includes("vencendo")) return Clock3;
  if (tipo.includes("confirmar") || tipo.includes("agendada")) return CheckCircle2;
  return Bell;
}

function tocarAudioLocal(src: string, volumePercentual = 100) {
  try {
    const audio = new Audio(src);
    audio.volume = Math.min(Math.max(volumePercentual, 0), 100) / 100;
    audio.currentTime = 0;

    const play = audio.play();

    if (play && typeof play.catch === "function") {
      play.catch(() => null);
    }
  } catch {
    // O navegador pode bloquear áudio antes da primeira interação do usuário.
  }
}

function getCentroSininho() {
  const sino = document.getElementById("flow-notification-bell");
  const rect = sino?.getBoundingClientRect();

  if (rect) {
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  return {
    x: window.innerWidth - 104,
    y: 28,
  };
}

function getFaviconHref() {
  const icon =
    document.querySelector<HTMLLinkElement>('link[rel="icon"]') ||
    document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');

  return icon?.href || "/favicon.ico";
}

function setFaviconHref(href: string) {
  let icon =
    document.querySelector<HTMLLinkElement>('link[rel="icon"]') ||
    document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');

  if (!icon) {
    icon = document.createElement("link");
    icon.rel = "icon";
    document.head.appendChild(icon);
  }

  icon.href = href;
}

async function criarFaviconComBadge(baseHref: string, total: number) {
  return new Promise<string>((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      resolve(baseHref);
      return;
    }

    function desenharBadge() {
      if (!ctx) return;

      ctx.beginPath();
      ctx.arc(47, 17, 16, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();

      ctx.lineWidth = 4;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = total > 9 ? "bold 18px Arial" : "bold 22px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(total > 99 ? "99+" : String(total), 47, 17);
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      ctx.clearRect(0, 0, 64, 64);
      ctx.drawImage(img, 0, 0, 64, 64);
      desenharBadge();
      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => {
      ctx.fillStyle = "#1d4ed8";
      ctx.beginPath();
      ctx.roundRect(8, 8, 48, 48, 12);
      ctx.fill();
      desenharBadge();
      resolve(canvas.toDataURL("image/png"));
    };

    img.src = baseHref;
  });
}

export function NotificacoesPopup({ onCountChange }: Props) {
  const router = useRouter();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [ocultas, setOcultas] = useState<Set<string>>(new Set());
  const [sugando, setSugando] = useState<Set<string>>(new Set());
  const [flyStyles, setFlyStyles] = useState<Record<string, React.CSSProperties>>({});
  const [audioLiberado, setAudioLiberado] = useState(false);
  const [paginaVisivel, setPaginaVisivel] = useState(true);

  const tocadasRef = useRef<Set<string>>(new Set());
  const timeoutsRef = useRef<Map<string, number>>(new Map());
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const faviconOriginalRef = useRef<string>("");
  const tituloIntervaloRef = useRef<number | null>(null);

  const pendentes = useMemo(
    () => notificacoes.filter((notificacao) => notificacao.status === "pendente"),
    [notificacoes]
  );

  const popupsVisiveis = useMemo(() => {
    return pendentes
      .filter((notificacao) => notificacao.popup_ativo)
      .filter((notificacao) => deveVirarPopup(notificacao.tipo))
      .filter((notificacao) => !notificacao.popup_fechado_em)
      .filter((notificacao) => !ocultas.has(notificacao.id))
      .sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime())
      .slice(-3);
  }, [pendentes, ocultas]);

  function ocultarDireto(id: string) {
    setOcultas((atuais) => {
      const proximo = new Set(atuais);
      proximo.add(id);
      return proximo;
    });

    setSugando((atuais) => {
      const proximo = new Set(atuais);
      proximo.delete(id);
      return proximo;
    });

    setFlyStyles((atuais) => {
      const proximo = { ...atuais };
      delete proximo[id];
      return proximo;
    });
  }

  function animarParaSino(id: string) {
    const card = cardRefs.current[id];
    const cardRect = card?.getBoundingClientRect();
    const destino = getCentroSininho();

    if (cardRect) {
      const origem = {
        x: cardRect.left + cardRect.width / 2,
        y: cardRect.top + cardRect.height / 2,
      };

      const dx = destino.x - origem.x;
      const dy = destino.y - origem.y;

      setFlyStyles((atuais) => ({
        ...atuais,
        [id]: {
          transform: `translate(${dx}px, ${dy}px) scale(0.06) rotate(14deg)`,
          opacity: 0,
          filter: "blur(5px)",
          transformOrigin: "center center",
        },
      }));
    }

    setSugando((atuais) => {
      const proximo = new Set(atuais);
      proximo.add(id);
      return proximo;
    });

    tocarAudioLocal(SONS.popupSugado, 90);
  }

  async function fecharPopup(id: string, motivo = "fechado_no_popup") {
    animarParaSino(id);

    window.setTimeout(() => {
      ocultarDireto(id);
    }, 820);

    try {
      await fetch("/api/notificacoes/marcar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          acao: "popup_fechado",
          motivo,
        }),
      });

      setNotificacoes((atuais) =>
        atuais.map((notificacao) =>
          notificacao.id === id
            ? {
                ...notificacao,
                popup_fechado_em: new Date().toISOString(),
                popup_fechado_motivo: motivo,
              }
            : notificacao
        )
      );
    } catch {
      // Se falhar, pelo menos oculta na tela atual.
    }
  }

  async function buscar() {
    try {
      await fetch("/api/notificacoes/gerar", {
        method: "GET",
        cache: "no-store",
      }).catch(() => null);

      const resposta = await fetch("/api/notificacoes", {
        method: "GET",
        cache: "no-store",
      });

      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) return;

      const lista = (dados?.notificacoes || []) as Notificacao[];
      setNotificacoes(lista);

      for (const notificacao of lista) {
        const deveTocar =
          notificacao.status === "pendente" &&
          notificacao.popup_ativo &&
          deveVirarPopup(notificacao.tipo) &&
          !notificacao.popup_fechado_em &&
          notificacao.som_ativo &&
          audioLiberado &&
          !tocadasRef.current.has(notificacao.id);

        if (deveTocar) {
          tocarAudioLocal(SONS.popupEntrada, notificacao.som_volume || 100);
          tocadasRef.current.add(notificacao.id);
        }

        const podeCriarTimer =
          notificacao.status === "pendente" &&
          notificacao.popup_ativo &&
          deveVirarPopup(notificacao.tipo) &&
          !notificacao.popup_fechado_em &&
          !timeoutsRef.current.has(notificacao.id);

        if (podeCriarTimer) {
          const timeout = window.setTimeout(() => {
            fecharPopup(notificacao.id, "tempo_expirado");
            timeoutsRef.current.delete(notificacao.id);
          }, 30000);

          timeoutsRef.current.set(notificacao.id, timeout);
        }
      }
    } catch {
      // Mantém o dashboard funcionando.
    }
  }

  async function marcar(id: string, acao: "lida" | "resolvida" | "ignorada") {
    animarParaSino(id);

    try {
      await fetch("/api/notificacoes/marcar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, acao }),
      });

      setNotificacoes((atuais) =>
        atuais.map((notificacao) =>
          notificacao.id === id ? { ...notificacao, status: acao } : notificacao
        )
      );

      window.setTimeout(() => {
        ocultarDireto(id);
      }, 820);
    } catch {
      window.setTimeout(() => {
        ocultarDireto(id);
      }, 820);
    }
  }

  function abrirNotificacao(notificacao: Notificacao) {
    if (!notificacao.acao_url) return;

    marcar(notificacao.id, "lida");
    router.push(notificacao.acao_url);
  }

  useEffect(() => {
    onCountChange?.(pendentes.length);
  }, [pendentes.length, onCountChange]);

  useEffect(() => {
    document.title = APP_TITLE;

    if (!faviconOriginalRef.current) {
      faviconOriginalRef.current = getFaviconHref();
    }
  }, []);

  useEffect(() => {
    async function atualizarAba() {
      const total = pendentes.length;
      const faviconBase = faviconOriginalRef.current || getFaviconHref();

      if (tituloIntervaloRef.current) {
        window.clearInterval(tituloIntervaloRef.current);
        tituloIntervaloRef.current = null;
      }

      if (total <= 0) {
        document.title = APP_TITLE;
        setFaviconHref(faviconBase);
        return;
      }

      document.title = `(${total > 99 ? "99+" : total}) ${APP_TITLE}`;

      const faviconComBadge = await criarFaviconComBadge(faviconBase, total);
      setFaviconHref(faviconComBadge);

      if (!paginaVisivel) {
        let alternar = false;

        tituloIntervaloRef.current = window.setInterval(() => {
          alternar = !alternar;
          document.title = alternar
            ? `🔔 ${total} notificação${total > 1 ? "s" : ""}`
            : `(${total > 99 ? "99+" : total}) ${APP_TITLE}`;
        }, 1100);
      }
    }

    atualizarAba();

    return () => {
      if (tituloIntervaloRef.current) {
        window.clearInterval(tituloIntervaloRef.current);
        tituloIntervaloRef.current = null;
      }
    };
  }, [pendentes.length, paginaVisivel]);

  useEffect(() => {
    function onVisibilityChange() {
      const visivel = document.visibilityState === "visible";
      setPaginaVisivel(visivel);

      if (visivel) {
        const total = pendentes.length;
        document.title =
          total > 0 ? `(${total > 99 ? "99+" : total}) ${APP_TITLE}` : APP_TITLE;
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pendentes.length]);

  useEffect(() => {
    function liberar() {
      setAudioLiberado(true);
      window.removeEventListener("click", liberar);
      window.removeEventListener("keydown", liberar);
      window.removeEventListener("touchstart", liberar);
    }

    window.addEventListener("click", liberar);
    window.addEventListener("keydown", liberar);
    window.addEventListener("touchstart", liberar);

    return () => {
      window.removeEventListener("click", liberar);
      window.removeEventListener("keydown", liberar);
      window.removeEventListener("touchstart", liberar);
    };
  }, []);

  useEffect(() => {
    buscar();

    const intervalo = window.setInterval(() => {
      buscar();
    }, 15000);

    return () => {
      window.clearInterval(intervalo);

      for (const timeout of timeoutsRef.current.values()) {
        window.clearTimeout(timeout);
      }

      if (tituloIntervaloRef.current) {
        window.clearInterval(tituloIntervaloRef.current);
      }

      document.title = APP_TITLE;

      if (faviconOriginalRef.current) {
        setFaviconHref(faviconOriginalRef.current);
      }
    };
  }, [audioLiberado]);

  if (popupsVisiveis.length === 0) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-none fixed bottom-0 right-0 top-[76px] z-40 w-[470px] max-w-[55vw] bg-gradient-to-l from-slate-950/30 via-slate-950/10 to-transparent" />

      <div className="pointer-events-none fixed bottom-5 right-5 top-[92px] z-50 flex w-[390px] max-w-[calc(100vw-32px)] flex-col justify-end gap-3 overflow-visible">
        {popupsVisiveis.map((notificacao) => {
          const Icone = tipoIcone(notificacao.tipo);
          const estaSugando = sugando.has(notificacao.id);

          const estiloCard: React.CSSProperties = estaSugando
            ? flyStyles[notificacao.id] || {
                transform: "translate(350px, -82vh) scale(0.04) rotate(12deg)",
                opacity: 0,
                filter: "blur(5px)",
                transformOrigin: "center center",
              }
            : {
                transform: "translate(0, 0) scale(1) rotate(0deg)",
                opacity: 1,
                filter: "blur(0)",
                transformOrigin: "center center",
              };

          return (
            <article
              key={notificacao.id}
              ref={(element) => {
                cardRefs.current[notificacao.id] = element;
              }}
              role="button"
              tabIndex={0}
              onClick={() => abrirNotificacao(notificacao)}
              onKeyDown={(event) => {
                if (event.key === "Enter") abrirNotificacao(notificacao);
              }}
              className={`pointer-events-auto cursor-pointer rounded-3xl border border-l-4 bg-white shadow-2xl shadow-slate-950/25 ring-4 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 ${prioridadeBorda(notificacao.prioridade)} ${prioridadeRing(notificacao.prioridade)}`}
              style={estiloCard}
            >
              <div className="flex items-start gap-3 p-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${prioridadeClasse(notificacao.prioridade)}`}>
                  <Icone className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black text-slate-950">{notificacao.titulo}</h3>

                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${prioridadeClasse(notificacao.prioridade)}`}>
                          {notificacao.prioridade}
                        </span>
                      </div>

                      <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-600">
                        {notificacao.mensagem}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        fecharPopup(notificacao.id, "fechado_no_popup");
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      title="Fechar popup"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {notificacao.acao_url ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          abrirNotificacao(notificacao);
                        }}
                        className="inline-flex h-8 items-center justify-center gap-1 rounded-xl bg-slate-950 px-3 text-[11px] font-black text-white transition hover:bg-blue-700"
                      >
                        Abrir
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        marcar(notificacao.id, "resolvida");
                      }}
                      className="inline-flex h-8 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 px-3 text-[11px] font-black text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Resolver
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        marcar(notificacao.id, "ignorada");
                      }}
                      className="inline-flex h-8 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-500 transition hover:bg-slate-100"
                    >
                      Ignorar
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
