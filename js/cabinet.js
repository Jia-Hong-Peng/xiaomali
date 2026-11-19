// 木紋小瑪莉機台外觀：以單一 SVG（viewBox 600x1180）繪製，所有實體零件皆為可操作的 SVG 群組。
import {
  SVGNS, SYMBOL_ART, symbolDefs, MARY_ART, sevenSegment, woodTexture, grainTexture, scratches, shade,
} from './art.js';
import { LAMPS, SYMBOLS, ONCE_MORE, MAX_BET_PER_SYMBOL } from './config.js';

export const VB_W = 600;
export const VB_H = 1180;

const RING_X = 30, RING_Y = 112, CELL = 540 / 7;
const FONT_SANS = "'PingFang TC','Noto Sans TC','Microsoft JhengHei','Heiti TC',sans-serif";
const FONT_SERIF = "'Noto Serif TC','Songti TC','PMingLiU','Microsoft JhengHei',serif";

/** 燈位索引 → 棋盤格座標（順時針，從左上角開始）。 */
export function lampCell(i) {
  if (i <= 6) return { col: i, row: 0 };
  if (i <= 12) return { col: 6, row: i - 6 };
  if (i <= 18) return { col: 6 - (i - 12), row: 6 };
  return { col: 0, row: 6 - (i - 18) };
}

export const BUTTON_COLORS = {
  apple: '#d02a2a', orange: '#f08a1a', papaya: '#2c9a55', bell: '#e6c21c',
  watermelon: '#1f9486', star: '#3b78d8', seven: '#dc3b7c', bar: '#8d939d',
};

const multText = (s) => s.mults.join('/');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function screw(x, y, r = 4.2, rot = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${rot})"><circle r="${r}" fill="url(#gScrew)" stroke="#2a1a0c" stroke-width=".8"/><path d="M${-r * 0.7} 0H${r * 0.7}" stroke="#2a2018" stroke-width="1.3"/></g>`;
}

