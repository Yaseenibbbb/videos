"""A jazz waltz in F at 132 bpm (one bar of 3 = 1.364 s): walking jazz bass (Karoryfer), brushes (synthesised swishes + VCSL snare taps),
nylon guitar comping on 2 and 3 (pluck model), flute lead (VSCO 2 CE). The bass walks alone on the blank page; the flute enters with the colour;
the trio is full only for the laugh; one bar of true silence; today is guitar alone, rubato, the flute returning under the question.
LIB=<library> python music/score.py → music/score.wav + music/cues.json"""
import sys, os, json, numpy as np, soundfile as sf
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
from core.audio import sampler as S, pluck as P
from core.audio.sfx import SR, add, bp, lp
HERE = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.path.join(HERE, '..', 'events.json'))); DUR = E['dur'] + 1.5
S.seed(13); rng = np.random.default_rng(3)
buf = np.zeros((int(DUR * SR), 2), np.float32)
BEAT = 60 / 132; BAR = 3 * BEAT
PROG = [('F', ['F2', 'A2', 'C3'], ['A3', 'C4', 'E4']), ('Dm', ['D2', 'F2', 'A2'], ['F3', 'A3', 'C4']), ('Gm', ['G2', 'Bb2', 'D3'], ['F3', 'Bb3', 'D4']), ('C7', ['C2', 'E2', 'G2'], ['E3', 'Bb3', 'C4']),
        ('Am', ['A2', 'C3', 'E3'], ['G3', 'C4', 'E4']), ('D7', ['D2', 'F#2', 'A2'], ['F#3', 'C4', 'D4']), ('Gm', ['G2', 'Bb2', 'D3'], ['F3', 'Bb3', 'D4']), ('C7', ['C2', 'E2', 'Bb2'], ['E3', 'Bb3', 'C4'])]
def walk(t0, t1, vel=.62, gain=.9):
    b, t = 0, t0
    while t < t1 - .05:
        _, bn, _ = PROG[b % 8]; nxt = PROG[(b + 1) % 8][1][0]
        for k, p in enumerate([bn[0], bn[1 + (b % 2)], bn[2]]):
            if t + k * BEAT < t1: add(buf, S.note('jazz_bass', p, BEAT * 1.05, vel=vel * (1.08 if k == 0 else .92)), t + k * BEAT, gain, -.05)
        t += BAR; b += 1
def comp(t0, t1, vel=.42, gain=.5, rub=0.0):
    b, t = 0, t0
    while t < t1 - .05:
        _, _, ch = PROG[b % 8]
        for k in (1, 2):
            tk = t + k * BEAT + rub * (rng.random() - .5) * .08
            if tk < t1:
                for j, p in enumerate(ch): add(buf, P.pluck('nylon_guitar', p, None, vel=vel * (.9 if k == 2 else 1)), tk + j * .012, gain, .3)
        t += BAR * (1 + rub * .25); b += 1
def brushes(t0, t1, gain=1.0):
    t = t0
    while t < t1 - .05:
        for k in range(3):
            tk = t + k * BEAT
            if tk >= t1: break
            d = BEAT * (1.0 if k == 0 else .5); n = int(d * SR); x = bp(rng.standard_normal(n), 1800, 9000, 2) * np.sin(np.linspace(0, np.pi, n)) ** (2 if k else 1)
            add(buf, (x * (.03 if k == 0 else .022) * gain).astype(np.float32), tk, 1.0, -.25)
            if k: add(buf, S.hit('snare2', 'taps', .22), tk, .35 * gain, -.25)
        t += BAR
def flute(seq, t0, vel=.5, gain=.7):
    """seq = [(beat offset, pitch, beats)]"""
    for b, p, d in seq: add(buf, S.note('flute', p, d * BEAT, vel=vel, attack=.05, release=.3), t0 + b * BEAT, gain, .15)
THEME = [(0, 'C5', 2), (2, 'A4', 1), (3, 'F5', 2), (5, 'E5', 1), (6, 'D5', 3), (9, 'Bb4', 1), (10, 'D5', 1), (11, 'E5', 1), (12, 'G5', 2), (14, 'F5', 1), (15, 'E5', 3), (18, 'C5', 3),
         (21, 'D5', 2), (23, 'F#5', 1), (24, 'A5', 3), (27, 'G5', 1), (28, 'F5', 1), (29, 'E5', 1), (30, 'C5', 3)]
cues = {}
# 1 blank page: the bass alone, walking in three; brushes from bar 4
walk(0.2, 20.75); brushes(0.2 + 4 * BAR, 20.75, .8)
# 2 the colour comes in with the light: the flute enters, the guitar comps
comp(10.3, 20.75); flute(THEME[:12], 12.9, .48)
flute([(0, 'C5', 1), (1, 'F5', 2)], 19.0, .58)                     # the second call: a rising fourth
# 3 years later: bass and brushes only, thinner
walk(21.6, 26.3, vel=.5, gain=.75); brushes(21.6, 26.3, .6)
# 4 the laugh: the full trio, the theme's high point
walk(26.3, 31.45); comp(26.3, 31.45, vel=.5); brushes(26.3, 31.45, 1.0); flute(THEME[12:], 26.4, .6, .8)
cues['silence'] = [31.45, 33.0]
# 5 today: guitar alone, rubato; the flute returns softly under the question
comp(33.0, 49.8, vel=.36, gain=.5, rub=1.0)
flute([(0, 'A4', 3), (3, 'C5', 3), (6, 'Bb4', 3), (9, 'G4', 6)], 38.2, .38, .55)
flute([(0, 'F4', 3), (3, 'A4', 3), (6, 'C5', 6)], 44.9, .36, .5)
# 6 the book: the theme's last phrase, the bass on the root
walk(49.8, 54.0, vel=.5, gain=.7); comp(49.8, 54.0, vel=.42)
flute([(0, 'D5', 2), (2, 'E5', 1), (3, 'F5', 3), (6, 'C5', 3), (9, 'F5', 6)], 49.9, .5, .7)
add(buf, S.note('jazz_bass', 'F1', 2.5, vel=.6), 54.0, .9, -.05)
for j, p in enumerate(['F3', 'A3', 'C4', 'E4']): add(buf, P.pluck('nylon_guitar', p, None, vel=.4), 54.0 + j * .05, .5, .3)

mix = S.room(buf, size=.4, mix=.18)
a, z = cues['silence']; i0, i1 = int(a * SR), int(z * SR); f = int(.2 * SR)
g = np.ones(len(mix), np.float32); g[i0:i1] = 0; g[i0 - f:i0] = np.linspace(1, 0, f)
mix *= g[:, None]
mix = mix / (np.abs(mix).max() + 1e-9) * .8
sf.write(os.path.join(HERE, 'score.wav'), mix, SR)
json.dump(cues, open(os.path.join(HERE, 'cues.json'), 'w'), indent=1)
print('score.wav', len(mix) / SR, 's', cues)
print('\n'.join(S.credits(['jazz_bass', 'flute', 'snare2'])))
