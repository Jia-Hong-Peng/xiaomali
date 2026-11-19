// 瀏覽器端對端測試：在 iframe 中載入真正的 index.html，以真實 DOM 事件操作機台。
// 開啟 http://127.0.0.1:8137/tests/e2e.html（先 `npm run serve`）。結果寫在頁面與 document.title。
import { LAMPS, MAX_BET_PER_SYMBOL, NUM_LAMPS, SAVE_KEY } from '../js/config.js';
import { taipeiDateKey } from '../js/engine.js';
import { AudioEngine } from '../js/audio.js';

const frame = document.getElementById('app');
const out = document.getElementById('out');
const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = () => frame.contentWindow;
const D = () => frame.contentDocument;
const G = () => W().__xiaomali.game;
const M = () => G().machine;
const S = () => M().state;

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const tr = document.createElement('tr');
  tr.innerHTML = `<td class="${pass ? 'pass' : 'fail'}">${pass ? 'PASS' : 'FAIL'}</td><td>${name}</td><td>${String(detail).replace(/</g, '&lt;')}</td>`;
  out.appendChild(tr);
}
const check = (name, cond, detail) => record(name, !!cond, detail);

function navigate(url) {
  return new Promise((resolve) => {
    frame.onload = () => resolve();
    frame.src = url;
  });
}

/** 載入遊戲。seed 為字串時，先寫入存檔再載入；clear 會先清空 localStorage。 */
async function load({ clear = true, seed = null } = {}) {
  await navigate(`../index.html?x=${Math.random()}`);
  if (clear || seed !== null) {
    const ls = W().localStorage;
    if (clear) ls.clear();
    if (seed !== null) ls.setItem(SAVE_KEY, seed);
    await navigate(`../index.html?y=${Math.random()}`);
  }
  for (let i = 0; i < 100 && !W().__xiaomali; i++) await sleep(30);
  await sleep(60);
}

function press(id, { hold = 30 } = {}) {
  const el = D().getElementById(id);
  const P = W().PointerEvent;
  const init = { bubbles: true, cancelable: true, pointerId: 7, button: 0, pointerType: 'touch', isPrimary: true };
  el.dispatchEvent(new P('pointerdown', init));
  setTimeout(() => el.dispatchEvent(new P('pointerup', init)), hold);
}
const waitFor = async (fn, ms = 15000, step = 25) => {
  const t0 = performance.now();
  while (performance.now() - t0 < ms) { if (fn()) return true; await sleep(step); }
  return false;
};
/** 讓下一次抽籤依序回傳指定值（取代引擎的亂數來源，僅限測試）。 */
const forceRng = (...vals) => {
  let i = 0;
  M().randomInt = (n) => { const v = vals[i++]; if (v === undefined || v >= n) throw new Error(`rng ${v} / ${n}`); return v; };
};
const rollFor = (lamp) => LAMPS.slice(0, lamp).reduce((a, l) => a + l.weight, 0);
const total = (b) => Object.values(b).reduce((a, c) => a + c, 0);

