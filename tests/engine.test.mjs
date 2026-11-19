// node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Machine, defaultState, taipeiDateKey, drawSpin, evaluate, emptyBets, exactRtp, doubleUpRtp, doubleUpResult,
  totalBet,
} from '../js/engine.js';
import { loadState, saveState, validateState } from '../js/storage.js';
import { buildSchedule, runSchedule, scheduleDuration } from '../js/anim.js';
import {
  LAMPS, NUM_LAMPS, MAX_BET_PER_SYMBOL, MIN_BET_PER_SYMBOL, SAVE_KEY, WEIGHT_TOTAL, SYMBOLS, OM_LAMPS,
  PRIZE_LAMPS, DOUBLE_UP, ONCE_MORE,
} from '../js/config.js';

const TODAY = '2026-11-19';
const fresh = (rand) => new Machine(defaultState(TODAY), rand ? { randomInt: rand } : {});
const memStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _m: m };
};
/** 依序回傳指定數值的假亂數（並檢查範圍）。 */
const seq = (...vals) => {
  let i = 0;
  return (n) => { const v = vals[i++]; assert.ok(v !== undefined, 'rng exhausted'); assert.ok(v >= 0 && v < n, `rng ${v} not in [0,${n})`); return v; };
};
/** 讓 drawSpin 第一個亂數恰好選中某燈位。 */
const rollFor = (lamp) => LAMPS.slice(0, lamp).reduce((a, l) => a + l.weight, 0);
/** 贈燈抽樣：在 pool 內選中 pick 所需的亂數。 */
const bonusRoll = (pool, pick) => { let r = 0; for (const i of pool) { if (i === pick) return r; r += LAMPS[i].weight; } throw new Error('pick not in pool'); };
const bets = (o) => ({ ...emptyBets(), ...o });
const APPLE = 1, ORANGE_X2 = 11, BAR_X100 = 23, OM0 = 0;

test('盤面：24 燈、四角為 ONCE MORE、其餘 20 格含全部八門與文件載明的倍數', () => {
  assert.equal(LAMPS.length, 24);
  assert.deepEqual(OM_LAMPS, [0, 6, 12, 18]);
  assert.equal(PRIZE_LAMPS.length, 20);
  const per = Object.fromEntries(SYMBOLS.map((s) => [s.id, LAMPS.filter((l) => l.symbol === s.id).map((l) => l.mult).sort((a, b) => a - b)]));
  assert.deepEqual(per.apple, [5, 5, 5, 5, 5]);
  assert.deepEqual(per.orange, [2, 10]);
  assert.deepEqual(per.papaya, [2, 15]);
  assert.deepEqual(per.bell, [2, 20]);
  assert.deepEqual(per.watermelon, [2, 20]);
  assert.deepEqual(per.star, [2, 30]);
  assert.deepEqual(per.seven, [2, 40]);
  assert.deepEqual(per.bar, [25, 50, 100]);
  // 每個燈位的倍數都在該圖案文件所列倍數之內
  for (const l of LAMPS) if (l.symbol !== ONCE_MORE) assert.ok(SYMBOLS.find((s) => s.id === l.symbol).mults.includes(l.mult));
  assert.equal(LAMPS.reduce((a, l) => a + l.weight, 0), WEIGHT_TOTAL);
});

test('1. 初始口袋現金為 NT$100，機台分數為 0', () => {
  const m = fresh();
  assert.equal(m.state.pocket, 100);
  assert.equal(m.state.credit, 0);
  assert.equal(m.state.win, 0);
});

test('2/3. 投幣：口袋剛好 -10、機台 +10', () => {
  const m = fresh();
  assert.equal(m.insertCoin().ok, true);
  assert.equal(m.state.pocket, 90);
  assert.equal(m.state.credit, 10);
  m.insertCoin();
  assert.equal(m.state.pocket, 80);
  assert.equal(m.state.credit, 20);
});

test('4. 口袋不足時投幣被拒絕且金額不變', () => {
  const m = fresh();
  m.state.pocket = 9;
  assert.deepEqual(m.insertCoin(), { ok: false, reason: 'insufficient-pocket' });
  assert.equal(m.state.pocket, 9);
  assert.equal(m.state.credit, 0);
});

