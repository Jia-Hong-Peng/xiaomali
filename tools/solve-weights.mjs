// 求各燈位停燈權重（SIMULATED）：使每一門理論回收率相同且約等於目標值。
// 用法：node tools/solve-weights.mjs [目標RTP=0.90]
import { LAMPS, SYMBOL_IDS, ONCE_MORE, WEIGHT_TOTAL } from '../js/config.js';
import { exactRtp } from '../js/engine.js';

const R = Number(process.argv[2] ?? 0.9);
// 每個「圖案 + 倍數」群組分配固定比例的回收；同群組有多個燈位時平分。
const groupCount = (sym, mult) => LAMPS.filter((l) => l.symbol === sym && l.mult === mult).length;
const share = (sym, mult) => {
  if (sym === 'apple') return 1 / LAMPS.filter((l) => l.symbol === 'apple').length;
  if (sym === 'bar') return { 25: 0.5, 50: 0.3, 100: 0.2 }[mult];
  return (mult === 2 ? 0.25 : 0.75) / groupCount(sym, mult); // 小倍率群組 25%、大倍率群組 75%
};
const omIdx = LAMPS.map((l, i) => (l.symbol === ONCE_MORE ? i : -1)).filter((i) => i >= 0);

function build(q) {
  // 先依「回收分配 / 倍率」建立比例，再逐門等化，最後把非 ONCE MORE 權重總和固定為 1-q
  let w = LAMPS.map((l) => (l.symbol === ONCE_MORE ? q / omIdx.length : share(l.symbol, l.mult) / l.mult));
  for (let it = 0; it < 14; it++) {
    const pw = w.reduce((a, x, i) => a + (LAMPS[i].symbol === ONCE_MORE ? 0 : x), 0);
    w = w.map((x, i) => (LAMPS[i].symbol === ONCE_MORE ? q / omIdx.length : (x * (1 - q)) / pw));
    const rtp = exactRtp(w);
    const mean = SYMBOL_IDS.reduce((a, s) => a + rtp[s], 0) / SYMBOL_IDS.length;
    w = w.map((x, i) => (LAMPS[i].symbol === ONCE_MORE ? x : x * (mean / rtp[LAMPS[i].symbol])));
  }
  const pw = w.reduce((a, x, i) => a + (LAMPS[i].symbol === ONCE_MORE ? 0 : x), 0);
  w = w.map((x, i) => (LAMPS[i].symbol === ONCE_MORE ? q / omIdx.length : (x * (1 - q)) / pw));
  const rtp = exactRtp(w);
  return { w, mean: SYMBOL_IDS.reduce((a, s) => a + rtp[s], 0) / SYMBOL_IDS.length };
}

let lo = 0.001, hi = 0.6;
for (let i = 0; i < 24; i++) {
  const mid = (lo + hi) / 2;
  if (build(mid).mean < R) lo = mid; else hi = mid;
}
const { w } = build((lo + hi) / 2);
const iw = w.map((x) => Math.max(1, Math.round(x * WEIGHT_TOTAL)));
iw[omIdx[0]] += WEIGHT_TOTAL - iw.reduce((a, b) => a + b, 0);
const rtp = exactRtp(iw);
console.log('weights =', JSON.stringify(iw));
console.log('ONCE MORE 機率 =', ((omIdx.reduce((a, i) => a + iw[i], 0) / WEIGHT_TOTAL) * 100).toFixed(2) + '%');
for (const s of SYMBOL_IDS) console.log(s.padEnd(11), (rtp[s] * 100).toFixed(2) + '%');
console.log(iw.map((x, i) => `${i}:${LAMPS[i].symbol}${LAMPS[i].mult || ''}=${((x / WEIGHT_TOTAL) * 100).toFixed(2)}%`).join('  '));
