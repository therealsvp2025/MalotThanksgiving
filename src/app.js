(() => {
'use strict';
const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const D = JSON.parse($('data').textContent);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const addCss = href => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); };
addCss('https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');   // added by script so it never blocks the first paint
const idle = window.requestIdleCallback ? f => requestIdleCallback(f, {timeout: 1500}) : f => setTimeout(f, 150);

/* ============ Tabs (one helper for every tab list) ============ */
function tabs(list, onSelect) {
  const ts = [...list.querySelectorAll('[role=tab]')];
  const select = (t, focus) => {
    const ctl = t.getAttribute('aria-controls');
    for (const x of ts) {
      const on = x === t, id = x.getAttribute('aria-controls');
      x.setAttribute('aria-selected', on);
      x.tabIndex = on ? 0 : -1;
      if (id !== ctl) { const p = $(id); if (p) p.hidden = true; }
    }
    const p = $(ctl);
    if (p) p.hidden = false;
    if (onSelect) onSelect(t);
    if (focus) t.focus();
    else {
      if (list.scrollWidth > list.clientWidth + 2) t.scrollIntoView({inline: 'center', block: 'nearest'});   // phone: keep the chosen chip in view
      if (list.id === 'tabs') {   // switching sections: start the new one at the top of the panel
        const top = $('panel').getBoundingClientRect().top + window.scrollY;
        if (window.scrollY > top) window.scrollTo(0, top);
      }
    }
  };
  list.addEventListener('click', e => {
    const t = e.target.closest('[role=tab]');
    if (t && list.contains(t)) select(t);
  });
  list.addEventListener('keydown', e => {
    const i = ts.indexOf(document.activeElement);
    if (i < 0) return;
    const n = ts.length;
    const k = e.key;
    const j = k === 'ArrowRight' || k === 'ArrowDown' ? (i + 1) % n
            : k === 'ArrowLeft' || k === 'ArrowUp' ? (i - 1 + n) % n
            : k === 'Home' ? 0 : k === 'End' ? n - 1 : -1;
    if (j >= 0) { e.preventDefault(); select(ts[j], true); }
  });
  const sel = ts.find(t => t.getAttribute('aria-selected') === 'true') || ts[0];
  ts.forEach(t => { t.tabIndex = t === sel ? 0 : -1; });
  return select;
}

/* ============ Place lists (rendered on demand) ============ */
const useIcon = id => {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('class', 'ic');
  s.setAttribute('aria-hidden', 'true');
  const u = document.createElementNS(NS, 'use');
  u.setAttribute('href', id);
  s.appendChild(u);
  return s;
};
const link = (href, title, label, icon) => {
  const a = el('a', 'ext');
  a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
  a.title = title; a.setAttribute('aria-label', label);
  a.appendChild(useIcon(icon));
  return a;
};
function row(it, rank) {
  const [name, loc, miles, rating, pid, count, fav] = it;     // fav: a funny verdict for places the family has been and loved
  const r = el('div', (rank ? 'row rk' : 'row') + (fav ? ' fav' : ''));
  if (rank) r.appendChild(el('span', 'rank', rank));
  const nm = el('span', 'nm');
  if (fav) nm.appendChild(el('span', 'stamp', 'Stavan Approved'));   // small static stamp above the title
  nm.append(name);
  nm.appendChild(el('small', '', `${loc ? loc + ', ' : ''}~${miles} mi from Florence${count ? ` (${count} reviews)` : ''}`));
  if (fav) nm.appendChild(el('small', 'fav-note', fav));
  const st = el('span', 'stars');
  const star = el('span', '', '\u2605');
  star.setAttribute('aria-hidden', 'true');
  st.append(star, ' ' + rating, el('small', '', ' / 5'));
  const dest = name.replace(/\s*\([^)]*\)/g, '');
  const links = el('span', 'links');
  links.append(
    link(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest)}&query_place_id=${pid}`, 'Google reviews', `Google reviews for ${name}`, '#i-ext'),
    link(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&destination_place_id=${pid}`, 'Directions', `Directions to ${name}`, '#i-nav'));
  r.append(nm, st, links);
  return r;
}
const rowsFrag = (rows, ranked, start = 0) => {
  const f = document.createDocumentFragment();
  rows.forEach((it, i) => f.appendChild(row(it, ranked ? start + i + 1 : 0)));
  return f;
};

const catCache = [];
function showCat(i) {
  if (!catCache[i]) {
    const [, , title, rows] = D.r[i];
    const box = el('div');
    box.append(el('h3', 'grp', title), rowsFrag(rows.filter(r => r[6]).concat(rows.filter(r => !r[6])), true));
    catCache[i] = box;
  }
  $('cat-panel').replaceChildren(catCache[i]);
  $('cat-panel').setAttribute('aria-labelledby', 'ct-' + D.r[i][0]);
}
const renderers = {
  'sub-activities'() {
    const box = $('act-list');
    for (const [title, rows] of D.a) box.append(el('h3', 'grp', title), rowsFrag(rows, true));
  },
  'sub-breweries'() { $('brew-list').appendChild(rowsFrag(D.b, true)); },
  'sub-restaurants'() {
    const chips = $('chips');
    D.r.forEach(([id, label], i) => {
      const b = el('button', '', label);
      if (D.r[i][3].some(r => r[6])) { const st = el('span', 'chip-star', ' \u2605'); st.setAttribute('aria-hidden', 'true'); b.appendChild(st); }
      b.type = 'button'; b.id = 'ct-' + id; b.dataset.i = i;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', 'cat-panel');
      b.setAttribute('aria-selected', i === 0);
      chips.appendChild(b);
    });
    tabs(chips, t => showCat(+t.dataset.i));
    showCat(0);
  }
};
const ensured = new Set();
const ensure = id => {
  if (renderers[id] && !ensured.has(id)) { ensured.add(id); renderers[id](); }
};
tabs($('tabs'), t => {
  if (t.getAttribute('aria-controls') === 'meals') requestAnimationFrame(() => growAll());
  if (t.getAttribute('aria-controls') === 'outings')
    ensure($('outing-tabs').querySelector('[aria-selected=true]').getAttribute('aria-controls'));
});
tabs($('outing-tabs'), t => ensure(t.getAttribute('aria-controls')));
tabs($('live-tabs'));
tabs($('sports-tabs'));
idle(() => { ensure('sub-activities'); idle(() => { ensure('sub-breweries'); idle(() => ensure('sub-restaurants')); }); });

/* ============ Countdown ============ */
const target = new Date(2026, 10, 26).getTime();
const cd = {d: $('d'), h: $('h'), m: $('m'), s: $('s')}, shown = {};
const put = (k, v) => { if (shown[k] !== v) { shown[k] = v; cd[k].textContent = v; } };
const pad = n => String(n).padStart(2, '0');
let cdTimer = 0;
function cdTick() {
  clearTimeout(cdTimer);
  const diff = target - Date.now();
  if (diff <= 0) { $('count').replaceChildren(el('p', 'done', 'Happy Thanksgiving!')); return; }
  const s = Math.floor(diff / 1000);
  put('d', String(Math.floor(s / 86400)));
  put('h', pad(Math.floor(s % 86400 / 3600)));
  put('m', pad(Math.floor(s % 3600 / 60)));
  put('s', pad(s % 60));
  cdTimer = setTimeout(cdTick, (diff % 1000 || 1000) + 15);
}
document.addEventListener('visibilitychange', () => document.hidden ? clearTimeout(cdTimer) : cdTick());
cdTick();

/* ============ Animation scheduler (one timer, about 12 frames per second) ============ */
const tasks = [];
let loopTimer = 0, loopMs = 100;   // 10 frames a second in the background, 12 while the theater is open
const tickAll = () => { const now = performance.now(); for (const f of tasks) f(now); };
const startLoop = () => { if (!loopTimer) loopTimer = setInterval(tickAll, loopMs); };
const stopLoop = () => { clearInterval(loopTimer); loopTimer = 0; };
const setLoopRate = ms => { if (ms === loopMs) return; loopMs = ms; if (loopTimer) { stopLoop(); startLoop(); } };
document.addEventListener('visibilitychange', () => document.hidden ? stopLoop() : startLoop());