async function run() {
  /* 1–3 初始與投幣、版面 */
  await load();
  check('1. 初始口袋現金 NT$100、機台 0', S().pocket === 100 && S().credit === 0, JSON.stringify({ p: S().pocket, c: S().credit }));
  check('15a. 手機尺寸（390×844）無水平溢出', D().documentElement.scrollWidth <= W().innerWidth && D().body.scrollWidth <= W().innerWidth,
    `scrollW=${D().documentElement.scrollWidth} innerW=${W().innerWidth}`);
  const svgBox = D().getElementById('cabinet').getBoundingClientRect();
  check('15b. 機台完整落在視窗內且保持 600:1180 比例',
    svgBox.left >= -0.5 && svgBox.right <= W().innerWidth + 0.5 && svgBox.top >= -0.5 && svgBox.bottom <= W().innerHeight + 0.5
    && Math.abs(svgBox.width / svgBox.height - 600 / 1180) < 0.01, `${svgBox.width.toFixed(1)}x${svgBox.height.toFixed(1)}`);
  const btnSizes = ['btn-bet-apple', 'btn-bet-bar', 'btn-start', 'btn-cash', 'btn-small', 'btn-coin'].map((id) => {
    const r = D().querySelector(`#${id} .hit`).getBoundingClientRect();
    return [id, Math.round(r.width), Math.round(r.height)];
  });
  check('15c. 觸控目標 ≥ 44×44 CSS px', btnSizes.every(([, w, h]) => w >= 44 && h >= 44), JSON.stringify(btnSizes));
  const vp = D().querySelector('meta[name=viewport]').content;
  check('15d. 禁止縮放 viewport 與安全區設定', /user-scalable=no/.test(vp) && /viewport-fit=cover/.test(vp), vp);

  press('btn-coin'); await sleep(450);
  check('2/3. 投幣：口袋 -10、機台 +10', S().pocket === 90 && S().credit === 10, JSON.stringify({ p: S().pocket, c: S().credit }));
  check('3b. 投幣後硬幣飛行元素已移除', D().querySelectorAll('#flyLayer g').length === 0);

  /* 5 押注 */
  for (let i = 0; i < 3; i++) { press('btn-bet-apple'); await sleep(40); }
  check('5a. 押注 3 分蘋果：機台 7、押 3', S().credit === 7 && S().bets.apple === 3, JSON.stringify(S().bets));
  for (let i = 0; i < 12; i++) { press('btn-bet-bar'); await sleep(20); }
  check('5b. 分數用完後不能再押（不為負）', S().credit === 0 && total(S().bets) === 10, JSON.stringify({ c: S().credit, b: total(S().bets) }));
  press('btn-cash'); await sleep(80);
  check('5c. 取分：押注退回，口袋回到 100、押注清空', S().pocket === 100 && S().credit === 0 && total(S().bets) === 0, JSON.stringify({ p: S().pocket }));
  for (let i = 0; i < 6; i++) { press('btn-coin'); await sleep(40); }
  for (let i = 0; i < 55; i++) { press('btn-bet-seven', { hold: 5 }); await sleep(8); }
  check('5d. 單門押注上限 50 分', S().bets.seven === MAX_BET_PER_SYMBOL && S().credit === 10, JSON.stringify({ seven: S().bets.seven, c: S().credit }));

  /* 4 口袋不足 */
  await load();
  S().pocket = 5; press('btn-coin'); await sleep(80);
  check('4. 口袋不足 NT$10 時投幣被拒絕、金額不變',
    S().pocket === 5 && S().credit === 0 && /口袋沒錢/.test(D().getElementById('msg1').textContent), D().getElementById('msg1').textContent);

  /* 6/7 START 防重入 + 跑燈停在預定燈位（強制抽中橘子×10：燈位 2） */
  await load();
  press('btn-coin'); await sleep(450);
  press('btn-bet-orange'); await sleep(40); press('btn-bet-orange'); await sleep(40);
  forceRng(rollFor(2));
  const seq = [];
  let lastKey = '';
  const poll = setInterval(() => {
    const key = [...G().ui.onLamps].sort((a, b) => a - b).join(',');
    if (key !== lastKey) { lastKey = key; seq.push(key); }
  }, 8);
  press('btn-start'); press('btn-start'); await sleep(20); press('btn-start');
  await sleep(150);
  const startEvents = G().events.filter((e) => e.type === 'start' && e.data.ok).length;
  check('6. 連按 START 三次只會開始一局', startEvents === 1 && S().phase === 'spinning', `starts=${startEvents} phase=${S().phase}`);
  press('btn-coin'); press('btn-bet-bar'); press('btn-cash'); // 跑燈中應全部無效
  const pendingTarget = S().pending && S().pending.target;
  const t0 = performance.now();
  const finished = await waitFor(() => S().phase !== 'spinning', 20000);
  const spinMs = performance.now() - t0;
  clearInterval(poll);
  await sleep(300);
  const lit = [...G().ui.onLamps];
  check('7. 跑燈結束後燈停在引擎預定的燈位', finished && pendingTarget === 2 && lit.length === 1 && lit[0] === 2, `target=${pendingTarget} lit=${lit} spin≈${Math.round(spinMs)}ms`);
  const singles = seq.filter((k) => k !== '' && !k.includes(',')).map(Number);
  let stepsOk = singles.length > 48;
  for (let i = 1; i < singles.length; i++) if (((singles[i] - singles[i - 1] + NUM_LAMPS) % NUM_LAMPS) !== 1) { stepsOk = false; break; }
  check('7b. 燈逐格順時針前進，至少繞 2 圈', stepsOk, `steps=${singles.length}`);
  check('7c. 跑燈中的投幣/押注/退幣沒有生效', S().pocket === 90 && total(S().bets) === 0, JSON.stringify({ p: S().pocket, bets: total(S().bets) }));
  check('8. 中獎：得分 = 2 × 10 = 20，只結算一次', S().phase === 'win' && S().win === 20 && S().credit === 8, JSON.stringify({ win: S().win, credit: S().credit }));
  check('8b. 中獎燈閃爍', D().getElementById('lamp-2').classList.contains('flash'));
  await sleep(1600);

  /* 猜大小 */
  forceRng(3); // n = 4 → 小
  press('btn-small'); await sleep(300); await waitFor(() => !G().ui.lock, 8000); await sleep(100);
  check('9. 猜小猜中 → 得分加倍 40', S().win === 40 && S().phase === 'win', JSON.stringify({ win: S().win }));
  forceRng(6); // n = 7
  press('btn-large'); await sleep(300); await waitFor(() => S().phase === 'idle' && !G().ui.lock, 8000); await sleep(100);
  check('9b. 開 7 通吃 → 得分歸零', S().win === 0 && S().phase === 'idle' && S().credit === 8, JSON.stringify({ win: S().win, credit: S().credit }));

  /* 中獎後 START 轉分 */
  forceRng(rollFor(1));
  press('btn-bet-apple'); await sleep(40); press('btn-bet-apple'); await sleep(40);
  press('btn-start'); await waitFor(() => S().phase === 'win', 20000); await sleep(400);
  check('8c. 蘋果 ×5 × 押 2 = 10', S().win === 10 && S().credit === 6, JSON.stringify({ win: S().win, credit: S().credit }));
  press('btn-start'); await sleep(200); await waitFor(() => S().phase === 'idle' && !G().ui.lock, 8000); await sleep(100);
  press('btn-start'); await sleep(100);
  check('8d. START 轉分只一次：機台 16', S().credit === 16 && S().win === 0, JSON.stringify({ credit: S().credit }));

  /* 10 退幣 */
  const before = { pocket: S().pocket, credit: S().credit };
  press('btn-cash'); await sleep(120); press('btn-cash'); await sleep(100);
  check('10. 退幣轉回口袋，且連按不會重複', S().pocket === before.pocket + before.credit && S().credit === 0, JSON.stringify({ before, now: { p: S().pocket, c: S().credit } }));
  check('10b. 退幣盤出現硬幣動畫元素', D().querySelectorAll('#trayCoins g').length >= 1, `coins=${D().querySelectorAll('#trayCoins g').length}`);
  await sleep(1500);
  press('tray'); await sleep(900);
  check('10c. 點退幣盤取走硬幣', D().querySelectorAll('#trayCoins g').length === 0);

  /* 11 重新整理保留狀態 */
  await load({ clear: true });
  press('btn-coin'); await sleep(450); press('btn-coin'); await sleep(450);
  press('btn-bet-bell'); await sleep(60);
  const snap = JSON.stringify(S());
  await load({ clear: false });
  check('11. 重新載入後狀態一致（口袋/機台/押注）', JSON.stringify(S()) === snap, `${snap} => ${JSON.stringify(S())}`);

  /* 跑燈中重新整理：補完結算，不重複派彩 */
  press('btn-start'); await sleep(300);
  const saved = JSON.parse(W().localStorage.getItem(SAVE_KEY));
  const payoutExpected = saved.pending ? saved.pending.payout : null;
  const creditBefore = saved.credit;
  await load({ clear: false });
  const settledOk = S().total === undefined && total(S().bets) === 0 && S().lamp === (saved.pending.bonus.length ? saved.pending.bonus[saved.pending.bonus.length - 1] : saved.pending.target)
    && (payoutExpected > 0 ? (S().phase === 'win' && S().win === payoutExpected) : S().phase === 'idle') && S().credit === creditBefore;
  check('11b. 跑燈中途重新整理：補完結算一次、押注已被收走', settledOk, `pending=${JSON.stringify(saved.pending && { t: saved.pending.target, p: saved.pending.payout })} now=${JSON.stringify(S())}`);

  /* 13 損毀存檔 */
  const garbage = ['{{{{', 'null', '{"v":2,"pocket":-1}', JSON.stringify({ v: 2, pocket: 999999999 })];
  let allRecovered = true;
  for (const g of garbage) {
    await load({ clear: true, seed: g });
    if (!(S().pocket === 100 && S().credit === 0 && G().recovered === true)) allRecovered = false;
  }
  check('13. 損毀/竄改存檔皆安全還原為預設', allRecovered);
  const blob = JSON.parse(W().localStorage.getItem(SAVE_KEY));
  check('13b. 還原後寫入乾淨存檔', blob && blob.v === 2 && blob.pocket === 100, JSON.stringify(blob));

  /* 12 台灣日期 */
  const k1 = taipeiDateKey(new Date('2026-11-19T15:59:59Z')), k2 = taipeiDateKey(new Date('2026-11-19T16:00:00Z'));
  check('12. 瀏覽器 Intl：台灣 00:00 換日（15:59:59Z→11-19、16:00:00Z→11-20）', k1 === '2026-11-19' && k2 === '2026-11-20', `${k1} ${k2}`);
  const old = JSON.parse(W().localStorage.getItem(SAVE_KEY));
  old.pocket = 30; old.credit = 40; old.lastAllowanceDate = '2020-01-01';
  await load({ clear: true, seed: JSON.stringify(old) });
  check('12b. 新的一天載入：口袋補到 NT$100、機台分數保留', S().pocket === 100 && S().credit === 40 && S().lastAllowanceDate === taipeiDateKey(new Date()), JSON.stringify({ p: S().pocket, c: S().credit, d: S().lastAllowanceDate }));

  /* 14 音效 */
  await load();
  const au = W().__xiaomali.audio;
  press('btn-coin'); await sleep(300);
  check('14a. 手勢之後 AudioContext 已建立並就緒', au.ctx !== null && au.ready, `state=${au.state}（合成事件沒有使用者啟動，suspended 屬瀏覽器政策；真實點擊另行驗證為 running）`);
  const names = ['coinInsert', 'betClick', 'startClick', 'buttonClick', 'reject', 'tick', 'stop', 'blip', 'win', 'lose', 'coinPayout', 'coinScoop'];
  const peaks = {};
  let audioOk = true;
  for (const n of names) {
    const sr = 44100;
    const ctx = new OfflineAudioContext(1, sr * 4, sr);
    const eng = new AudioEngine({ ctx });
    eng.master.gain.cancelScheduledValues(0); eng.master.gain.setValueAtTime(0.9, 0); // 離線渲染從 t=0 開始，略過實際使用時的淡入
    if (n === 'coinPayout') eng.coinPayout(30); else if (n === 'win') eng.win(true); else if (n === 'tick') eng.tick(0.2); else eng[n]();
    const buf = await ctx.startRendering();
    const d = buf.getChannelData(0);
    let pk = 0, e = 0;
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > pk) pk = a; e += d[i] * d[i]; }
    peaks[n] = +pk.toFixed(3);
    if (!(pk > 0.01 && pk < 0.98 && Number.isFinite(e))) audioOk = false;
  }
  // 同時疊加最多聲音：不得爆音
  {
    const sr = 44100; const ctx = new OfflineAudioContext(1, sr * 5, sr);
    const eng = new AudioEngine({ ctx });
    eng.master.gain.cancelScheduledValues(0); eng.master.gain.setValueAtTime(0.9, 0);
    eng.coinInsert(); eng.betClick(); eng.startClick(); eng.win(true); eng.coinPayout(40); eng.coinScoop(); eng.stop(); eng.tick(0.1);
    const d = (await ctx.startRendering()).getChannelData(0); let pk = 0; for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i]));
    check('14b2. 最壞情況同時疊加所有音效：峰值 ≤ 1（限幅器有效）', pk <= 1 && pk > 0.05, `peak=${pk.toFixed(3)}`);
  }
  check('14b. 12 種音效離線渲染：皆有聲音、峰值 < 0.98（不爆音）', audioOk, JSON.stringify(peaks));
  const ctx2 = new OfflineAudioContext(1, 44100, 44100);
  const mute = new AudioEngine({ ctx: ctx2 }); mute.setEnabled(false); mute.coinInsert(); mute.coinPayout(10);
  const b2 = await ctx2.startRendering(); let pk2 = 0; b2.getChannelData(0).forEach((v) => { pk2 = Math.max(pk2, Math.abs(v)); });
  check('14c. 靜音時完全無聲', pk2 < 0.001, `peak=${pk2}`);
  press('btn-sound'); await sleep(80);
  check('14d. 音效開關：切換並寫入存檔', S().soundOn === false && JSON.parse(W().localStorage.getItem(SAVE_KEY)).soundOn === false && au.enabled === false);

  /* 美術與無障礙 */
  check('美術. 24 個跑燈、無 emoji', D().querySelectorAll('.lamp').length === 24 && !/[\u{1F300}-\u{1FAFF}]/u.test(D().body.innerHTML));
  check('無障礙. 所有實體按鍵皆有 aria-label 與 role', [...D().querySelectorAll('.btn')].every((b) => b.getAttribute('aria-label') && b.getAttribute('role')), `${D().querySelectorAll('.btn').length} buttons`);

  const failed = results.filter((r) => !r.pass);
  const sum = `${results.length - failed.length}/${results.length} 通過${failed.length ? `，失敗：${failed.map((f) => f.name).join('；')}` : ''}`;
  document.getElementById('summary').textContent = sum;
  document.title = failed.length ? `E2E FAIL ${sum}` : `E2E PASS ${sum}`;
  window.__e2e = { results, done: true };
}

run().catch((e) => {
  record('測試腳本例外', false, e.stack || e);
  document.title = 'E2E FAIL (exception)';
  window.__e2e = { results, done: true, error: String(e) };
});