test('5. 押注不得超過機台分數、單門上限（50 分），也不能押不存在的圖案', () => {
  const m = fresh();
  assert.equal(m.addBet('apple').reason, 'insufficient-credit');
  for (let i = 0; i < 6; i++) m.insertCoin(); // credit 60
  for (let i = 0; i < MAX_BET_PER_SYMBOL; i++) assert.equal(m.addBet('apple').ok, true);
  assert.equal(m.state.bets.apple, 50);
  assert.equal(m.state.credit, 10);
  assert.equal(m.addBet('apple').reason, 'max-bet');
  assert.equal(m.addBet('nope').reason, 'unknown-symbol');
  for (let i = 0; i < 10; i++) assert.equal(m.addBet('bar').ok, true);
  assert.equal(m.state.credit, 0);
  assert.equal(m.addBet('bar').reason, 'insufficient-credit');
  assert.equal(m.state.credit + totalBet(m.state.bets), 60); // 分數守恆
  assert.equal(MIN_BET_PER_SYMBOL, 1);
});

test('START 需要押注；有押注才能開始', () => {
  const m = fresh();
  m.insertCoin();
  assert.equal(m.start().reason, 'no-bet');
  m.addBet('apple');
  assert.equal(m.start().ok, true);
});

test('6. 跑燈中無法再次 START / 投幣 / 押注 / 退幣 / 猜大小 / 轉分', () => {
  const m = fresh();
  m.insertCoin(); m.addBet('apple');
  assert.equal(m.start().ok, true);
  const snap = JSON.stringify(m.state);
  assert.equal(m.start().reason, 'busy');
  assert.equal(m.insertCoin().reason, 'busy');
  assert.equal(m.addBet('apple').reason, 'busy');
  assert.equal(m.cashOut().reason, 'busy');
  assert.equal(m.guess('small').ok, false);
  assert.equal(m.collect().ok, false);
  assert.equal(JSON.stringify(m.state), snap);
});

test('7. 跑燈排程一定停在引擎預先決定的燈位（全部起點×終點）', () => {
  for (let from = 0; from < NUM_LAMPS; from++) {
    for (let to = 0; to < NUM_LAMPS; to++) {
      const steps = buildSchedule(from, to);
      assert.equal(steps[steps.length - 1].pos, to, `from ${from} to ${to}`);
      assert.ok(steps.length >= NUM_LAMPS * 2);
      let p = from;
      for (const s of steps) { assert.equal(s.pos, (p + 1) % NUM_LAMPS); p = s.pos; }
    }
  }
});

test('7b. 加速→等速→減速：延遲先降後升，且最後一步最慢', () => {
  const steps = buildSchedule(3, 17);
  const d = steps.map((s) => s.delay);
  assert.ok(d[0] > d[8], '起步比巡航慢');
  assert.equal(Math.min(...d), 48);
  assert.ok(d[d.length - 1] >= d[d.length - 2]);
  assert.ok(d[d.length - 1] > 300);
  const total = scheduleDuration(steps);
  assert.ok(total > 3000 && total < 12000, `duration ${total}`);
});

test('7c. 動畫控制器以假計時器走完排程並停在目標，只呼叫 onDone 一次', () => {
  const queue = [];
  const timer = { set: (fn) => { queue.push(fn); return queue.length; }, clear: () => {} };
  const steps = buildSchedule(5, 11);
  let last = null; let done = 0; let stepCount = 0;
  runSchedule(steps, { onStep: (p) => { last = p; stepCount++; }, onDone: () => { done++; }, timer });
  while (queue.length) queue.shift()();
  assert.equal(last, 11);
  assert.equal(done, 1);
  assert.equal(stepCount, steps.length);
});

test('7d. finishNow 直接跳到終點，且之後計時器不再觸發', () => {
  const queue = [];
  const timer = { set: (fn) => { queue.push(fn); return 1; }, clear: () => {} };
  const steps = buildSchedule(0, 9);
  let last = null; let done = 0;
  const h = runSchedule(steps, { onStep: (p) => { last = p; }, onDone: () => { done++; }, timer });
  h.finishNow(); h.finishNow();
  queue.splice(0).forEach((f) => f());
  assert.equal(last, 9);
  assert.equal(done, 1);
});

