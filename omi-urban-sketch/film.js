// Film timeline: three sketchbook pages of the same corner, turned by hand; the words are handwritten in the lower margin;
// turning the last page uncovers the real book lying on the desk.
import { compositor, clamp, lerp, ss, rgba, INK } from './engine.js';
import { page1, page2, page3, bake, SC, PW, PH, MARK_T } from './pages.js';
import { track } from '/core/lib.js';

const TL = await (await fetch('timeline.json')).json();
const BOOK = new Image(); BOOK.src = 'img/book.webp'; await BOOK.decode();
await Promise.all(["500 56px 'Playpen Sans Arabic'", "400 40px 'Playpen Sans Arabic'", "700 64px 'El Messiri'", "500 48px 'El Messiri'"].map(f => document.fonts.load(f, 'حكاية abc')));
export const DUR = TL.dur;
const CTA = TL.cta, SW = 1080, SH = 1920;
export const TURN1 = [20.75, 21.55], TURN2 = [32.85, 33.65], CLOSE = [CTA.t0, CTA.t0 + 1.0];
const pr = (t, a, b) => clamp((t - a) / (b - a));
const eo = t => 1 - Math.pow(1 - clamp(t), 3);

// —— pages: baked once, one compositor (GL canvas) each ——
const mkc = () => { const c = document.createElement('canvas'); c.width = SW; c.height = SH; return c; };
const PAGES = [page1, page2, page3].map(f => { const L = bake(f()); const c = mkc(); return { L, c, draw: compositor(c, L) }; });
const NOTE = ['ظهيرة يوم عاديّ', 'بعد سنوات', 'اليوم'];
// cameras: page units (centre x, y, zoom); the compositor takes baked pixels
const cams = [
  track([[0, [790, 520, 1.6]], [3.6, [700, 640, 1.4]], [6.2, [540, 960, 1.0]], [10.0, [540, 980, 1.0]], [11.2, [470, 1140, 1.45]], [13.4, [500, 1060, 1.22]], [16.0, [520, 1060, 1.22]],
    [17.2, [600, 1150, 1.42]], [19.4, [640, 1120, 1.32]], [21.6, [620, 1080, 1.25]]]),
  track([[20.7, [540, 960, 1.0]], [22.3, [880, 1060, 1.55]], [25.3, [880, 790, 1.5]], [26.6, [340, 880, 1.3]], [31.4, [340, 840, 1.42]], [33.7, [340, 840, 1.44]]]),
  track([[32.8, [540, 960, 1.0]], [36.0, [530, 980, 1.05]], [38.0, [500, 1010, 1.28]], [43.5, [520, 820, 1.28]], [49.8, [540, 900, 1.12]]]),
];
const camFor = (n, t) => { const [x, y, z] = cams[n](t); return { cx: x * SC, cy: y * SC, z: z / SC }; };
function pageAt(n, t) { const P = PAGES[n]; P.draw(camFor(n, t), t); return P.c; }

