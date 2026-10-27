// The three pages of the picture book (page coordinates = 1080 × 1920; the camera moves over them) and what draws itself when.
//   page 1: the ordinary lunch, years ago            page 2: the same table, years later; the door's height marks; the laugh
//   page 3: today, Mum and her grown daughter on the sofa; the question written in white wax over them, waiting for the wash
import { line, fill, dab, ellipse, handCircle, smooth, xf } from './crayon.js';
import { part, curve, erase } from './rig.js';
import { person } from './people.js';
import { PAL } from './pal.js';
import { clamp, hash } from '/core/lib.js';
const K = PAL.crayon;
export const pr = (t, a, b) => clamp((t - a) / (b - a));
const lo = (seed, e = {}) => ({ w: 7, col: K.ink, seed, ...e });
const fo = (col, seed, e = {}) => ({ col, p: 0.66, gap: 10, w: 12, seed, over: 5, ...e });
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const closed = pts => [...pts, pts[0]];
const step12 = t => Math.floor(t * 12) / 12;      // drawn things move on twos

// ———— shared props ————
function windowAt(BG, t0, curtain, seed) {
  const d = pr(BG.t, t0, t0 + 0.8), f = pr(BG.t, t0 + 0.5, t0 + 1.4);
  fill(BG.f, rect(660, 240, 950, 550), fo(K.sky, seed, { p: 0.45, draw: f, ang: 0.3 }));
  part({ k: BG.k, f: BG.f, l: BG.l }, handCircle(860, 340, 46, seed + 1, 0, 28), fo(K.sun, seed + 2, { p: 0.85, gap: 6, w: 9, draw: f }), lo(seed + 3, { col: K.orange, draw: d }), { occ: true, kn: false });
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; line(BG.l, [[860 + Math.cos(a) * 62, 340 + Math.sin(a) * 62], [860 + Math.cos(a) * 84, 340 + Math.sin(a) * 84]], lo(seed + 10 + k, { col: K.orange, w: 6, draw: f })); }
  line(BG.l, closed(rect(660, 240, 950, 550)), lo(seed + 20, { w: 9, col: K.brown, draw: d }));
  line(BG.l, [[805, 240], [805, 550]], lo(seed + 21, { w: 8, col: K.brown, draw: d }));
  line(BG.l, [[660, 395], [950, 395]], lo(seed + 22, { w: 8, col: K.brown, draw: d }));
  [[620, 690], [920, 990]].forEach(([a, b], k) => {
    const c = smooth([[a, 214], [b, 214], [b - 6, 330], [b + 8, 450], [b - 4, 600], [a + 2, 606], [a + 10, 470], [a - 4, 330]], 4);
    fill(BG.f, c, fo(curtain, seed + 30 + k, { p: 0.7, draw: f, ang: 1.45 }));
    line(BG.l, c, lo(seed + 32 + k, { w: 6, draw: d }));
  });
  line(BG.l, [[600, 214], [1010, 214]], lo(seed + 40, { w: 8, col: K.brown, draw: d }));
}
function floorLine(BG, y, t0, seed) {
  line(BG.l, [[-20, y], [1100, y + 4]], lo(seed, { col: K.brown, w: 8, draw: pr(BG.t, t0, t0 + 0.6) }));
}
// a bowl of soup on the table (side view, child logic: the soup shows as an orange ellipse on top)
function bowl(BG, x, y, seed, d, f) {
  const b = smooth([[x - 40, y], [x + 40, y], [x + 30, y + 26], [x - 30, y + 26]], 3);
  fill(BG.f, b, fo(K.teal, seed, { p: 0.75, gap: 6, w: 8, draw: f }));
  fill(BG.f, ellipse(x, y, 38, 9, 20), fo(K.orange, seed + 1, { p: 0.85, gap: 5, w: 7, draw: f }));
  line(BG.l, closed(b), lo(seed + 2, { w: 6, draw: d }));
  line(BG.l, ellipse(x, y, 40, 10, 24), lo(seed + 3, { w: 5, draw: d }));
}
function steam(BG, x, y, seed, d) {
  for (let k = 0; k < 2; k++) line(BG.l, curve([[x - 10 + k * 20, y], [x - 20 + k * 20, y - 24], [x + k * 20, y - 48], [x - 14 + k * 20, y - 72]]), lo(seed + k, { w: 5, p: 0.55, draw: d }));
}
function table(BG, x0, x1, y, legY, cloth, seed, d, f) {
  const top = rect(x0, y, x1, y + 26);
  [[x0 + 30, x0 + 52], [x1 - 52, x1 - 30]].forEach(([a, b], k) => { fill(BG.f, rect(a, y, b, legY), fo(K.brown, seed + k, { p: 0.75, gap: 7, w: 9, draw: f })); line(BG.l, closed(rect(a, y, b, legY)), lo(seed + 2 + k, { draw: d })); });
  fill(BG.f, top, fo(K.brown, seed + 4, { draw: f }));
  if (cloth) {
    const c = [[x0 - 14, y - 4], [x1 + 14, y - 4]];
    for (let x = x1 + 14; x >= x0 - 14; x -= 38) c.push([x, y + 70 + 10 * Math.sin(x * 0.17)], [x - 19, y + 58]);
    part({ k: BG.k, f: BG.f, l: BG.l }, c, fo(cloth, seed + 5, { p: 0.75, draw: f, ang: 0.3 }), lo(seed + 6, { draw: d }), { occ: true, kn: false });
  } else line(BG.l, closed(top), lo(seed + 6, { draw: d }));
}
function blocks(BG, n, x, yb, seed, born) {
  const cols = [K.sun, K.teal, K.rose, K.sky, K.orange, K.leaf];
  for (let i = 0; i < n; i++) {
    const pop = born ? clamp((BG.t - born[i]) / 0.08) : 1; if (pop <= 0) continue;
    const off = (hash(seed + i) - .5) * 10, y = yb - (i + 1) * 52;
    const b = rect(x + off, y, x + off + 56, y + 52);
    fill(BG.f, b, fo(cols[i % 6], seed + i * 3, { p: 0.85, gap: 7, w: 9 }));
    line(BG.l, closed(b), lo(seed + i * 3 + 1, { w: 6 }));
  }
}
// "calling" arcs from a mouth: three rose arcs, bigger for the second call
function callArcs(L, x, y, n, k, seed, d) {
  for (let i = 0; i < n; i++) { const r = (18 + i * 16) * k; line(L, ellipse(x + 10 + i * 10 * k, y, r, r * 1.1, 14, -0.9, 0.9), lo(seed + i, { col: K.rose, w: 7, draw: clamp(d * n - i) })); }
}