test('7e. 引擎預定的燈位 = 動畫終點（整合）：隨機 200 局', () => {
  for (let n = 0; n < 200; n++) {
    const m = fresh();
    m.insertCoin(); m.addBet('apple');
    const r = m.start();
    const steps = buildSchedule(r.from, r.target);
    assert.equal(steps[steps.length - 1].pos, r.target);
    assert.equal(m.state.pending.target, r.target);
  }
});

test('8. 主燈位中獎：押分 × 倍數，且只派彩一次', () => {
  const m = fresh(seq(rollFor(APPLE)));
  m.insertCoin();
  for (let i = 0; i < 3; i++) m.addBet('apple');
  const r = m.start();
  assert.equal(r.target, APPLE);
  assert.equal(r.payout, 15);              // 3 × 5
  assert.equal(m.state.credit, 7);
  const s1 = m.settle();
  assert.equal(s1.ok, true);
  assert.equal(s1.payout, 15);
  assert.equal(m.state.phase, 'win');
  assert.equal(m.state.win, 15);
  assert.equal(m.state.credit, 7);        // 得分尚未轉入
  assert.equal(m.settle().ok, false);      // 重複結算被拒
  assert.equal(m.state.win, 15);
  assert.equal(m.collect().amount, 15);    // 得分轉入投幣分數
  assert.equal(m.state.credit, 22);
  assert.equal(m.collect().ok, false);     // 不能重複轉入
  assert.equal(m.state.credit, 22);
  assert.equal(m.state.phase, 'idle');
  assert.equal(totalBet(m.state.bets), 0);
  assert.equal(m.state.lamp, APPLE);
});

test('8a. 小倍率與大倍率燈位：同一圖案依停燈位置給不同倍數', () => {
  const small = fresh(seq(rollFor(ORANGE_X2)));
  small.insertCoin(); for (let i = 0; i < 5; i++) small.addBet('orange');
  assert.equal(small.start().payout, 10);   // 5 × 2
  const big = fresh(seq(rollFor(2)));       // 橘子 ×10
  big.insertCoin(); for (let i = 0; i < 5; i++) big.addBet('orange');
  assert.equal(big.start().payout, 50);     // 5 × 10
  const bar = fresh(seq(rollFor(BAR_X100)));
  bar.insertCoin(); bar.addBet('bar'); bar.addBet('bar');
  assert.equal(bar.start().payout, 200);    // 2 × 100
});

test('8b. 押在別門時不中獎，直接回到 idle', () => {
  const m = fresh(seq(rollFor(APPLE)));
  m.insertCoin(); m.addBet('bar'); m.addBet('bell');
  const r = m.start();
  assert.equal(r.payout, 0);
  assert.equal(m.settle().payout, 0);
  assert.equal(m.state.phase, 'idle');
  assert.equal(m.state.credit, 8);
  assert.equal(m.state.win, 0);
});

test('8c. ONCE MORE：隨機贈燈 1–3 個，押中贈燈圖案即中獎（各自結算）', () => {
  // 主燈 = ONCE MORE(0)，贈 2 個燈：先蘋果(1)，再 BAR×100(23)
  const pool0 = PRIZE_LAMPS;
  const pool1 = pool0.filter((i) => i !== APPLE);
  const m = fresh(seq(rollFor(OM0), 1 /* k=2 */, bonusRoll(pool0, APPLE), bonusRoll(pool1, BAR_X100)));
  m.insertCoin();
  m.addBet('apple'); m.addBet('apple'); m.addBet('bar');
  const r = m.start();
  assert.equal(r.target, OM0);
  assert.deepEqual(r.bonus, [APPLE, BAR_X100]);
  assert.equal(r.payout, 2 * 5 + 1 * 100);
  assert.equal(r.hits.length, 2);
  assert.equal(m.settle().payout, 110);
  assert.equal(m.state.win, 110);
});

