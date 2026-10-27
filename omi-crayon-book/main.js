// Entry: ?test=model draws the model sheet; otherwise renders the film
import { makeComp } from './gl.js';
import { BOIL } from './crayon.js';
const Q = new URLSearchParams(location.search);
const comp = makeComp(document.getElementById('gl'));
window.DUR = 1;
await Promise.all(["500 60px 'Marhey'", "700 60px 'Marhey'", "700 60px 'El Messiri'", "500 50px 'El Messiri'"].map(f => document.fonts.load(f, 'حكاية abc')));
const test = Q.get('test');
if (test) {
  const T = await import('./sheet.js');
  window.render = t => { BOIL.step = Math.floor(t * 12); T.sheet(comp, t, test); };
} else {
  const M = await import('./film.js');
  await M.ready;
  // ?from=a&to=b renders only that stretch (to re-render part of the film and splice it in)
  const from = +(Q.get('from') ?? 0), to = +(Q.get('to') ?? M.DUR);
  window.DUR = to - from; window.EV = M.EV; window.TEXTS = M.TEXTS;
  window.render = t => { t += from; BOIL.step = Math.floor(t * 12 + 1e-6); M.frame(comp, t); };
}
window.READY = true;
