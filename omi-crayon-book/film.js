// Film timeline: three picture-book pages joined by page turns; the question waits in white wax on page 3 until a rose wash finds it;
// then the camera pulls out past the page edge to a desk where the real book lies.
import { layer, clear, line, fill, CAM, BOIL, W, H } from './crayon.js';
import { group, clearGroup } from './rig.js';
import { page1, page2, page3, MARKS, BUBBLE, pr } from './pages.js';
import { PAL } from './pal.js';
import { clamp, lerp, hash, track, ss, eo } from '/core/lib.js';
const K = PAL.crayon;

const TL = await (await fetch('timeline.json')).json();
const BOOK = new Image(); BOOK.src = 'img/book.webp';
export const ready = BOOK.decode();
export const DUR = TL.dur;
const CTA = TL.cta;
export const TURN1 = [20.6, 21.4], TURN2 = [32.9, 33.6];
export const WASH_BANDS = [{ t0: 38.1, t1: 40.2, y0: 110, y1: 720, dir: -1 }, { t0: 40.25, t1: 41.9, y0: 690, y1: 880, dir: 1 }];
const QUESTION = TL.cards.find(c => c.id === 'c8');
const WAX_LINES = [{ text: 'ما اللحظة التي تتمنّين', y: 300 }, { text: 'أن تعيشيها مرّةً أخرى؟', y: 420 }];

// —— cameras (page coords: centre x, y, zoom), one per page ——
const cam1 = track([[0, [500, 1040, 1.75]], [5.8, [500, 1020, 1.62]], [8.2, [540, 960, 1.0]], [10.2, [540, 960, 1.0]], [11.4, [250, 960, 1.42]],
  [14.0, [290, 950, 1.42]], [15.0, [810, 900, 1.45]], [16.4, [800, 900, 1.45]], [17.3, [700, 1080, 1.2]], [20.6, [660, 1020, 1.14]]]);
const cam2 = track([[21.4, [930, 1130, 1.72]], [25.6, [930, 790, 1.62]], [26.8, [470, 960, 1.22]], [31.4, [470, 930, 1.42]], [33.6, [470, 930, 1.44]]]);
const cam3 = track([[32.9, [540, 960, 1.0]], [37.9, [540, 930, 1.04]], [42.0, [540, 930, 1.04]], [44.8, [520, 900, 1.1]], [49.8, [520, 890, 1.12]]]);

// —— layers ——
const BG = group(), P = group(), WAX = layer(), WASH = layer(), SUBK = layer(), SUBT = layer(), DESK = layer();
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return { c, g: c.getContext('2d') }; };
const SA = mk(), SB = mk(), OUT = mk();
const glc = () => document.getElementById('gl');
const snap = S => { S.g.setTransform(1, 0, 0, 1, 0, 0); S.g.clearRect(0, 0, W, H); S.g.drawImage(glc(), 0, 0); };

