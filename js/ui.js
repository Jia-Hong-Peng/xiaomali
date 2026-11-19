// UI 控制器：把引擎、動畫、音效與 SVG 機台串起來。規則判定全在 engine.js，這裡只負責呈現。
import { Machine, totalBet, taipeiDateKey } from './engine.js';
import { loadState, saveState } from './storage.js';
import { buildCabinet } from './cabinet.js';
import { buildSchedule, runSchedule, attractPattern } from './anim.js';
import {
  SYMBOLS, SYMBOL_BY_ID, LAMPS, COIN_VALUE, SPIN, MAX_BET_PER_SYMBOL, BET_LAYOUT, ATTRACT,
} from './config.js';
import { SVGNS } from './art.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp01 = (x) => Math.max(0, Math.min(1, x));

function safeStorage() {
  try {
    const s = globalThis.localStorage;
    const k = '__xm_probe__';
    s.setItem(k, '1'); s.removeItem(k);
    return s;
  } catch { return null; }
}

export class Game {
  constructor(root, { storage = safeStorage(), audio, now = () => new Date(), machineOptions, powerOn = true } = {}) {
    this.powerOnEnabled = powerOn;
    this._lastAct = performance.now();
    this._attracting = false;
    this._attractStep = 0;
    this._poweringOn = false;
    this.root = root;
    this.storage = storage;
    this.audio = audio;
    this.now = now;
    this.cab = buildCabinet(root);
    const { state, recovered } = loadState(this.storage, taipeiDateKey(this.now()));
    this.machine = new Machine(state, machineOptions);
    this.recovered = recovered;
    this.ui = {
      lock: false,            // 猜大小揭曉等短暫鎖定
      spinner: null,
      displayCredit: null,    // 顯示器的暫時數值（滾分動畫），null 代表顯示真實值
      displayWin: null,
      flash: null,            // { l1, l2, until }
      flashTimer: null,
      onLamps: new Set(),
      trayCoins: [],
      timers: new Set(),
    };
    this.events = [];          // 測試用事件紀錄
    this._bind();
    this._init();
  }

  /* ---------- 初始化 ---------- */
  _init() {
    this.audio.setEnabled(this.machine.state.soundOn);
    const daily = this.machine.applyDailyAllowance(this.now());
    if (this.machine.state.phase === 'spinning') {
      // 跑燈中途離開（重新整理/關閉）：補完結算，不讓玩家靠重新整理逃避輸局
      const r = this.machine.settle();
      this._log('recover-settle', r);
    }
    this._persist();
    this._lightIdle();
    this.render();
    if (this.recovered) this._flashMsg('存檔異常', '已重設為初始狀態', 4000);
    else if (daily.changed && daily.granted > 0) this._flashMsg('新的一天', `零用金補發 NT$${daily.granted}`, 4000);
    this._dailyTimer = setInterval(() => this._checkDaily(), 20000);
    this._attractTimer = setInterval(() => this._attractTick(), ATTRACT.stepMs);
    if (this.powerOnEnabled) this._powerOn();
  }

  /** 開機自我檢測：所有七段顯示亮 8、24 顆燈依序點亮再閃兩下（實機開機都會這樣）。 */
  _powerOn() {
    const c = this.cab;
    this._poweringOn = true;
    this.ui.lock = true;
    c.led.credit.set(88888); c.led.win.set(88888); c.pocketLed.set(88888);
    Object.values(c.betDigits).forEach((d) => d.set(88));
    c.duDigits.set(88);
    const all = Array.from({ length: LAMPS.length }, (_, i) => i);
    this._swapLamps(new Set());
    all.forEach((i) => this._later(() => this._swapLamps(new Set(all.slice(0, i + 1))), 120 + i * 32));
    [0, 1].forEach((k) => {
      this._later(() => this._swapLamps(new Set()), 1050 + k * 320);
      this._later(() => this._swapLamps(new Set(all)), 1210 + k * 320);
    });
    this._later(() => {
      this.ui.lock = false;
      this._poweringOn = false;
      c.duDigits.set('');
      this._lastAct = performance.now();
      this._lightIdle();
      this.render();
    }, 1950);
  }