function defs(woodUrl, grainUrl) {
  const colorGrads = Object.entries({ ...BUTTON_COLORS, red: '#d4262a', yellow: '#f0b81c', start: '#e0301c', slate: '#6e747c' })
    .map(([k, c]) => `
      <linearGradient id="gBtn-${k}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${shade(c, 0.45)}"/><stop offset=".35" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -0.42)}"/>
      </linearGradient>
      <radialGradient id="gRBtn-${k}" cx=".4" cy=".3" r=".85">
        <stop offset="0" stop-color="${shade(c, 0.55)}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -0.5)}"/>
      </radialGradient>`).join('');
  return `
  ${symbolDefs()}
  ${colorGrads}
  <pattern id="pWood" patternUnits="userSpaceOnUse" width="${VB_W}" height="${VB_H}">
    ${woodUrl ? `<image href="${woodUrl}" width="${VB_W}" height="${VB_H}" preserveAspectRatio="none"/>` : `<rect width="${VB_W}" height="${VB_H}" fill="#4a2a17"/>`}
  </pattern>
  ${grainUrl ? `<pattern id="pGrain" patternUnits="userSpaceOnUse" width="192" height="192"><image href="${grainUrl}" width="192" height="192"/></pattern>` : ''}
  <linearGradient id="gBrass" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#f6e29a"/><stop offset=".3" stop-color="#c79a36"/><stop offset=".6" stop-color="#8a6118"/><stop offset=".85" stop-color="#d8b259"/><stop offset="1" stop-color="#7a5514"/>
  </linearGradient>
  <linearGradient id="gChrome" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fbfbf8"/><stop offset=".25" stop-color="#b9bdc0"/><stop offset=".55" stop-color="#6a6f74"/><stop offset=".8" stop-color="#c9cdd0"/><stop offset="1" stop-color="#8c9094"/>
  </linearGradient>
  <linearGradient id="gSteel" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4c5156"/><stop offset=".5" stop-color="#8e949a"/><stop offset="1" stop-color="#3a3e43"/>
  </linearGradient>
  <radialGradient id="gScrew" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#f3e9c8"/><stop offset=".6" stop-color="#a08a52"/><stop offset="1" stop-color="#4a3a1a"/></radialGradient>
  <linearGradient id="gSign" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffe9a0"/><stop offset=".5" stop-color="#ffc94a"/><stop offset="1" stop-color="#f0962a"/>
  </linearGradient>
  <linearGradient id="gCell" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6e7b8"/><stop offset="1" stop-color="#dcc189"/></linearGradient>
  <radialGradient id="gCellLit" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="#fffdea"/><stop offset=".55" stop-color="#ffe37a"/><stop offset="1" stop-color="#ffb73a"/></radialGradient>
  <radialGradient id="gHalo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3a8" stop-opacity=".95"/><stop offset=".45" stop-color="#ffb531" stop-opacity=".55"/><stop offset="1" stop-color="#ff8a1a" stop-opacity="0"/></radialGradient>
  <radialGradient id="gBulbOff" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#9a7a46"/><stop offset=".6" stop-color="#4f3a1c"/><stop offset="1" stop-color="#2a1d0d"/></radialGradient>
  <radialGradient id="gBulbOn" cx=".45" cy=".4" r=".65"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#fff0a0"/><stop offset="1" stop-color="#ffa81f"/></radialGradient>
  <linearGradient id="gGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".55" stop-color="#fff" stop-opacity=".03"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="gBoard" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14100f"/><stop offset="1" stop-color="#0a0807"/></linearGradient>
  <linearGradient id="gCenter" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#173a82"/><stop offset=".6" stop-color="#0f2a63"/><stop offset="1" stop-color="#0a1c46"/></linearGradient>
  <radialGradient id="gVignette" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
  <linearGradient id="gTray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f3337"/><stop offset=".45" stop-color="#6d7379"/><stop offset="1" stop-color="#3c4146"/></linearGradient>
  <radialGradient id="gCoin" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fbfbf6"/><stop offset=".5" stop-color="#c3c6c4"/><stop offset="1" stop-color="#7d8180"/></radialGradient>
  <radialGradient id="gSlotLamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe9b0"/><stop offset=".5" stop-color="#ff7a2a" stop-opacity=".8"/><stop offset="1" stop-color="#ff3a10" stop-opacity="0"/></radialGradient>
  <filter id="fGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <clipPath id="cpTray"><rect x="104" y="1090" width="392" height="52" rx="10"/></clipPath>
  <clipPath id="cpCenter"><rect x="114" y="196" width="372" height="372"/></clipPath>
  <clipPath id="cpGlass"><rect x="26" y="108" width="548" height="548" rx="3"/></clipPath>`;
}

/* ---------- 零件 ---------- */
function lampCellMarkup(i) {
  const lamp = LAMPS[i];
  const { col, row } = lampCell(i);
  const x = RING_X + col * CELL, y = RING_Y + row * CELL;
  const cx = x + CELL / 2;
  const isOm = lamp.symbol === ONCE_MORE;
  const icon = isOm
    ? `<use href="#sym-oncemore" x="${x + 6}" y="${y + 14}" width="${CELL - 12}" height="${CELL - 12}"/>`
    : `<use href="#sym-${lamp.symbol}" x="${cx - 21}" y="${y + 17}" width="42" height="42"/>`;
  const tag = isOm ? '' : `<text x="${cx}" y="${y + CELL - 6.5}" text-anchor="middle" font-family="${FONT_SANS}" font-weight="900" font-size="12.5" fill="#7a1616">×${lamp.mult}</text>`;
  return `
  <g class="lamp" id="lamp-${i}" data-lamp="${i}">
    <rect x="${x + 2.5}" y="${y + 2.5}" width="${CELL - 5}" height="${CELL - 5}" rx="4" fill="url(#gCell)" stroke="#6e5026" stroke-width="1.6"/>
    <g class="lit">
      <rect x="${x + 2.5}" y="${y + 2.5}" width="${CELL - 5}" height="${CELL - 5}" rx="4" fill="url(#gCellLit)"/>
    </g>
    ${icon}
    ${tag}
    <circle cx="${cx}" cy="${y + 10.5}" r="6" fill="url(#gBulbOff)" stroke="#201408" stroke-width="1"/>
    <g class="lit">
      <circle cx="${cx}" cy="${y + 10.5}" r="21" fill="url(#gHalo)"/>
      <circle cx="${cx}" cy="${y + 10.5}" r="5.2" fill="url(#gBulbOn)"/>
    </g>
  </g>`;
}

