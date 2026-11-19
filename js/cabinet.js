// 木紋水果瑪莉機台外觀：以單一 SVG（viewBox 600x1180）繪製，所有實體零件皆為可操作的 SVG 群組。
// 版面依參考機台照片（reference/）：玻璃窗上緣兩組紅色七段顯示（中獎分 / 投幣分）、
// 棋盤下緣一排「最高倍數 + 圖案 + 各門押分計數」、面板上兩排圓形橘色街機按鍵
// （PAY、WIN↔CREDIT、DOUBLE UP BET、START；八個押分鍵分兩組）、右上角金屬投幣器。
import {
  SVGNS, symbolDefs, MARY_ART, sevenSegment, woodTexture, grainTexture, scratches, shade,
} from './art.js';
import { LAMPS, SYMBOL_BY_ID, ONCE_MORE, BET_LAYOUT } from './config.js';

export const VB_W = 600;
export const VB_H = 1180;

const RING_X = 30, RING_Y = 180, CELL = 540 / 7;
const FONT_SANS = "'PingFang TC','Noto Sans TC','Microsoft JhengHei','Heiti TC',sans-serif";
const FONT_SERIF = "'Noto Serif TC','Songti TC','PMingLiU','Microsoft JhengHei',serif";

/** 燈位索引 → 棋盤格座標（順時針，從左上角開始）。 */
export function lampCell(i) {
  if (i <= 6) return { col: i, row: 0 };
  if (i <= 12) return { col: 6, row: i - 6 };
  if (i <= 18) return { col: 6 - (i - 12), row: 6 };
  return { col: 0, row: 6 - (i - 18) };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const maxMult = (id) => Math.max(...SYMBOL_BY_ID[id].mults);

function screw(x, y, r = 4.2, rot = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${rot})"><circle r="${r}" fill="url(#gScrew)" stroke="#2a1a0c" stroke-width=".8"/><path d="M${-r * 0.7} 0H${r * 0.7}" stroke="#2a2018" stroke-width="1.3"/></g>`;
}

function defs(woodUrl, grainUrl) {
  const san = (id, c) => `
    <radialGradient id="gSan-${id}" cx=".38" cy=".3" r=".85">
      <stop offset="0" stop-color="${shade(c, 0.6)}"/><stop offset=".4" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -0.45)}"/>
    </radialGradient>`;
  return `
  ${symbolDefs()}
  ${san('orange', '#ff9a1c')}${san('red', '#e2302a')}
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
  <linearGradient id="gMech" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#8d9297"/><stop offset=".25" stop-color="#e9ecee"/><stop offset=".55" stop-color="#b3b8bc"/><stop offset="1" stop-color="#7b8085"/>
  </linearGradient>
  <linearGradient id="gPlate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4ecd2"/><stop offset="1" stop-color="#e0d4aa"/></linearGradient>
  <radialGradient id="gScrew" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#f3e9c8"/><stop offset=".6" stop-color="#a08a52"/><stop offset="1" stop-color="#4a3a1a"/></radialGradient>
  <linearGradient id="gSign" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffe9a0"/><stop offset=".5" stop-color="#ffc94a"/><stop offset="1" stop-color="#f0962a"/>
  </linearGradient>
  <linearGradient id="gCell" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8f0d6"/><stop offset="1" stop-color="#e3d3a4"/></linearGradient>
  <radialGradient id="gCellLit" cx=".5" cy=".5" r=".8"><stop offset="0" stop-color="#fff6d0"/><stop offset=".6" stop-color="#ffd27a"/><stop offset="1" stop-color="#ff9a4a"/></radialGradient>
  <radialGradient id="gHalo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd0a0" stop-opacity=".95"/><stop offset=".4" stop-color="#ff5a2a" stop-opacity=".6"/><stop offset="1" stop-color="#ff2a10" stop-opacity="0"/></radialGradient>
  <radialGradient id="gLampOff" cx=".38" cy=".32" r=".85"><stop offset="0" stop-color="#8a2a20"/><stop offset=".6" stop-color="#4a100c"/><stop offset="1" stop-color="#220806"/></radialGradient>
  <radialGradient id="gLampOn" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#fff4e0"/><stop offset=".35" stop-color="#ff9a60"/><stop offset="1" stop-color="#ff2a14"/></radialGradient>
  <linearGradient id="gGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".55" stop-color="#fff" stop-opacity=".03"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="gBoard" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14100f"/><stop offset="1" stop-color="#0a0807"/></linearGradient>
  <linearGradient id="gCenter" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a73c8"/><stop offset=".6" stop-color="#1f5fb0"/><stop offset="1" stop-color="#174a8c"/></linearGradient>
  <radialGradient id="gVignette" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
  <linearGradient id="gTray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f3337"/><stop offset=".45" stop-color="#6d7379"/><stop offset="1" stop-color="#3c4146"/></linearGradient>
  <radialGradient id="gCoin" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fbfbf6"/><stop offset=".5" stop-color="#c3c6c4"/><stop offset="1" stop-color="#7d8180"/></radialGradient>
  <radialGradient id="gSlotLamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe9b0"/><stop offset=".5" stop-color="#ff7a2a" stop-opacity=".8"/><stop offset="1" stop-color="#ff3a10" stop-opacity="0"/></radialGradient>
  <filter id="fGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <clipPath id="cpTray"><rect x="104" y="1090" width="392" height="52" rx="10"/></clipPath>
  <clipPath id="cpCenter"><rect x="114" y="264" width="372" height="372"/></clipPath>
  <clipPath id="cpGlass"><rect x="26" y="106" width="548" height="698" rx="3"/></clipPath>`;
}

/* ---------- 零件 ---------- */
function lampCellMarkup(i) {
  const lamp = LAMPS[i];
  const { col, row } = lampCell(i);
  const x = RING_X + col * CELL, y = RING_Y + row * CELL;
  const cx = x + CELL / 2, cy = y + CELL / 2;
  // 燈在格子「朝向中央」的一側（參考照片：紅色小方燈在圖案與中央畫面之間）
  const dx = col === 0 ? 1 : col === 6 ? -1 : 0;
  const dy = row === 0 ? 1 : row === 6 ? -1 : 0;
  const lx = cx + dx * (CELL / 2 - 11), ly = cy + dy * (CELL / 2 - 11);
  const isOm = lamp.symbol === ONCE_MORE;
  const ix = cx - dx * 5, iy = cy - dy * 5 + 1;
  // 小倍率（×2）用較小的圖案，大倍率用大圖案；格子上不印倍數（照片如此，倍數印在棋盤下緣）
  const mults = isOm ? [] : SYMBOL_BY_ID[lamp.symbol].mults;
  const small = mults.length > 1 && lamp.mult === Math.min(...mults);
  const size = isOm ? 62 : small ? 30 : lamp.symbol === 'bar' ? 50 : 46;
  const art = lamp.symbol === 'bar' && lamp.mult === 50 ? 'bar50' : lamp.symbol === 'bar' && lamp.mult === 100 ? 'bar100' : isOm ? 'oncemore' : lamp.symbol;
  const icon = `<use href="#sym-${art}" x="${ix - size / 2}" y="${iy - size / 2}" width="${size}" height="${size}"/>`;
  const tag = '';
  return `
  <g class="lamp" id="lamp-${i}" data-lamp="${i}">
    <rect x="${x + 2.5}" y="${y + 2.5}" width="${CELL - 5}" height="${CELL - 5}" rx="4" fill="url(#gCell)" stroke="#6e5026" stroke-width="1.6"/>
    <g class="lit"><rect x="${x + 2.5}" y="${y + 2.5}" width="${CELL - 5}" height="${CELL - 5}" rx="4" fill="url(#gCellLit)" fill-opacity=".62"/></g>
    ${icon}${tag}
    <rect x="${lx - 7}" y="${ly - 7}" width="14" height="14" rx="3" fill="url(#gLampOff)" stroke="#120504" stroke-width="1.2"/>
    <g class="lit">
      <circle cx="${lx}" cy="${ly}" r="27" fill="url(#gHalo)"/>
      <rect x="${lx - 6.5}" y="${ly - 6.5}" width="13" height="13" rx="3" fill="url(#gLampOn)"/>
    </g>
  </g>`;
}

/** 圓形街機按鍵（半透明橘色／紅色，內有一圈凹盤）。 */
function roundButton({ act, arg = '', cx, cy, r = 27, hitW = 86, hitH = 72, color = 'orange', aria, id }) {
  const base = color === 'red' ? '#e2302a' : '#ff9a1c';
  return `
  <g class="btn" id="${id}" data-act="${act}" data-arg="${arg}" role="button" tabindex="0" aria-label="${esc(aria)}">
    <circle class="well" cx="${cx}" cy="${cy + 1}" r="${r + 5}" fill="#0d0b0a" stroke="#4a4036" stroke-width="1.6"/>
    <g class="cap">
      <circle cx="${cx}" cy="${cy + 5}" r="${r}" fill="${shade(base, -0.62)}"/>
      <circle class="face" cx="${cx}" cy="${cy}" r="${r}" fill="url(#gSan-${color})" stroke="${shade(base, -0.5)}" stroke-width="1.4"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.72}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="2"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.72}" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="1" transform="translate(1 1)"/>
      <ellipse cx="${cx - r * 0.25}" cy="${cy - r * 0.5}" rx="${r * 0.42}" ry="${r * 0.2}" fill="#fff" opacity=".42"/>
      <circle class="glow" cx="${cx}" cy="${cy}" r="${r}" fill="#ffe35a" opacity="0"/>
      <circle class="dim" cx="${cx}" cy="${cy}" r="${r}" fill="#120a06" opacity="0"/>
    </g>
    <rect class="hit" x="${cx - hitW / 2}" y="${cy - hitH / 2}" width="${hitW}" height="${hitH}" fill="transparent"/>
  </g>`;
}

const labelBlock = (x, w, y, h, fill, text, color = '#fff', size = 14) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${fill}"/>
   <text x="${x + w / 2}" y="${y + h / 2 + size * 0.36}" text-anchor="middle" font-family="${FONT_SANS}" font-weight="900" font-size="${size}" fill="${color}" letter-spacing=".5">${text}</text>`;
const caption = (x, y, text) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="${FONT_SANS}" font-weight="800" font-size="11" fill="#2a1d10">${text}</text>`;

/* ---------- 組裝整台機器 ---------- */
export function buildCabinet(root) {
  const woodUrl = woodTexture();
  const grainUrl = grainTexture();
  const colW = 540 / 8;

  // 棋盤下緣：最高倍數 / 圖案 / 押分計數
  const payRow = BET_LAYOUT.map((id, i) => {
    const x = 30 + i * colW;
    return `
    <rect x="${x + 3}" y="727" width="${colW - 6}" height="17" rx="2" fill="#b3201c"/>
    <text x="${x + colW / 2}" y="740.5" text-anchor="middle" font-family="${FONT_SANS}" font-weight="900" font-size="13" fill="#fff">${maxMult(id)}</text>
    <use href="#sym-${id}" x="${x + colW / 2 - 14}" y="746" width="28" height="28"/>
    <g id="bw-${id}"><rect x="${x + 6}" y="776" width="${colW - 12}" height="26" rx="3" fill="#0b0605" stroke="#6a5a40" stroke-width="1.2"/></g>`;
  }).join('');

  // 面板：下排八個押分鍵（兩組各四個），圖案印在鍵上方
  const betBtns = BET_LAYOUT.map((id, i) => {
    const cx = 30 + colW * (i + 0.5) + (i < 4 ? -4 : 4);
    return `
    <use href="#sym-${id}" x="${cx - 16}" y="938" width="32" height="32"/>
    ${roundButton({ act: 'bet', arg: id, cx, cy: 1004, r: 25, hitW: colW, hitH: 92, id: `btn-bet-${id}`, aria: `押${SYMBOL_BY_ID[id].name}，賠率${SYMBOL_BY_ID[id].mults.join('/')}倍` })}`;
  }).join('');

  const rays = Array.from({ length: 24 }, (_, k) => {
    const a = (k * Math.PI * 2) / 24;
    return `<path d="M300 447L${(300 + Math.cos(a) * 280).toFixed(1)} ${(447 + Math.sin(a) * 280).toFixed(1)}" stroke="#fff" stroke-opacity="${k % 2 ? 0.05 : 0.1}" stroke-width="${k % 2 ? 10 : 18}"/>`;
  }).join('');

  const svg = `
<svg id="cabinet" xmlns="${SVGNS}" viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="xMidYMid meet" role="application" aria-label="水果瑪莉機台" focusable="false">
  <defs>${defs(woodUrl, grainUrl)}</defs>

  <!-- 機身木紋 -->
  <rect width="${VB_W}" height="${VB_H}" rx="14" fill="url(#pWood)"/>
  <rect x="3" y="3" width="${VB_W - 6}" height="${VB_H - 6}" rx="12" fill="none" stroke="#1a0d06" stroke-width="3"/>
  <rect x="9" y="9" width="${VB_W - 18}" height="${VB_H - 18}" rx="8" fill="none" stroke="#a8703a" stroke-opacity=".35" stroke-width="1.5"/>
  <rect x="12" y="12" width="${VB_W - 24}" height="${VB_H - 24}" rx="6" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="2"/>

  <!-- 上方招牌（左）與投幣器（右上） -->
  <rect x="22" y="16" width="420" height="72" rx="8" fill="#1a0e07" stroke="url(#gBrass)" stroke-width="4"/>
  <rect x="30" y="23" width="404" height="58" rx="5" fill="url(#gSign)" stroke="#8a2a10" stroke-width="2"/>
  <g font-family="${FONT_SERIF}" font-weight="900" text-anchor="middle">
    <text x="234" y="70" font-size="46" letter-spacing="10" fill="#2a0a05" opacity=".55">小瑪莉</text>
    <text x="232" y="68" font-size="46" letter-spacing="10" fill="#d3191f" stroke="#fff3c4" stroke-width="3" paint-order="stroke" stroke-linejoin="round">小瑪莉</text>
  </g>
  <text x="44" y="46" font-family="${FONT_SANS}" font-weight="900" font-size="11" fill="#8a2a10" letter-spacing="2">FRUIT</text>
  <text x="44" y="61" font-family="${FONT_SANS}" font-weight="900" font-size="11" fill="#8a2a10" letter-spacing="2">MARY</text>
  <text x="420" y="46" text-anchor="end" font-family="${FONT_SANS}" font-weight="900" font-size="11" fill="#8a2a10">水果</text>
  <text x="420" y="61" text-anchor="end" font-family="${FONT_SANS}" font-weight="900" font-size="11" fill="#8a2a10">瑪莉</text>
  ${screw(35, 29, 3.4)}${screw(429, 29, 3.4)}${screw(35, 75, 3.4)}${screw(429, 75, 3.4)}

  <!-- 投幣器（金屬）：點一下投入一枚 NT$10 -->
  <g class="btn" id="btn-coin" data-act="coin" role="button" tabindex="0" aria-label="投入一枚十元硬幣">
    <rect x="454" y="12" width="122" height="80" rx="5" fill="url(#gMech)" stroke="#3a3d40" stroke-width="2"/>
    <rect x="460" y="18" width="110" height="68" rx="3" fill="#5a5f64" opacity=".35"/>
    <circle id="slotLamp" cx="482" cy="25" r="4" fill="#4a1a10" stroke="#1a0a06" stroke-width="1"/>
    <circle id="slotLampLit" class="slotlit" cx="482" cy="25" r="17" fill="url(#gSlotLamp)" opacity="0"/>
    <rect x="474" y="33" width="16" height="46" rx="3" fill="#050302" stroke="#2a2d30" stroke-width="2"/>
    <rect id="slotLight" x="480" y="37" width="4" height="38" rx="2" fill="#ff9a3a" opacity="0"/>
    <rect x="474" y="33" width="16" height="46" rx="3" fill="none" stroke="#f4f4f0" stroke-width="1" opacity=".55"/>
    <rect x="504" y="30" width="54" height="16" rx="3" fill="url(#gChrome)" stroke="#33363a" stroke-width="1.4"/>
    <text x="531" y="42" text-anchor="middle" font-family="${FONT_SANS}" font-weight="900" font-size="10" fill="#2a2d30">退幣</text>
    <circle cx="531" cy="64" r="13" fill="url(#gChrome)" stroke="#33363a" stroke-width="1.4"/>
    <text x="531" y="69" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="14" fill="#2a2d30">10</text>
    <rect class="hit" x="448" y="8" width="132" height="88" fill="transparent"/>
    ${screw(464, 22, 2.6)}${screw(566, 22, 2.6)}${screw(464, 82, 2.6)}${screw(566, 82, 2.6)}
  </g>

  <!-- 玻璃面板：金屬框 -->
  <rect x="18" y="98" width="564" height="714" rx="6" fill="url(#gBrass)"/>
  <rect x="24" y="104" width="552" height="702" rx="4" fill="#0a0706"/>
  ${screw(30, 104, 4)}${screw(570, 104, 4)}${screw(30, 806, 4)}${screw(570, 806, 4)}
  <g clip-path="url(#cpGlass)">
    <rect x="26" y="106" width="548" height="698" fill="url(#gBoard)"/>

    <!-- 上緣兩組紅色七段顯示 -->
    <rect x="34" y="112" width="262" height="62" rx="4" fill="#090504" stroke="#4a331a" stroke-width="1.4"/>
    <rect x="304" y="112" width="262" height="62" rx="4" fill="#090504" stroke="#4a331a" stroke-width="1.4"/>
    <g font-family="${FONT_SANS}" font-weight="900" font-size="12" text-anchor="middle" fill="#ffb02e">
      <text x="165" y="127">中獎分　BONUS-WIN</text><text x="435" y="127">投幣分　CREDIT</text>
    </g>
    <g id="leds"></g>

    <!-- 24 個跑燈 -->
    <g id="lamps">${LAMPS.map((_, i) => lampCellMarkup(i)).join('')}</g>

    <!-- 中央印刷圖案 -->
    <g id="center">
      <rect x="107" y="257" width="386" height="386" rx="6" fill="url(#gCenter)" stroke="#f2f2ec" stroke-width="5"/>
      <rect x="114" y="264" width="372" height="372" rx="3" fill="none" stroke="#d2262f" stroke-width="2"/>
      <g clip-path="url(#cpCenter)">${rays}</g>
      <g font-family="${FONT_SERIF}" font-weight="900" text-anchor="middle">
        <text x="303" y="324" font-size="54" letter-spacing="8" fill="#000" opacity=".45">小瑪莉</text>
        <text x="300" y="321" font-size="54" letter-spacing="8" fill="#ffd23c" stroke="#b3141c" stroke-width="5.5" paint-order="stroke" stroke-linejoin="round">小瑪莉</text>
      </g>
      <text x="300" y="340" text-anchor="middle" font-family="${FONT_SANS}" font-weight="900" font-size="12" letter-spacing="6" fill="#fff6d0">FRUIT MARY</text>
      <use href="#sym-apple" x="140" y="346" width="54" height="54"/>
      <use href="#sym-bell" x="406" y="346" width="54" height="54"/>
      <g transform="translate(263 346) scale(.72)">${MARY_ART}</g>
      <!-- 比大小的數字顯示（猜大小時顯示開出的數字） -->
      <rect x="262" y="432" width="76" height="40" rx="4" fill="#090504" stroke="#4a331a" stroke-width="1.4"/>
      <g id="duDigits"></g>
      <!-- 狀態顯示窗 -->
      <rect x="133" y="484" width="334" height="76" rx="6" fill="#0a0504" stroke="url(#gBrass)" stroke-width="4"/>
      <g id="msg" font-family="${FONT_SANS}" font-weight="900" text-anchor="middle" fill="#ffb02e" filter="url(#fGlow)">
        <text id="msg1" x="300" y="520" font-size="27">請投幣</text>
        <text id="msg2" x="300" y="545" font-size="15" font-weight="700" fill="#ff8a2a">NT$10 一枚</text>
      </g>
      <g font-family="${FONT_SANS}" font-weight="800" text-anchor="middle" fill="#fff6d0" stroke="#0e3a78" stroke-width="2.6" paint-order="stroke" font-size="12">
        <text x="300" y="584">ONCE MORE 再送 1～3 個燈</text>
        <text x="300" y="602">猜小 1–6　猜大 8–13　猜對加倍</text>
        <text x="300" y="620">小圖 ×2　大圖 ×最高倍　BAR 100 最大獎</text>
      </g>
    </g>

    <!-- 棋盤下緣：最高倍數 / 圖案 / 各門押分 -->
    <rect x="26" y="722" width="548" height="82" fill="#e9dfb8"/>
    <rect x="26" y="722" width="548" height="3" fill="#6e5026"/>
    ${payRow}
  </g>

  <!-- 玻璃反光與老化顆粒 -->
  <g pointer-events="none" clip-path="url(#cpGlass)">
    ${grainUrl ? `<rect x="26" y="106" width="548" height="698" fill="url(#pGrain)" opacity=".5"/>` : ''}
    <rect x="26" y="106" width="548" height="698" fill="#c89a40" opacity=".05"/>
    <path d="M26 106H340L170 804H26Z" fill="url(#gGlass)"/>
    <path d="M370 106H402L232 804H200Z" fill="#fff" opacity=".045"/>
    <path d="${scratches(26, 548, 698, 11, 120).replace(/M([\d.]+) ([\d.]+)/g, (_, a, b) => `M${(+a + 26).toFixed(1)} ${(+b + 106).toFixed(1)}`)}" stroke="#fff" stroke-opacity=".16" stroke-width=".6" fill="none"/>
  </g>

  <!-- 操作面板（印刷面板 + 圓形街機鍵） -->
  <rect x="20" y="818" width="560" height="224" rx="6" fill="#1a0e07" stroke="url(#gBrass)" stroke-width="3.5"/>
  <rect x="26" y="824" width="548" height="212" rx="3" fill="url(#gPlate)" stroke="#3a2c1a" stroke-width="1.2"/>
  ${labelBlock(48, 70, 830, 20, '#f2c21c', 'PAY', '#3a2a06')}
  ${labelBlock(134, 150, 830, 20, '#f2c21c', 'WIN ↔ CREDIT', '#3a2a06')}
  ${labelBlock(306, 150, 830, 20, '#c8231f', 'DOUBLE UP BET', '#fff')}
  ${labelBlock(482, 70, 830, 20, '#1f4fb0', 'START', '#fff')}
  <g id="controls">
    ${roundButton({ act: 'cash', cx: 83, cy: 886, id: 'btn-cash', aria: '退幣，領回所有分數' })}
    ${roundButton({ act: 'toCredit', cx: 170, cy: 886, id: 'btn-tocredit', aria: '得分轉到投幣分數，按住可連續轉' })}
    ${roundButton({ act: 'toWin', cx: 257, cy: 886, id: 'btn-towin', aria: '投幣分數轉到得分，按住可連續轉' })}
    ${roundButton({ act: 'small', cx: 343, cy: 886, color: 'red', id: 'btn-small', aria: '猜小（1 到 6）' })}
    ${roundButton({ act: 'large', cx: 430, cy: 886, color: 'red', id: 'btn-large', aria: '猜大（8 到 13）' })}
    ${roundButton({ act: 'start', cx: 517, cy: 886, id: 'btn-start', aria: '開始，啟動跑燈；有得分時按下可把得分轉入投幣分數' })}
  </g>
  <g>
    ${caption(83, 934, '退幣')}${caption(170, 934, '得分→分數')}${caption(257, 934, '分數→得分')}
    ${caption(343, 934, '猜小 1–6')}${caption(430, 934, '猜大 8–13')}${caption(517, 934, '開始')}
  </g>
  <path d="M34 940H566" stroke="#3a2c1a" stroke-opacity=".35" stroke-width="1"/>
  <g id="bets">${betBtns}</g>
  ${screw(34, 832, 3)}${screw(566, 832, 3)}${screw(34, 1028, 3)}${screw(566, 1028, 3)}

  <!-- 現金牌與音效開關 -->
  <rect x="22" y="1048" width="556" height="30" rx="4" fill="#1b0f08" fill-opacity=".6"/>
  <g class="btn" id="btn-sound" data-act="sound" role="switch" tabindex="0" aria-checked="true" aria-label="音效開關">
    <rect x="30" y="1048" width="104" height="30" fill="transparent" class="hit"/>
    <text x="36" y="1068" font-family="${FONT_SANS}" font-weight="900" font-size="13" fill="#e8cf8d">音效</text>
    <rect x="76" y="1054" width="46" height="18" rx="9" fill="#0b0705" stroke="url(#gBrass)" stroke-width="2"/>
    <g class="cap"><circle id="soundKnob" cx="99" cy="1063" r="7.5" fill="url(#gChrome)" stroke="#333" stroke-width="1"/></g>
  </g>
  <rect x="170" y="1048" width="262" height="30" rx="4" fill="url(#gBrass)" stroke="#4a3210" stroke-width="1.5"/>
  <rect x="174" y="1051" width="254" height="24" rx="3" fill="#0a0504"/>
  <text x="184" y="1068" font-family="${FONT_SANS}" font-weight="900" font-size="13" fill="#e8b24a">身上現金 NT$</text>
  <g id="pocketLed"></g>
  <!-- 機台貼紙（實機常見的黃底黑字警示貼紙，邊角磨損） -->
  <g transform="rotate(-1.2 505 1063)">
    <rect x="440" y="1050" width="132" height="27" rx="2" fill="#f0c020" stroke="#3a2a06" stroke-width="1"/>
    <path d="M440 1050H572V1055H440Z" fill="#1c1c1c" opacity=".9"/>
    <path d="M444 1050l8 5M460 1050l8 5M476 1050l8 5M492 1050l8 5M508 1050l8 5M524 1050l8 5M540 1050l8 5M556 1050l8 5" stroke="#f0c020" stroke-width="3"/>
    <text x="506" y="1067" text-anchor="middle" font-family="${FONT_SANS}" font-weight="900" font-size="9.5" fill="#241a04">本機為娛樂類機台</text>
    <text x="506" y="1075.500" text-anchor="middle" font-family="${FONT_SANS}" font-weight="900" font-size="8.5" fill="#241a04">不得兌換現金　無真實金錢</text>
    <path d="M566 1077l6-6v6Z" fill="#8a6a10" opacity=".7"/>
  </g>

  <!-- 金屬退幣盤 -->
  <g transform="translate(0 16)">
    <g id="tray" role="button" tabindex="0" aria-label="退幣盤，點一下取走硬幣" data-act="scoop">
      <path d="M52 1084H548L566 1146H34Z" fill="#1a0f08"/>
      <path d="M58 1082H542L558 1136H42Z" fill="url(#gChrome)" stroke="#3a3d40" stroke-width="2"/>
      <rect x="96" y="1082" width="408" height="56" rx="12" fill="url(#gTray)" stroke="#1c1e20" stroke-width="3"/>
      <rect x="104" y="1086" width="392" height="46" rx="10" fill="#15171a"/>
      <g clip-path="url(#cpTray)" transform="translate(0 -4)">
        <rect x="104" y="1090" width="392" height="46" fill="url(#gTray)" opacity=".55"/>
        <path d="M118 1100H300M330 1100H470" stroke="#fff" stroke-opacity=".12" stroke-width="2"/>
        <g id="trayCoins"></g>
      </g>
      <path d="M42 1136H558L566 1146H34Z" fill="url(#gChrome)" opacity=".9"/>
      ${screw(70, 1112, 3.4)}${screw(530, 1112, 3.4)}
      <rect x="34" y="1074" width="532" height="76" fill="transparent" class="hit"/>
    </g>
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
    win: sevenSegment(leds, { digits: 5, x: 0, y: 0, scale: 0.8, on: '#ff3b1f' }),
    credit: sevenSegment(leds, { digits: 5, x: 0, y: 0, scale: 0.8, on: '#ff3b1f' }),
  };
  // 五位數寬 = (5*38-8)*0.8 = 145.6，置中於各自的 262 寬盒子；高 44*0.8 = 35.2
  led.win.el.setAttribute('transform', `translate(${34 + (262 - 145.6) / 2} 132) scale(0.8)`);
  led.credit.el.setAttribute('transform', `translate(${304 + (262 - 145.6) / 2} 132) scale(0.8)`);
  const pocketLed = sevenSegment(el.querySelector('#pocketLed'), { digits: 5, x: 304, y: 1053, scale: 0.4, on: '#ffb02e', off: '#241406', gap: 6 });
  const duDigits = sevenSegment(el.querySelector('#duDigits'), { digits: 2, x: 0, y: 0, scale: 0.7, on: '#ff3b1f' });
  duDigits.el.setAttribute('transform', `translate(${300 - 47.6 / 2} 437) scale(0.7)`);
  const betDigits = {};
  BET_LAYOUT.forEach((id, i) => {
    const x = 30 + i * colW;
    betDigits[id] = sevenSegment(el.querySelector(`#bw-${id}`), { digits: 2, x: 0, y: 0, scale: 0.5, on: '#ff3b1f' });
    betDigits[id].el.setAttribute('transform', `translate(${x + (colW - 34) / 2} 778) scale(0.5)`);
  });
  led.credit.set(''); led.win.set(''); pocketLed.set(''); duDigits.set('');

  const lamps = LAMPS.map((_, i) => el.querySelector(`#lamp-${i}`));
  const buttons = {};
  el.querySelectorAll('.btn').forEach((b) => { buttons[b.id] = b; });

  return {
    svg: el,
    lamps,
    led,
    pocketLed,
    duDigits,
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
