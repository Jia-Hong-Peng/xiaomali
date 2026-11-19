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
// 依參考機台照片（reference/2.png，放大後逐格辨識；一台較晚期的小瑪莉）：
//   照片可見：四角是水果；「再一次 ONCE MORE」在左右兩側正中央（共 2 個）；上邊 橘子、鈴鐺（大）、
//             BAR 50、BAR 100；右側 西瓜（大）、西瓜（小）、再一次、蘋果、橘子（小）；右下角 橘子（大）；
//             下邊 鈴鐺（大）、77（小）、77（大）、蘋果、木瓜（小）；左下角 木瓜（大）；
//             左側 雙星（大）、雙星（小）、再一次、蘋果、鈴鐺（小）；右上角 木瓜（大）。
//             小倍率（×2）用「較小的圖案」表示，大倍率用大圖案；格子上不印倍數。
//   推定：上邊第 5 格是一個金色的東西，照片看不出是什麼，本站放評鑑文件的 BAR ×25（照片的盤面
//         看不到單獨的 BAR 25，但文件有此倍數）。每格大小與倍數的對應（小圖 = ×2、大圖 = 該圖案最高倍）
//         是依照片「同一圖案有大小兩種圖」推定，並對照評鑑文件的倍數表。
// weight：SIMULATED 停燈權重（總和 WEIGHT_TOTAL），由 tools/solve-weights.mjs 求得，
// 使每一門的理論回收率約 90%（含再一次贈燈）。原廠權重無從考證。
export const LAMP_WEIGHTS = [2781,1389,443,148,1476,3704,1852,2781,9271,4735,3704,9271,2781,1389,9258,1389,3704,9262,1852,1852,9262,4734,3704,9258];
const L = (symbol, mult) => ({ symbol, mult });
const OM = () => ({ symbol: 'oncemore', mult: 0 });
export const LAMPS = [
  L('orange', 10),        // 0 橘子 ×10
  L('bell', 20),          // 1 鈴鐺 ×20
  L('bar', 50),           // 2 BAR ×50
  L('bar', 100),          // 3 BAR ×100
  L('bar', 25),           // 4 BAR ×25
  L('apple', 5),          // 5 蘋果 ×5
  L('papaya', 15),        // 6 木瓜 ×15
  L('watermelon', 20),    // 7 西瓜 ×20
  L('watermelon', 2),     // 8 西瓜 ×2
  OM(),                   // 9 再一次
  L('apple', 5),          // 10 蘋果 ×5
  L('orange', 2),         // 11 橘子 ×2
  L('orange', 10),        // 12 橘子 ×10
  L('bell', 20),          // 13 鈴鐺 ×20
  L('seven', 2),          // 14 雙七 ×2
  L('seven', 40),         // 15 雙七 ×40
  L('apple', 5),          // 16 蘋果 ×5
  L('papaya', 2),         // 17 木瓜 ×2
  L('papaya', 15),        // 18 木瓜 ×15
  L('star', 30),          // 19 雙星 ×30
  L('star', 2),           // 20 雙星 ×2
  OM(),                   // 21 再一次
  L('apple', 5),          // 22 蘋果 ×5
  L('bell', 2),           // 23 鈴鐺 ×2
].map((l, i) => ({ ...l, weight: LAMP_WEIGHTS[i] }));

// 實體押注鍵由左到右的順序（參考機台：BAR、77、雙星、西瓜 | 鈴鐺、木瓜、橘子、蘋果）
export const BET_LAYOUT = ['bar', 'seven', 'star', 'watermelon', 'bell', 'papaya', 'orange', 'apple'];
export const SYMBOL_BY_ID = Object.fromEntries(SYMBOLS.map((s) => [s.id, s]));
export const SYMBOL_IDS = SYMBOLS.map((s) => s.id);
export const ONCE_MORE = 'oncemore';
export const BONUS_MAX_LAMPS = 3;       // VERIFIED（文件）：隨機贈送 1–3 個燈（各數量機率 SIMULATED：均等）
export const OM_LAMPS = LAMPS.map((l, i) => (l.symbol === ONCE_MORE ? i : -1)).filter((i) => i >= 0);
export const PRIZE_LAMPS = LAMPS.map((l, i) => (l.symbol !== ONCE_MORE ? i : -1)).filter((i) => i >= 0);

// 待機燈光秀（INFERRED：實機沒人玩時會自己跑燈招攬；花樣與節奏為模擬）
export const ATTRACT = { delay: 6000, stepMs: 130 };

// 跑燈節奏（SIMULATED）
export const SPIN = {
  laps: 2,
  accelSteps: 9,
  decelSteps: 15,
  startDelay: 240,  // ms
  fastDelay: 48,
  endDelay: 460,
};