/* ============ Pixel helpers ============ */
let g = null;                        // current 2d drawing context for the helpers below
let K = 1;                           // drawing scale: 1 = native pixels; art authored on a coarser grid is scaled up by K
let lastG = null, lastC = '';          // remember the last colour set on the current canvas so it is not parsed again
const R = (x, y, w, h, c) => {
  if (g !== lastG || c !== lastC) { g.fillStyle = c; lastG = g; lastC = c; }
  const x0 = Math.round(x * K), y0 = Math.round(y * K);
  g.fillRect(x0, y0, Math.max(1, Math.round((x + w) * K) - x0), Math.max(1, Math.round((y + h) * K) - y0));
};
const E = (cx, cy, rx, ry, c) => {
  for (let y = -ry; y <= ry; y++) { const w = Math.floor(Math.sqrt(1 - y * y / (ry * ry)) * rx); R(cx - w, cy + y, w * 2 + 1, 1, c); }
};
const layer = (w, h, fn) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const prev = g; g = c.getContext('2d'); g.imageSmoothingEnabled = false; fn(); g = prev;
  return c;
};
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`; };
const OUT = '#3a2213', OFFS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const makeOutliner = (w, h) => {        // draws a sprite with a 1-pixel dark outline; can work on just a sub-rectangle
  const col = document.createElement('canvas'), sil = document.createElement('canvas');
  col.width = sil.width = w; col.height = sil.height = h;
  const cx = col.getContext('2d'), sx = sil.getContext('2d');
  return {
    cx,
    clear(rx = 0, ry = 0, rw = w, rh = h) { cx.clearRect(rx, ry, rw, rh); },
    flush(dest, rx = 0, ry = 0, rw = w, rh = h) {
      sx.globalCompositeOperation = 'source-over'; sx.clearRect(rx, ry, rw, rh); sx.drawImage(col, rx, ry, rw, rh, rx, ry, rw, rh);
      sx.globalCompositeOperation = 'source-in'; sx.fillStyle = OUT; sx.fillRect(rx, ry, rw, rh);
      for (const [dx, dy] of OFFS) dest.drawImage(sil, rx, ry, rw, rh, rx + dx, ry + dy, rw, rh);
      dest.drawImage(col, rx, ry, rw, rh, rx, ry, rw, rh);
    }
  };
};
const rng32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

/* ============ Fall landscape and wind ============ */
const land = $('land'), gl = land.getContext('2d');
const wind = {t: 0, last: 0, dt: 0, g: 0, s: 0.25, drift: 0};
const gustAt = t => {
  const a = Math.sin(t * 0.42) + Math.sin(t * 0.17 + 2.1) * 0.8 + Math.sin(t * 0.91) * 0.25;
  const x = Math.max(0, Math.min(1, (a - 0.05) / 1.5));
  return x * x;
};
const streaks = Array.from({length: matchMedia('(prefers-reduced-motion: reduce)').matches ? 3 : 5},
  () => ({x: -60, y: 0, len: 14 + Math.random() * 14, sp: 0.8 + Math.random() * 0.6, ph: Math.random() * 6.28, fresh: true}));
function windTick(now) {
  const dt = Math.min((now - wind.last) / 1000 || 0, 0.25);
  wind.last = now; wind.t += dt; wind.dt = dt;
  wind.g = gustAt(wind.t);
  wind.s = 0.25 + 0.75 * wind.g;
  wind.drift += wind.s * 7 * dt;
  for (const k of streaks) {
    k.x += (30 + 90 * wind.s) * k.sp * dt;
    if (k.fresh || k.x > LWd + 10) { k.fresh = false; k.x = -k.len - Math.random() * 60; k.y = Math.random() * LHd * 0.7; }
  }
}
const FALL = [['#d9692b', '#f09a45', '#a8441b', '#d9a03a'], ['#d9a03a', '#f2c968', '#a8741e', '#d9692b'],
  ['#a8323f', '#d0525a', '#6e1d29', '#d9692b'], ['#b5532a', '#d9783f', '#7a3418', '#d9a03a'], ['#c9a030', '#e6c85a', '#8f7020', '#a8441b']];
let LWd = 0, LHd = 0, landBg = null, hearthGlow = null, blades = [], groundY = () => 0;
/* ============ 8-bit fall forest and lake: tiered pine trees in many fall colors ============ */
const FIRE = {x: -999, y: -999};   // centre of the fire pit in screen pixels (set each frame by drawHearth)
const skyC = $('sky'), nearC = $('fl3');
const NP = 8;                          // extra pixels at each side of the near trees so they can sway
const TREE = {                         // [lit side, base, shade, highlight]
  forest: ['#3a7048', '#1f4f30', '#10301d', '#5a9468'], pine: ['#2f6b50', '#1b4a3a', '#0f2d24', '#4f8a6d'], moss: ['#55803a', '#36601f', '#1f3d12', '#7aa356'],
  orange: ['#ffb347', '#ff8c1a', '#c85a0a', '#ffd27a'], red: ['#ff7a5a', '#e63a1e', '#a31f10', '#ff9d80'], flame: ['#ff9a4a', '#f0551a', '#b83a0c', '#ffb878'],
  yellow: ['#fff07a', '#ffd21f', '#d9a00a', '#fff7a8']};
const WOODS = {
  far: ['forest', 'yellow', 'orange', 'pine', 'red', 'yellow', 'flame', 'moss', 'orange'],
  mid: ['forest', 'orange', 'red', 'yellow', 'pine', 'flame', 'yellow', 'moss', 'red', 'forest', 'orange'],
  near: ['forest', 'red', 'orange', 'yellow', 'pine', 'flame', 'yellow', 'forest', 'red', 'moss', 'orange', 'pine']};
function pine(cx, base, h, pal) {
  const [lt, bs, dk] = pal, rnd = rng32((cx * 73856093) ^ (base * 19349663) ^ (h * 83492791));   // per-tree seed keeps the texture steady
  const tiers = Math.min(5, Math.max(3, Math.round(h / 13))), hwMax = Math.max(4, Math.round(h * 0.42));
  const trunkH = Math.max(2, Math.round(h * 0.09)), trunkW = h > 34 ? 4 : 2;
  const bodyBottom = base - trunkH, top = base - h, step = (bodyBottom - top) / tiers;
  R(cx - (trunkW >> 1), bodyBottom - 1, trunkW, trunkH + 2, '#5e3820'); R(cx - (trunkW >> 1), bodyBottom - 1, 1, trunkH + 2, '#7b4a2a');
  const detail = h >= 34;                       // small, distant trees skip the fine needle texture (it is hidden by the haze anyway)
  let prevBot = 1;
  for (let i = 0; i < tiers; i++) {
    const y0 = Math.round(top + i * step), y1 = Math.min(bodyBottom, Math.round(top + (i + 1) * step) - 1);
    const wTop = i === 0 ? 1 : Math.max(2, prevBot * 0.55), wBot = hwMax * (i + 1) / tiers, hem = Math.max(2, Math.round((y1 - y0) * 0.34));
    const widthAt = y => Math.round(wTop + (wBot - wTop) * (y - y0) / Math.max(1, y1 - y0));
    for (let y = y0; y <= y1; y++) {
      const w = widthAt(y), x0 = cx - w, x1 = cx + w;
      if (y > y1 - hem) R(x0, y, x1 - x0 + 1, 1, dk);          // dark band under each tier
      else {
        R(x0, y, cx - x0, 1, lt); R(cx, y, x1 - cx + 1, 1, bs); if (x1 > cx) R(x1, y, 1, 1, dk);
        if (detail && rnd() < 0.3) R(x0 - 1, y, 1, 1, lt);      // ragged needle tips along the edges
        if (detail && rnd() < 0.3) R(x1 + 1, y, 1, 1, dk);
      }
    }
    const rows = Math.max(1, y1 - y0 - hem), n = Math.round(rows * wBot / 4.5);
    for (let k = 0; detail && k < n; k++) {                      // foliage texture: little needle clusters
      const y = y0 + 1 + Math.floor(rnd() * rows), w = widthAt(y), x = cx - w + 1 + Math.floor(rnd() * Math.max(1, 2 * w - 2)), left = x < cx, q = rnd();
      if (q < 0.4) R(x + 1, y + 1, 1, 1, left ? bs : dk);                                                 // shadow under a clump
      else if (q < 0.75) { const c = left ? bs : dk; R(x, y, 1, 1, c); R(x - 1, y + 1, 1, 1, c); R(x + 1, y + 1, 1, 1, c); }   // dark gap between clumps
    }
    const fw = Math.round(wBot);
    for (let t = 1; t <= 2; t++) for (let x = cx - fw; x <= cx + fw; x++) if ((x + t * 2) % 4 < 3 - t && rnd() < 0.8) R(x, y1 + t, 1, 1, dk);   // jagged hem
    prevBot = wBot;
  }
  R(cx, top, 1, 1, lt);
}
const hazy = (pal, amt) => pal.map(c => mix(c, '#f0b496', amt));
function treeRow(x0, x1, base, hMin, hMax, spacing, woods, haze, rnd) {
  const list = [];
  for (let x = x0; x < x1; x += spacing * (0.55 + rnd() * 0.9)) list.push({x: Math.round(x), h: Math.round(hMin + rnd() * (hMax - hMin)), b: base + Math.round((rnd() - 0.5) * 5), p: TREE[woods[(rnd() * woods.length) | 0]]});
  list.sort((p, q) => p.b - q.b).forEach(t => pine(t.x, t.b, t.h, haze ? hazy(t.p, haze) : t.p));
}
let forestRun = 0;
function buildForest() {    // built in three short slices so the page never freezes while the forest draws
  const run = ++forestRun, W = Math.ceil(innerWidth / 4), H = Math.ceil(innerHeight / 4), wl = Math.round(H * 0.76), bottom = Math.round(H * 0.9), rnd = rng32(7);
  K = 1;
  const back = layer(W, H, () => {                       // sky, sun, clouds, and the two far rows of trees
    const bands = ['#e79ab8', '#ee9fb0', '#f3a5a4', '#f6ac98', '#f8b389', '#f9ab76', '#f89a5e'], skyH = Math.round(H * 0.8);
    bands.forEach((c, i) => {
      const y0 = Math.floor(i * skyH / bands.length), y1 = Math.floor((i + 1) * skyH / bands.length);
      R(0, y0, W, y1 - y0, c);
      if (i < bands.length - 1) for (let x = 0; x < W; x += 2) R(x + (y1 % 2), y1 - 1, 1, 1, bands[i + 1]);
    });
    const sx = Math.round(W * 0.8), sy = Math.round(H * 0.3);
    E(sx, sy, 19, 19, '#fbc2a0'); E(sx, sy, 13, 13, '#fdb07a'); E(sx, sy, 8, 8, '#ff9a3c');
    [[0.14, 0.14], [0.46, 0.09], [0.66, 0.2], [0.9, 0.12]].forEach(([fx, fy]) => {
      const x = Math.round(W * fx), y = Math.round(H * fy);
      E(x + 1, y + 2, 9, 3, '#e9a3a6'); E(x, y + 1, 9, 3, '#fbd5d0'); E(x + 7, y - 1, 6, 3, '#fbd5d0'); E(x - 6, y, 5, 2, '#fbd5d0');
    });
    treeRow(-4, W + 6, wl - Math.round(H * 0.07), H * 0.1, H * 0.15, 4.5, WOODS.far, 0.4, rnd);
    treeRow(-4, W + 8, wl - Math.round(H * 0.035), H * 0.16, H * 0.24, 6.5, WOODS.mid, 0.16, rnd);
    R(0, wl - 1, W, 2, '#6a4a28');
  });
  skyC.width = W; skyC.height = H;
  const sc = skyC.getContext('2d'); sc.imageSmoothingEnabled = false;
  sc.drawImage(back, 0, 0);
  skyC.style.cssText = `width:${W * 4}px;height:${H * 4}px;left:0`;
  setTimeout(() => {
    if (run !== forestRun) return;
    K = 1;
    const near = layer(W + NP * 2, H, () => {            // the nearest, tallest trees: these sway in the wind
      treeRow(-6, W + NP * 2 + 6, wl, H * 0.22, H * 0.31, 9, WOODS.near, 0, rnd);
      [[NP + 6, 0.5, 'red'], [W + NP - 6, 0.48, 'orange']].forEach(([x, f, w]) => pine(x, wl + 2, Math.round(H * f), TREE[w]));
      R(0, wl - 1, W + NP * 2, 2, '#4a3018');
    });
    nearC.width = W + NP * 2; nearC.height = H;
    nearC.getContext('2d').drawImage(near, 0, 0);
    nearC.style.cssText = `width:${(W + NP * 2) * 4}px;height:${H * 4}px;left:${-NP * 4}px`;
    setTimeout(() => {
      if (run !== forestRun) return;
      K = 1;
      const full = layer(W, H, () => { g.drawImage(back, 0, 0); g.drawImage(near, -NP, 0); });
      const lake = layer(W, H, () => {                   // the forest mirrored in rippled water
        const bands = ['#6e3f3a', '#82505a', '#9a6272', '#b07888', '#c48c98'], lh = bottom - wl;
        bands.forEach((c, i) => R(0, wl + Math.floor(i * lh / bands.length), W, Math.ceil(lh / bands.length), c));
        for (let dy = 0; dy < lh; dy++) {
          g.globalAlpha = dy < lh * 0.35 ? 0.85 : dy < lh * 0.65 ? 0.6 : 0.38;
          g.drawImage(full, 0, wl - 1 - dy, W, 1, (dy >> 1) % 2, wl + dy, W, 1);
        }
        g.globalAlpha = 1;
        for (let y = wl; y < bottom; y++) for (let x = (y % 2); x < W; x += 2) if (y > wl + lh * 0.55) R(x, y, 1, 1, 'rgba(214,120,130,.32)');
        for (let i = 0; i < W / 4; i++) R(Math.floor(rnd() * W), wl + 2 + Math.floor(rnd() * (lh - 3)), 3 + Math.floor(rnd() * 7), 1, 'rgba(255,224,208,.6)');
      });
      sc.drawImage(lake, 0, 0);
    }, 0);
  }, 0);
}
let forestTimer = 0;
const scheduleForest = () => { clearTimeout(forestTimer); forestTimer = setTimeout(buildForest, 30); };
let swayPx = null;
function swayForest() {   // the nearest trees shift in whole pixels, like an 8-bit sprite
  const dx = Math.round((wind.s * 1.4 + Math.sin(wind.t * 0.9 + 2) * (0.3 + 1.2 * wind.g)) * 1.5 / 4) * 4;
  if (dx !== swayPx) { swayPx = dx; nearC.style.transform = `translate3d(${dx}px,0,0)`; }
}

function buildLand() {
  const W = LWd = Math.ceil(innerWidth / 4), H = LHd = Math.ceil(innerHeight / 4);
  land.width = W; land.height = H; gl.imageSmoothingEnabled = false; lastG = null;
  const rnd = rng32(11);
  const gy = x => Math.round(H * 0.88 + Math.sin(x * 0.07 + 1) * 1.5);
  groundY = gy;
  landBg = layer(W, H, () => {           // the shore the harvest scene stands on
    for (let x = 0; x < W; x++) { const y = gy(x); R(x, y - 1, 1, 1, '#5b4426'); R(x, y, 1, H - y, '#a98657'); R(x, y, 1, 2, '#b3a25a'); }
    for (let i = 0; i < W * 0.5; i++) {
      const x = Math.floor(rnd() * W), y = gy(x) + 2 + Math.floor(rnd() * (H - gy(x) - 2));
      R(x, y, 2, 1, FALL[Math.floor(rnd() * FALL.length)][Math.floor(rnd() * 2)]);
    }
  });
  hearthGlow = layer(93, 32, () => {                      // warm light on the ground around the fire, drawn once
    for (let dy = -16; dy <= 5; dy++) for (let dx = -46; dx <= 46; dx++) {
      const d = (dx / 46) ** 2 + (dy / 15) ** 2;
      if (d < 1 && (dx + dy) % 2 === 0) R(46 + dx, 16 + dy, 1, 1, d < 0.35 ? 'rgba(255,175,70,.38)' : d < 0.7 ? 'rgba(255,150,50,.2)' : 'rgba(255,130,40,.1)');
    }
  });
  blades = [];
  for (let x = 2; x < W; x += 5) blades.push([x, gy(x), (x / 5 | 0) % 2 ? '#b5a35a' : '#9a8a44']);
  mkFolk(W);
}

/* --- harvest scene: Wampanoag and English settlers sharing the feast --- */
const TONES = {wamp: {skin: '#b97b52', hair: '#2b1a12'}, eng: {skin: '#ecbf94', hair: '#6e4a2a'}};
const BODY = {   // [dx, dy, w, h, color]; skin and hair are filled in per person. Art faces right.
  wamp_man: [[-2, -12, 4, 4, 'S'], [-2, -12, 4, 1, 'H'], [-2, -11, 1, 3, 'H'], [-3, -10, 1, 4, 'H'], [-2, -11, 4, 1, '#8c2f39'], [1, -10, 1, 1, '#3a2213'], [1, -14, 1, 2, '#fbf5e8'], [1, -15, 1, 1, '#8c2f39'],
    [-2, -8, 5, 4, '#c8975a'], [-2, -8, 5, 1, '#a8323f'], [-2, -7, 2, 1, '#a8323f'], [-2, -4, 1, 1, '#a87a45'], [0, -4, 1, 1, '#a87a45'], [2, -4, 1, 1, '#a87a45'], [-3, -7, 1, 3, 'S']],
  wamp_woman: [[-2, -12, 4, 4, 'S'], [-2, -12, 4, 1, 'H'], [-3, -11, 1, 6, 'H'], [-2, -11, 1, 3, 'H'], [-2, -11, 4, 1, '#d9a03a'], [1, -10, 1, 1, '#3a2213'],
    [-2, -8, 5, 6, '#c8975a'], [-2, -8, 5, 1, '#a8323f'], [-2, -3, 1, 1, '#a87a45'], [0, -3, 1, 1, '#a87a45'], [2, -3, 1, 1, '#a87a45'], [-3, -7, 1, 3, 'S']],
  wamp_child: [[-1, -9, 3, 3, 'S'], [-1, -9, 3, 1, 'H'], [-2, -8, 1, 3, 'H'], [1, -8, 1, 1, '#3a2213'], [-1, -6, 3, 3, '#c8975a'], [-1, -6, 3, 1, '#a8323f']],
  eng_man: [[-3, -13, 6, 1, '#2a2a30'], [-2, -15, 4, 2, '#2a2a30'], [0, -14, 1, 1, '#d9a03a'], [-2, -12, 4, 3, 'S'], [1, -11, 1, 1, '#3a2213'], [-2, -9, 4, 1, '#fbf5e8'],
    [-2, -8, 5, 5, '#3b3b45'], [0, -7, 1, 1, '#d9a03a'], [0, -5, 1, 1, '#d9a03a'], [-3, -8, 1, 4, '#3b3b45']],
  eng_woman: [[-2, -13, 4, 2, '#fbf5e8'], [-2, -12, 4, 3, 'S'], [-2, -11, 1, 1, 'H'], [1, -11, 1, 1, '#3a2213'], [-2, -9, 4, 1, '#fbf5e8'],
    [-2, -8, 5, 6, '#6a6a76'], [-1, -6, 3, 4, '#fbf5e8'], [-3, -8, 1, 4, '#6a6a76']],
  eng_child: [[-2, -10, 4, 1, '#2a2a30'], [-1, -11, 2, 1, '#2a2a30'], [-1, -9, 3, 3, 'S'], [1, -8, 1, 1, '#3a2213'], [-1, -6, 3, 3, '#3b3b45']]
};
const LEGS = {wamp: ['#a87a45', '#7b4a2a'], eng: ['#4a4a55', '#2a2a30']};
let folk = [], folkProps = [], folkPeople = [], lo = null, folkBox = [0, 0, 1, 1];
function mkFolk(W) {
  folk = []; lo = makeOutliner(LWd, LHd);
  const c = Math.round(W / 2), sc = Math.min(1, (W / 2 - 8) / 64), bx = Math.max(0, c - 88), by = Math.max(0, groundY(c) - 34);
  folkBox = [bx, by, Math.min(W - bx, 176), LHd - by];      // both groups gather around the big fire; tighter on narrow screens
  [[-1, 'wamp'], [1, 'eng']].forEach(([side, kind]) => {
    folk.push({prop: kind === 'wamp' ? 'baskets' : 'table', x: c + side * Math.max(34, Math.round(60 * sc))});
    [['man', 31], ['woman', 42], ['child', 25]].forEach(([role, off]) => {
      const hx = c + side * Math.max(20, Math.round(off * sc));
      const body = BODY[kind + '_' + role], sleeve = body.find(r => r[0] === -3 && r[3] >= 3);
      folk.push({kind, role, body, arm: sleeve ? sleeve[4] : 'S', x: hx, home: hx, dir: -side, state: 'idle', until: Math.random() * 2, target: hx, edge: c + side * Math.max(19, Math.round(21 * sc)),
        speed: role === 'child' ? 9 : 5.5, ph: Math.random() * 6, item: kind === 'wamp' ? 'corn' : 'pie'});
    });
  });
  folkProps = folk.filter(q => q.prop); folkPeople = folk.filter(q => !q.prop);
}
function updFolk(t, dt) {
  for (const p of folk) {
    if (p.prop) continue;
    const goto = (tx, next) => { p.target = tx; p.state = 'walk'; p.next = next; };
    if (p.state === 'walk') {
      const d = p.target - p.x;
      if (Math.abs(d) <= p.speed * dt) {
        p.x = p.target;
        if (p.next === 'hold') { p.state = 'hold'; p.until = t + 2.8; }
        else { p.state = 'idle'; p.until = t + 1 + Math.random() * 3; p.carry = false; }
      } else { p.dir = d > 0 ? 1 : -1; p.x += p.dir * p.speed * dt; }
    } else if (t >= p.until) {
      if (p.state === 'hold') { p.carry = true; goto(p.home, 'idle'); continue; }
      const r = Math.random();
      if (p.role === 'child') goto(p.home + (Math.random() - 0.5) * 24, 'idle');
      else if (r < 0.18) { p.carry = true; goto(p.edge + (p.edge > p.home ? -3 : 3), 'hold'); }
      else if (r < 0.5) { p.state = 'wave'; p.until = t + 1.6; }
      else if (r < 0.75) goto(p.home + (Math.random() - 0.5) * 14, 'idle');
      else { p.state = 'idle'; p.until = t + 2 + Math.random() * 3; }
    }
  }
}
function drawFolk(t) {
  if (!folk.length) return;
  lo.clear(...folkBox); g = lo.cx; K = 1;
  for (const p of folkProps) {
    const y = groundY(p.x) + 5;
    if (p.prop === 'baskets') {
      R(p.x - 9, y - 1, 18, 1, '#8a5a32'); R(p.x - 8, y - 2, 16, 1, '#a8693a');
      R(p.x - 7, y - 7, 8, 5, '#a8693a'); R(p.x - 7, y - 5, 8, 1, '#7b4a2a'); R(p.x - 6, y - 10, 6, 3, '#f1d25a'); R(p.x - 6, y - 10, 6, 1, '#fbe58a');
      R(p.x + 3, y - 6, 6, 4, '#e8832a'); R(p.x + 3, y - 6, 6, 1, '#ffb347'); R(p.x + 5, y - 8, 2, 2, '#7d8f3a');
    } else {
      R(p.x - 9, y - 7, 18, 2, '#a8693a'); R(p.x - 9, y - 7, 18, 1, '#c88a4f'); R(p.x - 8, y - 5, 1, 5, '#8a5a32'); R(p.x + 7, y - 5, 1, 5, '#8a5a32');
      R(p.x - 4, y - 10, 6, 3, '#c27a2c'); R(p.x - 4, y - 10, 6, 1, '#fbd271'); R(p.x - 7, y - 9, 3, 2, '#f1d25a'); R(p.x + 3, y - 9, 4, 2, '#c58a45'); R(p.x + 3, y - 10, 4, 1, '#fbf5e8');
    }
  }
  folkPeople.sort((a, b) => a.x - b.x);
  for (const p of folkPeople) {
    const x = Math.round(p.x), y = groundY(x) + 5, dir = p.dir, f = Math.floor(t * 6 + p.ph);
    const walking = p.state === 'walk', bob = !walking && f % 4 === 0 ? 1 : 0, tone = TONES[p.kind], big = p.role !== 'child';
    const P2 = (dx, dy, w, h, c) => R(dir > 0 ? x + dx : x - dx - w + 1, y + dy + bob, w, h, c === 'S' ? tone.skin : c === 'H' ? tone.hair : c);
    const lg = LEGS[p.kind], top = p.role === 'woman' ? -2 : -3, lift = walking ? f % 2 : -1;
    if (big) { P2(-2, top, 2, -top - (lift === 0 ? 1 : 0), lg[0]); P2(1, top, 2, -top - (lift === 1 ? 1 : 0), lg[0]); P2(-2, -1, 2, 1, lg[1]); P2(1, -1, 2, 1, lg[1]); }
    else { P2(-1, -3, 1, 3 - (lift === 0 ? 1 : 0), lg[0]); P2(1, -3, 1, 3 - (lift === 1 ? 1 : 0), lg[0]); }
    for (const r of p.body) P2(r[0], r[1], r[2], r[3], r[4]);
    const arm = p.arm;
    const ay = big ? -8 : -6;
    if (p.state === 'wave') { P2(3, ay - 4 - (f % 2), 1, 4, arm); if (p.kind === 'eng' && p.role === 'man') P2(3, ay - 6 - (f % 2), 2, 2, '#cdb48e'); }
    else if (p.carry || p.state === 'hold') {
      P2(3, ay + 1, 2, 1, arm);
      if (p.item === 'corn') { P2(4, ay, 4, 2, '#a8693a'); P2(4, ay - 1, 4, 1, '#f1d25a'); }
      else { P2(4, ay, 4, 1, '#fbf5e8'); P2(4, ay + 1, 4, 1, '#c58a45'); }
    } else P2(3, ay, 1, 4, arm);
  }
  lo.flush(gl, ...folkBox); g = gl;
}

/* --- big fire between the two groups --- */
function drawHearth(t) {
  const W = LWd, x = Math.round(W / 2), y = groundY(x) + 7, f = Math.floor(t * 9);
  FIRE.x = x * (innerWidth / W); FIRE.y = (y - 2) * (innerHeight / LHd);
  g = gl; K = 1;
  gl.drawImage(hearthGlow, x - 46, y - 16);                                         // warm light spreading over the ground
  lo.clear(...folkBox); g = lo.cx;                                                             // stones and logs, outlined like the rest
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; R(x + Math.round(Math.cos(a) * 16) - 1, y + Math.round(Math.sin(a) * 3.2) - 1, 4, 3, i % 2 ? '#8a8378' : '#a8a092'); }
  R(x - 12, y - 3, 24, 3, '#5e3820'); R(x - 9, y - 6, 18, 3, '#7b4a2a'); R(x - 8, y - 2, 16, 1, '#d9441a');
  lo.flush(gl, ...folkBox); g = gl;
  for (let c = -11; c <= 11; c++) {                                                 // flames: tall in the middle, flickering
    const edge = 1 - Math.abs(c) / 12.5, n = Math.sin(c * 1.7 + f * 1.3) + Math.sin(c * 0.9 - f * 0.8) * 0.8;
    const h = Math.max(3, Math.round(edge * (27 + n * 6))), base = y - 6;
    R(x + c, base - h, 1, h, '#c8301e');
    if (Math.abs(c) <= 8) R(x + c, base - Math.round(h * 0.8), 1, Math.round(h * 0.8), '#ff7a1a');
    if (Math.abs(c) <= 5) R(x + c, base - Math.round(h * 0.55), 1, Math.round(h * 0.55), '#ffc61f');
    if (Math.abs(c) <= 2) R(x + c, base - Math.round(h * 0.3), 1, Math.round(h * 0.3), '#fff4b0');
  }
  for (let i = 0; i < 20; i++) {                                                    // sparks drifting up
    const life = (t * 8 + i * 5.3) % 44, sx = x + Math.round(Math.sin(i * 2.1 + life * 0.3) * (5 + life * 0.45)), sy = y - 10 - Math.round(life);
    if (life < 40) R(sx, sy, 1, 1, life < 16 ? '#ffd24a' : life < 30 ? '#ff8a2a' : '#d9441a');
  }
}
function drawLand() {
  const W = LWd, t = wind.t;
  gl.clearRect(0, 0, W, LHd); gl.drawImage(landBg, 0, 0);
  g = gl;
  updFolk(t, wind.dt);
  for (const b of blades) {
    const x = b[0], y = b[1], c = b[2], l = Math.round(wind.s * 1.8 + Math.sin(t * 2 + x * 0.4) * wind.g * 1.2);
    R(x, y - 1, 1, 1, c); R(x + (l >> 1), y - 2, 1, 1, c); R(x + l, y - 3, 1, 1, c);
  }
  drawFolk(t);
  drawHearth(t);
  swayForest();
}

/* ============ Falling leaves ============ */
const lcv = $('leaves'), lctx = lcv.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LS = [   // x = leaf, v = vein, s = stem; the second frame is the tumbling pose
  [['..x..', '.xxx.', 'xxvxx', 'xxvxx', '.xvx.', '..v..', '..s..'], ['.x.', 'xvx', 'xvx', 'xvx', '.v.', '.s.']],
  [['...x...', '.x.x.x.', '.xxxxx.', 'xxxvxxx', '.xxvxx.', '...v...', '...s...'], ['..x..', 'x.x.x', '.xxx.', 'xxvxx', '..v..', '..s..']],
  [['....xx', '..xxxx', '.xxxvx', 'xxxvx.', 'xxvx..', 'svx...'], ['xx....', 'xxxx..', 'xvxxx.', '.xvxxx', '..xvxx', '...xvs']]];
const LC = [['#b5532a', '#7a3418'], ['#d9a03a', '#8f6516'], ['#8c2f39', '#561a22'], ['#d9692b', '#8a3f12'], ['#a8693a', '#5e3820']];
const leafSprites = LS.map(frames => LC.map(col => frames.map(rows => {
  const c = document.createElement('canvas');
  c.width = Math.max(...rows.map(r => r.length)); c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) {
    if (r[x] === '.') continue;
    g.fillStyle = r[x] === 'v' ? col[1] : r[x] === 's' ? '#5e3820' : col[0];
    g.fillRect(x, y, 1, 1);
  } });
  return c;
})));
let LW = 0, LH = 0, leaves = [];
const leafT0 = performance.now();
function sizeLeaves() {
  LW = Math.ceil(innerWidth / 4); LH = Math.ceil(innerHeight / 4);
  lcv.width = LW; lcv.height = LH;
  lctx.imageSmoothingEnabled = false;
  leaves = Array.from({length: reduced ? 12 : 24}, (_, i) => ({
    x0: Math.random() * LW, y0: Math.random() * (LH + 14), v: 5 + Math.random() * 9,
    a: 3 + Math.random() * 7, f: 0.6 + Math.random() * 1.2, p: Math.random() * 6.28, k: 0.6 + Math.random() * 0.8,
    type: i % 3, ci: i % LC.length}));
  buildLand();
}
function drawLeaves(now) {
  const t = (now - leafT0) / 1000, span = LW + 20;
  lctx.clearRect(0, 0, LW, LH);
  if (wind.s > 0.5) {                       // visible gust streaks
    lctx.globalAlpha = Math.min(1, (wind.s - 0.5) / 0.35) * 0.55;
    lctx.fillStyle = '#a37b52';
    for (const k of streaks) {
      for (let i = 0; i < k.len; i++) lctx.fillRect(Math.round(k.x + i), Math.round(k.y + Math.sin(i * 0.35 + k.ph) * 1.5), 1, 1);
      const hx = Math.round(k.x + k.len), hy = Math.round(k.y + Math.sin(k.len * 0.35 + k.ph) * 1.5);
      [[1, -1], [2, -1], [3, 0], [3, 1], [2, 2], [1, 2], [1, 1]].forEach(([dx, dy]) => lctx.fillRect(hx + dx, hy + dy, 1, 1));
    }
    lctx.globalAlpha = 1;
  }
  for (const l of leaves) {
    const y = (l.y0 + l.v * t) % (LH + 14) - 7;
    const x = ((l.x0 + Math.sin(t * l.f + l.p) * l.a + wind.drift * l.k) % span + span) % span - 10;
    lctx.drawImage(leafSprites[l.type][l.ci][Math.floor(t * 3 + l.p * 2) % 2], Math.round(x), Math.round(y));
  }
}
let resizeTimer = 0;
let lastW = innerWidth, lastH = innerHeight;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 120) return;   // ignore small mobile toolbar changes
    lastW = innerWidth; lastH = innerHeight; sizeLeaves(); scheduleForest();
  }, 250);
});
sizeLeaves();
scheduleForest();
tasks.push(windTick, drawLand, drawLeaves);

/* ============ Secret Turkey Theater ============ */



/* ============ Small dancing turkey (the footer button that opens the theater) ============ */
const miniCv = $('mini-turkey'), mini = makeOutliner(20, 22);
let miniCtx = null, miniStep = -1;
function miniTurkey(now) {
  const step = Math.floor(now / 190);
  if (step === miniStep) return;
  miniStep = step;
  if (!miniCtx) { miniCtx = miniCv.getContext('2d'); miniCtx.imageSmoothingEnabled = false; }
  const f = step % 4, cx = 10 + [-1, 0, 1, 0][f], cy = 13 + [0, -1, 0, -1][f];
  mini.clear(); g = mini.cx; K = 1;
  ['#8c2f39', '#b5532a', '#d9a03a', '#7d8f3a', '#8c2f39'].forEach((c, i) => { const h = [6, 8, 9, 8, 6][i]; R(cx - 5 + i * 2, cy - 3 - h, 2, h, c); });
  E(cx, cy, 5, 4, '#7b4a2a'); E(cx, cy + 1, 3, 3, '#a8693a');
  R(cx - 7, cy + [-2, -3, 0, -3][f], 2, 4, '#5e3820'); R(cx + 6, cy + [0, -3, -2, -3][f], 2, 4, '#5e3820');
  R(cx - 1, cy - 8, 3, 3, '#d8b08a'); R(cx - 1, cy - 7, 1, 1, '#3a2213'); R(cx + 1, cy - 7, 1, 1, '#3a2213');
  R(cx, cy - 6, 1, 1, '#d9a03a'); R(cx, cy - 5, 1, 1, '#8c2f39');
  R(cx - 3, cy + 4, 1, f === 0 ? 1 : 2, '#d9a03a'); R(cx + 2, cy + 4, 1, f === 2 ? 1 : 2, '#d9a03a');
  if (f !== 0) R(cx - 4, cy + 5, 3, 1, '#d9a03a'); if (f !== 2) R(cx + 2, cy + 5, 3, 1, '#d9a03a');
  miniCtx.clearRect(0, 0, 20, 22); mini.flush(miniCtx);
}
tasks.push(miniTurkey);

const secretBtn = $('secret-btn'), panel = $('secret'), stage = $('stage'), yardCv = $('yard');
const capEl = $('cap'), pauseBtn = $('pause');
let theaterReady = false, fontAdded = false;
let mg, yg;                          // stage and yard contexts
let bgLive, bgRoast, yardBg;         // cached background layers
let to, yo;                          // outlined sprite buffers for the dancing turkey and the yard turkeys
const RW = 84, RH = 60, KS = RW / 64; // stage grid and the scale from the original 64x48 art
const P = {ink: '#3a2213', wall: '#f8f0df', t1: '#cdb48e', t2: '#bfa57c', rust: '#b5532a', cran: '#8c2f39', sage: '#7d8f63',
  gold: '#d9a03a', card: '#fbf5e8', wood: '#a8693a', wood2: '#8a5a32'};
function loadFont() {
  if (fontAdded) return; fontAdded = true;
  addCss('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
}

function wall(shelf = true) {
  R(0, 0, 64, 48, P.wall);
  R(3, 3, 3, 14, P.sage); R(17, 3, 3, 14, P.sage);
  R(5, 4, 13, 12, P.ink); R(6, 5, 11, 10, '#cfe3e8'); R(11, 5, 1, 10, P.ink); R(6, 9, 11, 1, P.ink);
  if (shelf) {
    R(43, 12, 18, 2, P.wood2);
    E(48, 10, 3, 2, P.rust); R(48, 7, 1, 1, P.sage); E(55, 10, 3, 2, P.gold); R(55, 7, 1, 1, P.sage);
  }
}
function floorTiles() {
  R(0, 36, 64, 2, P.t2);
  for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 8; tx++) R(tx * 8, 38 + ty * 5, 8, 5, (tx + ty) % 2 ? P.t1 : P.t2);
}
function table() {
  R(0, 36, 64, 12, P.wood); R(0, 36, 64, 1, P.wood2); R(0, 41, 64, 1, P.wood2); R(0, 45, 64, 1, P.wood2);
}

/* --- finale: the same turkey, cooked: same size, same outline, same shading as the dancing bird --- */
function buildRoast() {
  const c = document.createElement('canvas'); c.width = RW; c.height = RH;
  const out = c.getContext('2d'), o = makeOutliner(RW, RH);
  const part = fn => { o.clear(); g = o.cx; K = KS; fn(); K = 1; o.flush(out); };
  const bone = '#fbf5e8', bone2 = '#e0cfa6';
  // platter with a leafy edge
  part(() => {
    E(32, 40, 25, 5, '#c9b88f'); E(32, 39, 25, 5, '#e6d9ba'); E(32, 38, 24, 4, '#fbf5e8'); E(32, 38, 19, 3, '#efe3cc');
    [[8, 35], [11, 34], [14, 35], [48, 35], [51, 34], [54, 35]].forEach(([x, y]) => { R(x, y, 4, 2, '#7d8f3a'); R(x + 1, y - 1, 2, 1, '#a3bd4e'); });
  });
  // drumsticks at the sides, bones pointing up
  [[-1, 21], [1, 43]].forEach(([f, x]) => part(() => {
    const bx = x + f * 4;
    R(bx - 1, 24, 3, 8, bone); R(bx - 1, 24, 1, 8, bone2);
    E(bx - 1, 23, 2, 2, bone); E(bx + 2, 23, 2, 2, bone);
    E(x, 33, 6, 4, '#e69a2c'); E(x, 35, 5, 2, '#b8661a'); R(x - 3, 31, 5, 1, '#fbd271');
  }));
  // body: same ellipse as the dancing bird, now golden brown
  part(() => {
    E(32, 26, 9, 8, '#c27a2c'); E(32, 28, 5, 5, '#e0a24e');
    const kk = K; K = 1;
    const ncx = Math.round(32 * kk), ncy = Math.round(26 * kk), rxn = Math.round(9 * kk), ryn = Math.round(8 * kk);
    for (let y = ncy; y <= ncy + ryn; y++) for (let x = ncx - rxn; x <= ncx + rxn; x++) {
      const ex = (x + 0.5 - ncx) / rxn, ey = (y + 0.5 - ncy) / ryn;
      if (ex * ex + ey * ey <= 1 && (ey > 0.62 || (ey > 0.3 && (x + y) % 2 === 0))) R(x, y, 1, 1, '#a9561a');
    }
    K = kk;
    E(29, 21, 4, 2, '#fbd271'); R(33, 20, 2, 1, '#fbd271');
    E(24, 28, 2, 4, '#9a5a1d'); E(40, 28, 2, 4, '#9a5a1d');
    [[27, 25], [34, 24], [30, 29], [36, 28], [28, 32], [34, 32]].forEach(([x, y]) => R(x, y, 1, 1, '#5e3820'));
    [[29, 24], [30, 25], [35, 26], [36, 27]].forEach(([x, y]) => R(x, y, 1, 1, '#8a4512'));
  });
  // cranberries and orange slices in front
  part(() => {
    [[26, 41], [32, 42], [38, 41]].forEach(([x, y]) => { R(x - 1, y - 1, 3, 3, '#b3202f'); R(x - 1, y - 1, 1, 1, '#ea5a6c'); });
    [[14, 40], [50, 40]].forEach(([x, y]) => { R(x - 3, y - 1, 7, 3, '#f19a2a'); R(x - 3, y - 1, 7, 1, '#fbd271'); });
  });
  return c;
}
function roastSteam(t) {
  const f = Math.floor(t * 4.5);
  [[37, 0], [43, 2], [49, 4]].forEach(([x0, ph], k) => {
    for (let i = 0; i < 6; i++) {
      const y = 22 - ((i * 3 + f * 2 + ph) % 18), x = x0 + Math.round(Math.sin(i * 1.1 + f * 0.9 + k * 1.7) * 2);
      if (y >= 3 && y <= 21) R(x, y, 2, 2, i % 2 === 0 ? '#e3d4b2' : '#d4c19a');
    }
  });
}
function note(x, y, c) { R(x, y, 1, 5, c); R(x - 2, y + 4, 2, 2, c); R(x + 1, y, 2, 1, c); }
function turkey(tt, prog) {
  const f = Math.floor(tt * 4) % 4, dx = [-3, 0, 3, 0][f], dy = [0, -2, 0, -2][f];
  const cx = 32 + dx, cy = 26 + dy;
  const order = [4, -4, 3, -3, 2, -2, 1, -1, 0], cols = [P.cran, P.rust, P.gold, P.sage];
  for (let i = 0; i < 9; i++) {
    const k = order[i], thr = 0.05 + i * 0.05, h = 15 - Math.abs(k) * 2;
    let bx = cx + k * 3 - 1, top = cy - 2 - h;
    if (prog >= thr) {
      const fall = (prog - thr) * 70;
      top = Math.min(top + fall, 36 - h);
      bx = 32 + k * 3 - 1 + Math.round(Math.sin(fall * 0.25 + k) * 2);
      if (top >= 36 - h) {   // landed: lies flat on the floor
        const fx = 32 + k * 6 - (h >> 1), fy = 36 + i % 3;
        R(fx, fy, h, 2, cols[(k + 4) % 4]); R(fx + h - 1, fy, 1, 2, P.ink);
        continue;
      }
    }
    R(bx, top, 3, h, cols[(k + 4) % 4]); R(bx, top, 3, 1, P.ink);
  }
  const body = mix('#7b4a2a', '#c27a2c', prog), chest = mix('#a8693a', '#e0a24a', prog), wing = mix('#5e3820', '#9a5a1d', prog);
  E(cx, cy, 9, 8, body); E(cx, cy + 2, 5, 5, chest);
  const kk = K; K = 1;           // checker-dithered shading on the lower body, drawn on the native pixel grid
  const ncx = Math.round(cx * kk), ncy = Math.round(cy * kk), rxn = Math.round(9 * kk), ryn = Math.round(8 * kk), shade = mix('#5e3820', '#a9561a', prog);
  for (let y = ncy; y <= ncy + ryn; y++) for (let x = ncx - rxn; x <= ncx + rxn; x++) {
    const ex = (x + 0.5 - ncx) / rxn, ey = (y + 0.5 - ncy) / ryn;
    if (ex * ex + ey * ey <= 1 && (ey > 0.62 || (ey > 0.3 && (x + y) % 2 === 0))) R(x, y, 1, 1, shade);
  }
  K = kk;
  E(cx - 11, cy + [-4, -4, 1, 3][f], 3, 6, wing); E(cx + 11, cy + [1, -4, -4, 3][f], 3, 6, wing);
  R(cx - 1, cy - 12, 3, 5, '#d8b08a'); R(cx - 2, cy - 17, 5, 5, '#d8b08a'); R(cx - 1, cy - 18, 3, 1, P.cran);
  const ec = Math.floor(tt * 2) % 6 === 5 ? '#b9926a' : P.ink;
  R(cx - 1, cy - 16, 1, 1, ec); R(cx + 1, cy - 16, 1, 1, ec);
  R(cx - 1, cy - 14, 3, 2, P.gold); R(cx, cy - 12, 1, 3, P.cran);
  const lift = [1, 0, 2, 0][f];
  [-4, 3].forEach((ox, idx) => {
    const top = cy + 7, bottom = 36 - (lift === idx + 1 ? 3 : 0);
    R(cx + ox, top, 2, bottom - top, P.gold); R(cx + ox - 1, bottom - 1, 4, 1, P.gold);
  });
  if (prog < 0.5) { note(10, 19 + (f % 2 ? -2 : 0), P.rust); note(52, 21 + (f % 2 ? 0 : -2), P.sage); }
  if (prog > 0.15 && prog < 0.9) R(cx + 4, cy - 15 + Math.floor(tt * 8 % 8), 1, 2, '#8fb3c9');
}
function fire(tt, prog) {
  const fp = Math.max(0, Math.min(1, (prog - 0.15) / 0.7));
  if (fp <= 0) return;
  const fr = Math.floor(tt * 8);
  for (let x = 0; x < 64; x += 2) {
    const h = Math.round(fp * (10 + 3 * (Math.sin(x * 0.7 + fr * 1.7) + Math.sin(x * 0.31 - fr * 1.1))));
    if (h <= 0) continue;
    R(x, 48 - h, 2, h, P.cran);
    if (h > 3) R(x, 48 - h + 2, 2, h - 2, P.rust);
    if (h > 5) R(x, 48 - h + 4, 2, h - 4, P.gold);
  }
}

/* --- yard with mini turkeys --- */
const YW = 135, GROUND = 15;         // yard art is authored on a 135x18 grid
const KY = 0.75, YPW = 101, YPH = 14;  // drawn at 0.75 so its pixel size matches the stage
let tk = [];
const STATES = [['walk', 3, 2, 4.5], ['peck', 3, 2, 3.5], ['gobble', 2, 1.2, 2], ['flap', 1, 1, 1.6], ['fluff', 1, 1.5, 2.5], ['nap', 1, 3, 5]];
function drawYardBg() {
  for (let fx = 2; fx < YW; fx += 11) R(fx, 5, 2, 8, '#a8693a');
  R(0, 7, YW, 1, '#a8693a'); R(0, 10, YW, 1, '#a8693a');
  R(0, 13, YW, 5, '#9bb08a'); R(0, 13, YW, 1, '#7d8f63');
  for (let i = 0; i < 26; i++) R((i * 17 + 5) % YW, 15 + i % 3, 1, 1, '#7d8f63');
  const lc = ['#b5532a', '#d9a03a', '#8c2f39', '#d9692b'];
  for (let j = 0; j < 8; j++) R((j * 37 + 11) % YW, 14 + j % 4, 2, 1, lc[j % 4]);
}
function mkTurkeys() {
  const cols = [['#7b4a2a', '#a8693a', '#5e3820'], ['#8a5a32', '#b9824d', '#6a4325'], ['#6a3f22', '#946037', '#4d2d18'], ['#9a5a1d', '#c58a45', '#744313']];
  tk = cols.map((c, i) => ({x: 16 + i * 29, dir: i % 2 ? -1 : 1, state: 'walk', until: 0, c, ph: i * 0.37, v: 8 + i * 1.5}));
}
function updTurkeys(t, dt) {
  for (const k of tk) {
    if (t >= k.until) {
      let r = Math.random() * STATES.reduce((a, s) => a + s[1], 0), s = STATES[0];
      for (const c of STATES) { r -= c[1]; if (r <= 0) { s = c; break; } }
      k.state = s[0]; k.until = t + s[2] + Math.random() * (s[3] - s[2]);
      if (s[0] === 'walk' && Math.random() < 0.4) k.dir = -k.dir;
    }
    if (k.state === 'walk') {
      k.x += k.dir * k.v * dt;
      if (k.x < 12) { k.x = 12; k.dir = 1; }
      if (k.x > YW - 16) { k.x = YW - 16; k.dir = -1; }
    }
  }
}
function drawMini(k, t) {
  const f = Math.floor(t * 6 + k.ph * 10), x = Math.round(k.x), dir = k.dir, st = k.state;
  const P2 = (dx, dy, w, h, c) => R(dir > 0 ? x + dx : x - dx - w + 1, GROUND + dy, w, h, c);
  const [body, chest, wing] = k.c, tan = '#d8b08a';
  let hop = 0, hx = 0, hy = 0, spread = false, wingUp = false, closed = false, sit = 0, gob = false, lifted = -1;
  if (st === 'walk') lifted = f % 2;
  if (st === 'peck') { const ph = f % 4; hx = ph < 2 ? 3 : 0; hy = ph < 2 ? 8 : 0; }
  if (st === 'gobble') { gob = f % 2 === 0; hy = -1; hx = 1; }
  if (st === 'flap') { wingUp = f % 2 === 0; hop = wingUp ? -1 : 0; }
  if (st === 'fluff') spread = true;
  if (st === 'nap') { sit = 2; closed = true; }
  const oy = hop + sit;
  if (spread) {
    [[-4, -9, 5, '#7d8f63'], [-3, -11, 7, '#8c2f39'], [-2, -12, 8, '#b5532a'], [-1, -12, 8, '#d9a03a'], [0, -11, 7, '#8c2f39'], [1, -10, 6, '#7d8f63']]
      .forEach(b => P2(b[0], b[1] + oy, 1, b[2], b[3]));
  } else {
    P2(-3, -8 + oy, 1, 4, '#8c2f39'); P2(-2, -9 + oy, 1, 5, '#b5532a'); P2(-1, -8 + oy, 1, 3, '#d9a03a');
  }
  P2(-1, -7 + oy, 7, 4, body); P2(0, -8 + oy, 5, 1, body); P2(2, -6 + oy, 3, 2, chest);
  if (wingUp) P2(0, -10 + oy, 4, 3, wing); else P2(1, -7 + oy, 3, 2, wing);
  for (let i = 0; i <= 4; i++) P2(5 + Math.round(i * hx / 4), -8 + Math.round(i * (hy - 3) / 4) + oy, 2, 2, tan);
  P2(5 + hx, -11 + hy + oy, 3, 3, tan);
  P2(6 + hx, -10 + hy + oy, 1, 1, closed ? '#b9926a' : '#4a2e1f');
  P2(8 + hx, -10 + hy + oy, 1, 1, '#d9a03a');
  P2(7 + hx, -8 + hy + oy, 1, gob ? 3 : 2, '#8c2f39');
  if (gob) { P2(10 + hx, -11 + hy + oy, 1, 1, '#4a2e1f'); P2(11 + hx, -9 + hy + oy, 1, 1, '#4a2e1f'); }
  if (!sit) {
    P2(0, -3, 1, lifted === 0 ? 2 : 3, '#d9a03a'); P2(3, -3, 1, lifted === 1 ? 2 : 3, '#d9a03a');
    P2(0, -1, 2, 1, '#d9a03a'); P2(3, -1, 2, 1, '#d9a03a');
  } else {
    const zy = -14 - (Math.floor(f / 2) % 3);
    P2(8, zy, 3, 1, '#4a2e1f'); P2(9, zy + 1, 1, 1, '#4a2e1f'); P2(8, zy + 2, 3, 1, '#4a2e1f');
  }
}

/* --- timeline --- */
const D1 = 4.5, T1 = 3.5, X1 = 0.8;
const CAPS = ['A LIVE TURKEY IS DANCING...', 'UH OH. IT IS GETTING WARM IN HERE.', 'DINNER IS SERVED! HAPPY THANKSGIVING!'];
let capNow = -1;
const setCap = n => { if (n !== capNow) { capNow = n; capEl.textContent = CAPS[n]; } };
function liveScene(t, prog) {
  g = mg; mg.drawImage(bgLive, 0, 0);
  to.clear(); g = to.cx; K = KS; turkey(t, prog); K = 1;
  to.flush(mg);
  g = mg; K = KS; fire(t, prog); K = 1;
}
function frame(t) {
  if (t < D1) { setCap(0); liveScene(t, 0); return; }
  if (t < D1 + T1) { setCap(1); liveScene(t, (t - D1) / T1); return; }
  g = mg;
  if (t < D1 + T1 + X1) {
    setCap(1); liveScene(t, 1); g = mg;
    mg.globalAlpha = (t - D1 - T1) / X1; mg.drawImage(bgRoast, 0, 0); roastSteam(t); mg.globalAlpha = 1;
    return;
  }
  setCap(2); mg.drawImage(bgRoast, 0, 0); roastSteam(t);
}
const th = {open: false, paused: false, t0: 0, pausedAt: 0, step: -1, last: 0};
function theaterTick(now) {
  if (!th.open || th.paused) return;
  const t = (now - th.t0) / 1000, step = Math.floor(t * 12);
  if (step === th.step) return;
  th.step = step;
  frame(t);
  updTurkeys(t, Math.max(0, Math.min(t - th.last, 0.5))); th.last = t;
  yo.clear(); g = yo.cx; K = KY;
  tk.slice().sort((a, b) => a.x - b.x).forEach(k => drawMini(k, t));
  K = 1;
  yg.clearRect(0, 0, YPW, YPH); yg.drawImage(yardBg, 0, 0); yo.flush(yg);
}
tasks.push(theaterTick);
function startTheater() {
  th.paused = false; pauseBtn.textContent = 'Pause';
  th.step = -1; th.last = 0; capNow = -1; mkTurkeys();
  th.t0 = performance.now(); theaterTick(th.t0);
}
function openTheater() {
  loadFont();
  if (!theaterReady) {
    theaterReady = true;
    mg = stage.getContext('2d'); yg = yardCv.getContext('2d');
    mg.imageSmoothingEnabled = yg.imageSmoothingEnabled = false;
    to = makeOutliner(RW, RH); yo = makeOutliner(YPW, YPH);
    K = KS;
    bgLive = layer(RW, RH, () => { wall(); floorTiles(); });
    const roastBg = layer(RW, RH, () => { wall(); table(); });
    K = KY; yardBg = layer(YPW, YPH, drawYardBg); K = 1;
    const art = buildRoast();
    bgRoast = layer(RW, RH, () => { g.drawImage(roastBg, 0, 0); g.drawImage(art, 0, 0); });
  }
  panel.hidden = false; th.open = true; setLoopRate(83);
  secretBtn.setAttribute('aria-expanded', 'true');
  startTheater();
  panel.scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block: 'center'});
  $('secret-title').focus({preventScroll: true});
}
function closeTheater() {
  th.open = false; panel.hidden = true; setLoopRate(100);
  secretBtn.setAttribute('aria-expanded', 'false');
  secretBtn.focus();
}
secretBtn.addEventListener('click', () => panel.hidden ? openTheater() : closeTheater());
['pointerenter', 'focus'].forEach(ev => secretBtn.addEventListener(ev, loadFont, {once: true}));
$('replay').addEventListener('click', startTheater);
$('close').addEventListener('click', closeTheater);
pauseBtn.addEventListener('click', () => {
  const now = performance.now();
  if (th.paused) { th.t0 = now - th.pausedAt * 1000; th.paused = false; pauseBtn.textContent = 'Pause'; }
  else { th.pausedAt = (now - th.t0) / 1000; th.paused = true; pauseBtn.textContent = 'Play'; }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) closeTheater(); });

startLoop();

/* ============ Shared lists (snacks, family games, dinner menu, meal plan) ============ */
const S = {db: null, uid: null, admin: false, write: null, locked: false};
const LOCKMSG = 'The page is locked. Unlock it to make changes.';
const mnStatus = $('mn-status');
let menu = [];
const writable = () => !!S.db && S.write !== false && !S.locked;

/* a shared "item, brought by" list; used for Snacks and Family Games */
function signup(p, coll, noun) {
  const nameEl = $(p + '-name'), itemEl = $(p + '-item'), addBtn = $(p + '-add'), status = $(p + '-status'), list = $(p + '-list');
  const box = $(p + '-copyBox'), txt = $(p + '-copyText');
  let items = [];
  try { const saved = localStorage.getItem('pl-name'); if (saved) nameEl.value = saved; } catch (e) {}
  const render = () => {
    const f = document.createDocumentFragment();
    for (const e of items) {
      const li = el('li', 'card pl-row'), t = el('span', 'pl-text');
      t.appendChild(el('b', '', e.item));
      if (e.name) t.appendChild(el('small', '', 'Brought by ' + e.name));
      li.appendChild(t);
      if (!S.locked && (S.admin || (S.uid && e.uid === S.uid))) {
        const d = el('button', 'del', 'Remove');
        d.type = 'button'; d.dataset.id = e.id; d.setAttribute('aria-label', 'Remove ' + e.item);
        li.appendChild(d);
      }
      f.appendChild(li);
    }
    list.replaceChildren(f);
  };
  const showCopy = (name, item) => { txt.value = name ? `${name} is bringing ${item}.` : `Someone is bringing ${item}.`; box.hidden = false; };
  const add = () => {
    const name = nameEl.value.trim(), item = itemEl.value.trim();
    if (!item) { status.textContent = `Please enter the ${noun} you are bringing.`; return; }
    try { if (name) localStorage.setItem('pl-name', name); } catch (e) {}
    if (S.locked) { status.textContent = LOCKMSG; return; }
    if (!S.db || S.write === false) { showCopy(name, item); return; }
    addBtn.disabled = true; status.textContent = '';
    S.db.collection(coll).add({name, item, uid: S.uid || null, created: Date.now()})
      .then(() => { itemEl.value = ''; box.hidden = true; status.textContent = 'Added. Thank you!'; })
      .catch(err => {
        if (err && err.code === 'invalid_argument') {
          S.write = false;
          status.textContent = `You can see the list, but adding ${noun}s needs permission from the host.`;
          showCopy(name, item); renderShared();
        } else status.textContent = 'Could not save that. Please try again.';
      })
      .then(() => { addBtn.disabled = false; });
  };
  addBtn.addEventListener('click', add);
  [nameEl, itemEl].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }));
  list.addEventListener('click', e => { const b = e.target.closest('.del'); if (b) del(coll, b.dataset.id, status); });
  $(p + '-copyBtn').addEventListener('click', () => {
    txt.select();
    let ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt.value); ok = true; }
      else ok = document.execCommand('copy');
    } catch (e) {}
    status.textContent = ok ? 'Copied. Paste it into a text to the host.' : 'Select the message above and copy it.';
  });
  return {coll, noun, status, render, lock(on) { [nameEl, itemEl, addBtn].forEach(x => { x.disabled = on; }); }, set(rows) { items = rows; render(); }};
}
const signups = [signup('pl', 'potluck', 'snack'), signup('gm', 'games', 'game')];

function renderMenu() {
  const can = writable();
  document.querySelectorAll('.mn-card').forEach(card => {
    const cat = card.dataset.cat, ul = card.querySelector('ul'), f = document.createDocumentFragment();
    const list = menu.filter(x => x.cat === cat);
    for (const x of list) {
      const li = el('li'); li.appendChild(el('span', '', x.item));
      if (can) {
        const d = el('button', 'del', 'Remove');
        d.type = 'button'; d.dataset.id = x.id; d.setAttribute('aria-label', 'Remove ' + x.item);
        li.appendChild(d);
      }
      f.appendChild(li);
    }
    ul.replaceChildren(f);
    card.querySelector('.mn-form').hidden = !can;
  });
}
function addMenu(cat, input) {
  const v = input.value.trim();
  if (!v || !S.db) return;
  mnStatus.textContent = '';
  if (S.locked) return;
  S.db.collection('menu').add({cat, item: v, created: Date.now()})
    .then(() => { input.value = ''; })
    .catch(err => {
      if (err && err.code === 'invalid_argument') { S.write = false; renderMenu(); mnStatus.textContent = 'Only the host can change the menu.'; }
      else mnStatus.textContent = 'Could not save that. Please try again.';
    });
}
const del = (coll, id, status) => {
  if (S.locked) { status.textContent = LOCKMSG; return; }
  return S.db && S.db.collection(coll).doc(id).delete()
    .catch(() => { status.textContent = 'Could not remove that item. Please try again.'; });
};

document.querySelectorAll('.mn-card').forEach(card => {
  const input = card.querySelector('input');
  card.querySelector('.btn').addEventListener('click', () => addMenu(card.dataset.cat, input));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addMenu(card.dataset.cat, input); } });
  card.addEventListener('click', e => { const b = e.target.closest('.del'); if (b) del('menu', b.dataset.id, mnStatus); });
});

/* ---- weekly meal plan (Tuesday to Saturday) ---- */
const PLAN_DAYS = [['tue', 'Tue, Nov 24', ''], ['wed', 'Wed, Nov 25', 'Thanksgiving Eve'], ['thu', 'Thu, Nov 26', 'Thanksgiving Day'], ['fri', 'Fri, Nov 27', 'Black Friday'], ['sat', 'Sat, Nov 28', '']];
const PLAN_MEALS = ['Breakfast', 'Lunch', 'Dinner'];
const planBody = $('plan-body'), planStatus = $('plan-status');
let plan = {}, growTimer = 0;
function buildPlan() {
  const f = document.createDocumentFragment();
  for (const [key, label, sub] of PLAN_DAYS) {
    const tr = el('tr'), th = el('th', '', label);
    th.scope = 'row';
    if (sub) th.appendChild(el('small', '', sub));
    tr.appendChild(th);
    for (const meal of PLAN_MEALS) {
      const td = el('td'), inp = el('textarea', 'field'), txt = el('span', 'cell-text');
      td.dataset.label = meal;
      inp.rows = 1; inp.maxLength = 200; inp.dataset.id = `${key}-${meal.toLowerCase()}`;
      inp.dataset.day = key; inp.dataset.meal = meal.toLowerCase();
      inp.setAttribute('aria-label', `${label} ${meal.toLowerCase()}`); inp.hidden = true;
      td.append(inp, txt); tr.appendChild(td);
    }
    f.appendChild(tr);
  }
  planBody.appendChild(f);
}
const grow = t => { t.style.height = 'auto'; t.style.height = (t.scrollHeight + t.offsetHeight - t.clientHeight) + 'px'; };   // show the whole entry
const growAll = () => planBody.querySelectorAll('textarea').forEach(t => { if (!t.hidden) grow(t); });
function renderPlan() {
  const can = writable();
  planBody.querySelectorAll('td').forEach(td => {
    const inp = td.querySelector('textarea'), txt = td.querySelector('.cell-text'), val = plan[inp.dataset.id] || '';
    inp.hidden = !can; txt.hidden = can;
    if (can) { if (document.activeElement !== inp) inp.value = val; grow(inp); }
    else { txt.textContent = val || '\u2014'; txt.classList.toggle('empty', !val); }
  });
}
function savePlan(inp) {
  const id = inp.dataset.id, text = inp.value.trim();
  if (!S.db || (plan[id] || '') === text) return;
  planStatus.textContent = '';
  if (S.locked) return;
  S.db.collection('mealplan').doc(id).set({text, day: inp.dataset.day, meal: inp.dataset.meal, updated: Date.now()})
    .then(() => { planStatus.textContent = 'Saved.'; })
    .catch(err => {
      if (err && err.code === 'invalid_argument') { S.write = false; renderPlan(); renderMenu(); planStatus.textContent = 'Only the host can change the meal plan.'; }
      else planStatus.textContent = 'Could not save that. Please try again.';
    });
}
planBody.addEventListener('change', e => { const i = e.target.closest('textarea'); if (i) savePlan(i); });
planBody.addEventListener('input', e => { if (e.target.matches('textarea')) grow(e.target); });
planBody.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('textarea')) { e.preventDefault(); e.target.blur(); } });
addEventListener('resize', () => { clearTimeout(growTimer); growTimer = setTimeout(growAll, 150); });
buildPlan();

/* ---- events for each day (editable lists) ---- */
const evStatus = $('ev-status');
let events = [];
function renderEvents() {
  const can = writable();
  document.querySelectorAll('.ev-day').forEach(day => {
    const f = document.createDocumentFragment();
    for (const x of events.filter(e => e.day === day.dataset.day)) {
      const li = el('li', 'item'), body = el('div', 'ev-body');
      li.appendChild(el('div', 'time', x.time));
      body.appendChild(el('span', '', x.text));
      if (can) {
        const d = el('button', 'del', 'Remove');
        d.type = 'button'; d.dataset.id = x.id; d.setAttribute('aria-label', 'Remove ' + x.text);
        body.appendChild(d);
      }
      li.appendChild(body); f.appendChild(li);
    }
    day.querySelector('.ev-list').replaceChildren(f);
    day.querySelector('.ev-form').hidden = !can;
  });
}
function addEvent(day) {
  const time = day.querySelector('.ev-time'), text = day.querySelector('.ev-text'), v = text.value.trim();
  if (!v || !S.db) return;
  evStatus.textContent = '';
  if (S.locked) return;
  S.db.collection('events').add({day: day.dataset.day, time: time.value.trim(), text: v, created: Date.now()})
    .then(() => { text.value = ''; time.value = ''; })
    .catch(err => {
      if (err && err.code === 'invalid_argument') { S.write = false; renderShared(); evStatus.textContent = 'Only the host can change the events.'; }
      else evStatus.textContent = 'Could not save that. Please try again.';
    });
}
document.querySelectorAll('.ev-day').forEach(day => {
  day.querySelector('.ev-add').addEventListener('click', () => addEvent(day));
  day.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addEvent(day); } }));
  day.addEventListener('click', e => { const bt = e.target.closest('.del'); if (bt) del('events', bt.dataset.id, evStatus); });
});
/* ---- lodging: hotel rooms and arrivals (editable shared lists) ---- */
function lodgeList(coll, p, fields, noun, line) {
  const list = $(p + '-list'), form = $(p + '-form'), status = $(p + '-status');
  const addBtn = form.querySelector('.lg-add'), cancel = form.querySelector('.lg-cancel');
  const inputs = fields.map(k => form.querySelector(`[data-k=${k}]`));
  let items = [], editing = null;
  const map = d => { const x = d.data() || {}, o = {id: d.id, created: +x.created || Date.now()}; fields.forEach(k => { o[k] = String(x[k] || ''); }); return o; };
  const reset = () => { editing = null; inputs.forEach(i => { i.value = ''; }); addBtn.textContent = 'Add'; cancel.hidden = true; };
  const render = () => {
    const can = writable();
    if (editing && !items.some(x => x.id === editing)) reset();
    const f = document.createDocumentFragment();
    if (!items.length) f.appendChild(el('li', 'empty', `No ${noun} added yet.`));
    for (const x of items) {
      const li = el('li', 'lg-item'), main = el('div', 'lg-main');
      const [top, sub, tag] = line(x);
      main.appendChild(el('span', 'nm', top));
      if (sub) main.appendChild(el('small', '', sub));
      li.appendChild(main);
      if (tag) li.appendChild(el('span', 'room', tag));
      if (can) {
        const act = el('div', 'lg-act');
        const ed = el('button', 'del', 'Edit'), rm = el('button', 'del', 'Remove');
        ed.type = rm.type = 'button'; ed.dataset.act = 'edit'; rm.dataset.act = 'del'; ed.dataset.id = rm.dataset.id = x.id;
        ed.setAttribute('aria-label', 'Edit ' + top); rm.setAttribute('aria-label', 'Remove ' + top);
        act.append(ed, rm); li.appendChild(act);
      }
      f.appendChild(li);
    }
    list.replaceChildren(f);
    form.hidden = !can;
  };
  const save = () => {
    const v = {}; fields.forEach((k, i) => { v[k] = inputs[i].value.trim(); });
    if (!v[fields[0]] || !S.db) { inputs[0].focus(); return; }
    status.textContent = '';
    const cur = items.find(x => x.id === editing);
    if (S.locked) return;
    const col = S.db.collection(coll);
    const req = cur ? col.doc(cur.id).set(Object.assign({}, v, {created: cur.created})) : col.add(Object.assign({}, v, {created: Date.now()}));
    addBtn.disabled = true;
    req.then(() => { reset(); status.textContent = cur ? 'Saved.' : 'Added.'; })
      .catch(err => {
        if (err && err.code === 'invalid_argument') { S.write = false; renderShared(); status.textContent = 'Only the host can change this list.'; }
        else status.textContent = 'Could not save that. Please try again.';
      })
      .then(() => { addBtn.disabled = false; });
  };
  addBtn.addEventListener('click', save);
  cancel.addEventListener('click', () => { reset(); status.textContent = ''; });
  inputs.forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } }));
  list.addEventListener('click', e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    if (b.dataset.act === 'del') { if (editing === b.dataset.id) reset(); del(coll, b.dataset.id, status); return; }
    const x = items.find(y => y.id === b.dataset.id); if (!x) return;
    editing = x.id; fields.forEach((k, i) => { inputs[i].value = x[k]; });
    addBtn.textContent = 'Save changes'; cancel.hidden = false; status.textContent = '';
    form.scrollIntoView({block: 'nearest'}); inputs[0].focus();
  });
  return {coll, status, map, render, set(rows) { items = rows; render(); }};
}
const lodges = [
  lodgeList('lodging', 'lh', ['name', 'room'], 'hotel guests', x => [x.name, '', x.room ? 'Room ' + x.room : '']),
  lodgeList('arrivals', 'la', ['name', 'mode', 'time'], 'arrivals', x => [x.name, [x.mode, x.time].filter(Boolean).join(' \u00b7 '), ''])
];
tabs($('lodging-tabs'));

function renderShared() { renderMenu(); renderPlan(); renderEvents(); lodges.forEach(l => l.render()); }

/* ---- page lock: when locked, nobody can add, edit or remove anything ---- */
const lockBtn = $('lockbtn'), lkNote = $('lk-note');
let lkTimer = 0;
const lkSay = msg => { lkNote.textContent = msg; clearTimeout(lkTimer); lkTimer = setTimeout(() => { lkNote.textContent = ''; }, 4000); };
function applyLock() {
  const L = !!S.locked, can = !!S.db && S.admin;   // only the host (an editor of the page) can lock or unlock
  lockBtn.classList.toggle('on', L); lockBtn.classList.toggle('ro', !can);
  lockBtn.setAttribute('aria-pressed', String(L));
  lockBtn.setAttribute('aria-label', L ? 'The page is locked. Unlock the page' : 'The page is unlocked. Lock the page');
  lockBtn.title = !can ? 'Only the host can lock or unlock the page' : L ? 'Unlock the page to allow changes' : 'Lock the page to stop all changes';
  lockBtn.querySelector('.lk-txt').textContent = L ? 'Locked' : 'Unlocked';
  signups.forEach(sg => sg.lock(L));
  const sts = [mnStatus, evStatus, planStatus, ...lodges.map(l => l.status), ...signups.map(sg => sg.status)];
  sts.forEach(s => { if (L) s.textContent = LOCKMSG; else if (s.textContent === LOCKMSG) s.textContent = ''; });
  renderShared(); signups.forEach(sg => sg.render());
}
lockBtn.addEventListener('click', () => {
  if (!S.db) { lkSay('Locking needs the shared page, which is not available in this view.'); return; }
  if (!S.admin) { lkSay('Only the host can lock or unlock the page.'); return; }
  const next = !S.locked;
  S.db.collection('settings').doc('lock').set({locked: next, updated: Date.now()})
    .then(() => { S.locked = next; applyLock(); lkSay(next ? 'Locked. No one can make changes.' : 'Unlocked. Changes are allowed.'); })
    .catch(err => {
      if (err && err.code === 'invalid_argument') { S.write = false; applyLock(); lkSay('Only the host can lock or unlock the page.'); }
      else lkSay('Could not change the lock. Please try again.');
    });
});
async function initShared() {
  const offline = () => {
    signups.forEach(sg => { sg.status.textContent = `The shared list is not available in this view. You can still write your ${sg.noun} here and copy a message for the host.`; });
    mnStatus.textContent = 'The shared menu is not available in this view.';
    evStatus.textContent = 'The shared event list is not available in this view.';
    planStatus.textContent = 'The shared meal plan is not available in this view.';
    lodges.forEach(l => { l.status.textContent = 'The shared list is not available in this view.'; });
    signups.forEach(sg => sg.render()); renderShared(); applyLock();
  };
  signups.forEach(sg => sg.render()); renderShared();
  const c = window.claude;
  if (!c || !c.use) return offline();
  try {
    const [db, user] = await Promise.all([c.use('db'), c.use('user')]);
    if (!db) return offline();
    S.db = db;
    if (user) {
      const [id, admin, write] = await Promise.allSettled([user.id(), user.canEdit(), user.can('data.write')]);
      if (id.status === 'fulfilled') S.uid = id.value;
      if (admin.status === 'fulfilled') S.admin = !!admin.value;
      if (write.status === 'fulfilled') S.write = write.value;
    }
    if (S.write === false) { planStatus.textContent = 'You can see the meal plan, but only the host can change it.'; lodges.forEach(l => { l.status.textContent = 'You can see this list, but only the host can change it.'; }); }
    renderShared(); applyLock();
    if (S.write === false) signups.forEach(sg => { sg.status.textContent = `You can see the list, but adding ${sg.noun}s needs permission from the host. Fill in the form to make a message to send them.`; });
    const map = d => { const x = d.data() || {}; return {id: d.id, name: String(x.name || ''), item: String(x.item || ''), cat: String(x.cat || ''), uid: x.uid || null}; };
    signups.forEach(sg => db.collection(sg.coll).orderBy('created', 'asc').onSnapshot(s => sg.set(s.docs.map(map)), () => { sg.status.textContent = 'The shared list could not be loaded.'; }));
    db.collection('mealplan').orderBy('updated', 'asc').onSnapshot(s => { plan = {}; s.docs.forEach(d => { plan[d.id] = String((d.data() || {}).text || ''); }); renderPlan(); }, () => { planStatus.textContent = 'The shared meal plan could not be loaded.'; });
    db.collection('events').orderBy('created', 'asc').onSnapshot(s => { events = s.docs.map(d => { const x = d.data() || {}; return {id: d.id, day: String(x.day || ''), time: String(x.time || ''), text: String(x.text || '')}; }); renderEvents(); }, () => { evStatus.textContent = 'The shared event list could not be loaded.'; });
    lodges.forEach(l => db.collection(l.coll).orderBy('created', 'asc').onSnapshot(s => l.set(s.docs.map(l.map)), () => { l.status.textContent = 'The shared list could not be loaded.'; }));
    db.collection('settings').orderBy('updated', 'asc').onSnapshot(s => { const d = s.docs.find(x => x.id === 'lock'); S.locked = !!(d && (d.data() || {}).locked); applyLock(); }, () => {});
    db.collection('menu').orderBy('created', 'asc').onSnapshot(s => { menu = s.docs.map(map); renderMenu(); }, () => { mnStatus.textContent = 'The shared menu could not be loaded.'; });
  } catch (e) { offline(); }
}
/* ---- hidden page: click the dead centre of the fire pit ---- */
const emp = $('emperor'), empClose = $('em-close');
let empFrom = null;
function openEmperor() { empFrom = document.activeElement; emp.hidden = false; document.body.style.overflow = 'hidden'; empClose.focus(); }
function closeEmperor() { emp.hidden = true; document.body.style.overflow = ''; if (empFrom && empFrom.focus) empFrom.focus(); }
document.addEventListener('click', e => {
  if (!emp.hidden || e.target.closest('button, a, input, textarea, select, label, .panel')) return;
  if (Math.hypot(e.clientX - FIRE.x, e.clientY - FIRE.y) <= 16) openEmperor();
});
const galleries = [...emp.querySelectorAll('.em-gal')].map(root => {
  const slides = [...root.querySelectorAll('.em-img')], count = root.querySelector('.em-count'), stage = root.querySelector('.em-slides');
  let i = 0;
  const show = n => {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => { s.hidden = k !== i; });
    count.textContent = (i + 1) + ' / ' + slides.length;
    stage.style.setProperty('--bg', 'url("' + slides[i].src + '")');   // the same picture, enlarged and dimmed, fills any gap around the slide
  };
  root.querySelector('.em-prev').addEventListener('click', () => show(i - 1));
  root.querySelector('.em-next').addEventListener('click', () => show(i + 1));
  let x = null;
  stage.addEventListener('touchstart', e => { x = e.touches[0].clientX; }, {passive: true});
  stage.addEventListener('touchend', e => { if (x === null) return; const dx = e.changedTouches[0].clientX - x; x = null; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); }, {passive: true});
  if (slides.length < 2) { root.querySelectorAll('.em-arrow').forEach(a => { a.hidden = true; }); count.hidden = true; }   // one picture: nothing to slide to
  show(0);
  return {root, step: d => show(i + d)};
});
document.addEventListener('keydown', e => {
  if (emp.hidden || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
  const vis = r => { const b = r.getBoundingClientRect(); return Math.max(0, Math.min(b.bottom, innerHeight) - Math.max(b.top, 0)); };
  galleries.reduce((a, c) => vis(c.root) > vis(a.root) ? c : a).step(e.key === 'ArrowRight' ? 1 : -1);   // arrows move the gallery most in view
});
empClose.addEventListener('click', closeEmperor);
emp.addEventListener('click', e => { if (e.target === emp) closeEmperor(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !emp.hidden) closeEmperor(); });

initShared();
})();