  /** 待機燈光秀：沒人投幣一陣子後自己跑燈；任何操作立刻停止。 */
  _attractTick() {
    if (this._poweringOn) return;
    const s = this.machine.state;
    const can = !document.hidden && s.phase === 'idle' && !this.ui.lock && s.credit === 0 && s.win === 0
      && totalBet(s.bets) === 0 && performance.now() - this._lastAct > ATTRACT.delay;
    if (can) {
      this._attracting = true;
      this._swapLamps(new Set(attractPattern(this._attractStep++)));
    } else if (this._attracting) {
      this._attracting = false;
      this._lightIdle();
    }
  }

  _checkDaily() {
    const d = this.machine.applyDailyAllowance(this.now());
    if (d.changed) {
      this._persist(); this.render();
      if (d.granted > 0) this._flashMsg('新的一天', `零用金補發 NT$${d.granted}`, 4000);
    }
  }

  _log(type, data) { this.events.push({ type, data, t: Date.now() }); if (this.events.length > 200) this.events.shift(); }
  _persist() { saveState(this.storage, this.machine.snapshot()); }
  _later(fn, ms) {
    const id = setTimeout(() => { this.ui.timers.delete(id); fn(); }, ms);
    this.ui.timers.add(id);
    return id;
  }

  /* ---------- 事件綁定 ---------- */
  _bind() {
    const svg = this.cab.svg;
    this.active = new Map();
    svg.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
      const btn = e.target.closest('.btn, #tray');
      if (!btn) return;
      e.preventDefault();
      this.audio.unlock();
      this._press(btn);
      this.active.set(e.pointerId, btn);
      try { svg.setPointerCapture(e.pointerId); } catch { /* noop */ }
      const ok = this._act(btn.dataset.act, btn.dataset.arg);
      if (ok !== false && ['bet', 'toCredit', 'toWin'].includes(btn.dataset.act)) this._startRepeat(btn);
    });
    const up = (e) => {
      const btn = this.active.get(e.pointerId);
      if (btn) { this.active.delete(e.pointerId); this._release(btn); this._stopRepeat(btn); }
      this.audio.unlock();
    };
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
    svg.addEventListener('contextmenu', (e) => e.preventDefault());
    svg.addEventListener('dblclick', (e) => e.preventDefault());
    // iOS：避免雙擊縮放與手勢縮放
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((n) => document.addEventListener(n, (e) => e.preventDefault()));
    document.addEventListener('touchend', () => this.audio.unlock(), { passive: true });
    document.addEventListener('keydown', (e) => { this._lastAct = performance.now(); this._onKey(e); });
    document.addEventListener('keyup', (e) => {
      const el = this._keyBtn; if (el && (e.key === ' ' || e.key === 'Enter' || this._keyMap(e.key))) { this._release(el); this._keyBtn = null; }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.audio.suspend(); this.active.forEach((b) => this._stopRepeat(b)); return; }
      this.audio.resume();
      this._checkDaily();
      if (this.ui.spinner && !this.ui.spinner.done) this.ui.spinner.finishNow();
    });
  }

  _keyMap(key) {
    const k = key.toLowerCase();
    const idx = '12345678'.indexOf(k);
    if (idx >= 0 && k.length === 1) return { act: 'bet', arg: BET_LAYOUT[idx], id: `btn-bet-${BET_LAYOUT[idx]}` };
    if (k === 'q') return { act: 'toCredit', id: 'btn-tocredit' };
    if (k === 'w') return { act: 'toWin', id: 'btn-towin' };
    if (k === 'c') return { act: 'coin', id: 'btn-coin' };
    if (k === ' ' || k === 'enter') return { act: 'start', id: 'btn-start' };
    if (k === 'arrowleft') return { act: 'small', id: 'btn-small' };
    if (k === 'arrowright') return { act: 'large', id: 'btn-large' };
    if (k === 'x' || k === 'backspace') return { act: 'cash', id: 'btn-cash' };
    if (k === 'm') return { act: 'sound', id: 'btn-sound' };
    return null;
  }

  _onKey(e) {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    let m = this._keyMap(e.key);
    // 焦點在按鍵上時，Space/Enter 按該鍵，而不是 START
    const focused = document.activeElement && document.activeElement.closest && document.activeElement.closest('.btn');
    if (focused && (e.key === ' ' || e.key === 'Enter')) m = { act: focused.dataset.act, arg: focused.dataset.arg, id: focused.id };
    if (!m) return;
    e.preventDefault();
    this.audio.unlock();
    const el = this.cab.buttons[m.id];
    if (el) { this._press(el); this._keyBtn = el; }
    this._act(m.act, m.arg);
  }

  _press(btn) {
    btn.classList.add('down');
    btn._downAt = performance.now();
  }
  _release(btn) {
    const wait = Math.max(0, 90 - (performance.now() - (btn._downAt || 0)));
    setTimeout(() => btn.classList.remove('down'), wait);
  }

  /* ---------- 動作分派 ---------- */
  _act(act, arg) {
    const a = this.audio;
    const m = this.machine;
    this._lastAct = performance.now();
    if (this._attracting) { this._attracting = false; this._lightIdle(); }
    if (act !== 'scoop' && act !== 'sound' && !this.ui.lock && m.state.phase !== 'spinning') { clearTimeout(this.ui.flashTimer); this.ui.flash = null; }
    switch (act) {
      case 'coin': return this._coin();
      case 'bet': {
        if (this.ui.lock) { a.reject(); return false; }
        const r = m.addBet(arg);
        this._log('bet', { arg, r });
        if (!r.ok) {
          a.reject();
          if (r.reason === 'insufficient-credit') this._flashMsg('分數不足', m.state.pocket >= COIN_VALUE ? '請先投幣' : '口袋沒錢了', 1600);
          else if (r.reason === 'max-bet') this._flashMsg('已達上限', `每門最多押 ${MAX_BET_PER_SYMBOL} 分`, 1600);
          return false;
        }
        a.betClick();
        this._persist(); this.render();
        return true;
      }
      case 'toCredit':
      case 'toWin': return this._transfer(act, this._holdAmount());
      case 'start': return this._start();
      case 'small':
      case 'large': return this._guess(act);
      case 'cash': return this._cash();
      case 'sound': {
        m.setSound(!m.state.soundOn);
        a.setEnabled(m.state.soundOn);
        a.unlock();
        if (m.state.soundOn) a.buttonClick();
        this._persist(); this.render();
        return undefined;
      }
      case 'scoop': return this._scoop();
      default: return undefined;
    }
  }

  /* 按住連發：押分鍵與轉分鍵 */
  _startRepeat(el) {
    this._stopRepeat(el);
    el._holdN = 0;
    const run = () => {
      el._holdN += 1;
      this._holdTick = el._holdN;
      const ok = this._act(el.dataset.act, el.dataset.arg);
      this._holdTick = 0;
      if (ok === false || !el.classList.contains('down')) { el._rep = null; return; }
      el._rep = setTimeout(run, el._holdN < 6 ? 110 : el._holdN < 14 ? 70 : 40);
    };
    el._rep = setTimeout(run, 420);
  }
  _stopRepeat(el) { if (el._rep) clearTimeout(el._rep); el._rep = null; }
  /** 轉分每次的分數：單按 1 分，按住越久越多。 */
  _holdAmount() {
    const n = this._holdTick || 0;
    return n < 8 ? 1 : n < 20 ? 5 : 25;
  }

  _transfer(dir, amount) {
    if (this.ui.lock) { this.audio.reject(); return false; }
    const r = this.machine.transfer(dir, amount);
    this._log('transfer', { dir, r });
    if (!r.ok) { this.audio.reject(); return false; }
    this.audio.tick(0.9);
    this.ui.displayWin = null;
    this._persist();
    this._stopFlash();
    this.render();
    return true;
  }

  _coin() {
    const m = this.machine;
    if (this.ui.lock) return this.audio.reject();
    const before = m.state.credit + (m.state.phase === 'win' ? m.state.win : 0);
    const r = m.insertCoin();
    this._log('coin', r);
    if (!r.ok) {
      this.audio.reject();
      if (r.reason === 'insufficient-pocket') this._flashMsg('口袋沒錢了', '明天零用金會補發', 2200);
      else if (r.reason === 'credit-full') this._flashMsg('分數已滿', '請先退幣', 1800);
      return;
    }
    this.audio.coinInsert();
    this._persist();
    // 硬幣飛入投幣孔，落下後分數才跳動
    this.ui.displayCredit = Math.max(0, m.state.credit - COIN_VALUE);
    this.render();
    this._flyCoin(() => {
      this.ui.displayCredit = null;
      this.render();
    });
    void before;
  }

  _start() {
    const m = this.machine;
    if (this.ui.lock) return this.audio.reject();
    if (m.state.phase === 'spinning') return undefined;
    if (m.state.phase === 'win') {
      const oldCredit = m.state.credit;
      const r = m.collect();
      this._log('collect', r);
      if (r.ok) {
        this.audio.startClick();
        this._persist();
        this._stopFlash();
        this.ui.displayCredit = oldCredit;
        this.ui.displayWin = r.amount;
        this._rollTransfer(r.amount, oldCredit);
      }
      return undefined;
    }
    const r = m.start();
    this._log('start', r);
    if (!r.ok) {
      this.audio.reject();
      if (r.reason === 'no-bet') this._flashMsg('請先押分', m.state.credit > 0 ? '按下水果鍵' : '請先投幣', 1600);
      return undefined;
    }
    this.audio.startClick();
    this._persist();
    this._stopFlash();
    try { this._beginSpin(r); } catch (err) {
      // 動畫失敗也不能讓機台卡死：直接結算，結果仍以引擎預定的為準
      console.error(err);
      this._swapLamps(new Set([r.target, ...r.bonus]));
      this._finalize(r);
    }
    return undefined;
  }

  /* ---------- 跑燈 ---------- */
  _beginSpin(res) {
    this._clearFlashes();
    this.render();
    const steps = buildSchedule(res.from, res.target);
    this._flashMsg('', '', 0);
    let prev = this.ui.onLamps.size ? [...this.ui.onLamps] : [res.from];
    const total = steps.length;
    this._swapLamps(new Set([res.from]));
    this.ui.spinner = runSchedule(steps, {
      onStep: (pos, i, n, delay) => {
        this._swapLamps(new Set([pos]));
        const speed = clamp01(1 - (delay - SPIN.fastDelay) / (SPIN.endDelay - SPIN.fastDelay));
        this.audio.tick(speed);
        this.lastStep = { pos, i, n };
      },
      onDone: () => this._afterSpin(res),
    });
    void prev; void total;
  }

  async _afterSpin(res) {
    this.ui.lock = true;
    this.audio.stop();
    this._log('spin-stopped', { target: res.target });
    if (res.bonus.length) {
      this.cab.msg1.textContent = '再一次'; this.cab.msg2.textContent = `贈送 ${res.bonus.length} 個燈`;
      await sleep(600);
      const lit = new Set([res.target]);
      for (let k = 0; k < res.bonus.length; k++) {
        lit.add(res.bonus[k]);
        this._swapLamps(new Set(lit), true);
        this.audio.blip(1 + k * 0.14);
        await sleep(640);
      }
      await sleep(250);
    } else {
      await sleep(260);
    }
    this._finalize(res);
  }

  _finalize(res) {
    const m = this.machine;
    const r = m.settle();           // 冪等：只會派彩一次
    this._log('settle', r);
    this._persist();
    this.ui.lock = false;
    this.ui.spinner = null;
    const lit = new Set([res.target, ...res.bonus]);
    this._swapLamps(lit, true);
    if (!r.ok) { this.render(); return; }
    if (r.payout > 0) {
      const names = [...new Set(r.hits.map((h) => SYMBOL_BY_ID[h.symbol].name))];
      const big = r.hits.some((h) => h.mult >= 30) || r.payout >= 100;
      this.audio.win(big);
      r.hits.forEach((h) => this.cab.lamps[h.lamp].classList.add('flash'));
      if (big) this._bigWinShow(lit);
      this._flashMsg('中獎！', r.hits.length === 1 ? `${names[0]} ×${r.hits[0].mult}　得 ${r.payout}` : `${names.join('、')}　共得 ${r.payout}`, 0);
      this.ui.displayWin = 0;
      this._rollNumber(0, r.payout, (v) => { this.ui.displayWin = v; this.cab.led.win.set(v); }, () => { this.ui.displayWin = null; this.render(); });
    } else {
      const sym = LAMPS[res.target].symbol;
      this._flashMsg('未中獎', sym === 'oncemore' ? '再一次沒有送到你的圖案' : `開出 ${SYMBOL_BY_ID[sym].name}`, 2600);
      this.render();
    }
  }

  /** 大獎：整圈燈奇偶交替狂閃（實機大獎的全盤閃爍），約 2.5 秒後回到中獎燈。 */
  _bigWinShow(finalLit) {
    this.ui.lock = true;
    let k = 0;
    const step = () => {
      if (k >= 18) {
        this._swapLamps(new Set(finalLit));
        this.ui.lock = false;
        this.render();
        return;
      }
      const odd = k % 2;
      this._swapLamps(new Set(Array.from({ length: LAMPS.length }, (_, i) => i).filter((i) => i % 2 === odd)));
      this.audio.blip(1 + (k % 6) * 0.12);
      k += 1;
      this._later(step, 140);
    };
    step();
  }

  /* ---------- 猜大小 ---------- */
  async _guess(side) {
    const m = this.machine;
    if (this.ui.lock) return this.audio.reject();
    if (m.state.phase !== 'win') { this.audio.reject(); this._flashMsg('猜大小', '中獎後才能玩', 1500); return undefined; }
    const before = m.state.win;
    const r = m.guess(side);
    this._log('guess', r);
    if (!r.ok) { this.audio.reject(); return undefined; }
    this._persist();
    this.audio.buttonClick();
    this._stopFlash();
    this.ui.lock = true;
    this.ui.displayWin = before;      // 揭曉前，顯示器維持舊得分
    this.render();
    this._flashMsg('', '', 0);
    this.cab.msg2.textContent = side === 'small' ? '猜小 1–6' : '猜大 8–13';
    for (let i = 0; i < 9; i++) {
      this.cab.duDigits.set(1 + Math.floor(Math.random() * 13));
      this.cab.msg1.textContent = '比大小';
      this.audio.tick(0.85 - i * 0.07);
      await sleep(70 + i * 22);
    }
    this.audio.stop();
    this.cab.duDigits.set(r.n);
    this.cab.msg1.textContent = `${r.n}`;
    this._later(() => this.cab.duDigits.set(''), 3200);
    await sleep(420);
    this.ui.lock = false;
    this.ui.displayWin = null;
    if (r.won) {
      this.audio.win(false);
      this._flashMsg('猜對了！', `得分加倍 ${before} → ${r.win}`, 0);
      this.cab.led.win.set(r.win);
    } else {
      this.audio.lose();
      this._flashMsg(r.n === 7 ? '開 7' : '猜錯了', r.n === 7 ? '大小通吃' : `得分 ${before} 歸零`, 2600);
    }
    this.render();
    return undefined;
  }

  /* ---------- 退幣 ---------- */
  _cash() {
    const m = this.machine;
    if (this.ui.lock) return this.audio.reject();
    const r = m.cashOut();
    this._log('cash', r);
    if (!r.ok) {
      this.audio.reject();
      if (r.reason === 'nothing-to-cash') this._flashMsg('沒有分數', '', 1400);
      return undefined;
    }
    const coins = Math.floor(r.amount / COIN_VALUE) + (r.amount % COIN_VALUE ? 1 : 0);
    this.audio.coinPayout(coins);
    this._persist();
    this._stopFlash();
    this._dropCoins(coins);
    this._flashMsg('退幣', `NT$${r.amount} 已放回口袋`, 3200);
    this.render();
    return undefined;
  }

  _scoop() {
    if (!this.ui.trayCoins.length) return;
    this.audio.coinScoop();
    const list = this.ui.trayCoins.splice(0);
    list.forEach((c, i) => {
      c.style.transition = 'opacity .35s, transform .35s';
      setTimeout(() => { c.style.opacity = '0'; c.style.transform = 'translateY(26px)'; }, i * 18);
      setTimeout(() => c.remove(), 520 + i * 18);
    });
  }

  /* ---------- 燈 ---------- */
  _lightIdle() {
    this._swapLamps(new Set([this.machine.state.lamp]));
  }
  _swapLamps(next) {
    for (const i of this.ui.onLamps) if (!next.has(i)) this.cab.lamps[i].classList.remove('on');
    for (const i of next) this.cab.lamps[i].classList.add('on');
    this.ui.onLamps = next;
  }
  _clearFlashes() { this.cab.lamps.forEach((l) => l.classList.remove('flash')); }
  _stopFlash() { this._clearFlashes(); }

  /* ---------- 顯示器 ---------- */
  _flashMsg(l1, l2, ms) {
    clearTimeout(this.ui.flashTimer);
    this.ui.flash = l1 || l2 ? { l1, l2 } : null;
    if (ms > 0) this.ui.flashTimer = setTimeout(() => { this.ui.flash = null; this.render(); }, ms);
    this.render();
  }

  _message() {
    const s = this.machine.state;
    if (this.ui.flash) return this.ui.flash;
    if (s.phase === 'spinning') return { l1: '跑燈中', l2: '請稍候…' };
    if (s.phase === 'win') return { l1: `得分 ${s.win}`, l2: '按 START 得分　或　猜大小' };
    const bet = totalBet(s.bets);
    if (s.credit === 0 && bet === 0) {
      return s.pocket >= COIN_VALUE ? { l1: '請投幣', l2: `NT$${COIN_VALUE} 一枚` } : { l1: '口袋沒錢了', l2: '明天零用金會補發' };
    }
    if (bet === 0) return { l1: '請押分', l2: '按下水果鍵' };
    return { l1: '按 START', l2: `押分共 ${bet}` };
  }

  render() {
    const s = this.machine.state;
    const c = this.cab;
    const bet = totalBet(s.bets);
    c.led.credit.set(this.ui.displayCredit ?? s.credit);
    if (this.ui.displayWin == null) c.led.win.set(s.win > 0 ? s.win : '');
    c.pocketLed.set(s.pocket);
    for (const sym of SYMBOLS) c.betDigits[sym.id].set(s.bets[sym.id] > 0 ? s.bets[sym.id] : '');
    const m = this._message();
    if (!this.ui.lock || this.ui.flash) { c.msg1.textContent = m.l1; c.msg2.textContent = m.l2; }
    const live = this.root.querySelector('#live') || document.getElementById('live');
    if (live) live.textContent = `${m.l1} ${m.l2}`;

    const spinning = s.phase === 'spinning';
    const busy = spinning || this.ui.lock;
    const setBtn = (id, { off = false, lit = false, ready = false, label } = {}) => {
      const b = c.buttons[id];
      if (!b) return;
      b.classList.toggle('off', off);
      b.classList.toggle('lit', lit);
      b.classList.toggle('ready', ready);
      b.setAttribute('aria-disabled', off ? 'true' : 'false');
      if (label) b.setAttribute('aria-label', label);
    };
    for (const sym of SYMBOLS) {
      const n = s.bets[sym.id];
      setBtn(`btn-bet-${sym.id}`, {
        off: busy || (s.phase !== 'win' && s.credit < 1) || n >= MAX_BET_PER_SYMBOL,
        lit: n > 0,
        label: `押${sym.name}，賠率${sym.mults.join('/')}倍，目前押${n}分`,
      });
    }
    setBtn('btn-start', { off: busy || (s.phase === 'idle' && bet === 0), ready: !busy && (s.phase === 'win' || bet > 0) });
    setBtn('btn-small', { off: busy || s.phase !== 'win', ready: !busy && s.phase === 'win' });
    setBtn('btn-large', { off: busy || s.phase !== 'win', ready: !busy && s.phase === 'win' });
    setBtn('btn-tocredit', { off: busy || s.win <= 0, ready: false });
    setBtn('btn-towin', { off: busy || s.credit <= 0, ready: false });
    setBtn('btn-cash', { off: busy || (s.credit + bet + s.win) === 0, lit: !busy && s.credit + s.win > 0 });
    setBtn('btn-coin', { off: busy || s.pocket < COIN_VALUE });
    const snd = c.buttons['btn-sound'];
    snd.setAttribute('aria-checked', String(s.soundOn));
    c.soundKnob.setAttribute('cx', s.soundOn ? 99 : 85);
    c.soundKnob.setAttribute('fill', s.soundOn ? 'url(#gChrome)' : '#555');
    c.svg.classList.toggle('needcoin', !busy && s.credit === 0 && bet === 0 && s.win === 0 && s.pocket >= COIN_VALUE);
  }

  /* ---------- 小動畫 ---------- */
  _rollNumber(from, to, setter, done, maxMs = 1300) {
    const n = Math.max(1, to - from);
    const stepMs = Math.max(28, Math.min(80, maxMs / n));
    const inc = Math.max(1, Math.ceil(n / (maxMs / stepMs)));
    let v = from;
    const tick = () => {
      v = Math.min(to, v + inc);
      setter(v);
      if (v % 2 === 0) this.audio.tick(0.9);
      if (v < to) this._later(tick, stepMs); else done && done();
    };
    this._later(tick, stepMs);
  }

  /** 得分轉入投幣分數的滾分。 */
  _rollTransfer(amount, startCredit) {
    this.ui.lock = true;
    let moved = 0;
    const stepMs = Math.max(24, Math.min(60, 900 / amount));
    const inc = Math.max(1, Math.ceil(amount / (900 / stepMs)));
    const tick = () => {
      moved = Math.min(amount, moved + inc);
      this.cab.led.credit.set(startCredit + moved);
      this.cab.led.win.set(amount - moved > 0 ? amount - moved : '');
      if (moved % 2 === 0) this.audio.tick(0.9);
      if (moved < amount) this._later(tick, stepMs);
      else { this.ui.lock = false; this.ui.displayCredit = null; this.ui.displayWin = null; this.render(); }
    };
    this._later(tick, stepMs);
  }

  _flyCoin(done) {
    const layer = this.cab.flyLayer;
    const g = document.createElementNS(SVGNS, 'g');
    g.innerHTML = `<ellipse rx="13" ry="13" fill="url(#gCoin)" stroke="#6f7473" stroke-width="1.4"/><ellipse rx="9.5" ry="9.5" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1"/><text y="4" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="11" fill="#5a5f5e">10</text>`;
    layer.appendChild(g);
    const x0 = 430, y0 = 1066, x1 = 520, y1 = 40;
    const t0 = performance.now(), dur = 250;
    const step = (now) => {
      const t = clamp01((now - t0) / dur);
      const e = 1 - (1 - t) ** 2;
      const x = x0 + (x1 - x0) * e;
      const y = y0 + (y1 - y0) * e - Math.sin(t * Math.PI) * 28;
      const sx = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4 * 0.85;       // 側立進入投幣孔
      g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(t * 40).toFixed(1)}) scale(${sx.toFixed(2)} 1)`);
      if (t < 1) requestAnimationFrame(step); else finish();
    };
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      g.remove();
      this.cab.slotLight.style.opacity = '1';
      this.cab.slotLamp.style.opacity = '1';
      setTimeout(() => { this.cab.slotLight.style.opacity = '0'; this.cab.slotLamp.style.opacity = '0'; }, 220);
      done && done();
    };
    requestAnimationFrame(step);
    setTimeout(finish, dur + 120); // 背景分頁 rAF 會暫停：保底計時器，確保分數一定更新
  }

  _dropCoins(count) {
    const layer = this.cab.trayCoins;
    const n = Math.min(count, 18);
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      const g = document.createElementNS(SVGNS, 'g');
      g.innerHTML = `<ellipse rx="13" ry="7.5" fill="url(#gCoin)" stroke="#5f6463" stroke-width="1.2"/><ellipse rx="9" ry="4.6" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".9"/>`;
      const x = 128 + Math.random() * 344;
      const yEnd = 1112 + Math.random() * 20;
      const delay = i * (105 + Math.random() * 20); // 出幣馬達節奏規律
      g.setAttribute('transform', `translate(${x} 1070)`);
      g.style.opacity = '0';
      layer.appendChild(g);
      this.ui.trayCoins.push(g);
      const start = t0 + delay;
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        g.style.opacity = '1';
        g.setAttribute('transform', `translate(${x.toFixed(1)} ${yEnd.toFixed(1)})`);
      };
      setTimeout(settle, delay + 700);
      const step = (now) => {
        if (settled) return;
        if (now < start) { requestAnimationFrame(step); return; }
        const t = clamp01((now - start) / 520);
        // 彈跳
        const bounce = (u) => {
          if (u < 1 / 2.75) return 7.5625 * u * u;
          if (u < 2 / 2.75) { u -= 1.5 / 2.75; return 7.5625 * u * u + 0.75; }
          if (u < 2.5 / 2.75) { u -= 2.25 / 2.75; return 7.5625 * u * u + 0.9375; }
          u -= 2.625 / 2.75; return 7.5625 * u * u + 0.984375;
        };
        const y = 1070 + (yEnd - 1070) * bounce(t);
        g.style.opacity = '1';
        g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((1 - t) * 90 * (i % 2 ? 1 : -1)).toFixed(0)})`);
        if (t < 1) requestAnimationFrame(step); else settle();
      };
      requestAnimationFrame(step);
    }
    // 盤中硬幣上限
    while (this.ui.trayCoins.length > 36) this.ui.trayCoins.shift().remove();
  }

  /** 測試用：停掉所有計時器。 */
  destroy() {
    clearInterval(this._dailyTimer);
    clearInterval(this._attractTimer);
    this.ui.timers.forEach(clearTimeout);
  }
}
