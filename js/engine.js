// 遊戲規則與結算引擎：純邏輯、無 DOM、無計時器，可在 Node 與瀏覽器中測試。
import {
  COIN_VALUE, START_POCKET, MAX_BET_PER_SYMBOL, MAX_CREDIT, BET_STEP, TIMEZONE, DOUBLE_UP,
  SYMBOLS, SYMBOL_BY_ID, SYMBOL_IDS, LAMPS, NUM_LAMPS, WEIGHT_TOTAL, SAVE_VERSION,
  ONCE_MORE, OM_LAMPS, PRIZE_LAMPS, BONUS_MAX_LAMPS,
} from './config.js';

/** 台灣日期字串 YYYY-MM-DD（Asia/Taipei，不受使用者裝置時區影響）。 */
export function taipeiDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** 以 crypto.getRandomValues 做無偏差（拒絕取樣）的 [0, n) 整數。 */
export function cryptoRandomInt(n) {
  if (!Number.isInteger(n) || n <= 0 || n > 0xffffffff) throw new RangeError('n out of range');
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / n) * n;
    do { c.getRandomValues(buf); } while (buf[0] >= limit);
    return buf[0] % n;
  }
  return Math.floor(Math.random() * n); // 無 crypto 時的後備（文件已註明）
}

export function emptyBets() {
  return Object.fromEntries(SYMBOL_IDS.map((id) => [id, 0]));
}

export function defaultState(today = taipeiDateKey()) {
  return {
    v: SAVE_VERSION,
    pocket: START_POCKET,
    credit: 0,            // 投幣分數
    win: 0,               // 得分（尚未轉入投幣分數；可猜大小）
    bets: emptyBets(),
    phase: 'idle',        // idle | spinning | win
    pending: null,        // spinning 時的預定結果
    lamp: 0,
    lastAllowanceDate: today,
    soundOn: true,
  };
}

export function totalBet(bets) {
  return SYMBOL_IDS.reduce((a, id) => a + bets[id], 0);
}

/** 依權重（可指定子集合）抽一個燈位。 */
function drawLamp(randomInt, candidates, weights = LAMPS.map((l) => l.weight)) {
  const total = candidates.reduce((a, i) => a + weights[i], 0);
  let r = randomInt(total);
  for (const i of candidates) {
    if (r < weights[i]) return i;
    r -= weights[i];
  }
  return candidates[candidates.length - 1]; // 不會到這裡
}

/** 抽出一局的停燈結果：主燈位；若為 ONCE MORE，再隨機贈送 1–3 個不重複的燈。 */
export function drawSpin(randomInt = cryptoRandomInt) {
  const all = LAMPS.map((_, i) => i);
  const target = drawLamp(randomInt, all);
  const bonus = [];
  if (LAMPS[target].symbol === ONCE_MORE) {
    const k = randomInt(BONUS_MAX_LAMPS) + 1;
    let pool = PRIZE_LAMPS.slice();
    for (let n = 0; n < k; n++) {
      const pick = drawLamp(randomInt, pool);
      bonus.push(pick);
      pool = pool.filter((i) => i !== pick);
    }
  }
  return { target, bonus };
}

/** 依押注評估中獎：主燈位 + 贈燈，各自「押分 × 倍數」。 */
export function evaluate(bets, target, bonus = []) {
  const hits = [];
  for (const lamp of [target, ...bonus]) {
    const { symbol, mult } = LAMPS[lamp];
    if (symbol !== ONCE_MORE && bets[symbol] > 0) {
      hits.push({ lamp, symbol, mult, amount: bets[symbol] * mult });
    }
  }
  return { hits, payout: hits.reduce((a, h) => a + h.amount, 0) };
}

/** 猜大小結果：1–13；7 兩邊都不算。 */
export function doubleUpResult(n, side) {
  const { small, large } = DOUBLE_UP;
  if (side === 'small') return n >= small[0] && n <= small[1];
  if (side === 'large') return n >= large[0] && n <= large[1];
  return false;
}

const fail = (reason) => ({ ok: false, reason });

export class Machine {
  constructor(state, { randomInt = cryptoRandomInt } = {}) {
    this.state = state;
    this.randomInt = randomInt;
  }

  snapshot() { return JSON.parse(JSON.stringify(this.state)); }

  get totalBet() { return totalBet(this.state.bets); }

  /** 台灣時間每日 00:00 補發：口袋現金補到 NT$100（不累加；機台內分數不動）。 */
  applyDailyAllowance(now = new Date()) {
    const today = taipeiDateKey(now);
    if (this.state.lastAllowanceDate === today) return { ok: true, granted: 0, changed: false };
    const before = this.state.pocket;
    this.state.pocket = Math.max(this.state.pocket, START_POCKET);
    this.state.lastAllowanceDate = today;
    return { ok: true, granted: this.state.pocket - before, changed: true };
  }

  /** 得分轉入投幣分數（文件：按開始鍵得分繼續遊戲）。冪等。 */
  collect() {
    const s = this.state;
    if (s.phase !== 'win') return fail('nothing-to-collect');
    const amount = Math.min(s.win, MAX_CREDIT - s.credit);
    s.credit += amount;
    s.win = 0; // 超出顯示上限的部分捨棄
    s.phase = 'idle';
    return { ok: true, amount };
  }

