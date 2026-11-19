// 美術資源：全部為程式產生的原創 SVG / Canvas 圖形（無外部圖檔、無表情符號）。
// 木紋與紙張顆粒以種子亂數在 Canvas 產生一次，之後當成靜態圖片使用（行動裝置效能佳）。

export const SVGNS = 'http://www.w3.org/2000/svg';

/* ---------- 色彩工具 ---------- */
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/* ---------- 種子亂數與雜訊 ---------- */
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeNoise(seed) {
  const rnd = mulberry32(seed);
  const SIZE = 256;
  const grid = new Float32Array(SIZE * SIZE).map(() => rnd());
  const at = (x, y) => grid[((y & 255) << 8) | (x & 255)];
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const tx = smooth(x - xi), ty = smooth(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
}

/** 深色核桃木紋（直紋）。回傳 data URL；失敗（無 canvas）回傳 null。 */
export function woodTexture(w = 300, h = 590, seed = 1980) {
  try {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(w, h);
    const n1 = makeNoise(seed), n2 = makeNoise(seed + 7), n3 = makeNoise(seed + 13);
    const dark = [34, 18, 10], mid = [78, 44, 24], light = [112, 68, 38];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const warp = n1(x * 0.012, y * 0.0035) * 7 + n2(x * 0.03, y * 0.01) * 1.2;
        const ring = Math.sin(x * 0.17 + warp * 3.2) * 0.5 + 0.5;
        const fiber = n3(x * 1.3, y * 0.045);
        const pore = n2(x * 0.9 + 40, y * 0.12) > 0.82 ? 0.35 : 0;
        let t = ring * 0.62 + fiber * 0.38 - pore;
        t = Math.max(0, Math.min(1, t));
        const c = t < 0.5 ? mix(dark, mid, t * 2) : mix(mid, light, (t - 0.5) * 2);
        const i = (y * w + x) * 4;
        img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL('image/jpeg', 0.82);
  } catch { return null; }
}
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** 舊印刷品的紙張顆粒與髒污（透明 PNG，可平鋪）。 */
export function grainTexture(size = 192, seed = 42) {
  try {
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(size, size);
    const rnd = mulberry32(seed);
    const nz = makeNoise(seed + 3);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const speck = rnd() < 0.035 ? 1 : 0;
        const blot = nz(x * 0.05, y * 0.05);
        const a = speck ? 70 + rnd() * 60 : Math.max(0, (blot - 0.55) * 90);
        img.data[i] = 70; img.data[i + 1] = 48; img.data[i + 2] = 20; img.data[i + 3] = a;
      }
    }
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL('image/png');
  } catch { return null; }
}

/** 磨石子地板（電動間常見的地面）：灰米底色 + 深淺碎石，可平鋪。 */
export function terrazzoTexture(size = 200, seed = 1985) {
  try {
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const ctx = cv.getContext('2d');
    const rnd = mulberry32(seed);
    ctx.fillStyle = '#8f8678'; ctx.fillRect(0, 0, size, size);
    const nz = makeNoise(seed + 5);
    const img = ctx.getImageData(0, 0, size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const v = (nz(x * 0.08, y * 0.08) - 0.5) * 26;
      const i = (y * size + x) * 4;
      img.data[i] += v; img.data[i + 1] += v; img.data[i + 2] += v * 0.9;
    }
    ctx.putImageData(img, 0, 0);
    const chips = ['#3a3430', '#d9d2c4', '#6b4a38', '#b9ad98', '#2a2622', '#e8e2d4', '#7a6a56'];
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = chips[Math.floor(rnd() * chips.length)];
      ctx.globalAlpha = 0.55 + rnd() * 0.4;
      const x = rnd() * size, y = rnd() * size, r = 1 + rnd() * 4.2;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + rnd() * 0.6, rr = r * (0.6 + rnd() * 0.6);
        ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    return cv.toDataURL('image/jpeg', 0.8);
  } catch { return null; }
}

/** 種子亂數產生的刮痕線條 path 字串。 */
export function scratches(count, w, h, seed = 7, maxLen = 90) {
  const rnd = mulberry32(seed);
  let d = '';
  for (let i = 0; i < count; i++) {
    const x = rnd() * w, y = rnd() * h;
    const a = (rnd() - 0.5) * 1.1 + (rnd() < 0.5 ? 0 : Math.PI / 2.6);
    const len = 12 + rnd() * maxLen;
    d += `M${x.toFixed(1)} ${y.toFixed(1)}l${(Math.cos(a) * len).toFixed(1)} ${(Math.sin(a) * len).toFixed(1)}`;
  }
  return d;
}

