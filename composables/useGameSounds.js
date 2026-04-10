// composables/useGameSounds.js
// Retro WW1 sound effects via Web Audio API — no external library needed

export function useGameSounds() {
  let ctx = null;

  const getCtx = () => {
    if (!ctx && process.client) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctx;
  };

  const resume = () => {
    const c = getCtx();
    if (c && c.state === "suspended") c.resume();
  };

  // ── Core synth helpers ────────────────────────────────────────────
  const playTone = ({
    freq = 440,
    type = "sine",
    duration = 0.1,
    gain = 0.3,
    freqEnd = null,
    gainEnd = 0,
  }) => {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const vol = c.createGain();
    osc.connect(vol);
    vol.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (freqEnd !== null)
      osc.frequency.exponentialRampToValueAtTime(
        freqEnd,
        c.currentTime + duration,
      );
    vol.gain.setValueAtTime(gain, c.currentTime);
    vol.gain.exponentialRampToValueAtTime(
      Math.max(gainEnd, 0.0001),
      c.currentTime + duration,
    );
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  };

  const playNoise = ({ duration = 0.1, gain = 0.4, filter = 800 }) => {
    const c = getCtx();
    if (!c) return;
    const bufSize = c.sampleRate * duration;
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = filter;
    const vol = c.createGain();
    vol.gain.setValueAtTime(gain, c.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    src.connect(filt);
    filt.connect(vol);
    vol.connect(c.destination);
    src.start();
    src.stop(c.currentTime + duration);
  };

  // ── Sound effects ──────────────────────────────────────────────────
  const gunshot = () => {
    resume();
    // Quick sharp crack
    playNoise({ duration: 0.06, gain: 0.5, filter: 1200 });
    playTone({
      freq: 180,
      type: "sawtooth",
      duration: 0.08,
      gain: 0.2,
      freqEnd: 60,
    });
  };

  const explosion = (big = false) => {
    resume();
    const dur = big ? 0.9 : 0.35;
    playNoise({
      duration: dur,
      gain: big ? 0.8 : 0.5,
      filter: big ? 300 : 500,
    });
    playTone({
      freq: big ? 80 : 120,
      type: "sawtooth",
      duration: dur * 0.6,
      gain: big ? 0.4 : 0.25,
      freqEnd: 30,
    });
  };

  const hit = () => {
    resume();
    playNoise({ duration: 0.12, gain: 0.35, filter: 700 });
    playTone({
      freq: 220,
      type: "square",
      duration: 0.1,
      gain: 0.15,
      freqEnd: 100,
    });
  };

  const powerUp = () => {
    resume();
    [0, 100, 200].forEach((delay, i) => {
      setTimeout(() => {
        playTone({
          freq: [440, 550, 660][i],
          type: "sine",
          duration: 0.15,
          gain: 0.3,
          freqEnd: [550, 660, 880][i],
        });
      }, delay);
    });
  };

  const kill = () => {
    resume();
    playNoise({ duration: 0.6, gain: 0.6, filter: 250 });
    setTimeout(
      () =>
        playTone({
          freq: 60,
          type: "sawtooth",
          duration: 0.5,
          gain: 0.35,
          freqEnd: 25,
        }),
      50,
    );
  };

  const abilityReady = () => {
    resume();
    playTone({
      freq: 660,
      type: "sine",
      duration: 0.2,
      gain: 0.2,
      freqEnd: 880,
    });
  };

  const abilityUse = () => {
    resume();
    playTone({
      freq: 880,
      type: "square",
      duration: 0.25,
      gain: 0.3,
      freqEnd: 440,
    });
  };

  const uiClick = () => {
    resume();
    playTone({
      freq: 500,
      type: "sine",
      duration: 0.08,
      gain: 0.15,
      freqEnd: 700,
    });
  };

  const victory = () => {
    resume();
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(
        () =>
          playTone({
            freq: f,
            type: "sine",
            duration: 0.3,
            gain: 0.35,
            freqEnd: f * 1.02,
          }),
        i * 180,
      );
    });
  };

  const defeat = () => {
    resume();
    const notes = [400, 300, 220, 165];
    notes.forEach((f, i) => {
      setTimeout(
        () =>
          playTone({
            freq: f,
            type: "sawtooth",
            duration: 0.35,
            gain: 0.3,
            freqEnd: f * 0.8,
          }),
        i * 200,
      );
    });
  };

  return {
    gunshot,
    explosion,
    hit,
    powerUp,
    kill,
    abilityReady,
    abilityUse,
    uiClick,
    victory,
    defeat,
  };
}