// ———— page 1: the ordinary lunch ————
export function page1(BG, P, t) {
  BG.t = t;
  floorLine(BG, 1010, 6.6, 101);
  windowAt(BG, 8.8, K.lilac, 110);
  // the doorway, Mum in it (drawn 10.3 → 12.3); she calls at 12.6 and again, louder, at 19.0
  line(BG.l, [[40, 1240], [40, 560], [360, 560], [360, 1240]], lo(130, { w: 10, col: K.brown, draw: pr(t, 10.3, 10.9) }));
  // the table against the wall with three bowls (14.0 → 16.2)
  table(BG, 640, 1010, 800, 1012, K.rose, 140, pr(t, 14.0, 14.8), pr(t, 14.6, 15.6));
  [700, 820, 940].forEach((x, i) => bowl(BG, x, 778, 150 + i * 5, pr(t, 15.0 + i * 0.25, 15.4 + i * 0.25), pr(t, 15.3 + i * 0.25, 15.9 + i * 0.25)));
  steam(BG, 820, 760, 170, pr(t, 16.0, 16.8));
  // the rug (6.4 → 8.0)
  const rug = ellipse(660, 1185, 380, 84, 48);
  fill(BG.f, rug, fo(K.lilac, 180, { p: 0.55, draw: pr(t, 7.0, 8.2), ang: 0.15 }));
  line(BG.l, rug, lo(181, { col: K.teal, w: 10, draw: pr(t, 6.4, 7.2) }));
  // the tower of blocks: three, then three more while the boy is called
  if (t > 8.6) blocks(BG, t < 17.5 ? 3 : 6, 958, 1236, 190, [8.6, 8.9, 9.2, 17.55, 17.95, 18.35]);
  // people: the girl (from the first frame), the boy, Mum
  const late = t >= 16.7;
  const girlDraw = pr(t, 0.05, 0.9), girlFill = pr(t, 0.8, 1.9);
  if (!late) {
    const ph = step12(t), toss = ph > 1.0 ? Math.abs(Math.sin(Math.PI * (ph - 1.0) / 1.5)) : 0;
    const g = person(P, { kind: 'girl', x: 470, y: 1205, s: 1.08, armR: 'up', expr: toss > 0.2 ? 'happy' : 'smile', seed: 300, draw: girlDraw, fillDraw: girlFill });
    const ball = [g.hands.R[0] + 6, g.hands.R[1] - 34 - 230 * toss];
    if (t > 0.6) part(P, handCircle(ball[0], ball[1], 30, 310, 0, 26), fo(K.orange, 311, { p: 0.9, gap: 6, w: 9, draw: pr(t, 0.7, 1.2) }), lo(312, { draw: pr(t, 0.6, 0.9) }));
    if (t > 0.6) line(P.l, ellipse(ball[0], ball[1], 30, 9, 16, 0.3, Math.PI - 0.3), lo(313, { w: 5, col: K.sun, draw: pr(t, 0.9, 1.2) }));
  } else person(P, { kind: 'girl', x: 600, y: 1040, s: 0.96, armL: 'wave', expr: 'smile', seed: 300 });
  if (t > 7.0) person(P, { kind: 'boy', x: 840, y: 1236, s: 1.0, sit: true, armR: 'reach', look: 1, expr: late && t > 19.0 && t < 20.0 ? 'call' : 'smile', seed: 400, draw: pr(t, 7.0, 7.9), fillDraw: pr(t, 7.8, 8.8) });
  if (t > 10.4) {
    const calling = (t > 12.5 && t < 14.2) || (t > 18.9 && t < 20.6);
    const m = person(P, { kind: 'mum', x: 200, y: 1236, s: 1.15, armR: calling ? 'call' : 'hip', armL: 'down', expr: calling ? 'call' : 'smile', seed: 500, draw: pr(t, 10.4, 11.4), fillDraw: pr(t, 11.2, 12.3) });
    if (t > 12.6 && t < 14.6) callArcs(P.l, m.head[0] + 44, m.head[1] + 22, 3, 1, 520, pr(t, 12.6, 13.3));
    if (t > 19.0) callArcs(P.l, m.head[0] + 44, m.head[1] + 22, 4, 1.45, 530, pr(t, 19.0, 19.5));
  }
}

