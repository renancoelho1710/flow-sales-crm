export const NOTIFICATION_SOUNDS = {
  erroSistema: "/sounds/notification-error.mp3",
  novoLead: "/sounds/soft-bell-ding.mp3",
  agendamentoCriado: "/sounds/thinking.mp3",
  popupEntrada: "/sounds/thinking.mp3",
  popupSugado: "/sounds/whoomp.mp3",
};

export function tocarAudioLocal(src: string, volume = 1) {
  try {
    const audio = new Audio(src);
    audio.volume = Math.min(Math.max(volume, 0), 1);
    audio.currentTime = 0;

    const play = audio.play();

    if (play && typeof play.catch === "function") {
      play.catch(() => null);
    }
  } catch {
    // Navegador pode bloquear áudio antes da primeira interação.
  }
}

export function tocarSomFallback(volume = 1) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const context = new AudioContextClass();
    const ganhoFinal = Math.min(Math.max(volume, 0), 1);

    function beep(frequencia: number, inicio: number, duracao: number, tipo: OscillatorType = "square") {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = tipo;
      oscillator.frequency.setValueAtTime(frequencia, context.currentTime + inicio);
      gain.gain.setValueAtTime(0.001, context.currentTime + inicio);
      gain.gain.exponentialRampToValueAtTime(Math.max(ganhoFinal, 0.01), context.currentTime + inicio + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + inicio + duracao);

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start(context.currentTime + inicio);
      oscillator.stop(context.currentTime + inicio + duracao + 0.03);
    }

    beep(1040, 0, 0.2);
    beep(760, 0.25, 0.2);
    beep(1180, 0.5, 0.28);
  } catch {
    // Sem fallback.
  }
}

export function tocarSomNotificacao(src: string, volumePercentual = 100) {
  const volume = Math.min(Math.max(volumePercentual, 0), 100) / 100;

  tocarAudioLocal(src, volume);

  window.setTimeout(() => {
    tocarSomFallback(volume);
  }, 80);
}