// —— the output canvas ——
const out = document.getElementById('c'), g = out.getContext('2d');
function note(n, t, cam) {   // the corner note: place/time, handwritten small on the page
  const [x, y, z] = cams[n](t), a = pr(t, [0.3, 21.6, 33.7][n], [1.4, 22.6, 34.6][n]);
  if (a <= 0) return;
  g.save(); g.translate((80 - x) * z + SW / 2, (140 - y) * z + SH / 2); g.scale(z, z);
  g.font = "400 40px 'Playpen Sans Arabic'"; g.direction = 'rtl'; g.textAlign = 'left';
  const w = g.measureText(NOTE[n]).width;
  g.beginPath(); g.rect(w + 10 - (w + 20) * a, -60, (w + 20) * a, 90); g.clip();
  g.fillStyle = rgba(INK, .78); g.fillText(NOTE[n], 0, 0); g.restore();
}
// the words: handwritten into the lower margin, right → left, behind a soft halo of paper
function wrap(text, maxW) { const ws = text.split(' '), o = []; let cur = ''; for (const w of ws) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { o.push(cur); cur = w; } else cur = t; } if (cur) o.push(cur); return o; }
const CARD_Y = { c1a: 1450, c1b: 1600 };
function words(t) {
  for (const c of TL.cards) {
    if (t < c.t0 || t > c.t1 + 0.45) continue;
    g.save(); g.font = "500 58px 'Playpen Sans Arabic'"; g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = wrap(c.text, 920), lh = 84, y0 = (CARD_Y[c.id] ?? 1520) - (lines.length - 1) * lh / 2;
    const total = lines.reduce((a, l) => a + l.length, 0); let budget = pr(t, c.t0, c.t0 + c.w) * total;
    g.globalAlpha = 1 - pr(t, c.t1, c.t1 + 0.45);
    lines.forEach((l, i) => {
      const y = y0 + i * lh, w = g.measureText(l).width, u = clamp(budget / l.length); budget -= l.length;
      if (u <= 0) return;
      g.save(); g.beginPath(); g.rect(SW / 2 + w / 2 + 24 - (w + 48) * u, y - 60, (w + 48) * u, 120); g.clip();
      g.strokeStyle = 'rgba(245,238,222,0.9)'; g.lineWidth = 18; g.lineJoin = 'round'; g.filter = 'blur(5px)'; g.strokeText(l, SW / 2, y); g.filter = 'none';
      g.fillStyle = rgba(INK, .9); g.fillText(l, SW / 2, y); g.restore();
    });
    g.restore();
  }
}
// a page turned by hand over the left spine: affine strips, the free edge lifting toward us
function turn(A, B, u) {
  const th = ss(u) * Math.PI / 2, c = Math.cos(th), sn = Math.sin(th), ex = SW * c;
  g.drawImage(B, 0, 0);
  const sh = g.createLinearGradient(ex, 0, ex + 150 * sn + 1, 0); sh.addColorStop(0, `rgba(70,50,35,${0.32 * sn})`); sh.addColorStop(1, 'rgba(70,50,35,0)');
  g.fillStyle = sh; g.fillRect(ex, 0, 160, SH);
  for (let x = 0; x < SW; x += 6) { const k = 1 + 0.1 * (x / SW) * sn, hh = SH * k; g.drawImage(A, x, 0, 6, SH, x * c, (SH - hh) / 2, 6 * c + 1, hh); }
  const sd = g.createLinearGradient(0, 0, ex, 0); sd.addColorStop(0, 'rgba(70,50,35,0)'); sd.addColorStop(1, `rgba(70,50,35,${0.2 * sn})`);
  g.fillStyle = sd; g.fillRect(0, 0, ex, SH);
}
// under the last page: the desk, the real book, the store's words
const DESK = mkc();
{
  const d = DESK.getContext('2d'); d.fillStyle = '#efe5d2'; d.fillRect(0, 0, SW, SH);
  const v = d.createRadialGradient(SW / 2, SH * .45, 200, SW / 2, SH * .5, SH * .75); v.addColorStop(0, 'rgba(255,250,240,0.5)'); v.addColorStop(1, 'rgba(120,90,60,0.25)');
  d.fillStyle = v; d.fillRect(0, 0, SW, SH);
}
function deskFrame(t) {
  const d = DESK.getContext('2d'), c = mkc(), x = c.getContext('2d');
  x.drawImage(DESK, 0, 0);
  const bh = 980, bw = bh * BOOK.width / BOOK.height;
  x.save(); x.translate(SW / 2, 860); x.rotate(-0.025); x.shadowColor = 'rgba(60,40,25,0.35)'; x.shadowBlur = 36; x.shadowOffsetY = 18; x.drawImage(BOOK, -bw / 2, -bh / 2, bw, bh); x.restore();
  return c;
}
function ctaWords(t) {
  const a1 = pr(t, CLOSE[1] + 0.3, CLOSE[1] + 1.2), a2 = pr(t, CLOSE[1] + 0.9, CLOSE[1] + 1.7);
  if (a1 <= 0) return;
  g.save(); g.direction = 'rtl'; g.textAlign = 'center';
  g.font = "500 50px 'Playpen Sans Arabic'"; const w = g.measureText(CTA.sub).width;
  g.save(); g.beginPath(); g.rect(SW / 2 + w / 2 + 20 - (w + 40) * a1, 1440, (w + 40) * a1, 110); g.clip();
  g.fillStyle = rgba(INK, .88); g.fillText(CTA.sub, SW / 2, 1510); g.restore();
  g.direction = 'ltr'; g.font = "700 66px 'El Messiri'"; g.fillStyle = `rgba(111,54,60,${eo(a2)})`; g.fillText(CTA.url, SW / 2, 1620 - 8 * (1 - eo(a2)));
  g.restore();
}

export function frame(t) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (t >= CLOSE[0]) {
    const desk = deskFrame(t);
    if (t < CLOSE[1]) turn(pageAt(2, Math.min(t, 49.7)), desk, pr(t, ...CLOSE)); else g.drawImage(desk, 0, 0);
    ctaWords(t);
  } else if (t >= TURN1[0] && t < TURN1[1]) turn(pageAt(0, TURN1[0]), pageAt(1, TURN1[1]), pr(t, ...TURN1));
  else if (t >= TURN2[0] && t < TURN2[1]) turn(pageAt(1, TURN2[0]), pageAt(2, TURN2[1]), pr(t, ...TURN2));
  else { const n = t < TURN1[0] ? 0 : t < TURN2[0] ? 1 : 2; g.drawImage(pageAt(n, t), 0, 0); note(n, t); }
  if (t < CLOSE[0] + 0.5) words(t);
  const o = pr(t, DUR - TL.fade_out, DUR); if (o > 0) { g.fillStyle = `rgba(239,229,210,${o})`; g.fillRect(0, 0, SW, SH); }
}

// —— events for the mix ——
export const EV = [];
PAGES.forEach((P, n) => P.L.events.forEach(e => EV.push({ ...e, page: n })));
EV.push({ t: TURN1[0], type: 'page', dur: TURN1[1] - TURN1[0] }, { t: TURN2[0], type: 'page', dur: TURN2[1] - TURN2[0] }, { t: CLOSE[0], type: 'page', dur: CLOSE[1] - CLOSE[0], last: 1 });
MARK_T.forEach((t, i) => EV.push({ t, type: 'mark', i }));
TL.cards.forEach(c => EV.push({ t: c.t0, type: 'card', id: c.id, w: c.w, t1: c.t1 }));
[0.3, 21.6, 33.7].forEach(t => EV.push({ t, type: 'note' }));
EV.push({ t: CLOSE[1] + 0.3, type: 'card', id: 'cta', w: 0.9 });
export const TEXTS = t => TL.cards.filter(c => t >= c.t0 && t <= c.t1).map(c => ({ id: c.id, text: c.text, x0: 80, y0: 1380, x1: 1000, y1: 1680 }));
