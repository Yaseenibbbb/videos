// THE drawing: one line, designed backwards from the cells it has to visit.
// World units: a month calendar of 7 × 4 day cells (800 × 1300 each), x 0…5600, y 0…5200, y down; the book below it.
//   A = row 1, col 5: the ordinary lunch (window of 10.3–20.6 s)      B = row 3, col 2: years later: door marks + the laugh
//   C = row 3, col 1: today, Mum and her grown daughter with tea       book outline under C for the call to action
// Inside a cell: local coordinates, floor at y = 880. Times come from the shared timeline (timeline.json).

export const CW = 800, CH = 1300, FLOOR = 880;
export const CELL = { A: [4000, 1300], B: [1600, 3900], C: [800, 3900] };
export const BOOK = { x: 650, y: 5600, w: 1100, h: 1530 };

// ---------- helpers ----------
const f1 = v => (+v).toFixed(1);
// Catmull-Rom → Bézier through the points (the path starts with M at pts[0])
export function smooth(pts, close = false) {
  const P = close ? [pts.at(-1), ...pts, pts[0], pts[1]] : pts;
  const a = close ? 1 : 0, b = close ? P.length - 2 : P.length - 1;
  let d = `M${f1(P[a][0])},${f1(P[a][1])}`;
  for (let i = a; i < b; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])},${f1(p2[1])}`;
  }
  return d;
}
const poly = pts => 'M' + pts.map(p => `${f1(p[0])},${f1(p[1])}`).join(' L');
// a loop around (cx, cy) starting at angle a0 (radians, y down), turning `turns` times, radius r (with an optional squash)
function loop(cx, cy, r, a0, turns, sq = 1, dir = 1, n = 28) {
  const pts = [];
  for (let i = 0; i <= n * turns; i++) { const a = a0 + dir * i / n * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * sq]); }
  return pts;
}
// out-and-back wave (a call): from p0 toward p1 with amplitude amp and k humps, then back the same way (the retrace is invisible)
function wave(p0, p1, amp, k, n = 40) {
  const out = [], dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  for (let i = 0; i <= n; i++) { const u = i / n, a = Math.sin(u * Math.PI * k) * amp * (0.4 + 0.6 * u); out.push([p0[0] + dx * u + nx * a, p0[1] + dy * u + ny * a]); }
  return out.concat(out.slice(0, -1).reverse());
}
const W7 = 7 * CW, H4 = 4 * CH;

// ---------- the calendar: verticals in a boustrophedon, then the horizontals; it ends on the line under A's row ----------
function gridD() {
  const p = [[W7, 0]];
  for (let c = 7; c >= 0; c--) {            // verticals right → left, joined along the top / bottom borders
    const x = c * CW, down = (7 - c) % 2 === 0;
    p.push([x, down ? H4 : 0]);
    if (c > 0) p.push([x - CW, down ? H4 : 0]);
  }
  // now at (0, 0): top border →, down the right border, bottom ←, up the left border to row 3, … end at (5600, 2600)
  p.push([W7, 0], [W7, H4], [0, H4], [0, 3 * CH], [W7, 3 * CH], [W7, CH], [0, CH], [0, 2 * CH], [W7, 2 * CH]);
  return poly(p);
}

// ---------- the choice: back along the row line, then a pen loop around A ----------
function circleD() {
  const [ax, ay] = CELL.A, cx = ax + CW / 2, cy = ay + CH / 2;
  const pts = [[W7, 2 * CH], [ax + CW, 2 * CH], [ax + CW, ay + 94]];   // retrace along the calendar lines (invisible)
  const L = loop(cx, cy, 560, -0.75, 1.168, 1.46, 1, 40).map(([x, y], i, a) => {
    const u = i / (a.length - 1), wob = 1 + 0.05 * Math.sin(u * 9) + 0.04 * u;   // a hand's loop overshoots and drifts outward
    return [cx + (x - cx) * wob, cy + (y - cy) * wob];
  });
  return poly(pts) + ' ' + smooth(L).replace(/^M/, 'L');
}

// ---------- A: the ordinary lunch (local coordinates) ----------
const KID1 = [[18, 880], [26, 850], [32, 812], [44, 788], [30, 762], [36, 730], [62, 712], [92, 718], [108, 738], [116, 752], [106, 758], [104, 772], [96, 782],
  [118, 792], [146, 790]];
const BALL = loop(172, 774, 24, Math.PI * 0.92, 1.04, 1, 1, 30);   // the ball, once round (then the hands leave it)
const KID1b = [[150, 800], [120, 808], [112, 830], [150, 842], [190, 850], [214, 856], [224, 846], [234, 880]];
const TOWER = [[250, 880], [250, 848], [283, 848], [281, 816], [251, 816], [253, 784], [284, 784], [282, 880]];
const KID2 = [[300, 880], [304, 860], [312, 822], [314, 796], [300, 784], [287, 776], [292, 766], [314, 764], [316, 746], [308, 730], [302, 722],
  [308, 714], [306, 700], [322, 684], [348, 684], [366, 702], [362, 728], [352, 744], [358, 790], [364, 836], [392, 866], [410, 880]];
const MUM = [[430, 880], [446, 760], [458, 650], [452, 600], [430, 588], [408, 560], [414, 526], [428, 518], [440, 524], [438, 512],
  [430, 497], [440, 489], [440, 470], [455, 450], [480, 446], [500, 452], [510, 440], [528, 446], [530, 466], [514, 476], [504, 474],
  [498, 500], [502, 560], [494, 640], [500, 760], [548, 880]];
const CALL1 = wave([404, 520], [338, 498], 7, 3);
const TABLE = [[548, 880], [604, 880], [604, 702], [586, 702], [586, 690], [618, 690], [628, 690], [614, 668], [672, 668], [660, 690],
  [690, 690], [702, 690], [690, 668], [748, 668], [736, 690], [794, 690], [794, 702], [778, 702], [778, 880]];
const STEAM = [[719, 668], [712, 640], [728, 618], [716, 596], [730, 574]];   // steam over the second bowl (out and back)
const steam = STEAM.concat(STEAM.slice(0, -1).reverse());

function roomD() {
  // in from the loop to the left border at floor height, along the floor (the cell border itself is a retrace)
  return poly([[0, 880], [18, 880]]) + ' ' +
    smooth(KID1).replace(/^M/, 'L') + ' ' + smooth(BALL).replace(/^M/, 'L') + ' ' + smooth(KID1b).replace(/^M/, 'L') + ' ' +
    poly(TOWER).replace(/^M/, 'L') + ' ' + smooth(KID2).replace(/^M/, 'L');
}
function mumD() { return smooth(MUM.slice(0, 6)) + ' ' + smooth(CALL1).replace(/^M/, 'L') + ' ' + smooth(MUM.slice(5)).replace(/^M/, 'L'); }
function tableD() {
  return poly([...TABLE.slice(0, 13), [719, 668]]) + ' ' + smooth(steam).replace(/^M/, 'L') + ' ' + poly([[719, 668], ...TABLE.slice(13)]).replace(/^M/, 'L');
}
// the late one: back along the floor (retrace), up the tower, three more wobbly blocks; then Mum calls again, louder
function lateD() {
  const up = [[778, 880], [548, 880], [410, 880], [282, 880], [282, 784]];
  const blocks = [[284, 752], [254, 752], [253, 784], [254, 752], [256, 720], [287, 720], [285, 752], [287, 720], [283, 688], [252, 690], [256, 720]];
  const back = [[252, 690], [256, 720], [253, 784], [250, 880], [430, 880], [446, 760], [452, 600], [430, 588], [408, 560], [414, 526]];
  const call2 = wave([402, 522], [300, 470], 11, 4);
  const away = [[414, 526], [408, 560], [430, 588], [452, 600], [446, 760], [430, 880], [548, 880], [800, 880], [800, 1300]];
  return poly(up) + ' ' + poly(blocks).replace(/^M/, 'L') + ' ' + poly(back).replace(/^M/, 'L') + ' ' + smooth(call2).replace(/^M/, 'L') + ' ' + poly(away).replace(/^M/, 'L');
}

// ---------- travel A → B along the calendar lines (all retrace), into B's top-right corner and down its border ----------
function travelD() {
  const [ax, ay] = CELL.A, [bx, by] = CELL.B;
  return poly([[ax, ay + CH], [ax, by], [bx + CW, by], [bx + CW, by + FLOOR]]);
}

// ---------- B: years later: the door frame with growth marks, the table with four grown-ups, the laugh ----------
function doorD() {
  const p = [[800, 880], [760, 880], [760, 330], [600, 330], [600, 880]];
  const marks = [800, 742, 676, 610, 540, 470];
  const up = [[600, 880]];
  marks.forEach((y, i) => up.push([600, y + 4], [622 + i * 2, y], [600, y - 4]));
  up.push([600, 330], [600, 880]);
  return poly(p) + ' ' + poly(up).replace(/^M/, 'L');
}
const HEADS = [ // grown-ups behind the table: shoulders + head; the mother (bun) is third
  { x: 168, r: 36, hair: 'short' }, { x: 262, r: 34, hair: 'long' }, { x: 362, r: 35, hair: 'bun' }, { x: 460, r: 37, hair: 'short' }];
function tableBD() {
  const p = [[600, 880], [520, 880], [520, 704], [544, 704], [544, 690], [96, 690], [96, 704], [124, 704], [124, 880], [124, 704], [96, 704], [96, 690]];
  let d = poly(p);
  const sky = [[110, 690]];
  for (const h of HEADS) {   // shoulders up, round the head (tilted back: laughing), down the other shoulder
    const top = 690 - 92 - h.r;
    sky.push([h.x - 44, 690], [h.x - 40, 640], [h.x - 24, 612]);
    if (h.hair === 'long') sky.push([h.x - 34, 590], [h.x - h.r - 4, top + 14], [h.x - 6, top - 8], [h.x + h.r, top + 6], [h.x + h.r + 6, 600], [h.x + 26, 612]);
    else if (h.hair === 'bun') sky.push([h.x - h.r + 2, top + 30], [h.x - h.r + 4, top + 8], [h.x - 12, top - 4], [h.x - 4, top - 22], [h.x + 16, top - 24], [h.x + 18, top - 4], [h.x + h.r - 2, top + 12], [h.x + h.r - 2, top + 40], [h.x + 24, 612]);
    else sky.push([h.x - h.r, top + 30], [h.x - h.r + 8, top + 2], [h.x + 4, top - 6], [h.x + h.r, top + 14], [h.x + h.r - 4, top + 46], [h.x + 24, 612]);
    sky.push([h.x + 40, 640], [h.x + 44, 690]);
  }
  sky.push([530, 690]);
  d += ' ' + smooth(sky).replace(/^M/, 'L');
  return d;
}
// the laugh: back along the shoulders to the mother's head, then up in rose loops; it drifts left toward C
function laughD() {
  const h = HEADS[2], top = 690 - 92 - h.r;
  const back = [[530, 690], [h.x + 44, 690], [h.x + 40, 640], [h.x + 24, 612], [h.x + h.r - 2, top + 40], [h.x + h.r - 2, top + 12], [h.x + 18, top - 4], [h.x + 16, top - 24]];
  const curl = [[h.x + 16, top - 24]];
  for (let i = 0; i <= 120; i++) {   // three rising loops, getting bigger, drifting left
    const u = i / 120, a = -Math.PI / 2 + u * Math.PI * 2 * 3, R = 26 + 34 * u;
    curl.push([h.x + 10 - u * 210 + Math.cos(a) * R, top - 60 - u * 300 + Math.sin(a) * R * 0.8]);
  }
  return poly(back) + ' ' + smooth(curl.slice(1)).replace(/^M/, 'L');
}

// ---------- C: today. The laugh drifts across the border and comes down as steam into her tea glass ----------
// (C's local x = B's local x + 800)
function steamCD() {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40, x = 740 - u * 320, y = 250 + u * 230 + Math.sin(u * Math.PI * 4.5) * 26 * (1 - u * 0.5);
    pts.push([x, y]);
  }
  for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push([400 - 24 * Math.sin(u * Math.PI * 2) * (1 - u), 500 + u * 130]); }
  pts.push([396, 640]);
  return smooth(pts);
}
// a seated person on a chair, side view, facing +x (dir = 1) or -x (dir = -1); xh = hip; s = scale. hair: 'bun' | 'long'.
// Starts on the floor behind the chair, ends on the floor in front of the toes.
function seated(xh, dir, hair, s = 1) {
  const P = [[-58, 880], [-58, 610], [-50, 606]];                                       // chair back post
  if (hair === 'long') P.push([-44, 700], [-46, 640], [-52, 590], [-50, 540], [-40, 506], [-20, 486], [8, 482], [30, 496]);   // long hair falls down the back
  else P.push([-42, 700], [-44, 640], [-38, 590], [-28, 556], [-34, 540], [-52, 538], [-56, 520], [-44, 506], [-36, 512], [-26, 494], [0, 484], [26, 494]);   // a bun
  P.push([36, 512], [40, 522], [34, 528], [36, 538], [26, 552], [18, 560], [24, 590],          // forehead, nose, mouth, chin, neck, chest
    [62, 640], [100, 692], [104, 700], [86, 704], [54, 664], [30, 700], [32, 744],            // forearm out to the table, back along its underside
    [92, 746], [98, 790], [98, 868], [122, 880], [84, 880], [80, 792], [50, 770], [40, 772], [40, 880]);   // thigh, shin, foot; seat, front leg
  return P.map(([x, y]) => [xh + dir * x * s, 880 - (880 - y) * s]);
}
// today's table: two tea glasses on a small round table (side view), one leg and foot
const GLASSES = [[396, 640], [382, 662], [386, 700], [406, 700], [410, 662], [382, 662], [386, 700], [330, 700], [330, 712], [396, 712], [396, 860],
  [362, 880], [438, 880], [404, 860], [404, 712], [470, 712], [470, 700], [446, 700], [450, 662], [418, 662], [422, 700], [470, 700], [470, 712],
  [404, 712], [404, 860], [438, 880], [480, 880]];
const DAUGHTER = seated(606, -1, 'long', 0.9);
const MOTHER = seated(196, 1, 'bun', 0.92);
// her words: from her mouth up into the air, where a tiny lunch table is drawn (three small heads, the bowls); then away to the left border
function memoryD() {
  const m = MOTHER, back = m.slice().reverse();
  const mouth = m[18];                                                        // seated(): index 18 = the mouth (bun hair)
  const pts = [back[0], ...back.slice(1, back.indexOf(mouth) + 1)];          // retrace from her toes up to her mouth
  const rise = [mouth, [mouth[0] + 30, mouth[1] - 10], [mouth[0] + 50, mouth[1] - 50], [mouth[0] + 30, mouth[1] - 96], [250, 330], [220, 300], [220, 290]];
  const tiny = [[220, 290], [300, 290]];
  for (const [x, r] of [[270, 17], [210, 15], [150, 18]]) {   // shoulders, a round head, shoulders
    const cy = 290 - 14 - r;
    tiny.push([x + r + 9, 290], [x + r + 3, 282]);
    for (let i = 0; i <= 8; i++) { const a = -0.25 + i / 8 * (Math.PI + 0.5); tiny.push([x + r * Math.cos(a), cy - r * Math.sin(a)]); }
    tiny.push([x - r - 3, 282], [x - r - 9, 290]);
  }
  tiny.push([110, 290], [110, 300], [300, 300], [300, 290], [128, 290]);
  const away = [[128, 290], [70, 330], [0, 360]];
  return poly(pts) + ' ' + smooth(rise).replace(/^M/, 'L') + ' ' + smooth(tiny).replace(/^M/, 'L') + ' ' + smooth(away.slice(0, 2)).replace(/^M/, 'L') + ' ' + poly(away.slice(1)).replace(/^M/, 'L');
}
// down the border, out of the calendar and round the book
function bookD() {
  const [cx, cy] = CELL.C, { x, y, w, h } = BOOK;
  return poly([[cx, cy + 360], [cx, cy + CH], [cx, y - 120]]) + ' ' + smooth([[cx, y - 120], [cx - 40, y - 40], [x + 40, y]]).replace(/^M/, 'L') + ' ' +
    poly([[x + 40, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y + 6], [x + 60, y + 2]]).replace(/^M/, 'L');
}

// ---------- the chapter table ----------
const A = { x: CELL.A[0] + CW, y: CELL.A[1], fx: -1 },   // A is drawn mirrored: the floor line comes in from the loop on the right
      B = { x: CELL.B[0], y: CELL.B[1] }, C = { x: CELL.C[0], y: CELL.C[1] };
export const SEGS = [
  { id: 'grid', style: 'rule', t: [0.12, 5.6], parts: [{ d: gridD() }], slowK: 0.6, marks: [{ f: 0.012, t: 0.9 }] },
  { id: 'circle', style: 'pen', t: [5.6, 9.2], parts: [{ d: circleD() }], marks: [{ f: 0.18, t: 6.4 }] },
  { id: 'room', style: 'pen', t: [9.4, 13.2], parts: [{ d: roomD(), tf: A }] },
  { id: 'mum', style: 'pen', t: [13.2, 15.4], parts: [{ d: mumD(), tf: A }] },
  { id: 'table', style: 'pen', t: [15.4, 16.9], parts: [{ d: tableD(), tf: A }] },
  { id: 'late', style: 'pen', t: [16.9, 21.2], parts: [{ d: lateD(), tf: A }], marks: [{ f: 0.12, t: 17.5 }, { f: 0.36, t: 19.0 }, { f: 0.47, t: 19.4 }, { f: 0.72, t: 20.5 }] },
  { id: 'travel', style: 'pen', t: [21.2, 22.6], parts: [{ d: travelD() }] },
  { id: 'door', style: 'pen', t: [22.6, 25.9], parts: [{ d: doorD(), tf: B }], marks: [{ f: 0.42, t: 23.5 }] },
  { id: 'tableB', style: 'pen', t: [25.9, 28.6], parts: [{ d: tableBD(), tf: B }] },
  { id: 'laugh', style: 'accent', accentF: 0.25, t: [28.6, 33.4], parts: [{ d: laughD(), tf: B }], marks: [{ f: 0.1, t: 29.1 }], holds: [{ f: 0.995, t: 31.5, dur: 1.75 }] },
  { id: 'steam', style: 'pen', t: [33.4, 35.2], parts: [{ d: steamCD(), tf: C }] },
  { id: 'glasses', style: 'pen', t: [35.2, 37.2], parts: [{ d: poly(GLASSES), tf: C }] },
  { id: 'daughter', style: 'pen', t: [37.2, 40.6], parts: [{ d: poly([[480, 880], [740, 880], ...DAUGHTER.slice(0, 2)]) + ' ' + smooth(DAUGHTER.slice(1)).replace(/^M/, 'L'), tf: C }] },
  { id: 'mother', style: 'pen', t: [40.6, 44.4], parts: [{ d: poly([DAUGHTER.at(-1), [70, 880], ...MOTHER.slice(0, 2)]) + ' ' + smooth(MOTHER.slice(1)).replace(/^M/, 'L'), tf: C }] },
  { id: 'memory', style: 'pen', t: [44.4, 49.6], parts: [{ d: memoryD(), tf: C }] },
  { id: 'book', style: 'rule', t: [49.6, 52.4], parts: [{ d: bookD() }] },
];
