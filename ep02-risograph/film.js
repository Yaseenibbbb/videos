// انتصار صغير — timeline, shots, plates. One ink (Federal Blue) while she struggles; Sunflower rolls in with his steadying hand;
// Red arrives with a kick when she rides on alone (the first full overprint). Registration drifts in the held silence and snaps back with the help.
import { W, H, g, clear, over, layer, rect, circle, ellipse, poly, blob, line, inkA } from './draw.js';
import { mumBike, son, BIKE } from './people.js';
const TL = await (await fetch('timeline.json')).json();
export const DUR = TL.dur;
const E = TL.events;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); }, pr = (t, a, b) => clamp((t - a) / (b - a));
const step12 = t => Math.floor(t * 12 + 1e-6) / 12;   // characters act on twos
export const INKS = [[61, 85, 136], [255, 181, 17], [255, 102, 94]];   // Federal Blue, Sunflower, Red
export const PAPER = [244, 238, 226];

// —— the world (x along the square, y down); wheels touch the ground at GY ——
const GY = 1300, HY = 1040, SUN = [1180, 860, 330];
// her ride: position along the square, from the hesitant tries to the ride alone and the gentle stop
function bikeX(t) {
  if (t < 2.6) return 300 + 18 * ss(t / 2.6);
  if (t < 6.4) return 318;
  if (t < 8.6) return 318 + 102 * Math.sin(Math.PI / 2 * pr(t, 6.4, 8.6));   // the second try: a bike length, slowing to a stop
  if (t < E.go) return 420;
  const u = t - E.go, v = 270, ramp = 3.0;                                      // rolls away: speeds up over 3 s, then steady
  const x = u < ramp ? 0.5 * v / ramp * u * u : 0.5 * v * ramp + v * (u - ramp);
  const xb = 420 + x, tb = E.brake, ub = tb - E.go, xAtBrake = 420 + (ub < ramp ? 0.5 * v / ramp * ub * ub : 0.5 * v * ramp + v * (ub - ramp));
  if (t < tb) return xb;
  return xAtBrake + v * 0.45 * Math.sin(Math.PI / 2 * pr(t, tb, tb + 0.9));    // brakes gently to a stop
}
const STOP_X = bikeX(30);
function bikeState(t) {
  const tc = step12(t), x = bikeX(t), moving = (t > 6.4 && t < 8.6) || (t > E.go && t < E.brake + 0.9) || t < 2.6;
  const o = { crank: x * 0.022, wa: x / BIKE.Rw, expr: 'focus', lean: .12 };
  // wobble: big while unsure, gone once she rides
  const unsure = t < E.go + 1.2 ? 1 : 1 - pr(t, E.go + 1.2, E.go + 3);
  o.wobble = (0.07 * Math.sin(tc * 7.3) + 0.035 * Math.sin(tc * 13.1)) * unsure * (t < 2.6 || (t > 6.4 && t < 8.6) ? 1 : 0.25) * (t > 15.6 && t < E.go ? 0.2 : 1);
  if (t >= 2.6 && t < 6.4) { o.footDown = [70, 0]; o.wobble = 0.02; }            // her foot down to catch the balance
  if (t >= 8.6 && t < 15.6) { o.footDown = [72, 0]; o.wobble = 0.015; o.expr = t > 13.8 && t < 15.0 ? 'calm' : 'focus'; }
  if (t >= 13.8 && t < 15.0) o.lookBack = true;                                   // a look back to him
  if (t >= E.brake + 0.2) { o.footDown = [74, 0]; o.wobble = 0; }
  if (t >= E.turn) { o.lookBack = true; o.expr = t >= E.smile ? 'proud' : 'calm'; }
  if (t >= E.go && t < E.brake) o.expr = t > 21 ? 'smile' : 'focus';
  if (!moving) o.crank = Math.round(o.crank / Math.PI) * Math.PI + 0.6;            // pedals parked level-ish when stopped
  return { x, o };
}
// the son: walks in from behind, takes the saddle, jogs along, lets go, slows to a stop
function sonState(t, saddle) {
  if (t < 10.0) return null;
  const tc = step12(t);
  if (t < 12.2) { const x = lerp(-160, 210, ss(pr(t, 10.0, 12.2))); return { x, ph: tc * 7, walk: 1 - pr(t, 11.8, 12.2) }; }
  if (t < E.go) return { x: 210, ph: 0, walk: 0, hand: t >= E.hand_on ? saddle : null, expr: t > 13.8 ? 'smile' : 'calm' };
  const [r0, r1] = E.release, holding = t < r0 + 0.6;
  const x = holding ? saddle[0] - 70 : lerp(saddle[0] - 70, 980, ss(pr(t, r0, r1 + 1.2)));
  const xs = Math.min(x, holding ? x : lerp(bikeX(r0 + 0.6) - 150, 980, ss(pr(t, r0 + 0.6, r1 + 1.6))));
  return { x: xs, ph: tc * 9, walk: t < r1 + 1.4 ? 1 : 1 - pr(t, r1 + 1.4, r1 + 1.9), hand: holding ? saddle : null, expr: 'smile' };
}

