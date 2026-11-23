class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private riverGain: GainNode | null = null;
  private riverSource: AudioBufferSourceNode | null = null;

  public muted = false;
  public bgmVolume = 0.55;
  public sfxVolume = 0.75;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.sfxGain = this.ctx.createGain();
        this.bgmGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.muted ? 0 : this.sfxVolume;
        this.bgmGain.gain.value = this.muted ? 0 : this.bgmVolume * 0.32;
        this.sfxGain.connect(this.ctx.destination);
        this.bgmGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(m: boolean) {
    this.muted = m;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(m ? 0 : this.sfxVolume, this.ctx.currentTime, 0.05);
    }
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(m ? 0 : this.bgmVolume * 0.32, this.ctx.currentTime, 0.08);
    }
  }

  public setBgmVolume(v: number) {
    this.bgmVolume = Math.max(0, Math.min(1, v));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(
        this.muted ? 0 : this.bgmVolume * 0.32,
        this.ctx.currentTime,
        0.08
      );
    }
  }

  public setSfxVolume(v: number) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(
        this.muted ? 0 : this.sfxVolume,
        this.ctx.currentTime,
        0.05
      );
    }
  }

  // Heroic Medieval / Clash-of-Clans Style Continuous Background Soundtrack
  public startBgm() {
    const ctx = this.ensureContext();
    if (!ctx || this.bgmTimer !== null) return;

    // D Minor / Dorian Heroic Fantasy Progression (Dm - Bb - C - Am - Dm - F - Gm - A)
    const chords = [
      [146.83, 220.0, 293.66, 349.23], // Dm
      [116.54, 174.61, 233.08, 293.66], // Bb
      [130.81, 196.0, 261.63, 329.63], // C
      [110.0, 164.81, 220.0, 261.63], // Am
      [146.83, 220.0, 293.66, 349.23], // Dm
      [174.61, 220.0, 261.63, 349.23], // F
      [196.0, 233.08, 293.66, 392.0], // Gm
      [110.0, 164.81, 220.0, 277.18], // A major turn
    ];

    const melody = [
      587.33, 0, 659.25, 698.46, 587.33, 523.25, 440.0, 0,
      466.16, 0, 523.25, 587.33, 466.16, 440.0, 392.0, 0,
      523.25, 0, 587.33, 659.25, 523.25, 493.88, 440.0, 0,
      440.0, 523.25, 587.33, 0, 659.25, 587.33, 523.25, 440.0,
    ];

    const stepMs = 340; // Crisp adventurous medieval tempo
    const playStep = () => {
      if (!this.ctx || !this.bgmGain) return;
      if (this.ctx.state === 'suspended' || this.muted || this.bgmVolume <= 0.01) return;

      const now = this.ctx.currentTime;
      const step = this.bgmStep % 32;
      const chordIdx = Math.floor(step / 4) % chords.length;
      const chord = chords[chordIdx];

      // 1. Warm French Horn Pad at start of each 4-beat bar
      if (step % 4 === 0) {
        chord.slice(0, 3).forEach((freq) => {
          const osc = this.ctx!.createOscillator();
          const filter = this.ctx!.createBiquadFilter();
          const g = this.ctx!.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(580, now);
          g.gain.setValueAtTime(0.001, now);
          g.gain.linearRampToValueAtTime(0.08, now + 0.16);
          g.gain.exponentialRampToValueAtTime(0.001, now + 1.32);
          osc.connect(filter).connect(g).connect(this.bgmGain!);
          osc.start(now);
          osc.stop(now + 1.35);
        });
      }

      // 2. Plucked Lute / Harp Arpeggio on every step
      const arpFreq = chord[step % chord.length] * (step % 8 >= 4 ? 2 : 1);
      {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(arpFreq, now);
        g.gain.setValueAtTime(0.09, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        osc.connect(g).connect(this.bgmGain);
        osc.start(now);
        osc.stop(now + 0.34);
      }

      // 3. Heroic Woodwind / Flute Melody
      const melFreq = melody[step];
      if (melFreq > 0) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(melFreq, now);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.11, now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.31);
        osc.connect(g).connect(this.bgmGain);
        osc.start(now);
        osc.stop(now + 0.32);
      }

      // 4. Medieval Timpani / War Drum Pulse
      if (step % 2 === 0) {
        const drum = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        drum.type = 'sine';
        drum.frequency.setValueAtTime(step % 4 === 0 ? 105 : 82, now);
        drum.frequency.exponentialRampToValueAtTime(38, now + 0.14);
        g.gain.setValueAtTime(step % 4 === 0 ? 0.16 : 0.09, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        drum.connect(g).connect(this.bgmGain);
        drum.start(now);
        drum.stop(now + 0.17);
      }

      this.bgmStep++;
    };

    playStep();
    this.bgmTimer = window.setInterval(playStep, stepMs);
  }

  public stopBgm() {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  // Soft procedural river ambience; proximity controls its volume so it feels localized in-world.
  public setRiverAmbience(amount: number) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const target = this.muted ? 0 : Math.max(0, Math.min(1, amount)) * this.sfxVolume * 0.18;
    if (!this.riverGain) {
      this.riverGain = ctx.createGain();
      this.riverGain.gain.value = 0;
      this.riverGain.connect(ctx.destination);
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.28;
      this.riverSource = ctx.createBufferSource();
      this.riverSource.buffer = buffer;
      this.riverSource.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1450;
      this.riverSource.connect(filter).connect(this.riverGain);
      this.riverSource.start();
    }
    this.riverGain.gain.setTargetAtTime(target, ctx.currentTime, 0.12);
  }

  private getSfxTarget(): { ctx: AudioContext; out: AudioNode } | null {
    if (this.muted) return null;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return null;
    return { ctx, out: this.sfxGain };
  }

  playSlash(heavy = false) {
    const t = this.getSfxTarget();
    if (!t) return;
    const now = t.ctx.currentTime;
    const osc = t.ctx.createOscillator();
    const gain = t.ctx.createGain();
    osc.type = heavy ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(heavy ? 320 : 480, now);
    osc.frequency.exponentialRampToValueAtTime(heavy ? 75 : 110, now + (heavy ? 0.22 : 0.14));
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.24 : 0.15));
    osc.connect(gain).connect(t.out);
    osc.start(now);
    osc.stop(now + (heavy ? 0.25 : 0.16));
  }

  playFireCleave() {
    const t = this.getSfxTarget();
    if (!t) return;
    const now = t.ctx.currentTime;
    const osc = t.ctx.createOscillator();
    const osc2 = t.ctx.createOscillator();
    const gain = t.ctx.createGain();
    osc.type = 'sawtooth';
    osc2.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.36);
    osc2.frequency.setValueAtTime(140, now);
    osc2.frequency.exponentialRampToValueAtTime(40, now + 0.36);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(t.out);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.4);
    osc2.stop(now + 0.4);
  }

  playArcaneNova() {
    const t = this.getSfxTarget();
    if (!t) return;
    const now = t.ctx.currentTime;
    [330, 495, 660, 880].forEach((freq, i) => {
      const osc = t.ctx.createOscillator();
      const gain = t.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.03);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.45);
      gain.gain.setValueAtTime(0.08, now + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
      osc.connect(gain).connect(t.out);
      osc.start(now + i * 0.03);
      osc.stop(now + 0.5);
    });
  }

  playHit() {
    const t = this.getSfxTarget();
    if (!t) return;
    const now = t.ctx.currentTime;
    const osc = t.ctx.createOscillator();
    const gain = t.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(155, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.11);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(t.out);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playEquip() {
    const t = this.getSfxTarget();
    if (!t) return;
    const now = t.ctx.currentTime;
    const osc = t.ctx.createOscillator();
    const gain = t.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.setValueAtTime(780, now + 0.06);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain).connect(t.out);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playCoin() {
    const t = this.getSfxTarget();
    if (!t) return;
    const now = t.ctx.currentTime;
    [987, 1318].forEach((f, i) => {
      const osc = t.ctx.createOscillator();
      const gain = t.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.07);
      gain.gain.setValueAtTime(0.1, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.2);
      osc.connect(gain).connect(t.out);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.22);
    });
  }

  playPotion() {
    const t = this.getSfxTarget();
    if (!t) return;
    const now = t.ctx.currentTime;
    const osc = t.ctx.createOscillator();
    const gain = t.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.22);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain).connect(t.out);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playLevelUp() {
    const t = this.getSfxTarget();
    if (!t) return;
    const now = t.ctx.currentTime;
    [440, 554, 659, 880].forEach((freq, i) => {
      const osc = t.ctx.createOscillator();
      const gain = t.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.12, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
      osc.connect(gain).connect(t.out);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.36);
    });
  }
}

export const soundEngine = new SoundEngine();
