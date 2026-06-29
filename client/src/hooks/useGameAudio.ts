let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine') {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    /* audio unavailable */
  }
}

export function playDayStart() {
  playTone(440, 0.3);
  setTimeout(() => playTone(554, 0.4), 150);
}

export function playAnnouncement() {
  playTone(330, 0.2, 'triangle');
  setTimeout(() => playTone(392, 0.25, 'triangle'), 120);
}

export function playTimerTick() {
  playTone(880, 0.05, 'square');
}

export function playGameEnd() {
  playTone(523, 0.5);
  setTimeout(() => playTone(659, 0.5), 200);
  setTimeout(() => playTone(784, 0.7), 400);
}