function rectButton({ act, arg = '', x, y, w, h, color, label, sub = '', aria, labelSize = 18, id, icon, rx = 9 }) {
  const iconMarkup = icon
    ? `<rect x="${x + (w - 40) / 2}" y="${y + 7}" width="40" height="40" rx="6" fill="#f7ecc8" opacity=".92"/>
       <use href="#sym-${icon}" x="${x + (w - 36) / 2}" y="${y + 9}" width="36" height="36"/>`
    : '';
  const textY = icon ? y + h - 8 : y + h / 2 + (sub ? 2 : 7);
  return `
  <g class="btn" id="${id || `btn-${act}${arg ? `-${arg}` : ''}`}" data-act="${act}" data-arg="${arg}" role="button" tabindex="0" aria-label="${esc(aria)}">
    <rect class="well" x="${x - 4}" y="${y - 3}" width="${w + 8}" height="${h + 10}" rx="${rx + 3}" fill="#0b0705" stroke="#5a4020" stroke-width="1.4"/>
    <g class="cap">
      <rect x="${x}" y="${y + 5}" width="${w}" height="${h}" rx="${rx}" fill="${shade(color, -0.6)}"/>
      <rect class="face" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="url(#gBtn-${arg && BUTTON_COLORS[arg] ? arg : act === 'start' ? 'start' : act === 'cash' ? 'yellow' : act === 'small' || act === 'large' ? 'star' : 'slate'})" stroke="${shade(color, -0.55)}" stroke-width="1.4"/>
      <rect x="${x + 4}" y="${y + 3}" width="${w - 8}" height="${Math.min(14, h * 0.22)}" rx="5" fill="#fff" opacity=".28"/>
      ${iconMarkup}
      <text x="${x + w / 2}" y="${textY}" text-anchor="middle" font-family="${FONT_SANS}" font-weight="900" font-size="${labelSize}" fill="#fff" stroke="${shade(color, -0.65)}" stroke-width="3" paint-order="stroke" stroke-linejoin="round">${esc(label)}</text>
      ${sub ? `<text x="${x + w / 2}" y="${y + h - 9}" text-anchor="middle" font-family="${FONT_SANS}" font-weight="700" font-size="11" fill="#fff" stroke="${shade(color, -0.65)}" stroke-width="2.4" paint-order="stroke">${esc(sub)}</text>` : ''}
      <rect class="glow" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="#fff6b0" opacity="0"/>
      <rect class="dim" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="#120a06" opacity="0"/>
    </g>
    <rect class="hit" x="${x - 6}" y="${y - 8}" width="${w + 12}" height="${h + 22}" fill="transparent"/>
  </g>`;
}

