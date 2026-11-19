// 音效引擎：全部以 Web Audio API 即時合成（無任何受版權保護的音檔）。
// - 金屬/硬幣：多重短促瞬態 + 非諧波共振 + 短金屬衰減 + 隨機強度與時間
// - 只在使用者手勢之後建立/恢復 AudioContext（相容 iOS Safari）
// - 主輸出經壓縮/限幅，避免爆音；靜音時直接關閉輸出並停止背景嗡鳴
const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// 非諧波比例（近似小圓金屬片的振動模態）
const METAL_RATIOS = [1, 2.32, 4.25, 6.63, 9.38];
const METAL_AMPS = [1, 0.62, 0.38, 0.22, 0.12];

export class AudioEngine {
  /**
   * @param {object} [opts]
   * @param {BaseAudioContext} [opts.ctx] 注入現成的 context（測試用 OfflineAudioContext）
   */
  constructor({ ctx = null } = {}) {
    this.ctx = ctx;
    this.enabled = true;
    this.ready = false;
    this.master = null;
    this.humNodes = null;
    this.noiseBuf = null;
    this._injected = !!ctx;
    if (ctx) this._build();
  }

  get state() { return this.ctx ? this.ctx.state : 'none'; }

  /** 必須在使用者手勢（pointerup/click/keydown/touchend）中呼叫。可重複呼叫。 */
  unlock() {
    try {
      if (!this.ctx) {
        const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC({ latencyHint: 'interactive' });
        this._build();
        // iOS：播放一個無聲緩衝以解除鎖定
        const b = this.ctx.createBuffer(1, 1, 22050);
        const s = this.ctx.createBufferSource();
        s.buffer = b; s.connect(this.ctx.destination); s.start(0);
      }
      if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
        const p = this.ctx.resume();
        if (p && p.catch) p.catch(() => {});
      }
      this._applyEnabled();
      return true;
    } catch {
      return false;
    }
  }

  _build() {
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.0001;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 6;
    comp.attack.value = 0.002; comp.release.value = 0.12;
    const lim = ctx.createGain();
    lim.gain.value = 0.85;
    this.master.connect(comp); comp.connect(lim); lim.connect(ctx.destination);
    // 共用白噪音緩衝
    const len = Math.floor(ctx.sampleRate * 1.5);
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.ready = true;
    this._applyEnabled();
  }

  setEnabled(on) {
    this.enabled = !!on;
    this._applyEnabled();
  }

  _applyEnabled() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(this.enabled ? 0.9 : 0.0001, t, 0.015);
    if (this.enabled) this._startHum(); else this._stopHum();
  }

  /* ---------- 基礎零件 ---------- */
  get now() { return this.ctx.currentTime; }
  get live() { return this.ready && this.enabled; }

  _env(param, t, peak, attack, decay) {
    param.cancelScheduledValues(t);
    param.setValueAtTime(0.00001, t);
    param.linearRampToValueAtTime(peak * (this._g || 1), t + attack);
    param.exponentialRampToValueAtTime(0.00001, t + attack + decay);
  }

  _noise(t, dur, { type = 'highpass', freq = 3000, q = 0.7, gain = 0.3, attack = 0.0008 } = {}) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    this._env(g.gain, t, gain, attack, dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, rand(0, 0.8)); src.stop(t + attack + dur + 0.05);
    src.onended = () => { try { src.disconnect(); f.disconnect(); g.disconnect(); } catch { /* noop */ } };
  }

  _tone(t, freq, dur, { type = 'sine', gain = 0.2, attack = 0.001, endFreq = null, lp = null } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    const g = ctx.createGain();
    this._env(g.gain, t, gain, attack, dur);
    let tail = g;
    o.connect(g);
    if (lp) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
      g.connect(f); tail = f;
    }
    tail.connect(this.master);
    o.start(t); o.stop(t + attack + dur + 0.05);
    o.onended = () => { try { o.disconnect(); g.disconnect(); if (tail !== g) tail.disconnect(); } catch { /* noop */ } };
  }

  /** 金屬敲擊：瞬態 + 非諧波共振。intensity 0..1 */
  _metal(t, base, intensity = 0.7, decayScale = 1) {
    const k = clamp01(intensity);
    this._noise(t, 0.012 + 0.01 * k, { type: 'bandpass', freq: base * 1.6, q: 1.2, gain: 0.25 * k + 0.05 });
    METAL_RATIOS.forEach((r, i) => {
      const f = base * r * rand(0.985, 1.015);
      if (f > 14000) return;
      this._tone(t, f, (0.2 * decayScale) / (1 + i * 0.9) * (0.5 + k), {
        type: 'sine', gain: 0.17 * METAL_AMPS[i] * (0.3 + k), attack: 0.0006,
      });
    });
  }

  /* ---------- 事件音效 ---------- */

  /** NT$10 硬幣打在投幣孔、滑下、落入機內。 */
  coinInsert() {
    if (!this.live) return;
    const t = this.now + 0.005;
    this._metal(t, rand(2900, 3300), 0.95, 1.5);                // 硬幣邊緣敲到投幣孔
    this._noise(t + 0.03, 0.13, { type: 'bandpass', freq: 5200, q: 2.5, gain: 0.07, attack: 0.02 }); // 滑過滑道
    this._tone(t + 0.04, 900, 0.1, { type: 'sine', gain: 0.03, endFreq: 500 });
    this._metal(t + 0.17, rand(1900, 2300), 0.5, 0.8);          // 落入機內撞擊
    this._metal(t + 0.235, rand(1500, 1900), 0.32, 0.6);
    this._tone(t + 0.17, 150, 0.09, { type: 'sine', gain: 0.18, endFreq: 70 });   // 機殼悶響
    this._noise(t + 0.17, 0.12, { type: 'lowpass', freq: 500, gain: 0.12 });
  }

  /** 押注鍵：機械喀嗒 + 彈簧回彈。 */
  betClick() {
    if (!this.live) return;
    const t = this.now + 0.002;
    this._noise(t, 0.018, { type: 'highpass', freq: 2400, gain: 0.34 });
    this._tone(t, 190, 0.04, { type: 'sine', gain: 0.3, endFreq: 95 });
    this._noise(t + 0.045, 0.01, { type: 'bandpass', freq: 3300, q: 3, gain: 0.12 });   // 回彈
    this._tone(t + 0.047, rand(2100, 2500), 0.03, { type: 'triangle', gain: 0.03 });
  }

  /** START：厚重的實體按鍵。 */
  startClick() {
    if (!this.live) return;
    const t = this.now + 0.002;
    this._tone(t, 120, 0.11, { type: 'sine', gain: 0.5, endFreq: 55 });
    this._noise(t, 0.07, { type: 'lowpass', freq: 700, gain: 0.35 });
    this._noise(t + 0.006, 0.03, { type: 'bandpass', freq: 1600, q: 1.5, gain: 0.3 });  // 微動開關
    this._noise(t + 0.1, 0.02, { type: 'highpass', freq: 2000, gain: 0.15 });          // 回彈
    this._tone(t + 0.1, 70, 0.05, { type: 'sine', gain: 0.12 });
  }

  /** 一般實體按鍵（退幣、猜大小）。 */
  buttonClick() {
    if (!this.live) return;
    const t = this.now + 0.002;
    this._tone(t, 150, 0.07, { type: 'sine', gain: 0.38, endFreq: 70 });
    this._noise(t, 0.03, { type: 'bandpass', freq: 1800, q: 1.2, gain: 0.3 });
    this._noise(t + 0.07, 0.012, { type: 'highpass', freq: 2200, gain: 0.1 });
  }

  /** 無效操作：按鍵沒有吃分，只有悶悶的一聲。 */
  reject() {
    if (!this.live) return;
    const t = this.now + 0.002;
    this._tone(t, 110, 0.06, { type: 'sine', gain: 0.22, endFreq: 70 });
    this._noise(t, 0.02, { type: 'lowpass', freq: 600, gain: 0.15 });
  }

  /** 跑燈滴答。speed：0（最慢）~1（最快）。越慢越低、越長、越清楚。 */
  tick(speed = 1) {
    if (!this.live) return;
    const t = this.now + 0.001;
    const s = clamp01(speed);
    const dur = 0.014 + 0.05 * (1 - s);
    const f = 640 + 420 * s;
    this._tone(t, f, dur, { type: 'square', gain: 0.06 + 0.05 * (1 - s), lp: 2600, attack: 0.0008 });
    this._tone(t, f * 0.5, dur * 1.4, { type: 'triangle', gain: 0.07 + 0.05 * (1 - s), attack: 0.0008 });
    this._noise(t, 0.008 + 0.012 * (1 - s), { type: 'bandpass', freq: 2200, q: 1.5, gain: 0.1 + 0.1 * (1 - s) });
  }

  /** 最後停燈：繼電器落下 + 低沉電子「噗」。 */
  stop() {
    if (!this.live) return;
    const t = this.now + 0.002;
    this._tone(t, 135, 0.1, { type: 'sine', gain: 0.4, endFreq: 60 });
    this._noise(t, 0.05, { type: 'lowpass', freq: 900, gain: 0.3 });
    this._tone(t + 0.02, 520, 0.12, { type: 'square', gain: 0.07, endFreq: 330, lp: 2200 });
  }

  /** 單一贈燈/猜大小揭曉的短促電子音。 */
  blip(pitch = 1) {
    if (!this.live) return;
    const t = this.now + 0.002;
    this._tone(t, 880 * pitch, 0.07, { type: 'square', gain: 0.07, lp: 3000 });
    this._tone(t + 0.07, 1320 * pitch, 0.1, { type: 'square', gain: 0.06, lp: 3000 });
  }

  /** 中獎：簡單的復古電子和弦琶音。big 為高倍率時多響幾輪。 */
  win(big = false) {
    if (!this.live) return;
    const t = this.now + 0.01;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const rounds = big ? 3 : 1;
    for (let r = 0; r < rounds; r++) {
      notes.forEach((f, i) => {
        const tt = t + r * 0.46 + i * 0.09;
        this._tone(tt, f, 0.16, { type: 'square', gain: 0.075, lp: 3200 });
        this._tone(tt, f * 2, 0.12, { type: 'triangle', gain: 0.035 });
      });
    }
    this._tone(t + rounds * 0.46 - 0.02, 1046.5, 0.5, { type: 'triangle', gain: 0.09 });
  }

  /** 猜錯 / 沒中：低沉兩聲。 */
  lose() {
    if (!this.live) return;
    const t = this.now + 0.005;
    this._tone(t, 220, 0.14, { type: 'square', gain: 0.06, endFreq: 196, lp: 1600 });
    this._tone(t + 0.15, 165, 0.22, { type: 'square', gain: 0.06, endFreq: 131, lp: 1400 });
  }

  /** 退幣：多枚硬幣掉入金屬盤，互相碰撞、彈跳、滾動。 */
  coinPayout(count = 5) {
    if (!this.live) return;
    const n = Math.max(1, Math.min(40, Math.floor(count)));
    const t0 = this.now + 0.02;
    // 出幣馬達的低頻運轉
    this._tone(t0, 95, 0.1 + n * 0.075, { type: 'sawtooth', gain: 0.025, lp: 380, attack: 0.02 });
    let t = t0 + 0.04;
    for (let i = 0; i < n; i++) {
      t += rand(0.055, 0.12);
      const inten = rand(0.55, 1);
      const base = rand(1900, 3600);
      this._metal(t, base, inten, rand(0.8, 1.4));                              // 落盤
      this._tone(t, rand(520, 820), 0.07, { type: 'sine', gain: 0.1 * inten });  // 盤子共振
      const bounces = 1 + Math.floor(Math.random() * 3);
      let bt = t;
      for (let b = 0; b < bounces; b++) {                                        // 彈跳/碰撞
        bt += rand(0.035, 0.11) * (1 + b * 0.5);
        this._metal(bt, base * rand(0.8, 1.25), inten * 0.55 / (b + 1), 0.55);
      }
    }
    // 最後在盤中滾動/疊放的細碎聲
    const end = t + 0.1;
    for (let k = 0; k < 4 + Math.min(8, n); k++) {
      this._metal(end + k * rand(0.03, 0.08), rand(2400, 4200), rand(0.12, 0.3), 0.4);
    }
    this._noise(end, 0.18, { type: 'bandpass', freq: 3800, q: 0.9, gain: 0.05, attack: 0.03 });
  }

  /** 取走盤中硬幣的嘩啦聲（短）。 */
  coinScoop() {
    if (!this.live) return;
    const t = this.now + 0.005;
    for (let k = 0; k < 6; k++) this._metal(t + k * rand(0.025, 0.06), rand(2200, 3800), rand(0.15, 0.4), 0.5);
  }

  /* ---------- 背景嗡鳴（機殼電源與共振，台灣市電 60Hz） ---------- */
  _startHum() {
    if (this.humNodes || !this.ready) return;
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.setTargetAtTime(0.007, ctx.currentTime, 0.4);
    const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 60;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 120;
    const og2 = ctx.createGain(); og2.gain.value = 0.5;
    const n = ctx.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 260;
    const ng = ctx.createGain(); ng.gain.value = 0.35;
    o1.connect(g); o2.connect(og2); og2.connect(g); n.connect(nf); nf.connect(ng); ng.connect(g);
    g.connect(this.master);
    o1.start(); o2.start(); n.start();
    this.humNodes = { g, o1, o2, n };
  }

  _stopHum() {
    const h = this.humNodes;
    if (!h) return;
    this.humNodes = null;
    const t = this.ctx.currentTime;
    h.g.gain.cancelScheduledValues(t);
    h.g.gain.setTargetAtTime(0.00001, t, 0.05);
    const stopAt = t + 0.4;
    try { h.o1.stop(stopAt); h.o2.stop(stopAt); h.n.stop(stopAt); } catch { /* noop */ }
  }

  /** 離開頁面時暫停，回來再恢復，避免背景耗電。 */
  suspend() { try { if (this.ctx && !this._injected && this.ctx.state === 'running') this.ctx.suspend(); } catch { /* noop */ } }
  resume() { try { if (this.ctx && !this._injected && this.ctx.state !== 'running') this.ctx.resume(); } catch { /* noop */ } }
}

// 各音效的相對音量（小而短的機械聲需要補償，才不會被嗡鳴與硬幣聲蓋過）
const LEVELS = { betClick: 3, buttonClick: 3, reject: 3.5, tick: 4, stop: 3, blip: 3, lose: 2.5, win: 2 };
for (const [name, mult] of Object.entries(LEVELS)) {
  const orig = AudioEngine.prototype[name];
  AudioEngine.prototype[name] = function leveled(...args) {
    this._g = mult;
    try { return orig.apply(this, args); } finally { this._g = 1; }
  };
}