  insertCoin() {
    const s = this.state;
    if (s.phase === 'spinning') return fail('busy');
    if (s.pocket < COIN_VALUE) return fail('insufficient-pocket');
    if (s.phase === 'win') this.collect();
    if (s.credit + COIN_VALUE > MAX_CREDIT) return fail('credit-full');
    s.pocket -= COIN_VALUE;
    s.credit += COIN_VALUE;
    return { ok: true };
  }

  addBet(symbolId) {
    const s = this.state;
    if (s.phase === 'spinning') return fail('busy');
    if (!SYMBOL_BY_ID[symbolId]) return fail('unknown-symbol');
    if (s.phase === 'win') this.collect();
    if (s.credit < BET_STEP) return fail('insufficient-credit');
    if (s.bets[symbolId] + BET_STEP > MAX_BET_PER_SYMBOL) return fail('max-bet');
    s.credit -= BET_STEP;
    s.bets[symbolId] += BET_STEP;
    return { ok: true, count: s.bets[symbolId] };
  }

  /** 按下 START：僅在 idle 且有押注時抽結果並鎖定。得分狀態下的 START 由 UI 呼叫 collect()。 */
  start() {
    const s = this.state;
    if (s.phase !== 'idle') return fail('busy');          // 防止重複 START
    if (this.totalBet <= 0) return fail('no-bet');
    const { target, bonus } = drawSpin(this.randomInt);
    const { hits, payout } = evaluate(s.bets, target, bonus);
    const stake = this.totalBet;
    s.phase = 'spinning';
    s.pending = { target, bonus, hits, payout, stake, bets: { ...s.bets } };
    return { ok: true, from: s.lamp, target, bonus, hits, payout, stake };
  }

  /** 結算（冪等）：只有在 spinning 且有 pending 時才會派彩一次。 */
  settle() {
    const s = this.state;
    if (s.phase !== 'spinning' || !s.pending) return fail('nothing-to-settle');
    const { target, bonus, hits, payout } = s.pending;
    s.lamp = bonus.length ? bonus[bonus.length - 1] : target;
    s.win = Math.min(payout, MAX_CREDIT);
    s.bets = emptyBets();
    s.pending = null;
    s.phase = s.win > 0 ? 'win' : 'idle';
    return { ok: true, target, bonus, hits, payout: s.win };
  }

  /** 猜大小：只有得分狀態可玩。猜對得分 ×2，猜錯得分歸零。 */
  guess(side) {
    const s = this.state;
    if (s.phase !== 'win' || s.win <= 0) return fail('not-in-win');
    if (side !== 'small' && side !== 'large') return fail('bad-side');
    const n = this.randomInt(DOUBLE_UP.max - DOUBLE_UP.min + 1) + DOUBLE_UP.min;
    const won = doubleUpResult(n, side);
    if (won) {
      s.win = Math.min(s.win * DOUBLE_UP.factor, MAX_CREDIT);
    } else {
      s.win = 0;
      s.phase = 'idle';
    }
    return { ok: true, n, won, win: s.win };
  }

  /** 退幣：機台分數、未開始的押注與得分全數轉回口袋。 */
  cashOut() {
    const s = this.state;
    if (s.phase === 'spinning') return fail('busy');
    const amount = s.credit + this.totalBet + s.win;
    if (amount <= 0) return fail('nothing-to-cash');
    s.pocket += amount;
    s.credit = 0;
    s.win = 0;
    s.bets = emptyBets();
    s.phase = 'idle';
    return { ok: true, amount };
  }

  setSound(on) { this.state.soundOn = !!on; }
}

/**
 * 精確的理論回收率（押某一門 1 分的期望派彩）。對 24 燈位逐一列舉，
 * ONCE MORE 贈燈以不重複抽樣完整列舉（k = 1..3 均等）。不含猜大小。
 */
export function exactRtp(weights = LAMPS.map((l) => l.weight)) {
  const total = weights.reduce((a, b) => a + b, 0);
  const out = {};
  for (const sym of SYMBOL_IDS) {
    const val = (i) => (LAMPS[i].symbol === sym ? LAMPS[i].mult : 0);
    // 不重複抽樣下，抽 k 個的期望值
    const bonusExpect = (pool, k) => {
      if (k === 0 || pool.length === 0) return 0;
      const w = pool.reduce((a, i) => a + weights[i], 0);
      let e = 0;
      for (const i of pool) {
        e += (weights[i] / w) * (val(i) + bonusExpect(pool.filter((j) => j !== i), k - 1));
      }
      return e;
    };
    let e = 0;
    for (let i = 0; i < NUM_LAMPS; i++) {
      const p = weights[i] / total;
      if (LAMPS[i].symbol === ONCE_MORE) {
        let s = 0;
        for (let k = 1; k <= BONUS_MAX_LAMPS; k++) s += bonusExpect(PRIZE_LAMPS, k) / BONUS_MAX_LAMPS;
        e += p * s;
      } else {
        e += p * val(i);
      }
    }
    out[sym] = e;
  }
  return out;
}

/** 猜大小的期望回收（對目前得分）：6/13 × 2。 */
export function doubleUpRtp() {
  const { small, factor, min, max } = DOUBLE_UP;
  return ((small[1] - small[0] + 1) / (max - min + 1)) * factor;
}

export { SYMBOLS, SYMBOL_BY_ID, OM_LAMPS, WEIGHT_TOTAL };