function roundButton({ act, cx, cy, r, color, label, sub, aria, id }) {
  return `
  <g class="btn" id="${id || `btn-${act}`}" data-act="${act}" role="button" tabindex="0" aria-label="${esc(aria)}">
    <circle class="well" cx="${cx}" cy="${cy + 1}" r="${r + 7}" fill="#0b0705" stroke="url(#gBrass)" stroke-width="3.2"/>
    <g class="cap">
      <circle cx="${cx}" cy="${cy + 7}" r="${r}" fill="${shade(color, -0.62)}"/>
      <circle class="face" cx="${cx}" cy="${cy}" r="${r}" fill="url(#gRBtn-start)" stroke="${shade(color, -0.55)}" stroke-width="1.6"/>
      <ellipse cx="${cx - 8}" cy="${cy - r * 0.55}" rx="${r * 0.52}" ry="${r * 0.22}" fill="#fff" opacity=".3"/>
      <text x="${cx}" y="${cy + 3}" text-anchor="middle" font-family="${FONT_SANS}" font-weight="900" font-size="25" letter-spacing=".5" fill="#fff" stroke="${shade(color, -0.65)}" stroke-width="3.6" paint-order="stroke" stroke-linejoin="round">${esc(label)}</text>
      <text x="${cx}" y="${cy + 24}" text-anchor="middle" font-family="${FONT_SANS}" font-weight="800" font-size="15" fill="#fff" stroke="${shade(color, -0.65)}" stroke-width="3" paint-order="stroke">${esc(sub)}</text>
      <circle class="glow" cx="${cx}" cy="${cy}" r="${r}" fill="#fff0a0" opacity="0"/>
      <circle class="dim" cx="${cx}" cy="${cy}" r="${r}" fill="#120a06" opacity="0"/>
    </g>
    <circle class="hit" cx="${cx}" cy="${cy}" r="${r + 12}" fill="transparent"/>
  </g>`;
}

