import { Game } from './ui.js';
import { AudioEngine } from './audio.js';

const root = document.getElementById('machine');
const audio = new AudioEngine();
const game = new Game(root, { audio });
// 供自動化測試與除錯使用（不影響遊戲規則；所有規則仍由引擎判定）
window.__xiaomali = { game, audio, machine: game.machine };
document.documentElement.classList.add('ready');
