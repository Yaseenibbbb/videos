import { buildPath, headAt, posAt } from './geom.js';
import { SEGS, BOOK } from './scene.js';
import { prepare, drawLine, drawBlots } from './ink.js';
import { makePaper, drawPaper, vignette, makeTooth, drawTooth } from './paper.js';
import { card, ctaText } from './subs.js';
import { camAt, worldToScreen } from './cam.js';
import { CAM } from './shots.js';
import { penShadow } from './hands.js';
import { clamp, ss } from '/core/lib.js';

const q = new URLSearchParams(location.search);
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = cv.width, H = cv.height;
const TL = await (await fetch('timeline.json')).json();
await Promise.all(["700 66px 'Aref Ruqaa'", "700 64px 'El Messiri'", "500 50px 'El Messiri'"].map(f => document.fonts.load(f, 'حكاية abc')));
const book = new Image(); book.src = 'img/book.webp'; await book.decode();

const P = prepare(buildPath(SEGS));
const paper = makePaper(), tooth = makeTooth();
const DUR = TL.dur, CTA = TL.cta;
const NOSUB = q.has('nosub') || q.has('clean');
const PEN_UP = P.T[P.N - 1];

function camFor(t) {
  if (q.get('cam')) { const [x, y, z] = q.get('cam').split(',').map(Number); return { cx: x, cy: y, k: z, r: 0, z }; }
  return camAt(P, CAM, t, W, H);
}

// the real book develops inside the drawn outline (the book's cover fills the outline; the mockup's soft shadow spills a little)
function drawBook(t, M, k) {
  const u = ss(clamp((t - PEN_UP + 0.15) / 1.2));   // once the outline is closed
  if (u <= 0) return;
  const [x0, y0] = M(BOOK.x, BOOK.y), [x1, y1] = M(BOOK.x + BOOK.w, BOOK.y + BOOK.h);
  const bw = x1 - x0, bh = y1 - y0, iw = bw / 0.915, ih = bh / 0.962;   // the cover's share of the mockup image
  ctx.save(); ctx.globalAlpha = u;
  ctx.drawImage(book, x0 - iw * 0.035, y0 - ih * 0.012, iw, ih);
  ctx.restore();
}

function render(t) {
  const cam = camFor(t), M = worldToScreen(cam, W, H);
  drawPaper(ctx, paper, cam, W, H);
  const head = q.has('all') ? P.N - 1 : headAt(P, t);
  drawBook(t, M, cam.k);
  if (t >= P.T[0] || q.has('all')) drawLine(ctx, P, head, M, cam.k);
  drawBlots(ctx, P, q.has('all') ? 999 : t, M, cam.k);
  drawTooth(ctx, tooth, cam, W, H);
  vignette(ctx, W, H);
  if (!q.has('nopen') && !q.has('all')) {
    const tip = M(...posAt(P, head));
    const lift = t < P.T[0] ? clamp((P.T[0] - t) / 0.6) : clamp((t - PEN_UP) / 0.8);
    const appear = 1 - clamp((t - PEN_UP - 0.8) / 0.6);
    if (appear > 0) penShadow(ctx, tip, [0.5, 0.86], 0.3 + 0.3 * cam.k, { lift, alpha: appear * 0.75 });
  }
  if (!NOSUB) {
    for (const c of TL.cards) card(ctx, c, t, W, { y: c.id === 'c1a' ? 1290 : c.id === 'c1b' ? 1470 : undefined });
    const [, by] = M(0, BOOK.y + BOOK.h);
    ctaText(ctx, { ...CTA, t0: PEN_UP - 1.2 }, t, W, by + 110);
  }
  const out = clamp((t - (DUR - TL.fade_out)) / TL.fade_out);
  if (out > 0) { ctx.fillStyle = `rgba(244,239,228,${out})`; ctx.fillRect(0, 0, W, H); }
}

// events for the mix: the pen-speed track (200 Hz: speed, screen x, style), corners, first touch, the stop, the accent, segment times
function events() {
  const ev = [], track = [];
  for (let t = 0; t <= DUR; t += 0.005) {
    const h = headAt(P, t), i = Math.floor(h), cam = camAt(P, CAM, t, W, H), M = worldToScreen(cam, W, H);
    const p = M(...posAt(P, h)), moving = t >= P.T[0] && t <= PEN_UP;
    track.push([+t.toFixed(3), moving ? Math.round(P.V[i] * Math.min(1, cam.k / 0.6)) : 0, +(p[0] / W).toFixed(3), P.segs[P.SEG[i]].style]);
  }
  ev.push({ t: 0, type: 'track', data: track });
  const corners = [];
  for (let i = 8; i < P.N - 8; i++) {
    if (P.TURN[i] < 0.5) continue;
    let isMin = true; for (let j = -6; j <= 6; j++) if (P.V[i + j] < P.V[i]) { isMin = false; break; }
    if (isMin && (!corners.length || P.T[i] - corners.at(-1).t > 0.12)) corners.push({ t: +P.T[i].toFixed(3), seg: P.segs[P.SEG[i]].id });
  }
  ev.push({ t: 0, type: 'corners', data: corners });
  ev.push({ t: P.T[0], type: 'tap' });
  P.blots.forEach(b => ev.push({ t: b.t0, type: 'blot', dur: b.dur }));
  P.segs.forEach(s => ev.push({ t: s.t[0], type: 'seg', id: s.id, t1: s.t[1] }));
  TL.cards.forEach(c => ev.push({ t: c.t0, type: 'card', id: c.id, w: c.w, t1: c.t1 }));
  ev.push({ t: CTA.t0, type: 'cta', t1: CTA.t1 });
  return ev;
}

window.DUR = DUR;
window.EV = q.has('noev') ? [] : events();
window.TEXTS = t => {
  const out = [];
  for (const c of TL.cards) if (t >= c.t0 && t <= c.t1) out.push({ id: c.id, text: c.text, x0: 90, y0: 1200, x1: 990, y1: 1500 });
  return out;
};
window.PATH = P;
window.render = render;
window.READY = true;