// ———— page 2: years later ————
export const MARKS = [1150, 1075, 995, 915, 835, 755].map((y, i) => ({ y, t: 22.1 + i * 0.6, col: [K.sun, K.leaf, K.sky, K.rose, K.orange, K.lilac][i] }));
export function page2(BG, P, t) {
  BG.t = t;
  const T0 = 21.4;   // the page is already drawn when it turns in: what changed is drawn before our eyes
  floorLine(BG, 1010, 0, 201);
  windowAt(BG, 0, K.rose, 210);
  // a plant that grew tall (it wasn't there before)
  const pot = [[60, 1010], [190, 1010], [175, 900], [75, 900]];
  part(BG, pot, fo(K.orange, 220, { p: 0.8 }), lo(221), { occ: false, kn: false });
  [[125, 900, 90, 640], [125, 900, 40, 720], [125, 900, 190, 700], [125, 900, 150, 600]].forEach(([x0, y0, x1, y1], k) => {
    const st = curve([[x0, y0], [(x0 + x1) / 2 + 10, (y0 + y1) / 2], [x1, y1]]);
    line(BG.l, st, lo(230 + k, { col: K.leaf, w: 7 }));
    const lf = smooth([[x1, y1], [x1 + 30, y1 - 26], [x1 + 4, y1 - 64], [x1 - 26, y1 - 26]], 4);
    fill(BG.f, lf, fo(K.leaf, 240 + k, { p: 0.75, gap: 6, w: 8 })); line(BG.l, lf, lo(250 + k, { w: 5 }));
  });
  // the door frame on the right, with the height marks climbing it (22.1 → 25.6)
  line(BG.l, [[862, 1240], [862, 560], [1080, 560]], lo(260, { w: 11, col: K.brown }));
  line(BG.l, [[905, 1240], [905, 600], [1080, 600]], lo(261, { w: 7, col: K.brown, p: 0.6 }));
  MARKS.forEach((m, i) => {
    const d = pr(t, m.t, m.t + 0.35); if (d <= 0) return;
    line(BG.l, [[850, m.y], [940, m.y - 3]], lo(270 + i, { col: m.col, w: 14, draw: d }));
    dab(BG.f, 966, m.y - 4, 13, { col: m.col, p: 0.9 * d, seed: 280 + i });
  });
  // the family behind the table: grown children either side of their mother
  const laughing = t > 27.3;
  person(P, { kind: 'daughter', x: 250, y: 1230, s: 1.0, armL: 'down', armR: 'table', expr: laughing ? 'laugh' : 'smile', seed: 600 });
  person(P, { kind: 'oldmum', x: 470, y: 1236, s: 1.04, armL: 'table', armR: 'table', expr: laughing ? 'laugh' : 'smile', seed: 700 });
  person(P, { kind: 'son', x: 690, y: 1230, s: 1.02, armL: 'table', armR: 'down', expr: laughing ? 'laugh' : 'smile', seed: 800 });
  const under = rect(76, 1036, 844, 1260); erase(P.l, under); erase(P.f, under);   // the table hides their legs
  table(P, 90, 830, 1040, 1250, K.rose, 290, 1, 1);
  [190, 360, 560, 730].forEach((x, i) => bowl(P, x, 1020, 300 + i * 5, 1, 1));
  // the laugh: pink loops rising over their heads (27.5 → 29.6)
  if (laughing) [[250, 820], [470, 800], [690, 820]].forEach(([x, y], i) => {
    for (let j = 0; j < 2; j++) {
      const d = pr(t, 27.5 + i * 0.25 + j * 0.45, 28.0 + i * 0.25 + j * 0.45); if (d <= 0) continue;
      const lp = []; for (let k = 0; k <= 40; k++) { const u = k / 40, a = u * Math.PI * 4; lp.push([x - 40 + j * 60 + u * 40 + Math.cos(a) * 14, y - 80 - j * 40 - u * 40 + Math.sin(a) * 14]); }
      line(P.l, lp, lo(900 + i * 7 + j, { col: K.rose, w: 6, draw: d }));
    }
  });
}