/* ---------- 星形 ---------- */
export function starPoints(cx, cy, r, inner = 0.46) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * inner;
    pts.push(`${(cx + Math.cos(ang) * rr).toFixed(2)},${(cy + Math.sin(ang) * rr).toFixed(2)}`);
  }
  return pts.join(' ');
}

/* ---------- 水果與圖案（<symbol>，viewBox 0 0 64 64） ---------- */
export const SYMBOL_ART = {
  apple: `
    <path d="M32 21C25 12 10 16 10 33c0 14 10 25 18 23 2-.5 3-1 4-1s2 .5 4 1c8 2 18-9 18-23 0-17-15-21-22-12z" fill="url(#gApple)" stroke="#5e0c0c" stroke-width="2" stroke-linejoin="round"/>
    <path d="M32 21c0-6 2-10 6-13" fill="none" stroke="#4a2a12" stroke-width="3" stroke-linecap="round"/>
    <path d="M35 15c3-8 13-8 16-4-3 7-11 8-16 4z" fill="#2f8a2f" stroke="#17501a" stroke-width="1.6"/>
    <ellipse cx="21" cy="31" rx="3.6" ry="8" fill="#fff" opacity=".35" transform="rotate(12 21 31)"/>`,
  orange: `
    <circle cx="32" cy="35" r="22" fill="url(#gOrange)" stroke="#8a3a05" stroke-width="2"/>
    <g fill="#c8620c" opacity=".45"><circle cx="22" cy="40" r="1"/><circle cx="30" cy="46" r="1"/><circle cx="41" cy="42" r="1"/><circle cx="37" cy="52" r="1"/><circle cx="46" cy="33" r="1"/><circle cx="24" cy="50" r="1"/></g>
    <path d="M32 14c-3-6 5-9 10-5-3 5-7 6-10 5z" fill="#2f8a2f" stroke="#17501a" stroke-width="1.5"/>
    <ellipse cx="22" cy="27" rx="4" ry="7" fill="#fff" opacity=".32" transform="rotate(25 22 27)"/>`,
  papaya: `
    <path d="M30 8c14 1 27 14 27 31 0 11-8 17-17 17C23 56 8 40 8 24 8 14 18 7 30 8z" fill="url(#gPapaya)" stroke="#0b3a22" stroke-width="2" stroke-linejoin="round"/>
    <path d="M30 8c-2-3-1-5 2-6" fill="none" stroke="#5a3a18" stroke-width="3" stroke-linecap="round"/>
    <path d="M17 18c10 0 22 11 28 26" fill="none" stroke="#5fd08c" stroke-width="3" opacity=".35" stroke-linecap="round"/>`,
  bell: `
    <path d="M32 6a4.5 4.5 0 0 1 4.5 4.5C46 13 51 22 51 34c0 8 3 12 7 15H6c4-3 7-7 7-15 0-12 5-21 14.500-23.500A4.500 4.500 0 0 1 32 6z" fill="url(#gBell)" stroke="#6b4a08" stroke-width="2" stroke-linejoin="round"/>
    <rect x="5" y="48" width="54" height="5" rx="2.5" fill="#c99a1c" stroke="#6b4a08" stroke-width="1.5"/>
    <circle cx="32" cy="57" r="5" fill="#e0b132" stroke="#6b4a08" stroke-width="1.5"/>
    <path d="M20 22c-3 5-4 11-4 17" stroke="#fff6c0" stroke-width="3" fill="none" opacity=".55" stroke-linecap="round"/>`,
  watermelon: `
    <path d="M3 24a29 29 0 0 0 58 0z" fill="#1d6b2b" stroke="#0f3f18" stroke-width="2" stroke-linejoin="round"/>
    <path d="M8 24a24 24 0 0 0 48 0z" fill="#f4f1d8"/>
    <path d="M10.500 24a21.500 21.500 0 0 0 43 0z" fill="url(#gMelon)"/>
    <g fill="#201010"><ellipse cx="22" cy="33" rx="1.8" ry="3" transform="rotate(-20 22 33)"/><ellipse cx="32" cy="38" rx="1.8" ry="3"/><ellipse cx="42" cy="33" rx="1.8" ry="3" transform="rotate(20 42 33)"/><ellipse cx="27" cy="45" rx="1.6" ry="2.6" transform="rotate(-10 27 45)"/><ellipse cx="38" cy="45" rx="1.6" ry="2.6" transform="rotate(10 38 45)"/></g>`,
  star: `
    <polygon points="${starPoints(19, 34, 17)}" fill="url(#gStar)" stroke="#a45a00" stroke-width="2" stroke-linejoin="round"/>
    <polygon points="${starPoints(45, 34, 17)}" fill="url(#gStar)" stroke="#a45a00" stroke-width="2" stroke-linejoin="round"/>`,
  seven: `
    <text x="32" y="50" text-anchor="middle" font-family="Impact,'Arial Black','Haettenschweiler',sans-serif" font-weight="900" font-size="50" letter-spacing="-3" fill="url(#gSeven)" stroke="#5e0c1c" stroke-width="2.6" paint-order="stroke" stroke-linejoin="round">77</text>`,
  bar: `
    <g font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="12" text-anchor="middle">
      <rect x="6" y="8" width="52" height="15" rx="2.5" fill="#2b2b30" stroke="#0c0c0e" stroke-width="1.5"/><text x="32" y="20" fill="#f1f1ee">BAR</text>
      <rect x="6" y="25" width="52" height="15" rx="2.5" fill="#2b2b30" stroke="#0c0c0e" stroke-width="1.5"/><text x="32" y="37" fill="#f1f1ee">BAR</text>
      <rect x="6" y="42" width="52" height="15" rx="2.5" fill="#2b2b30" stroke="#0c0c0e" stroke-width="1.5"/><text x="32" y="54" fill="#f1f1ee">BAR</text>
    </g>`,
  bar50: `
    <g font-family="Arial Black,Arial,sans-serif" font-weight="900" text-anchor="middle">
      <rect x="6" y="6" width="52" height="15" rx="2.5" fill="#2b2b30" stroke="#0c0c0e" stroke-width="1.5"/><text x="32" y="18" font-size="12" fill="#f1f1ee">BAR</text>
      <text x="32" y="45" font-size="25" fill="#2b2b30" stroke="#f4efe0" stroke-width="2" paint-order="stroke">50</text>
      <rect x="6" y="43" width="52" height="15" rx="2.5" fill="#2b2b30" stroke="#0c0c0e" stroke-width="1.5"/><text x="32" y="55" font-size="12" fill="#f1f1ee">BAR</text>
    </g>`,
  bar100: `
    <g font-family="Arial Black,Arial,sans-serif" font-weight="900" text-anchor="middle">
      <rect x="6" y="6" width="52" height="15" rx="2.5" fill="#2b2b30" stroke="#0c0c0e" stroke-width="1.5"/><text x="32" y="18" font-size="12" fill="#f1f1ee">BAR</text>
      <text x="32" y="44" font-size="22" fill="#2b2b30" stroke="#f4efe0" stroke-width="2" paint-order="stroke">100</text>
      <rect x="6" y="43" width="52" height="15" rx="2.5" fill="#2b2b30" stroke="#0c0c0e" stroke-width="1.5"/><text x="32" y="55" font-size="12" fill="#f1f1ee">BAR</text>
    </g>`,
  oncemore: `
    <rect x="3" y="9" width="58" height="46" rx="6" fill="#16331a" stroke="#0a1a0c" stroke-width="2"/>
    <g font-family="Arial Black,Impact,sans-serif" font-weight="900" text-anchor="middle" stroke="#0a3a12" stroke-width="3.2" paint-order="stroke" stroke-linejoin="round">
      <text x="32" y="30" font-size="19" fill="#9cff4a">ONCE</text>
      <text x="32" y="50" font-size="19" fill="#d8ff3c">MORE</text>
    </g>`,
};

