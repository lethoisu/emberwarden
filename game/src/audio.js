// Emberwarden — every sound is synthesized with WebAudio oscillators and
// filtered noise. No audio files ship with the game, so it stays fully
// offline and tiny. The context is created on the first user gesture.

export function createAudio() {
  let ctx = null;
  let master = null;
  let padNodes = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo, delay = 0) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, filterFreq, delay = 0) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
  }

  const api = {
    unlock() { ensure(); },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
      if (m) api.stopPad();
    },
    isMuted() { return muted; },

    click() { tone(660, 0.06, 'sine', 0.12); },
    shoot(kind) {
      if (kind === 'spark') tone(920, 0.09, 'square', 0.06, 420);
      else if (kind === 'frost') tone(1240, 0.14, 'sine', 0.09, 700);
      else tone(240, 0.16, 'sawtooth', 0.08, 90);
    },
    hit() { noise(0.05, 0.05, 2400); },
    pop() { tone(520, 0.12, 'sine', 0.14, 980); noise(0.1, 0.08, 3200); },
    coin() { tone(880, 0.08, 'sine', 0.1); tone(1318, 0.14, 'sine', 0.1, 0, 0.07); },
    place() { tone(180, 0.12, 'triangle', 0.2, 90); noise(0.08, 0.1, 900); },
    upgrade() { tone(523, 0.1, 'sine', 0.12); tone(659, 0.1, 'sine', 0.12, 0, 0.08); tone(784, 0.16, 'sine', 0.12, 0, 0.16); },
    error() { tone(160, 0.16, 'square', 0.1, 110); },
    leak() { tone(220, 0.4, 'sawtooth', 0.16, 55); noise(0.3, 0.12, 500); },
    horn() {
      tone(196, 0.5, 'sawtooth', 0.12, 262);
      tone(294, 0.5, 'sawtooth', 0.08, 392, 0.05);
    },
    surge() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'sine', 0.13, 0, i * 0.05));
      noise(0.25, 0.1, 4000);
    },
    bossRoar() {
      tone(98, 0.7, 'sawtooth', 0.16, 49);
      tone(147, 0.7, 'sawtooth', 0.1, 73, 0.08);
      noise(0.5, 0.1, 300);
    },
    waveClear() { tone(659, 0.12, 'sine', 0.12); tone(880, 0.2, 'sine', 0.12, 0, 0.1); },
    victory() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, 'sine', 0.14, 0, i * 0.13));
    },
    defeat() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.32, 'triangle', 0.14, 0, i * 0.16));
    },

    // A soft two-voice pad that hums under play, started once per session.
    startPad() {
      if (!ensure() || muted || padNodes) return;
      const g = ctx.createGain();
      g.gain.value = 0.045;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      const o1 = ctx.createOscillator();
      o1.type = 'sine';
      o1.frequency.value = 110;
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = 164.8;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 120;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      o1.connect(filter);
      o2.connect(filter);
      filter.connect(g);
      g.connect(master);
      o1.start();
      o2.start();
      lfo.start();
      padNodes = { o1, o2, lfo, g };
    },
    stopPad() {
      if (!padNodes) return;
      try {
        padNodes.o1.stop();
        padNodes.o2.stop();
        padNodes.lfo.stop();
        padNodes.g.disconnect();
      } catch { /* already stopped */ }
      padNodes = null;
    },
  };
  return api;
}
