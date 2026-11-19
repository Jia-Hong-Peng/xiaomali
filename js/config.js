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

// 24 個燈位，從左上角順時針（7×7 外框：四角 + 每邊 5 格）。
// 依參考機台照片（reference/2.png，一台較晚期的小瑪莉）重建，哪些是照片可見、哪些是推定：
//   照片可見：四角是水果（不是再一次）；「再一次 ONCE MORE」在左右兩側正中央；
//             上邊正中間相鄰的 BAR 50 與 BAR 100；下邊相鄰的兩個 77；左側相鄰的兩個雙星；
//             蘋果出現次數最多。
//   推定/模擬：其餘每一格的圖案與倍數（照片解析度不足以逐格辨識）。總數依評鑑文件的倍數表湊齊：
//             蘋果×7（皆 ×5）、橘子 2/10、木瓜 2/15、鈴鐺 2/20、西瓜 2/20、雙星 2/30、77 2/40、
//             BAR 25/50/100、再一次×2，共 24。
// weight：SIMULATED 停燈權重（總和 WEIGHT_TOTAL），由 tools/solve-weights.mjs 求得，
// 使每一門的理論回收率約 90%（含再一次贈燈）。原廠權重無從考證。
// 停燈權重（總和 100000）。
export const LAMP_WEIGHTS = [5573,9259,442,147,9269,2109,3708,2778,9259,4766,2109,2109,9288,2778,1387,9246,2109,1474,2109,1850,9250,4763,2109,2109];
const L = (symbol, mult) => ({ symbol, mult });
const OM = () => ({ symbol: 'oncemore', mult: 0 });
export const LAMPS = [
  L('orange', 10),        // 0 橘子 ×10
  L('bell', 2),           // 1 鈴鐺 ×2
  L('bar', 50),           // 2 BAR ×50
  L('bar', 100),          // 3 BAR ×100
  L('papaya', 2),         // 4 木瓜 ×2
  L('apple', 5),          // 5 蘋果 ×5
  L('papaya', 15),        // 6 木瓜 ×15
  L('watermelon', 20),    // 7 西瓜 ×20
  L('watermelon', 2),     // 8 西瓜 ×2
  OM(),                   // 9 再一次
  L('apple', 5),          // 10 蘋果 ×5
  L('apple', 5),          // 11 蘋果 ×5
  L('orange', 2),         // 12 橘子 ×2
  L('bell', 20),          // 13 鈴鐺 ×20
  L('seven', 40),         // 14 雙七 ×40
  L('seven', 2),          // 15 雙七 ×2
  L('apple', 5),          // 16 蘋果 ×5
  L('bar', 25),           // 17 BAR ×25
  L('apple', 5),          // 18 蘋果 ×5
  L('star', 30),          // 19 雙星 ×30
  L('star', 2),           // 20 雙星 ×2
  OM(),                   // 21 再一次
  L('apple', 5),          // 22 蘋果 ×5
  L('apple', 5),          // 23 蘋果 ×5
].map((l, i) => ({ ...l, weight: LAMP_WEIGHTS[i] }));

// 實體押注鍵由左到右的順序（參考機台：BAR、77、雙星、西瓜 | 鈴鐺、木瓜、橘子、蘋果）
export const BET_LAYOUT = ['bar', 'seven', 'star', 'watermelon', 'bell', 'papaya', 'orange', 'apple'];
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