// —— the printed words: Marhey on a ragged patch of blank paper, written right → left word by word, boiling on twos ——
function wrap(g, text, maxW) {
  const words = text.split(' '), out = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur); return out;
}
export function arText(L, text, cx, cy, o = {}) {
  const g = L.g, size = o.size || 58, lh = size * 1.45, st = BOIL.step, ba = BOIL.amp, seed = o.seed || 1;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.font = `700 ${size}px 'Marhey'`; g.direction = 'rtl'; g.textAlign = 'right'; g.textBaseline = 'middle';
  const lines = o.lines || wrap(g, text, o.maxW || 900);
  const sp = g.measureText(' ').width, total = lines.reduce((a, l) => a + g.measureText(l).width, 0);
  let budget = (o.reveal ?? 1) * total;
  const boxes = [];
  lines.forEach((l, i) => {
    const y = o.ys ? o.ys[i] : cy + (i - (lines.length - 1) / 2) * lh, w = g.measureText(l).width;
    let x = cx + w / 2; const x0 = x;
    boxes.push([cx - w / 2, y - size * 0.7, cx + w / 2, y + size * 0.7]);
    l.split(' ').forEach((word, k) => {
      const ww = g.measureText(word).width, h = seed + i * 31 + k * 7;
      const jx = (hash(h + st * 1.3) - .5) * 1.6 * ba, jy = (hash(h + 5 + st * 2.1) - .5) * 1.6 * ba, rot = (hash(h + 9) - .5) * 0.05 + (hash(h + st * .7) - .5) * 0.012 * ba;
      g.save(); g.translate(x - ww / 2 + jx, y + (hash(h + 3) - .5) * size * 0.06 + jy); g.rotate(rot);
      g.fillStyle = o.col || K.ink; g.globalAlpha = o.p ?? 1;
      g.textAlign = 'center'; g.fillText(word, 0, 0);
      if (o.stroke) { g.lineWidth = o.stroke; g.strokeStyle = o.col || K.ink; g.globalAlpha = (o.p ?? 1) * 0.6; g.strokeText(word, 0, 0); }
      g.restore();
      x -= ww + sp;
    });
    // writing on: a clip that opens right → left over this line's share of the reveal
    const shown = clamp(budget / w); budget -= w;
    if (shown < 1) { g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.fillRect(0, y - size, x0 - w * shown - 4, size * 2); g.restore(); }
  });
  g.restore();
  return boxes;
}
function patch(L, boxes, pad = 40) {
  const g = L.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000';
  boxes.forEach(([x0, y0, x1, y1], j) => {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2 + pad, hh = (y1 - y0) / 2 + pad * 0.55;
    g.beginPath();
    for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2, px = Math.cos(a), py = Math.sin(a), sq = Math.pow(Math.abs(px), 0.3) * Math.sign(px); const n = 1 + 0.06 * Math.sin(a * 7 + 1.3 + j) + 0.03 * Math.sin(a * 17); const X = cx + sq * hw * n, Y = cy + py * hh * n; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }
    g.closePath(); g.fill();
  });
  g.restore();
}
const CARD_Y = { c1a: 1360, c1b: 1520 };
function printed(t) {
  for (const c of TL.cards) {
    if (c.id === 'c8' || t < c.t0 || t > c.t1) continue;    // c8 is the white-wax question on page 3
    const boxes = arText(SUBT, c.text, W / 2, CARD_Y[c.id] ?? 1440, { reveal: pr(t, c.t0, c.t0 + c.w), seed: 11 + c.t0 * 3, stroke: 1 });
    patch(SUBK, boxes);
  }
}

// —— the rose wash: wide bands with a wet leading edge; pigment density in the alpha ——
function drawWash(t) {
  const g = WASH.g; g.setTransform(CAM.s, 0, 0, CAM.s, W / 2 - CAM.x * CAM.s, H / 2 - CAM.y * CAM.s);   // anchored to the page
  WASH_BANDS.forEach((b, i) => {
    const u = ss(pr(t, b.t0, b.t1)); if (u <= 0) return;
    const xs = b.dir < 0 ? W + 60 : -60, xe = b.dir < 0 ? -60 : W + 60, edge = lerp(xs, xe, u);
    const [a0, a1] = b.dir < 0 ? [edge, xs] : [xs, edge];
    const top = [], bot = [];
    for (let x = a0; x <= a1 + 1; x += 16) { top.push([x, b.y0 + 10 * Math.sin(x * 0.031 + i) + 5 * Math.sin(x * 0.11)]); bot.push([x, b.y1 + 12 * Math.sin(x * 0.027 + 2 + i) + 5 * Math.sin(x * 0.13)]); }
    g.beginPath(); top.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); bot.reverse().forEach(([x, y]) => g.lineTo(x, y)); g.closePath();
    g.fillStyle = 'rgba(0,0,0,0.78)'; g.fill();
    for (let k = 0; k < 14; k++) {   // bristle streaks along the stroke
      const y = lerp(b.y0, b.y1, (k + hash(k * 3.1 + i)) / 14);
      g.strokeStyle = `rgba(0,0,0,${0.08 + 0.1 * hash(k + i * 9)})`; g.lineWidth = 3 + 5 * hash(k * 1.7); g.beginPath(); g.moveTo(a0, y); g.lineTo(a1, y + (hash(k) - .5) * 8); g.stroke();
    }
    if (u < 1) { g.fillStyle = 'rgba(0,0,0,0.95)'; g.fillRect(edge - (b.dir < 0 ? 0 : 26), b.y0 - 6, 26, b.y1 - b.y0 + 12); }   // wet leading edge
  });
}