export function symbolDefs() {
  const grad = (id, stops, x2 = 0, y2 = 1) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const rgrad = (id, stops, cx = 0.35, cy = 0.3) =>
    `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="0.8">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;
  const defs = [
    rgrad('gApple', [[0, '#ff6a5a'], [0.45, '#d92020'], [1, '#8d0d12']]),
    rgrad('gOrange', [[0, '#ffc15a'], [0.5, '#f58a14'], [1, '#c4560a']]),
    grad('gPapaya', [[0, '#35a870'], [0.5, '#1c7a4a'], [1, '#0d4a2b']], 1, 1),
    grad('gBell', [[0, '#fff0a0'], [0.4, '#e9bc2c'], [1, '#a8780c']], 1, 0.4),
    rgrad('gMelon', [[0, '#ff7d72'], [1, '#d7242f']], 0.5, 0.1),
    rgrad('gStar', [[0, '#fff49a'], [0.6, '#ffd21f'], [1, '#f09a10']]),
    grad('gSeven', [[0, '#ff6a78'], [0.55, '#e2203c'], [1, '#a1102a']]),
  ].join('');
  const syms = Object.entries(SYMBOL_ART)
    .map(([id, body]) => `<symbol id="sym-${id}" viewBox="0 0 64 64" overflow="visible">${body}</symbol>`).join('');
  return defs + syms;
}

/* ---------- 小瑪莉人物（原創簡筆插畫）：座標 0..100 x 0..110 ---------- */
export const MARY_ART = `
  <g stroke-linejoin="round" stroke-linecap="round">
    <path d="M12 108c2-20 18-27 38-27s36 7 38 27z" fill="#d2262f" stroke="#6e0d14" stroke-width="2"/>
    <path d="M38 82l12 14 12-14z" fill="#fff4d6" stroke="#6e0d14" stroke-width="1.6"/>
    <rect x="43" y="68" width="14" height="16" rx="5" fill="#f2c9a2" stroke="#8a5a30" stroke-width="1.6"/>
    <ellipse cx="50" cy="44" rx="33" ry="34" fill="#17100e" stroke="#000" stroke-width="2"/>
    <ellipse cx="50" cy="50" rx="27" ry="29" fill="#f6d3ae" stroke="#8a5a30" stroke-width="1.8"/>
    <path d="M22 44c4-16 14-22 28-22s24 6 28 22c-6-8-16-12-28-12s-22 4-28 12z" fill="#17100e" stroke="#000" stroke-width="1.6"/>
    <path d="M23 46c2 10 2 18 0 26M77 46c-2 10-2 18 0 26" stroke="#17100e" stroke-width="7" fill="none"/>
    <ellipse cx="39" cy="52" rx="3.2" ry="4.4" fill="#2a1a14"/><ellipse cx="61" cy="52" rx="3.2" ry="4.4" fill="#2a1a14"/>
    <circle cx="40.200" cy="50.500" r="1.100" fill="#fff"/><circle cx="62.200" cy="50.500" r="1.100" fill="#fff"/>
    <path d="M33 46c3-3 8-3 11-1M56 45c3-2 8-2 11 1" stroke="#2a1a14" stroke-width="1.8" fill="none"/>
    <ellipse cx="33" cy="63" rx="5.500" ry="3.200" fill="#ee8f86" opacity=".7"/><ellipse cx="67" cy="63" rx="5.500" ry="3.200" fill="#ee8f86" opacity=".7"/>
    <path d="M44 67c3 4 9 4 12 0" stroke="#a52a2a" stroke-width="2.200" fill="none"/>
    <g fill="#d2262f" stroke="#6e0d14" stroke-width="1.6"><path d="M14 28l-12-8 2 18z"/><path d="M14 28l12-9-1 17z"/><circle cx="14" cy="28" r="4.500"/><path d="M86 28l12-8-2 18z"/><path d="M86 28l-12-9 1 17z"/><circle cx="86" cy="28" r="4.500"/></g>
  </g>`;

/* ---------- 七段顯示器 ---------- */
const SEG = {
  a: [[3, 0], [27, 0], [23, 4], [7, 4]],
  b: [[28, 1], [28, 21], [24, 19], [24, 5]],
  c: [[28, 23], [28, 43], [24, 39], [24, 25]],
  d: [[3, 44], [27, 44], [23, 40], [7, 40]],
  e: [[2, 23], [2, 43], [6, 39], [6, 25]],
  f: [[2, 1], [2, 21], [6, 19], [6, 5]],
  g: [[4, 22], [8, 20], [22, 20], [26, 22], [22, 24], [8, 24]],
};
const DIGIT_SEGS = {
  0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g',
};

/**
 * 在 parent 內建立 n 位七段顯示。回傳 { el, set(value) }。
 * @param {string} on 亮起顏色；off 為微弱殘影
 */
export function sevenSegment(parent, { digits, x, y, scale = 1, on = '#ff3b1f', off = '#2b0c08', gap = 8 }) {
  const g = document.createElementNS(SVGNS, 'g');
  g.setAttribute('transform', `translate(${x} ${y}) scale(${scale})`);
  const cells = [];
  for (let i = 0; i < digits; i++) {
    const dg = document.createElementNS(SVGNS, 'g');
    dg.setAttribute('transform', `translate(${i * (30 + gap)} 0) skewX(-4)`);
    const segs = {};
    for (const [k, pts] of Object.entries(SEG)) {
      const p = document.createElementNS(SVGNS, 'polygon');
      p.setAttribute('points', pts.map((q) => q.join(',')).join(' '));
      p.setAttribute('fill', off);
      dg.appendChild(p);
      segs[k] = p;
    }
    g.appendChild(dg);
    cells.push(segs);
  }
  parent.appendChild(g);
  let last = null;
  return {
    el: g,
    set(value) {
      const str = value == null ? '' : String(value);
      if (str === last) return;
      last = str;
      const padded = str.length > digits ? '9'.repeat(digits) : str.padStart(digits, ' ');
      for (let i = 0; i < digits; i++) {
        const lit = DIGIT_SEGS[padded[i]] || '';
        for (const k of Object.keys(SEG)) cells[i][k].setAttribute('fill', lit.includes(k) ? on : off);
      }
    },
  };
}
