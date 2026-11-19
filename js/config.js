// 設定與歷史假設集中於此。每一項都標示證據等級：
//   VERIFIED  有可靠來源佐證
//   INFERRED  依現有資料合理推定
//   SIMULATED 刻意的遊戲設計近似（非原廠數值）
// 詳見 docs/HISTORICAL_NOTES.md 與 docs/RULES_AND_RTP.md

export const RULESET = 'FRUIT_MARY_REFERENCE';   // 以經濟部評鑑文件「水果瑪莉 FRUIT MARY」為規則基準（VERIFIED：文件內容）；
                                                 // 該文件非 1980 年代原廠資料（見 HISTORICAL_NOTES）
export const NUM_LAMPS = 24;            // INFERRED：7x7 外框共 24 格；FRUIT MARY 文件未載明格數
export const COIN_VALUE = 10;           // VERIFIED（文件）：每枚代幣十分；題目指定虛擬 NT$10 硬幣
export const POINT_NTD = 1;             // SIMULATED：1 分 = 虛擬 NT$1（文件無貨幣換算）
export const START_POCKET = 100;        // 題目指定：每日零用金 NT$100
export const MIN_BET_PER_SYMBOL = 1;    // VERIFIED（文件）：每格最小押分 1 分
export const MAX_BET_PER_SYMBOL = 50;   // VERIFIED（文件）：每格最大押分 50 分
export const BET_STEP = 1;              // 每按一次押 1 分
export const MAX_CREDIT = 99999;        // SIMULATED：機台顯示器為五位數
export const TIMEZONE = 'Asia/Taipei';
export const SAVE_KEY = 'xiaomali.v2';
export const SAVE_VERSION = 2;
export const WEIGHT_TOTAL = 100000;     // 燈位權重基數

// 猜大小（VERIFIED 文件：猜小 1–6、猜大 8–13，猜對得二倍，猜錯結束）。
// 抽 1–13；7 同時不屬於大小（INFERRED：文件的 1–6 / 8–13 分段留下 7 為空缺）。
export const DOUBLE_UP = { min: 1, max: 13, small: [1, 6], large: [8, 13], factor: 2 };

// 八門押注圖案。mults 為文件所載倍數（VERIFIED）。
export const SYMBOLS = [
  { id: 'apple',      name: '蘋果',   short: '蘋果', mults: [5] },
  { id: 'orange',     name: '橘子',   short: '橘子', mults: [2, 10] },
  { id: 'papaya',     name: '木瓜',   short: '木瓜', mults: [2, 15] },
  { id: 'bell',       name: '鈴鐺',   short: '鈴鐺', mults: [2, 20] },
  { id: 'watermelon', name: '西瓜',   short: '西瓜', mults: [2, 20] },
  { id: 'star',       name: '雙子星', short: '雙星', mults: [2, 30] },
  { id: 'seven',      name: '雙七',   short: '77',   mults: [2, 40] },
  { id: 'bar',        name: 'BAR',    short: 'BAR',  mults: [25, 50, 100] },
];

// 24 個燈位，從左上角順時針。四個角為「再一次 ONCE MORE」（VERIFIED：文件有此圖案；位置為 SIMULATED）。
// 其餘 20 格的圖案與倍數分布為 SIMULATED（文件未載明排列，標記為 REQUIRES_REFERENCE）。
// weight：SIMULATED 停燈權重（總和 WEIGHT_TOTAL），由 tools/solve-weights.mjs 求得，
// 使每一門的理論回收率約 90%（含再一次贈燈）。原廠權重無從考證。
// 停燈權重（總和 100000）。由 tools/solve-weights.mjs 求得；理論回收率見 docs/RULES_AND_RTP.md。
export const LAMP_WEIGHTS = [2382,2956,5572,9258,1387,9267,2381,2956,2777,9249,1474,9286,2381,2956,3707,2777,9258,9244,2381,2956,1850,442,2956,147];
const L = (symbol, mult) => ({ symbol, mult });
const OM = () => ({ symbol: 'oncemore', mult: 0 });
export const LAMPS = [
  OM(),               // 0  左上角 ONCE MORE
  L('apple', 5),    // 1
  L('orange', 10),  // 2
  L('bell', 2),     // 3
  L('seven', 40),   // 4
  L('papaya', 2),   // 5
  OM(),               // 6  右上角
  L('apple', 5),    // 7
  L('watermelon', 20), // 8
  L('star', 2),     // 9
  L('bar', 25),     // 10
  L('orange', 2),   // 11
  OM(),               // 12 右下角
  L('apple', 5),    // 13
  L('papaya', 15),  // 14
  L('bell', 20),    // 15
  L('watermelon', 2), // 16
  L('seven', 2),    // 17
  OM(),               // 18 左下角
  L('apple', 5),    // 19
  L('star', 30),    // 20
  L('bar', 50),     // 21
  L('apple', 5),    // 22
  L('bar', 100),    // 23
].map((l, i) => ({ ...l, weight: LAMP_WEIGHTS[i] }));

export const SYMBOL_BY_ID = Object.fromEntries(SYMBOLS.map((s) => [s.id, s]));
export const SYMBOL_IDS = SYMBOLS.map((s) => s.id);
export const ONCE_MORE = 'oncemore';
export const BONUS_MAX_LAMPS = 3;       // VERIFIED（文件）：隨機贈送 1–3 個燈（各數量機率 SIMULATED：均等）
export const OM_LAMPS = LAMPS.map((l, i) => (l.symbol === ONCE_MORE ? i : -1)).filter((i) => i >= 0);
export const PRIZE_LAMPS = LAMPS.map((l, i) => (l.symbol !== ONCE_MORE ? i : -1)).filter((i) => i >= 0);

// 跑燈節奏（SIMULATED）
export const SPIN = {
  laps: 2,
  accelSteps: 9,
  decelSteps: 15,
  startDelay: 240,  // ms
  fastDelay: 48,
  endDelay: 460,
};