// —— one page into the GL canvas ——
function drawPage(comp, n, t, cam, { subs = true, vig = 0.28 } = {}) {
  [CAM.x, CAM.y, CAM.s] = cam;
  BOIL.amp = (t > 31.4 && t < 33.0) ? 0.5 : 1;                 // the breath: the boil calms
  clearGroup(BG); clearGroup(P); [WAX, WASH, SUBK, SUBT].forEach(clear);
  (n === 1 ? page1 : n === 2 ? page2 : page3)(BG, P, t);
  if (n === 3) {
    arText(WAX, '', (W / 2 - CAM.x) * CAM.s + W / 2, 0, { lines: WAX_LINES.map(l => l.text), ys: WAX_LINES.map(l => (l.y - CAM.y) * CAM.s + H / 2), size: 76 * CAM.s, col: K.white, seed: 77, stroke: 2.5 });
    drawWash(t);
  }
  if (subs) printed(t);
  comp.paperCam(CAM.x * 0.6 + n * 900, CAM.y * 0.6, CAM.s / 0.6);
  comp.begin();
  comp.group(BG);
  if (n === 3) { comp.crayon(WAX.c, { gain: 1.0 }); comp.wash(WASH.c, { color: PAL.wash, resist: 0.94, edge: 1.4, gran: 0.6 }); }
  comp.group(P, { goff: [hash(BOIL.step) * 300, hash(BOIL.step + 7) * 300] });
  comp.knock(SUBK.c); comp.crayon(SUBT.c);
  comp.finish({ vig });
}

// —— a page turn: the old page folds away over the left spine, revealing the next ——
function turnFrame(comp, t, [a, b], nA, nB, camA, camB) {
  drawPage(comp, nA, a - 0.001, camA, { subs: false }); snap(SA);
  drawPage(comp, nB, b, camB, { subs: false }); snap(SB);
  const u = ss(pr(t, a, b)), th = u * Math.PI / 2, c = Math.cos(th), sn = Math.sin(th);
  const g = OUT.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  g.drawImage(SB.c, 0, 0);
  const ex = W * c;                                            // the turning page's free edge
  const sh = g.createLinearGradient(ex, 0, ex + 160 * sn + 1, 0); sh.addColorStop(0, `rgba(60,30,20,${0.35 * sn})`); sh.addColorStop(1, 'rgba(60,30,20,0)');
  g.fillStyle = sh; g.fillRect(ex, 0, 170, H);
  const SW = 6;
  for (let x = 0; x < W; x += SW) {                            // one affine strip at a time: x' = x·cos θ, the free edge lifts toward us
    const k = 1 + 0.1 * (x / W) * sn, hh = H * k;
    g.drawImage(SA.c, x, 0, SW, H, x * c, (H - hh) / 2, SW * c + 1, hh);
  }
  const sd = g.createLinearGradient(0, 0, ex, 0); sd.addColorStop(0, 'rgba(60,30,20,0)'); sd.addColorStop(1, `rgba(60,30,20,${0.22 * sn})`);
  g.fillStyle = sd; g.fillRect(0, 0, ex, H);
  [SUBK, SUBT].forEach(clear); printed(t);
  comp.begin(); comp.image(OUT.c); comp.knock(SUBK.c); comp.crayon(SUBT.c); comp.finish({ vig: 0, emb: 0.15 });
}