test('8d. 贈燈不重複、數量 1–3，且只在 ONCE MORE 時出現（統計 20000 次）', () => {
  const seen = new Set();
  let omCount = 0;
  for (let n = 0; n < 20000; n++) {
    const { target, bonus } = drawSpin();
    if (LAMPS[target].symbol === ONCE_MORE) {
      omCount++;
      assert.ok(bonus.length >= 1 && bonus.length <= 3);
      assert.equal(new Set(bonus).size, bonus.length);
      for (const b of bonus) assert.notEqual(LAMPS[b].symbol, ONCE_MORE);
      seen.add(bonus.length);
    } else {
      assert.equal(bonus.length, 0);
    }
  }
  assert.deepEqual([...seen].sort(), [1, 2, 3]);
  assert.ok(omCount > 1000 && omCount < 3000); // 約 9.5%
});

test('evaluate：贈燈與主燈各自累計；ONCE MORE 本身不派彩', () => {
  const b = bets({ apple: 4, bar: 2, orange: 1 });
  assert.equal(evaluate(b, OM0, []).payout, 0);
  assert.equal(evaluate(b, APPLE, []).payout, 20);
  assert.equal(evaluate(b, OM0, [BAR_X100, ORANGE_X2]).payout, 200 + 2);
});

test('9. 猜大小：猜對得分 ×2、猜錯得分歸零，7 兩邊皆輸', () => {
  const setup = (n) => {
    const m = fresh(seq(rollFor(APPLE), n - 1));
    m.insertCoin(); m.addBet('apple'); m.addBet('apple');
    m.start(); m.settle(); // win = 10
    assert.equal(m.state.win, 10);
    return m;
  };
  let m = setup(3);  // 3 屬小
  let r = m.guess('small');
  assert.deepEqual([r.n, r.won, r.win], [3, true, 20]);
  assert.equal(m.state.phase, 'win');
  m = setup(3);
  r = m.guess('large');
  assert.deepEqual([r.n, r.won, r.win], [3, false, 0]);
  assert.equal(m.state.phase, 'idle');
  assert.equal(m.guess('large').ok, false);             // 沒有得分就不能再猜
  m = setup(13);
  assert.equal(m.guess('large').won, true);
  m = setup(7);
  assert.equal(m.guess('small').won, false);
  m = setup(7);
  assert.equal(m.guess('large').won, false);
  m = setup(6); assert.equal(m.guess('small').won, true);
  m = setup(8); assert.equal(m.guess('large').won, true);
  m = setup(1); assert.equal(m.guess('bad').ok, false);
  assert.equal(doubleUpResult(6, 'small'), true);
  assert.equal(doubleUpResult(7, 'small'), false);
  assert.equal(doubleUpResult(8, 'large'), true);
});

test('9b. 猜大小可連續進行；每次猜對都 ×2，任何時候猜錯即歸零', () => {
  const m = fresh(seq(rollFor(APPLE), 0, 1, 2)); // n = 1, 2, 3
  m.insertCoin(); m.addBet('apple');
  m.start(); m.settle();                        // win 5
  assert.equal(m.guess('small').win, 10);
  assert.equal(m.guess('small').win, 20);
  assert.equal(m.guess('small').win, 40);
  assert.equal(m.state.credit, 9);
});

test('10. 退幣：機台分數、未開始押注、得分全數轉回口袋，不能重複', () => {
  const m = fresh();
  m.insertCoin(); m.insertCoin();          // pocket 80, credit 20
  m.addBet('apple');                       // credit 19, bet 1
  const r = m.cashOut();
  assert.equal(r.ok, true);
  assert.equal(r.amount, 20);
  assert.equal(m.state.pocket, 100);
  assert.equal(m.state.credit, 0);
  assert.equal(totalBet(m.state.bets), 0);
  assert.equal(m.cashOut().reason, 'nothing-to-cash');
  assert.equal(m.state.pocket, 100);
});

test('10b. 得分狀態下退幣：得分也一併退出，且只退一次', () => {
  const m = fresh(seq(rollFor(APPLE)));
  m.insertCoin(); for (let i = 0; i < 4; i++) m.addBet('apple'); // credit 6, bet 4
  m.start(); m.settle();                    // win 20
  assert.equal(m.state.win, 20);
  const r = m.cashOut();
  assert.equal(r.amount, 26);
  assert.equal(m.state.pocket, 90 + 26);
  assert.equal(m.state.win, 0);
  assert.equal(m.state.phase, 'idle');
  assert.equal(m.cashOut().ok, false);
  assert.equal(m.collect().ok, false);
});