// —— shots: camera (centre, zoom), registration offsets, sheet seed; hard cuts between them ——
const SHOTS = [
  { t: 0, cam: t => [bikeX(t) + 70, GY - 230, 2.15], reg: [[0, 0], [3, -2], [-2, 3]] },                     // ground-level close: the front wheel, her shoe
  { t: 4, cam: () => [640, 790, 0.8], reg: [[0, 0], [-3, 2], [2, -3]] },                                   // static wide: a small figure in a big square
  { t: 10, cam: t => [300, 1010 - 20 * pr(t, 13, 17), 1.5 + 0.1 * pr(t, 13, 17)], reg: [[0, 0], [2, 2], [-3, -1]] },   // two-shot, a slow push
  { t: 17, cam: t => [bikeX(t) + 140, 870, 0.92], reg: [[0, 0], [-2, -3], [3, 1]] },                        // tracking with her
  { t: 24, cam: () => [(STOP_X + 980) / 2 + 40, 800, 0.56], reg: [[0, 0], [2, -1], [-2, 2]] },             // locked: horizon, disc, figure; him far behind
];
const shotAt = t => { let k = 0; SHOTS.forEach((s, i) => { if (t >= s.t) k = i; }); return k; };

// —— plates arriving: a gate + a roller sweep (left → right) ——
const YEL = E.hand_on, RED = E.release[0] + 1.0;
function sweep(t, t0) { return t < t0 ? -1 : lerp(-40, W + 260, ss(pr(t, t0, t0 + 0.9))); }

// —— registration: fixed per shot; drift through the held silence and the wait, snap back as his hand takes the saddle; kicks on accents ——
function regOffsets(t, k) {
  const base = SHOTS[k].reg.map(p => p.slice());
  const drift = pr(t, E.stop2, E.stop2 + 2.0) * (1 - pr(t, YEL, YEL + 0.12));
  const kick = (t0, a) => { const u = t - t0; return u < 0 || u > 0.4 ? 0 : a * Math.exp(-u / 0.09) * Math.cos(u * 40); };
  const kk = kick(E.push2, 9) + kick(RED, 13) + kick(E.brake, 6);
  return base.map(([x, y], i) => [x + drift * [0, 16, -14][i] + kk * [0, 1, -0.8][i], y + drift * [0, -9, 11][i] + kk * [0, -0.6, 1][i]]);
}

// —— the square ——
function world(t) {
  // sky: stepped blue tint bands (the one-ink frame still reads); the sun disc knocks them out, then fills with Sunflower
  [[520, 760, .08], [760, HY, .16]].forEach(([y0, y1, d]) => rect(-2000, y0, 6000, y1 - y0, [d, 0, 0]));
  circle(SUN[0], SUN[1], SUN[2], [0, 1, 0]);
  // far roofs: blue silhouettes, paper windows; Red adds the roof tiles
  const B = [[-900, 260, 230], [-600, 330, 180], [-240, 210, 260], [10, 300, 200], [330, 240, 300], [660, 380, 170], [1500, 280, 260], [1840, 340, 200], [2160, 240, 300], [2500, 300, 220], [2800, 260, 260]];
  B.forEach(([x, w, h], i) => {
    rect(x, HY - h, w, h + 4, [.62, 0, 0]);
    poly([[x - 12, HY - h], [x + w / 2, HY - h - 60], [x + w + 12, HY - h]], [.62, 0, .9]);
    for (let r = 0; r < Math.floor(h / 80); r++) for (let c = 0; c < Math.floor(w / 70); c++) rect(x + 24 + c * 70, HY - h + 30 + r * 80, 22, 34, [0, .55, 0]);
  });
  // two round trees
  [[880, 150], [1360, 120], [2350, 160]].forEach(([x, r]) => { rect(x - 9, HY - 60, 18, 64, [1, 0, .2]); circle(x, HY - 70 - r * .7, r, [.85, 0, 0]); });
  // the square: a pale paving tint, a darker far edge; the light lands on it when Sunflower comes
  rect(-2000, HY, 6000, 2000, [.24, 0, 0]);
  rect(-2000, HY, 6000, 22, [.7, 0, 0]);
  over(() => rect(-2000, HY + 22, 6000, 2000, [0, .42, 0]));
  rect(-2000, HY + 22, 6000, 70, [.34, 0, 0]); rect(-2000, GY + 230, 6000, 3000, [1, 0, 0]); rect(-2000, GY + 230, 6000, 26, [.55, 0, 0]);   // stepped bands: far paving; a solid blue kerb field under everything
  // a bench
  rect(1640, GY - 70, 180, 14, [1, 0, .3]); rect(1650, GY - 70, 12, 70, [1, 0, .3]); rect(1798, GY - 70, 12, 70, [1, 0, .3]); rect(1640, GY - 120, 180, 12, [1, 0, .3]);
}