/* ---------- 組裝整台機器 ---------- */
export function buildCabinet(root) {
  const woodUrl = woodTexture();
  const grainUrl = grainTexture();

  const betColW = 540 / 8;
  const bets = SYMBOLS.map((s, i) => {
    const colX = 30 + i * betColW;
    const bx = colX + 1.5, bw = betColW - 3;
    return `
    <g class="betwin" id="bw-${s.id}">
      <rect x="${colX + 4}" y="763" width="${betColW - 8}" height="30" rx="4" fill="#0b0706" stroke="#5a4020" stroke-width="1.2"/>
    </g>
    ${rectButton({ act: 'bet', arg: s.id, x: bx, y: 802, w: bw, h: 78, color: BUTTON_COLORS[s.id], label: s.short, aria: `押${s.name}，賠率${multText(s)}倍`, labelSize: 16, icon: s.id })}
    <text x="${colX + betColW / 2}" y="902" text-anchor="middle" font-family="${FONT_SANS}" font-weight="800" font-size="${s.mults.length > 2 ? 10.5 : 12}" fill="#e9cf91" opacity=".9">×${multText(s)}</text>`;
  }).join('');

  const payTable = SYMBOLS.map((s, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 122 + col * 92, y = 456 + row * 52;
    return `<use href="#sym-${s.id}" x="${x + 14}" y="${y}" width="32" height="32"/>
      <text x="${x + 30}" y="${y + 44}" text-anchor="middle" font-family="${FONT_SANS}" font-weight="900" font-size="${s.mults.length > 2 ? 11 : 13}" fill="#ffe9a8" stroke="#08153a" stroke-width="2.4" paint-order="stroke">${multText(s)}</text>`;
  }).join('');

  const rays = Array.from({ length: 24 }, (_, k) => {
    const a = (k * Math.PI * 2) / 24;
    return `<path d="M300 382L${(300 + Math.cos(a) * 280).toFixed(1)} ${(382 + Math.sin(a) * 280).toFixed(1)}" stroke="#fff" stroke-opacity="${k % 2 ? 0.04 : 0.08}" stroke-width="${k % 2 ? 10 : 18}"/>`;
  }).join('');

  const svg = `
<svg id="cabinet" xmlns="${SVGNS}" viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="xMidYMid meet" role="application" aria-label="小瑪莉水果機台" focusable="false">
  <defs>${defs(woodUrl, grainUrl)}</defs>

  <!-- 機身木紋 -->
  <rect width="${VB_W}" height="${VB_H}" rx="14" fill="url(#pWood)"/>
  <rect x="3" y="3" width="${VB_W - 6}" height="${VB_H - 6}" rx="12" fill="none" stroke="#1a0d06" stroke-width="3"/>
  <rect x="9" y="9" width="${VB_W - 18}" height="${VB_H - 18}" rx="8" fill="none" stroke="#a8703a" stroke-opacity=".35" stroke-width="1.5"/>
  <rect x="12" y="12" width="${VB_W - 24}" height="${VB_H - 24}" rx="6" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="2"/>

  <!-- 上方招牌 -->
  <rect x="22" y="16" width="556" height="76" rx="8" fill="#1a0e07" stroke="url(#gBrass)" stroke-width="4"/>
  <rect x="30" y="23" width="540" height="62" rx="5" fill="url(#gSign)" stroke="#8a2a10" stroke-width="2"/>
  <g font-family="${FONT_SERIF}" font-weight="900" text-anchor="middle">
    <text x="302" y="74" font-size="52" letter-spacing="14" fill="#2a0a05" opacity=".55">小瑪莉</text>
    <text x="300" y="72" font-size="52" letter-spacing="14" fill="#d3191f" stroke="#fff3c4" stroke-width="3.4" paint-order="stroke" stroke-linejoin="round">小瑪莉</text>
  </g>
  <text x="46" y="45" font-family="${FONT_SANS}" font-weight="900" font-size="12" fill="#8a2a10" letter-spacing="2">FRUIT</text>
  <text x="46" y="62" font-family="${FONT_SANS}" font-weight="900" font-size="12" fill="#8a2a10" letter-spacing="2">MARY</text>
  <text x="554" y="45" text-anchor="end" font-family="${FONT_SANS}" font-weight="900" font-size="12" fill="#8a2a10">水果</text>
  <text x="554" y="62" text-anchor="end" font-family="${FONT_SANS}" font-weight="900" font-size="12" fill="#8a2a10">瑪莉</text>
  ${screw(34, 28)}${screw(566, 28)}${screw(34, 82)}${screw(566, 82)}

  <!-- 玻璃面板：金屬框 -->
  <rect x="18" y="100" width="564" height="564" rx="6" fill="url(#gBrass)"/>
  <rect x="24" y="106" width="552" height="552" rx="4" fill="#0a0706"/>
  ${screw(30, 106, 4)}${screw(570, 106, 4)}${screw(30, 658, 4)}${screw(570, 658, 4)}
  <g clip-path="url(#cpGlass)">
    <rect x="26" y="108" width="548" height="548" fill="url(#gBoard)"/>
    <!-- 24 個跑燈 -->
    <g id="lamps">${LAMPS.map((_, i) => lampCellMarkup(i)).join('')}</g>

    <!-- 中央印刷圖案 -->
    <g id="center">
      <rect x="107" y="189" width="386" height="386" rx="6" fill="url(#gCenter)" stroke="#e8b53c" stroke-width="4"/>
      <rect x="114" y="196" width="372" height="372" rx="3" fill="none" stroke="#d2262f" stroke-width="2"/>
      <g clip-path="url(#cpCenter)">${rays}</g>
      <g font-family="${FONT_SERIF}" font-weight="900" text-anchor="middle">
        <text x="303" y="256" font-size="56" letter-spacing="8" fill="#000" opacity=".5">小瑪莉</text>
        <text x="300" y="253" font-size="56" letter-spacing="8" fill="#ffd23c" stroke="#b3141c" stroke-width="5.5" paint-order="stroke" stroke-linejoin="round">小瑪莉</text>
      </g>
      <text x="300" y="272" text-anchor="middle" font-family="${FONT_SANS}" font-weight="900" font-size="12" letter-spacing="6" fill="#ffe9a8">FRUIT MARY</text>
      <use href="#sym-apple" x="140" y="276" width="56" height="56"/>
      <use href="#sym-bell" x="404" y="276" width="56" height="56"/>
      <g transform="translate(262 276) scale(.74)">${MARY_ART}</g>
      <!-- 顯示窗 -->
      <rect x="133" y="358" width="334" height="92" rx="6" fill="#0a0504" stroke="url(#gBrass)" stroke-width="4"/>
      <g id="msg" font-family="${FONT_SANS}" font-weight="900" text-anchor="middle" fill="#ffb02e" filter="url(#fGlow)">
        <text id="msg1" x="300" y="398" font-size="31">請投幣</text>
        <text id="msg2" x="300" y="430" font-size="17" font-weight="700" fill="#ff8a2a">NT$10 一枚</text>
      </g>
      ${payTable}
    </g>
    <path d="M0 0" id="spare"/>
  </g>

  <!-- 玻璃反光與老化顆粒 -->
  <g pointer-events="none" clip-path="url(#cpGlass)">
    ${grainUrl ? `<rect x="26" y="108" width="548" height="548" fill="url(#pGrain)" opacity=".5"/>` : ''}
    <rect x="26" y="108" width="548" height="548" fill="#c89a40" opacity=".05"/>
    <path d="M26 108H330L170 656H26Z" fill="url(#gGlass)"/>
    <path d="M360 108H392L232 656H200Z" fill="#fff" opacity=".045"/>
    <path d="${scratches(26, 548, 548, 11, 120).replace(/M([\d.]+) ([\d.]+)/g, (_, a, b) => `M${(+a + 26).toFixed(1)} ${(+b + 108).toFixed(1)}`)}" stroke="#fff" stroke-opacity=".16" stroke-width=".6" fill="none"/>
  </g>

  <!-- LED 顯示器 -->
  <rect x="22" y="670" width="556" height="86" rx="6" fill="#1a0e07" stroke="url(#gBrass)" stroke-width="3.5"/>
  <g font-family="${FONT_SANS}" font-weight="900" font-size="13" fill="#e8cf8d" text-anchor="middle">
    <rect x="34" y="676" width="192" height="74" rx="4" fill="#090504" stroke="#4a331a" stroke-width="1.4"/>
    <rect x="240" y="676" width="120" height="74" rx="4" fill="#090504" stroke="#4a331a" stroke-width="1.4"/>
    <rect x="374" y="676" width="192" height="74" rx="4" fill="#090504" stroke="#4a331a" stroke-width="1.4"/>
    <text x="130" y="692">投幣分數</text><text x="300" y="692">押　分</text><text x="470" y="692">得　分</text>
  </g>
  <g id="leds"></g>
  ${screw(28, 678, 3)}${screw(572, 678, 3)}${screw(28, 748, 3)}${screw(572, 748, 3)}

  <!-- 押注鍵 -->
  <rect x="22" y="758" width="556" height="162" rx="6" fill="#2a170c" fill-opacity=".55" stroke="#120904" stroke-width="2"/>
  <g id="bets">${bets}</g>

  <!-- 操作區 -->
  <g id="controls">
    ${rectButton({ act: 'small', x: 34, y: 934, w: 84, h: 60, color: '#4a7fd0', label: '猜小', sub: '1–6', aria: '猜小（1 到 6）', labelSize: 21, id: 'btn-small' })}
    ${rectButton({ act: 'large', x: 128, y: 934, w: 84, h: 60, color: '#4a7fd0', label: '猜大', sub: '8–13', aria: '猜大（8 到 13）', labelSize: 21, id: 'btn-large' })}
    ${roundButton({ act: 'start', cx: 300, cy: 966, r: 50, color: '#e0301c', label: 'START', sub: '開始', aria: '開始，啟動跑燈；有得分時按下可把得分轉入投幣分數' })}
    ${rectButton({ act: 'cash', x: 380, y: 934, w: 84, h: 60, color: '#f0b81c', label: '退幣', sub: '', aria: '退幣，領回所有分數', labelSize: 22, id: 'btn-cash' })}

    <!-- 投幣孔 -->
    <g class="btn" id="btn-coin" data-act="coin" role="button" tabindex="0" aria-label="投入一枚十元硬幣">
      <rect x="480" y="920" width="98" height="116" rx="6" fill="url(#gBrass)" stroke="#4a3210" stroke-width="2"/>
      <rect x="486" y="926" width="86" height="104" rx="4" fill="#2b1d0a" opacity=".35"/>
      <circle id="slotLamp" cx="529" cy="938" r="6" fill="#4a1a10" stroke="#1a0a06" stroke-width="1"/>
      <circle id="slotLampLit" class="slotlit" cx="529" cy="938" r="16" fill="url(#gSlotLamp)" opacity="0"/>
      <rect x="520" y="952" width="18" height="52" rx="3" fill="#050302" stroke="#1d130a" stroke-width="2"/>
      <rect id="slotLight" x="527" y="956" width="4" height="44" rx="2" fill="#ff9a3a" opacity="0"/>
      <rect x="520" y="952" width="18" height="52" rx="3" fill="none" stroke="#e9d089" stroke-width="1" opacity=".6"/>
      <text x="529" y="1019" text-anchor="middle" font-family="${FONT_SANS}" font-weight="900" font-size="13" fill="#3a2406">投幣 NT$10</text>
      <text x="529" y="1031" text-anchor="middle" font-family="${FONT_SANS}" font-weight="700" font-size="8" fill="#3a2406" letter-spacing="1">INSERT COIN</text>
      <rect x="474" y="914" width="110" height="128" fill="transparent" class="hit"/>
      ${screw(488, 930, 2.8)}${screw(570, 930, 2.8)}${screw(488, 1024, 2.8)}${screw(570, 1024, 2.8)}
    </g>
  </g>

  <!-- 現金牌與音效開關 -->
  <rect x="22" y="1044" width="556" height="34" rx="4" fill="#1b0f08" fill-opacity=".6"/>
  <g class="btn" id="btn-sound" data-act="sound" role="switch" tabindex="0" aria-checked="true" aria-label="音效開關">
    <rect x="30" y="1046" width="104" height="30" fill="transparent" class="hit"/>
    <text x="36" y="1066" font-family="${FONT_SANS}" font-weight="900" font-size="13" fill="#e8cf8d">音效</text>
    <rect x="76" y="1052" width="46" height="18" rx="9" fill="#0b0705" stroke="url(#gBrass)" stroke-width="2"/>
    <g class="cap"><circle id="soundKnob" cx="99" cy="1061" r="7.5" fill="url(#gChrome)" stroke="#333" stroke-width="1"/></g>
  </g>
  <rect x="170" y="1046" width="262" height="30" rx="4" fill="url(#gBrass)" stroke="#4a3210" stroke-width="1.5"/>
  <rect x="174" y="1049" width="254" height="24" rx="3" fill="#0a0504"/>
  <text x="184" y="1066" font-family="${FONT_SANS}" font-weight="900" font-size="13" fill="#e8b24a">身上現金 NT$</text>
  <g id="pocketLed"></g>
  <text x="566" y="1066" text-anchor="end" font-family="${FONT_SANS}" font-weight="700" font-size="9.5" fill="#d7bf84" opacity=".85">僅供娛樂</text>
  <text x="566" y="1075" text-anchor="end" font-family="${FONT_SANS}" font-weight="700" font-size="8" fill="#d7bf84" opacity=".7">無真實金錢</text>

  <!-- 金屬退幣盤 -->
  <g id="tray" role="button" tabindex="0" aria-label="退幣盤，點一下取走硬幣" data-act="scoop">
    <path d="M52 1090H548L566 1160H34Z" fill="#1a0f08"/>
    <path d="M58 1086H542L558 1150H42Z" fill="url(#gChrome)" stroke="#3a3d40" stroke-width="2"/>
    <rect x="96" y="1086" width="408" height="62" rx="12" fill="url(#gTray)" stroke="#1c1e20" stroke-width="3"/>
    <rect x="104" y="1090" width="392" height="52" rx="10" fill="#15171a"/>
    <g clip-path="url(#cpTray)">
      <rect x="104" y="1090" width="392" height="52" fill="url(#gTray)" opacity=".55"/>
      <path d="M118 1100H300M330 1100H470" stroke="#fff" stroke-opacity=".12" stroke-width="2"/>
      <g id="trayCoins"></g>
    </g>
    <path d="M42 1150H558L566 1160H34Z" fill="url(#gChrome)" opacity=".9"/>
    ${screw(70, 1124, 3.4)}${screw(530, 1124, 3.4)}
    <rect x="34" y="1080" width="532" height="80" fill="transparent" class="hit"/>
  </g>
  <g id="flyLayer" pointer-events="none"></g>

  <!-- 老化：刮痕、污漬、暗角 -->
  <g pointer-events="none">
    <path d="${scratches(70, VB_W, VB_H, 5, 70)}" stroke="#ffffff" stroke-opacity=".06" stroke-width=".7" fill="none"/>
    <path d="${scratches(50, VB_W, VB_H, 9, 90)}" stroke="#000" stroke-opacity=".22" stroke-width=".8" fill="none"/>
    ${grainUrl ? `<rect width="${VB_W}" height="${VB_H}" fill="url(#pGrain)" opacity=".18"/>` : ''}
    <rect width="${VB_W}" height="${VB_H}" rx="14" fill="url(#gVignette)"/>
  </g>
</svg>`;

  root.innerHTML = svg;
  const el = root.querySelector('svg');

  /* ---------- 取得參照並建立 LED ---------- */
  const leds = el.querySelector('#leds');
  const led = {
    credit: sevenSegment(leds, { digits: 5, x: 42, y: 700, scale: 1, on: '#ff3b1f' }),
    bet: sevenSegment(leds, { digits: 3, x: 248, y: 700, scale: 1, on: '#ff3b1f' }),
    win: sevenSegment(leds, { digits: 5, x: 382, y: 700, scale: 1, on: '#ff3b1f' }),
  };
  // 這些 LED 的幾何寬度：5 位 = 182、3 位 = 106，置中
  led.credit.el.setAttribute('transform', `translate(${34 + (192 - 182) / 2} 698) scale(1)`);
  led.bet.el.setAttribute('transform', `translate(${240 + (120 - 106) / 2} 698) scale(1)`);
  led.win.el.setAttribute('transform', `translate(${374 + (192 - 182) / 2} 698) scale(1)`);
  const pocketLed = sevenSegment(el.querySelector('#pocketLed'), { digits: 5, x: 304, y: 1051, scale: 0.4, on: '#ffb02e', off: '#241406', gap: 6 });
  const betDigits = {};
  SYMBOLS.forEach((s, i) => {
    const colX = 30 + i * (540 / 8);
    const w = 2 * 30 + 4;
    betDigits[s.id] = sevenSegment(el.querySelector(`#bw-${s.id}`), {
      digits: 2, x: colX + (540 / 8 - (2 * 30 + 8) * 0.5) / 2 - 0.5, y: 767, scale: 0.5, on: '#ffb02e', off: '#241406', gap: 8,
    });
    void w;
  });
  led.credit.set(''); led.bet.set(''); led.win.set(''); pocketLed.set('');

  const lamps = LAMPS.map((_, i) => el.querySelector(`#lamp-${i}`));
  const buttons = {};
  el.querySelectorAll('.btn').forEach((b) => { buttons[b.id] = b; });

  return {
    svg: el,
    lamps,
    led,
    pocketLed,
    betDigits,
    buttons,
    msg1: el.querySelector('#msg1'),
    msg2: el.querySelector('#msg2'),
    slotLamp: el.querySelector('#slotLampLit'),
    slotLight: el.querySelector('#slotLight'),
    trayCoins: el.querySelector('#trayCoins'),
    flyLayer: el.querySelector('#flyLayer'),
    soundKnob: el.querySelector('#soundKnob'),
    tray: el.querySelector('#tray'),
  };
}

export { MAX_BET_PER_SYMBOL };