// —— the call to action: out past the page edge to a desk; the real book slides in beside the page ——
function ctaFrame(comp, t) {
  drawPage(comp, 3, Math.min(t, 49.5), cam3(49.8), { subs: false, vig: 0 }); snap(SA);
  const u = ss(pr(t, CTA.t0, CTA.t0 + 1.5)), v = ss(pr(t, CTA.t0 + 0.7, CTA.t0 + 2.0));
  CAM.x = W / 2; CAM.y = H / 2; CAM.s = 1; clear(DESK);
  fill(DESK, [[-40, -40], [W + 40, -40], [W + 40, H + 40], [-40, H + 40]], { col: K.brown, p: 0.34 * u, gap: 18, w: 16, ang: 0.08, seed: 990, over: 0 });
  const g = OUT.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  // the page, shrinking onto the desk, with a soft shadow
  const s = lerp(1, 0.5, u), cx = lerp(W / 2, 330, u), cy = lerp(H / 2, 560, u), r = lerp(0, -0.08, u);
  g.save(); g.translate(cx, cy); g.rotate(r);
  g.shadowColor = `rgba(40,20,10,${0.45 * u})`; g.shadowBlur = 40 * u; g.shadowOffsetY = 16 * u;
  g.drawImage(SA.c, -W * s / 2, -H * s / 2, W * s, H * s); g.restore();
  // the book
  if (v > 0) {
    const bh = 800, bw = bh * BOOK.width / BOOK.height, by = lerp(H + bh, 1000, v);
    g.save(); g.translate(650, by); g.rotate(0.05 * v);
    g.shadowColor = 'rgba(40,20,10,0.35)'; g.shadowBlur = 30; g.shadowOffsetY = 14;
    g.drawImage(BOOK, -bw / 2, -bh / 2, bw, bh); g.restore();
  }
  // the store's words, under the book
  const a1 = pr(t, CTA.t0 + 1.9, CTA.t0 + 2.7), a2 = pr(t, CTA.t0 + 2.5, CTA.t0 + 3.3);
  // on a torn strip of the same paper, laid on the desk
  if (a1 > 0) {
    g.save(); g.translate(W / 2, 1565 + 40 * (1 - eo(a1))); g.rotate(-0.018); g.globalAlpha = eo(a1);
    g.shadowColor = 'rgba(40,20,10,0.35)'; g.shadowBlur = 18; g.shadowOffsetY = 8; g.fillStyle = '#f4efe3';
    g.beginPath(); for (let i = 0; i <= 40; i++) { const x = -430 + 860 * i / 40; g.lineTo(x, -105 + 5 * Math.sin(i * 2.7)); } for (let i = 40; i >= 0; i--) { const x = -430 + 860 * i / 40; g.lineTo(x, 105 + 5 * Math.sin(i * 3.1 + 1)); } g.closePath(); g.fill();
    g.shadowColor = 'transparent'; g.direction = 'rtl'; g.textAlign = 'center';
    g.font = "500 48px 'El Messiri'"; g.fillStyle = 'rgba(111,54,60,0.92)'; g.fillText(CTA.sub, 0, -22);
    g.direction = 'ltr'; g.font = "700 64px 'El Messiri'"; g.fillStyle = `rgba(111,54,60,${a2})`; g.fillText(CTA.url, 0, 66 - 8 * (1 - eo(a2)));
    g.restore();
  }
  const out = pr(t, DUR - TL.fade_out, DUR);
  if (out > 0) { g.fillStyle = `rgba(244,239,227,${out})`; g.fillRect(0, 0, W, H); }
  comp.begin(); comp.crayon(DESK.c); comp.image(OUT.c); comp.finish({ vig: 0.3 * u, emb: 0.3 });
}

export function frame(comp, t) {
  if (t >= CTA.t0) return ctaFrame(comp, t);
  if (t >= TURN1[0] && t < TURN1[1]) return turnFrame(comp, t, TURN1, 1, 2, cam1(TURN1[0]), cam2(TURN1[1]));
  if (t >= TURN2[0] && t < TURN2[1]) return turnFrame(comp, t, TURN2, 2, 3, cam2(TURN2[0]), cam3(TURN2[1]));
  if (t < TURN1[0]) return drawPage(comp, 1, t, cam1(t));
  if (t < TURN2[0]) return drawPage(comp, 2, t, cam2(t));
  return drawPage(comp, 3, t, cam3(t));
}

