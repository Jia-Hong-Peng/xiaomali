// 存檔與驗證。任何損毀、竄改或格式不符的資料都會安全地還原為預設狀態。
import {
  SAVE_KEY, SAVE_VERSION, MAX_CREDIT, MAX_BET_PER_SYMBOL, NUM_LAMPS, SYMBOL_IDS, LAMPS, ONCE_MORE,
  BONUS_MAX_LAMPS,
} from './config.js';
import { defaultState, emptyBets, evaluate, totalBet } from './engine.js';

const isInt = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;
const validBets = (b) => b && typeof b === 'object' && SYMBOL_IDS.every((id) => isInt(b[id], 0, MAX_BET_PER_SYMBOL));
const pickBets = (b) => Object.fromEntries(SYMBOL_IDS.map((id) => [id, b[id]]));

/** 驗證並回傳乾淨狀態；無效回傳 null。 */
export function validateState(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (raw.v !== SAVE_VERSION) return null;
  if (!isInt(raw.pocket, 0, 10_000_000)) return null;
  if (!isInt(raw.credit, 0, MAX_CREDIT)) return null;
  if (!isInt(raw.win, 0, MAX_CREDIT)) return null;
  if (!isInt(raw.lamp, 0, NUM_LAMPS - 1)) return null;
  if (typeof raw.lastAllowanceDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.lastAllowanceDate)) return null;
  if (typeof raw.soundOn !== 'boolean') return null;
  if (!['idle', 'spinning', 'win'].includes(raw.phase)) return null;
  if (!validBets(raw.bets)) return null;
  const bets = pickBets(raw.bets);

  if (raw.phase === 'win' && raw.win <= 0) return null;
  if (raw.phase !== 'win' && raw.win !== 0) return null;

  let pending = null;
  if (raw.phase === 'spinning') {
    const p = raw.pending;
    if (!p || typeof p !== 'object') return null;
    if (!isInt(p.target, 0, NUM_LAMPS - 1)) return null;
    if (!Array.isArray(p.bonus) || p.bonus.length > BONUS_MAX_LAMPS) return null;
    if (!p.bonus.every((i) => isInt(i, 0, NUM_LAMPS - 1) && LAMPS[i].symbol !== ONCE_MORE)) return null;
    if (new Set(p.bonus).size !== p.bonus.length) return null;
    const targetIsOm = LAMPS[p.target].symbol === ONCE_MORE;
    if (targetIsOm !== (p.bonus.length > 0)) return null; // 只有 ONCE MORE 才會有贈燈
    if (!validBets(p.bets)) return null;
    const pb = pickBets(p.bets);
    const ev = evaluate(pb, p.target, p.bonus);          // 由預定燈位重新計算，不信任存檔中的派彩
    if (p.payout !== ev.payout) return null;
    pending = { target: p.target, bonus: [...p.bonus], hits: ev.hits, payout: ev.payout, stake: totalBet(pb), bets: pb };
  } else if (raw.pending != null) {
    return null;
  }
  return {
    v: SAVE_VERSION, pocket: raw.pocket, credit: raw.credit, win: raw.win, bets, phase: raw.phase, pending,
    lamp: raw.lamp, lastAllowanceDate: raw.lastAllowanceDate, soundOn: raw.soundOn,
  };
}

/** @returns {{state:object, recovered:boolean, fresh:boolean}} */
export function loadState(storage, today) {
  let text = null;
  try { text = storage ? storage.getItem(SAVE_KEY) : null; } catch { text = null; }
  if (text == null) return { state: defaultState(today), recovered: false, fresh: true };
  try {
    const clean = validateState(JSON.parse(text));
    if (clean) return { state: clean, recovered: false, fresh: false };
  } catch { /* 往下還原 */ }
  return { state: defaultState(today), recovered: true, fresh: false };
}

export function saveState(storage, state) {
  try { storage.setItem(SAVE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}

export { emptyBets };
