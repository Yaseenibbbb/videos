const M = await import('./film.js');
// ?from=a&to=b renders only that stretch (to re-render part of the film and splice it in)
const Q = new URLSearchParams(location.search), from = +(Q.get('from') ?? 0), to = +(Q.get('to') ?? M.DUR);
window.DUR = to - from; window.EV = M.EV; window.TEXTS = M.TEXTS;
window.render = t => M.frame(t + from);
window.READY = true;