test('得分狀態下投幣/押注會先自動轉分，金額不會遺失或重複', () => {
  const m = fresh(seq(rollFor(APPLE)));
  m.insertCoin(); m.addBet('apple'); m.start(); m.settle(); // win 5, credit 9
  assert.equal(m.state.phase, 'win');
  assert.equal(m.addBet('bar').ok, true);                   // 自動 collect → credit 14 → 押 1
  assert.equal(m.state.win, 0);
  assert.equal(m.state.credit, 13);
  assert.equal(m.state.bets.bar, 1);
});

test('金額守恆：任意操作序列中，口袋+機台+押注+得分 + 莊家收入 - 累計派彩 恆為 100', () => {
  const m = fresh();
  let won = 0; let house = 0;
  const moves = ['coin', 'bet', 'bet', 'start', 'settle', 'guess', 'collect', 'cash', 'coin', 'coin', 'bet', 'start', 'settle', 'cash'];
  for (let round = 0; round < 3000; round++) {
    const mv = moves[round % moves.length];
    if (mv === 'coin') m.insertCoin();
    if (mv === 'bet') m.addBet(['apple', 'orange', 'bar', 'star', 'bell'][round % 5]);
    if (mv === 'start') m.start();
    if (mv === 'settle') { const stake = m.state.pending ? m.state.pending.stake : 0; const r = m.settle(); if (r.ok) { won += r.payout; house += stake; } }
    if (mv === 'guess') { const before = m.state.win; const r = m.guess(round % 2 ? 'small' : 'large'); if (r.ok) won += r.win - before; }
    if (mv === 'collect') m.collect();
    if (mv === 'cash') m.cashOut();
    const s = m.state;
    const inMachine = s.credit + s.win + totalBet(s.bets); // 跑燈中的押注仍留在 bets 內，結算時才被機台收走
    assert.equal(s.pocket + inMachine + house - won, 100, `round ${round} ${mv}`);
  }
});

test('11. 重新載入保留有效狀態（含跑燈中與得分中的狀態），且只結算一次', () => {
  const st = memStorage();
  const m = fresh(seq(rollFor(APPLE)));
  m.insertCoin(); m.addBet('apple'); m.addBet('apple');
  m.start();
  saveState(st, m.snapshot());
  let { state, recovered } = loadState(st, TODAY);
  assert.equal(recovered, false);
  assert.deepEqual(state, m.snapshot());
  const m2 = new Machine(state);
  assert.equal(m2.settle().ok, true);
  assert.equal(m2.settle().ok, false);
  assert.equal(m2.state.win, 10);
  saveState(st, m2.snapshot());
  ({ state, recovered } = loadState(st, TODAY));
  assert.equal(recovered, false);
  assert.equal(state.phase, 'win');
  assert.equal(state.win, 10);
});

test('12. 每日補發使用台灣日期（Asia/Taipei），00:00 邊界正確', () => {
  assert.equal(taipeiDateKey(new Date('2026-11-19T15:59:59Z')), '2026-11-19');
  assert.equal(taipeiDateKey(new Date('2026-11-19T16:00:00Z')), '2026-11-20');
  const m = fresh();
  m.state.pocket = 20; m.state.credit = 33;
  assert.equal(m.applyDailyAllowance(new Date('2026-11-19T15:59:59Z')).changed, false);
  assert.equal(m.state.pocket, 20);
  const r = m.applyDailyAllowance(new Date('2026-11-19T16:00:00Z'));
  assert.equal(r.changed, true);
  assert.equal(m.state.pocket, 100);
  assert.equal(m.state.credit, 33);
  assert.equal(m.state.lastAllowanceDate, '2026-11-20');
  assert.equal(m.applyDailyAllowance(new Date('2026-11-20T10:00:00Z')).changed, false);
});

test('12b. 每日補發不會讓高於 100 的口袋現金減少', () => {
  const m = fresh();
  m.state.pocket = 250;
  m.applyDailyAllowance(new Date('2026-11-21T00:00:00Z'));
  assert.equal(m.state.pocket, 250);
});

