// Model sheet: every member of the family in the poses and expressions the film uses
import { layer, clear, CAM } from './crayon.js';
import { group, clearGroup } from './rig.js';
import { person } from './people.js';
const G = group();
export function sheet(comp, t, page) {
  CAM.x = 540; CAM.y = 960; CAM.s = 1; clearGroup(G);
  const row = (y, list) => list.forEach((p, i) => person(G, { y, x: 140 + i * 270, seed: 100 + i * 97 + y, ...p }));
  if (page === 'model') {
    row(560, [{ kind: 'girl', armR: 'up', expr: 'happy' }, { kind: 'boy', armR: 'reach', sit: true, look: 1 }, { kind: 'girl', run: true, expr: 'smile' }, { kind: 'boy', expr: 'laugh' }]);
    row(1180, [{ kind: 'mum', armR: 'call', expr: 'call' }, { kind: 'mum', armL: 'hip', expr: 'smile' }, { kind: 'son', expr: 'laugh', armL: 'table', armR: 'table' }, { kind: 'daughter', expr: 'laugh' }]);
    row(1800, [{ kind: 'oldmum', armR: 'talk', expr: 'talk', sit: true }, { kind: 'oldmum', armL: 'cup', expr: 'smile', sit: true }, { kind: 'daughter', armR: 'cup', expr: 'smile', sit: true, look: -1 }, { kind: 'oldmum', expr: 'laugh' }]);
  }
  comp.paperCam(0, 0, 1); comp.begin(); comp.group(G); comp.finish({ vig: 0.2 });
}