export function renderFilm(t) {
  const k = shotAt(t), S = SHOTS[k], [cx, cy, z] = S.cam(t);
  clear();
  g.setTransform(z, 0, 0, z, W / 2 - cx * z, H / 2 - cy * z);
  world(t);
  const b = bikeState(t), s = 1.0;
  let saddle = [b.x + (BIKE.seat[0] - 20) * s, GY + (BIKE.seat[1] + 4) * s];
  const so = sonState(t, saddle);
  layer(() => {
    if (so && (!so.hand || so.x < b.x - 80)) son(so.x, GY + 6, 1.0, { ph: so.ph, walk: so.walk, hand: so.hand, expr: so.expr });
    mumBike(b.x, GY, s, b.o);
    if (so && so.hand && so.x >= b.x - 80) son(so.x, GY + 6, 1.0, { ph: so.ph, walk: so.walk, hand: so.hand, expr: so.expr });
  }, 5 / z);
  // the question: a paper knockout across the sky, printed on the blue plate, rolled on right → left
  const Q = TL.question;
  if (t >= Q.t0) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    const a = ss(pr(t, Q.t0, Q.t0 + 0.4)), x1 = 1030, x0 = lerp(x1, 50, a);
    g.beginPath(); g.roundRect(x0, 290, x1 - x0, 430, 18); g.fillStyle = inkA([0, 0, 0]); g.fill();
    g.save(); g.beginPath(); g.rect(lerp(1030, 40, ss(pr(t, Q.t0 + 0.3, Q.t0 + Q.w))), 280, 1000, 460); g.clip();
    g.font = "600 66px 'Readex Pro'"; g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = inkA([1, 0, 0]);
    Q.lines.forEach((l, i) => g.fillText(i === 0 ? '«' + l : i === Q.lines.length - 1 ? l + '»' : l, W / 2, 400 + i * 108));
    g.restore();
  }
  const gate = [1, t >= YEL ? 1 : 0, t >= RED ? 1 : 0];
  return {
    inks: INKS, paper: PAPER, off: regOffsets(t, k), ang: [0.2618, 0, 1.309], period: 7, gate,
    sweep: [1e5, sweep(t, YEL), sweep(t, RED)], seed: Math.floor(t * 12), sheet: k * 1.7 + 0.3, boil: 0.33,
  };
}

// —— on-screen text for readcheck, sound events for the mix ——
export const TEXTS = t => (t >= TL.question.t0 && t <= TL.question.t1 ? [{ id: 'q', text: TL.question.text, x0: 50, y0: 290, x1: 1030, y1: 720 }] : []);
export const EV = [];
{
  const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o });
  // the bike's speed (px/s), sampled at 50 Hz: it drives the tyre roll, the chain and the freewheel ticks in the mix
  const sp = []; for (let t = 0; t <= DUR; t += 0.02) sp.push([+t.toFixed(2), +Math.max(0, (bikeX(t + 0.01) - bikeX(t - 0.01)) / 0.02).toFixed(1)]);
  ev(0, 'speed', { data: sp });
  ev(E.foot1, 'foot'); ev(E.push2 - 0.25, 'pedal'); ev(E.push2, 'push'); ev(E.stop2, 'foot'); ev(E.stop2 - 0.15, 'brake', { k: .4 });
  ev(10.0, 'steps', { t1: 12.2, rate: 1.9 }); ev(E.hand_on, 'saddle'); ev(E.look, 'cloth'); ev(E.pedal, 'pedal'); ev(E.pedal + 0.4, 'pedal');
  ev(E.go, 'steps', { t1: E.release[1] + 1.6, rate: 2.6, fade: 1 }); ev(E.release[0] + 0.6, 'cloth');
  ev(E.brake, 'brake', { k: 1 }); ev(E.brake + 0.3, 'foot'); ev(E.turn, 'cloth');
  SHOTS.forEach((s, i) => i && ev(s.t, 'cut'));
}