// —— events for the mix ——
export const EV = [];
const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o });
[[0.05, 0.85, 'draw', -0.1], [0.6, 0.3, 'draw', 0.2], [6.4, 0.8, 'draw', 0.3], [6.6, 0.6, 'draw', -0.6], [7.0, 0.9, 'draw', 0.5], [8.8, 0.8, 'draw', 0.6],
 [10.3, 0.6, 'draw', -0.7], [10.4, 1.0, 'draw', -0.6], [14.0, 0.8, 'draw', 0.5], [15.0, 0.9, 'draw', 0.5], [16.0, 0.8, 'draw', 0.4], [34.4, 0.7, 'draw', -0.4], [35.4, 2.2, 'draw', -0.4]]
  .forEach(([t, d, ty, pan]) => ev(t, ty, { dur: d, pan }));
[[0.8, 1.1, -0.1], [7.0, 1.2, 0.3], [7.8, 1.0, 0.5], [9.3, 0.9, 0.6], [11.2, 1.1, -0.6], [14.6, 1.0, 0.5], [15.3, 0.9, 0.5], [34.8, 0.8, -0.4]]
  .forEach(([t, d, pan]) => ev(t, 'scribble', { dur: d, pan }));
for (let k = 0; ; k++) { const t = 1.0 + 1.5 * k; if (t > 16.6) break; ev(t, 'catch', { pan: -0.1 }); }
[8.6, 8.9, 9.2, 17.55, 17.95, 18.35].forEach((t, i) => ev(t, 'block', { i, pan: 0.65 }));
ev(12.6, 'call', { k: 1 }); ev(19.0, 'call', { k: 2 });
[15.0, 15.25, 15.5].forEach((t, i) => ev(t + 0.3, 'bowl', { i, pan: 0.5 }));
ev(16.7, 'pop', { pan: 0.1 });
ev(TURN1[0], 'page', { dur: TURN1[1] - TURN1[0] }); ev(TURN2[0], 'page', { dur: TURN2[1] - TURN2[0] });
MARKS.forEach((m, i) => ev(m.t, 'mark', { i, pan: 0.6 }));
ev(27.3, 'laugh'); [0, 1, 2].forEach(i => [0, 1].forEach(j => ev(27.5 + i * 0.25 + j * 0.45, 'loop', { i, j, pan: -0.4 + i * 0.4 })));
ev(31.4, 'silence', { dur: 1.6 });
WASH_BANDS.forEach(b => ev(b.t0, 'brush', { dur: b.t1 - b.t0, dir: b.dir }));
ev(38.0, 'dip');
// a glint for every word the wash uncovers: the leading edge crosses the word's centre (approximate word centres from the line layout)
{
  const cvs = document.createElement('canvas').getContext('2d'); cvs.font = "700 76px 'Marhey'";
  const b = WASH_BANDS[0];
  WAX_LINES.forEach((l, i) => {
    const w = cvs.measureText(l.text).width, sp = cvs.measureText(' ').width; let x = W / 2 + w / 2;
    l.text.split(' ').forEach(word => { const ww = cvs.measureText(word).width, xc = x - ww / 2; x -= ww + sp;
      const uu = clamp((W + 60 - xc) / (W + 120)); ev(b.t0 + (b.t1 - b.t0) * uu, 'glint', { pan: (xc - W / 2) / (W / 2), i }); });
  });
}
ev(CTA.t0, 'pullout'); ev(CTA.t0 + 0.9, 'bookdown'); ev(DUR, 'end');
TL.cards.forEach(c => ev(c.t0, 'card', { id: c.id, t1: c.t1 }));

// —— on-screen texts for readcheck ——
export const TEXTS = t => {
  const out = [];
  for (const c of TL.cards) if (t >= c.t0 && t <= c.t1) out.push({ id: c.id, text: c.text, x0: 80, y0: c.id === 'c8' ? 220 : 1300, x1: 1000, y1: c.id === 'c8' ? 480 : 1580 });
  return out;
};
