import { Game } from './ui.js';
import { grainTexture, terrazzoTexture } from './art.js';
import { AudioEngine } from './audio.js';
import { ATTRACT } from './config.js';

// 電動間氛圍：磨石子地板與老照片顆粒（程式產生，一次性）
try {
  const floor = terrazzoTexture();
  const grain = grainTexture(256, 77);
  if (floor) document.documentElement.style.setProperty('--floor', `url(${floor})`);
  if (grain) document.documentElement.style.setProperty('--grain', `url(${grain})`);
} catch { /* 純裝飾，失敗不影響遊戲 */ }

const root = document.getElementById('machine');
const audio = new AudioEngine();
// ?quick：略過開機自我檢測（自動化測試用）
const game = new Game(root, { audio, powerOn: !location.search.includes('quick') });
// 供自動化測試與除錯使用（不影響遊戲規則；所有規則仍由引擎判定）
window.__xiaomali = { game, audio, machine: game.machine, ATTRACT };
document.documentElement.classList.add('ready');