// ———— page 3: today ————
export const BUBBLE = { x: 270, y: 600, rx: 200, ry: 120 };
export function page3(BG, P, t) {
  BG.t = t;
  floorLine(BG, 1180, 0, 301);
  // the sofa: back, seat, arms
  const back = smooth([[110, 1010], [100, 880], [300, 850], [540, 860], [780, 850], [980, 880], [970, 1010]], 4);
  part(BG, back, fo(K.teal, 310, { p: 0.72, ang: 0.2 }), lo(311), { occ: false, kn: false });
  // a small lamp table on the right with the teapot
  line(BG.l, [[1000, 1180], [1000, 980]], lo(330, { col: K.brown, w: 9 }));
  // people sit, then the seat cushion and arms go over their laps
  const talking = t > 34.0;
  const mum = person(P, { kind: 'oldmum', x: 360, y: 1186, s: 1.1, sit: true, armR: talking ? 'talk' : 'cup', armL: 'down', expr: talking && Math.floor(t * 3) % 3 !== 2 ? 'talk' : 'smile', seed: 700 });
  const dau = person(P, { kind: 'daughter', x: 720, y: 1186, s: 1.06, sit: true, armL: 'cup', armR: 'down', expr: 'smile', look: -1, seed: 600 });
  // tea glasses: hers in her lap, the daughter's at her chest
  [[dau.hands.L[0] + 2, dau.hands.L[1] - 26], [mum.hands.L[0] + 14, mum.hands.L[1] - 18]].forEach(([x, y], i) => {
    const g = [[x - 16, y], [x + 16, y], [x + 12, y + 36], [x - 12, y + 36]];
    part(P, g, fo(K.orange, 340 + i, { p: 0.8, gap: 5, w: 7 }), lo(342 + i, { w: 5 }));
  });
  const seat = smooth([[90, 1085], [990, 1085], [996, 1150], [84, 1150]], 3);
  part(P, seat, fo(K.teal, 350, { p: 0.82, ang: 0.15 }), lo(351));
  [[90, 1050], [990, 1050]].forEach(([x, y], k) => part(P, handCircle(x, y, 58, 352 + k, 0, 28), fo(K.teal, 354 + k, { p: 0.85 }), lo(356 + k)));
  [[150, 1150], [930, 1150]].forEach(([x, y], k) => line(P.l, [[x, y], [x, 1186]], lo(358 + k, { col: K.brown, w: 10 })));
  // her words: a speech bubble (white wax, so the wash won't tint it) with a tiny crayon lunch inside (34.4 → 37.6)
  const b = BUBBLE, bd = pr(t, 34.4, 35.1);
  if (bd > 0) {
    const bub = ellipse(b.x, b.y, b.rx, b.ry, 40);
    fill(P.f, bub, fo(K.white, 360, { p: 1, gap: 6, w: 10, draw: pr(t, 34.8, 35.6) }));
    line(P.l, bub, lo(361, { draw: bd }));
    line(P.l, [[b.x + 70, b.y + 108], [mum.head[0] - 6, mum.head[1] - 70], [b.x + 120, b.y + 92]], lo(362, { draw: bd }));
    const tl = pr(t, 35.4, 37.6);
    if (tl > 0) {
      line(P.l, [[b.x - 120, b.y + 40], [b.x + 120, b.y + 40]], lo(363, { col: K.brown, w: 8, draw: tl * 3 }));
      [-80, 0, 80].forEach((dx, i) => {
        const hd = clamp(tl * 3 - 1 - i * 0.3);
        part(P, handCircle(b.x + dx, b.y - 6, 22, 370 + i, 0, 20), fo(K.peach, 373 + i, { p: 0.6, gap: 5, w: 7, draw: hd }), lo(376 + i, { w: 5, draw: hd }));
        fill(P.f, ellipse(b.x + dx, b.y - 24, 22, 10, 16, Math.PI, Math.PI * 2), fo(K.brown, 380 + i, { p: 0.85, gap: 4, w: 6, draw: hd }));
      });
      bowl(P, b.x, b.y + 28, 390, pr(t, 37.0, 37.5), pr(t, 37.2, 37.6));
    }
  }
}
