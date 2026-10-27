"""Small wooden and metal-toothed instruments, D major, a 6/8 lilt at 96 bpm (one bar = 1.25 s).
Nylon guitar (pluck model) keeps the lilt; the music box and a recorder carry theme A; a bassoon jokes under the late one;
the glockenspiel gives one note per height mark and per word the wash uncovers. The theme is heard in full only once:
on the music box, under the white-wax question. True silence for the breath; the music box winds down at the end.
LIB=<library> python music/score.py → music/score.wav + music/cues.json"""
import sys, os, json, numpy as np, soundfile as sf
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
from core.audio import sampler as S, pluck as P
from core.audio.sfx import SR, add
HERE = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.path.join(HERE, '..', 'events.json'))); ev = E['ev']; DUR = E['dur'] + 1.5
S.seed(9)
buf = np.zeros((int(DUR * SR), 2), np.float32)
BAR = 1.25; E8 = BAR / 6
get = lambda ty: [e for e in ev if e['type'] == ty]

# theme A: two four-bar phrases, eighth-note grid (None = rest / hold)
A1 = [['A4', None, 'D5', None, 'F#5', 'E5'], ['D5', None, None, 'B4', None, 'A4'], ['G4', None, 'B4', None, 'D5', 'C#5'], ['B4', None, None, 'A4', None, None]]
A2 = [['A4', None, 'D5', None, 'F#5', 'A5'], ['G5', None, 'F#5', 'E5', None, 'D5'], ['E5', None, 'F#5', None, 'E5', 'C#5'], ['D5', None, None, None, None, None]]
def notes(phrase, t0):
    out = []
    for b, bar in enumerate(phrase):
        for k, p in enumerate(bar):
            if p: out.append((t0 + b * BAR + k * E8, p))
    return out
def play(seq, inst, vel=.55, gain=1.0, pan=0.0, hold=1.6):
    for i, (t, p) in enumerate(seq):
        d = (seq[i + 1][0] - t + .05) if i + 1 < len(seq) else hold
        if inst == 'music_box': x = P.pluck('music_box', p, None, vel=vel)
        else: x = S.note(inst, p, max(.15, d), vel=vel, attack=.02 if inst != 'recorder' else .06, release=.35)
        add(buf, x, t, gain, pan)
CHORDS = {'D': ['D3', 'A3', 'D4', 'F#4'], 'G': ['G2', 'D3', 'G3', 'B3'], 'A': ['A2', 'E3', 'A3', 'C#4'], 'Bm': ['B2', 'F#3', 'B3', 'D4']}
def guitar(t0, t1, prog, vel=.5, gain=.55):
    b, t = 0, t0
    while t < t1 - .1:
        ch = CHORDS[prog[b % len(prog)]]
        for k, idx in enumerate([0, 2, 3, 1, 2, 3]):   # bass on 1, then the lilt
            tk = t + k * E8
            if tk >= t1: break
            add(buf, P.pluck('nylon_guitar', ch[idx], None, vel=vel * (1.1 if k == 0 else .85)), tk, gain, -.25)
        t += BAR; b += 1
def glock(t, p, vel=.5, gain=.45, pan=.3): add(buf, S.note('glockenspiel', p, 2.0, vel=vel), t, gain, pan)

cues = {}
# 1 page one opens: guitar lilt, the music box sketches the first half of the theme (held back)
guitar(0.2, 10.3, ['D', 'G', 'A', 'D'])
play(notes(A1[:2], 2.7), 'music_box', vel=.6, gain=.5, pan=.2)
play(notes(A1[2:], 5.2), 'music_box', vel=.55, gain=.45, pan=.2)
# 2 the lunch: the recorder sings A1 then the first half of A2 under Mum's call
guitar(10.3, 16.6, ['D', 'Bm', 'G', 'A', 'D'])
play(notes(A1, 10.5), 'recorder', vel=.5, gain=.5, pan=-.1)
play(notes(A2[:1], 15.5), 'recorder', vel=.5, gain=.5, pan=-.1)
# 3 the late one: a three-note bassoon joke on the blocks, then the call again: a rising fourth on the recorder
guitar(16.6, 20.6, ['G', 'A'], vel=.42)
for t, p in zip([e['t'] for e in get('block') if e['t'] > 17], ['D3', 'E3', 'F#3']): add(buf, S.note('bassoon_stac', p, .4, vel=.6), t, .7, .2)
play([(19.0, 'A4'), (19.3, 'D5')], 'recorder', vel=.6, gain=.6, hold=1.1)
# 4 the page turns: a glockenspiel flourish; then one note per height mark
for i, p in enumerate(['D6', 'E6', 'F#6', 'A6']): glock(20.65 + i * .12, p, .45, .35)
guitar(21.5, 26.0, ['D', 'G'], vel=.38, gain=.45)
for e, p in zip(get('mark'), ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6']): glock(e['t'], p, .55)
# 5 the laugh: theme A brighter: music box and recorder together; glock sparkles on the loops
guitar(26.0, 31.4, ['D', 'Bm', 'G', 'A'], vel=.5)
play(notes(A2, 26.3), 'music_box', vel=.62, gain=.5, pan=.25)
play(notes(A2, 26.3), 'recorder', vel=.45, gain=.35, pan=-.15)
for e in get('loop'): glock(e['t'], ['F#6', 'A6', 'D7'][e['i']], .4, .3, e['pan'])
# 6 the breath: true silence
cues['silence'] = [31.45, 33.0]
# 7 today: guitar alone, softer
guitar(33.0, 49.6, ['D', 'G', 'Bm', 'A'], vel=.36, gain=.45)
# 8 the wax question: the music box plays theme A in full for the first time; a glockenspiel note for each uncovered word
play(notes(A1, 38.1) + notes(A2, 38.1 + 4 * BAR), 'music_box', vel=.62, gain=.55, pan=.2)
for i, e in enumerate(get('glint')): glock(e['t'], ['A6', 'F#6', 'D6', 'B6', 'A6', 'E6', 'D6'][i % 7], .45, .32, e['pan'])
cues['theme'] = 38.1
# 9 the book: the final cadence; the music box winds down with a pitch droop
for k, ch in enumerate(['G', 'A', 'D']):
    for j, p in enumerate(CHORDS[ch]): add(buf, P.pluck('nylon_guitar', p, None, vel=.45), 49.9 + k * BAR + j * .03, .5, -.25)
for i, (p, vel) in enumerate([('A5', .55), ('F#5', .5), ('E5', .48), ('D5', .45)]):
    tt = 50.2 + i * .9; x = P.pluck('music_box', p, None, vel=vel, bend=[(0, 0), (.4, -0.15 * i), (1.2, -0.4 * i)])
    add(buf, x, tt, .5, .2)

mix = S.room(buf, size=.35, mix=.16)
a, z = cues['silence']; i0, i1 = int(a * SR), int(z * SR); f = int(.2 * SR)
g = np.ones(len(mix), np.float32); g[i0:i1] = 0; g[i0 - f:i0] = np.linspace(1, 0, f)
mix *= g[:, None]
mix = mix / (np.abs(mix).max() + 1e-9) * .8
sf.write(os.path.join(HERE, 'score.wav'), mix, SR)
json.dump(cues, open(os.path.join(HERE, 'cues.json'), 'w'), indent=1)
print('score.wav', len(mix) / SR, 's', cues)
print('\n'.join(S.credits(['recorder', 'glockenspiel', 'bassoon_stac'])))