test('13. 損毀/竄改的存檔安全還原為預設狀態', () => {
  const d = () => defaultState(TODAY);
  const bad = [
    'not json', '{', 'null', '[]', '"x"', '{}',
    JSON.stringify({ ...d(), pocket: -5 }),
    JSON.stringify({ ...d(), pocket: 1.5 }),
    JSON.stringify({ ...d(), pocket: '100' }),
    JSON.stringify({ ...d(), credit: 1e9 }),
    JSON.stringify({ ...d(), lamp: 24 }),
    JSON.stringify({ ...d(), v: 99 }),
    JSON.stringify({ ...d(), phase: 'spinning', pending: null }),
    JSON.stringify({ ...d(), phase: 'win', win: 0 }),
    JSON.stringify({ ...d(), phase: 'idle', win: 5 }),
    JSON.stringify({ ...d(), bets: { apple: 99 } }),
    JSON.stringify({ ...d(), lastAllowanceDate: 'yesterday' }),
    // 竄改待結算派彩
    JSON.stringify({ ...d(), phase: 'spinning', pending: { target: 1, bonus: [], payout: 99999, bets: { ...emptyBets(), apple: 1 } } }),
    // 非 ONCE MORE 卻帶贈燈
    JSON.stringify({ ...d(), phase: 'spinning', pending: { target: 1, bonus: [2], payout: 5, bets: { ...emptyBets(), apple: 1 } } }),
    // 贈燈重複
    JSON.stringify({ ...d(), phase: 'spinning', pending: { target: 0, bonus: [2, 2], payout: 0, bets: emptyBets() } }),
  ];
  for (const text of bad) {
    const st = memStorage(); st._m.set(SAVE_KEY, text);
    const { state, recovered } = loadState(st, TODAY);
    assert.equal(recovered, true, text);
    assert.deepEqual(state, defaultState(TODAY));
  }
});

test('13b. localStorage 丟例外時不會當機', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const { state } = loadState(broken, TODAY);
  assert.equal(state.pocket, 100);
  assert.equal(saveState(broken, state), false);
  assert.equal(loadState(null, TODAY).state.pocket, 100);
});

test('validateState 接受引擎在各階段產生的所有狀態', () => {
  const m = fresh(seq(rollFor(OM0), 2, bonusRoll(PRIZE_LAMPS, 2), bonusRoll(PRIZE_LAMPS.filter((i) => i !== 2), 14), bonusRoll(PRIZE_LAMPS.filter((i) => ![2, 14].includes(i)), 7)));
  m.insertCoin(); m.addBet('orange'); m.addBet('apple');
  assert.ok(validateState(m.snapshot()));
  m.start();
  assert.ok(validateState(m.snapshot()));
  m.settle();
  assert.ok(validateState(m.snapshot()));
  assert.equal(m.state.phase, 'win');
});

test('賠率模型：每一門理論回收率（含再一次）介於 89%–91%，總權重一致', () => {
  const rtp = exactRtp();
  for (const s of SYMBOLS) assert.ok(rtp[s.id] > 0.89 && rtp[s.id] < 0.91, `${s.id} ${rtp[s.id]}`);
  assert.equal(LAMPS.reduce((a, l) => a + l.weight, 0), WEIGHT_TOTAL);
  assert.ok(Math.abs(doubleUpRtp() - 12 / 13) < 1e-12);
  assert.equal(DOUBLE_UP.factor, 2);
});

test('蒙地卡羅：用完整引擎模擬 60 萬局（八門各押 1 分），實測回收率貼近理論值（±1.5%）', () => {
  let stake = 0; let paid = 0;
  const b = Object.fromEntries(SYMBOLS.map((s) => [s.id, 1]));
  for (let n = 0; n < 600000; n++) {
    const { target, bonus } = drawSpin();
    stake += 8;
    paid += evaluate(b, target, bonus).payout;
  }
  const mean = SYMBOLS.reduce((a, s) => a + exactRtp()[s.id], 0) / 8;
  assert.ok(Math.abs(paid / stake - mean) < 0.015, `${paid / stake} vs ${mean}`);
});

test('抽籤：各燈位命中率接近權重（±0.4%）', () => {
  const N = 300000; const hit = new Array(NUM_LAMPS).fill(0);
  for (let i = 0; i < N; i++) hit[drawSpin().target]++;
  LAMPS.forEach((l, i) => assert.ok(Math.abs(hit[i] / N - l.weight / WEIGHT_TOTAL) < 0.004, `lamp ${i}`));
});
