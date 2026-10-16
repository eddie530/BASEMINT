export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private drone: OscillatorNode | null = null;
  private drone2: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;
  private lastFreqAt = 0;
  private droneAfter = 0;

  unlock(): void {
    try {
      if (typeof window === "undefined") return;
      if (!this.ctx) {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        this.ctx = new Ctx({ latencyHint: "interactive" });
        this.master = this.ctx.createGain();
        this.music = this.ctx.createGain();
        this.sfx = this.ctx.createGain();
        this.music.gain.value = 0.5;
        this.sfx.gain.value = 0.85;
        this.master.gain.value = this.muted ? 0 : 0.85;
        this.music.connect(this.master);
        this.sfx.connect(this.master);
        this.master.connect(this.ctx.destination);
        const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.4), this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        this.noise = buffer;
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") void this.ctx?.resume().catch(() => {});
        });
      }
      if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => {});
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.ctx || !this.master) return;
    try {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.85, this.ctx.currentTime, 0.02);
    } catch {
      /* closed context */
    }
  }

  launch(): void {
    if (!this.ctx || !this.sfx || this.muted) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(180, now);
    o.frequency.exponentialRampToValueAtTime(520, now + 0.12);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    o.connect(g);
    g.connect(this.sfx);
    o.start(now);
    o.stop(now + 0.2);
  }

  tick(mult: number): void {
    if (!this.ctx || !this.sfx || this.muted) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "square";
    o.frequency.value = 420 + Math.log(Math.max(1, mult)) * 160;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.035, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    o.connect(g);
    g.connect(this.sfx);
    o.start(now);
    o.stop(now + 0.06);
  }

  startDrone(): void {
    if (!this.ctx || !this.music || this.drone || this.muted) return;
    if (performance.now() < this.droneAfter) return;
    let o1: OscillatorNode | null = null;
    let o2: OscillatorNode | null = null;
    let g: GainNode | null = null;
    try {
      o1 = this.ctx.createOscillator();
      o2 = this.ctx.createOscillator();
      g = this.ctx.createGain();
      o1.type = "sine";
      o2.type = "triangle";
      o1.frequency.value = 55;
      o2.frequency.value = 82.5;
      g.gain.value = 0.0001;
      o1.connect(g);
      o2.connect(g);
      g.connect(this.music);
      this.drone = o1;
      this.drone2 = o2;
      this.droneGain = g;
      this.lastFreqAt = 0;
      o1.start();
      o2.start();
      g.gain.setTargetAtTime(0.07, this.ctx.currentTime, 0.08);
    } catch {
      this.droneAfter = performance.now() + 1000;
      try {
        o1?.disconnect();
        o2?.disconnect();
        g?.disconnect();
      } catch {
        /* already gone */
      }
      this.drone = null;
      this.drone2 = null;
      this.droneGain = null;
    }
  }

  setDroneMult(mult: number): void {
    if (!this.ctx || !this.drone || !this.drone2) return;
    const now = this.ctx.currentTime;
    if (now - this.lastFreqAt < 0.08) return;
    this.lastFreqAt = now;
    const f = 55 * Math.pow(2, Math.log(Math.max(1, mult)) * 0.22);
    this.drone.frequency.setTargetAtTime(f, now, 0.08);
    this.drone2.frequency.setTargetAtTime(f * 1.5, now, 0.08);
  }

  stopDrone(): void {
    if (!this.ctx || !this.drone || !this.droneGain) return;
    const o1 = this.drone;
    const o2 = this.drone2;
    const g = this.droneGain;
    g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.04);
    const stopAt = this.ctx.currentTime + 0.18;
    try {
      o1.stop(stopAt);
      o2?.stop(stopAt);
    } catch {
      /* already stopped */
    }
    this.drone = null;
    this.drone2 = null;
    this.droneGain = null;
  }

  cash(): void {
    if (!this.ctx || !this.sfx || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const o = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      const t = now + i * 0.045;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g);
      g.connect(this.sfx!);
      o.start(t);
      o.stop(t + 0.24);
    });
  }

  rug(hard: boolean): void {
    if (!this.ctx || !this.sfx || !this.noise || this.muted) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(hard ? 1800 : 900, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.35);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(hard ? 0.35 : 0.22, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfx);
    src.start(now);
    src.stop(now + 0.4);

    const o = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(hard ? 240 : 160, now);
    o.frequency.exponentialRampToValueAtTime(40, now + 0.38);
    og.gain.setValueAtTime(0.0001, now);
    og.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    o.connect(og);
    og.connect(this.sfx);
    o.start(now);
    o.stop(now + 0.42);
  }
}

let engine: AudioEngine | null = null;

export function getAudio(): AudioEngine {
  if (!engine) engine = new AudioEngine();
  return engine;
}
