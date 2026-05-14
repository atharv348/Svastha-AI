// ── MediRush Sound System (Web Audio API) ───────────────────────
// Soft, ASMR-style synthesized sounds — no external files needed

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.15,
  rampDown = true,
) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);

    if (rampDown) {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available, fail silently
  }
}

function playNoise(duration: number, volume = 0.03) {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, ctx.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch {
    // fail silently
  }
}

// ── Public Sound Effects ────────────────────────────────────────

/** Soft bell — patient arrives */
export function soundPatientArrival() {
  playTone(880, 0.25, "sine", 0.08);
  setTimeout(() => playTone(1100, 0.3, "sine", 0.06), 120);
}

/** Warm chord — successful treatment */
export function soundTreatmentSuccess() {
  playTone(523, 0.3, "sine", 0.1);
  setTimeout(() => playTone(659, 0.3, "sine", 0.08), 80);
  setTimeout(() => playTone(784, 0.4, "sine", 0.07), 160);
}

/** Descending tone — wrong treatment */
export function soundTreatmentFail() {
  playTone(400, 0.2, "sawtooth", 0.06);
  setTimeout(() => playTone(300, 0.3, "sawtooth", 0.05), 150);
}

/** Coin collect — satisfying pop */
export function soundCoinCollect() {
  playTone(1200, 0.1, "sine", 0.1);
  setTimeout(() => playTone(1500, 0.15, "sine", 0.08), 60);
}

/** Upgrade purchased */
export function soundUpgrade() {
  playTone(440, 0.15, "triangle", 0.08);
  setTimeout(() => playTone(554, 0.15, "triangle", 0.07), 100);
  setTimeout(() => playTone(659, 0.15, "triangle", 0.06), 200);
  setTimeout(() => playTone(880, 0.3, "triangle", 0.08), 300);
}

/** Heartbeat beep — HUD pulse */
export function soundHeartbeat() {
  playTone(220, 0.08, "sine", 0.05);
  setTimeout(() => playTone(220, 0.06, "sine", 0.04), 120);
}

/** Outbreak warning alarm */
export function soundOutbreakAlert() {
  playTone(600, 0.15, "square", 0.06);
  setTimeout(() => playTone(500, 0.15, "square", 0.06), 200);
  setTimeout(() => playTone(600, 0.15, "square", 0.06), 400);
}

/** Disinfect spray — white noise burst */
export function soundDisinfect() {
  playNoise(0.4, 0.05);
}

/** Level up fanfare */
export function soundLevelUp() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.3, "sine", 0.1 - i * 0.015), i * 120);
  });
}

/** Soft tap — UI interaction */
export function soundTap() {
  playTone(800, 0.05, "sine", 0.06);
}

/** Pill drop */
export function soundPillDrop() {
  playTone(2000, 0.05, "sine", 0.05);
  setTimeout(() => playTone(1600, 0.08, "sine", 0.04), 50);
}

/** Timer warning — patient running out of patience */
export function soundTimerWarning() {
  playTone(1000, 0.08, "square", 0.04);
}
