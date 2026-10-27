"""Solo clarinet: one unbroken melodic line, the sound of the drawing. Short notes on the calendar's corners, a lilt for the lunch,
a rising scale for the growth marks, the highest note on the rose laugh (a hand chime doubles it), true silence at the stop,
then a low, tender line for today and a resolving phrase on the book. F major, 72 bpm.
LIB=<library> python music/score.py → music/score.wav + music/cues.json"""
import sys, os, json, numpy as np, soundfile as sf
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR, add
HERE = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.path.join(HERE, '..', 'events.json')))
ev = E['ev']; DUR = E['dur'] + 1.0
seg = {e['id']: (e['t'], e['t1']) for e in ev if e['type'] == 'seg'}
corners = [c for e in ev if e['type'] == 'corners' for c in e['data']]
S.seed(5)
buf = np.zeros((int(DUR * SR), 2), np.float32)
PAN = 0.1

def legato(notes, vel=.5, attack=.08, tail=.9, gain=1.0, overlap=.1):
    """notes = [(t, pitch[, vel])]; each note holds until the next onset + overlap"""
    for i, n in enumerate(notes):
        t, p = n[0], n[1]; v = n[2] if len(n) > 2 else vel
        t1 = notes[i + 1][0] + overlap if i + 1 < len(notes) else t + tail
        add(buf, S.note('clarinet', p, max(.2, t1 - t), vel=v, attack=attack, release=.4), t, gain, PAN)

def stac(notes, vel=.5, gain=.8):
    for n in notes: add(buf, S.note('clarinet_stac', n[1], .5, vel=n[2] if len(n) > 2 else vel), n[0], gain, PAN)

cues = {}
SCALE = ['F3', 'G3', 'A3', 'Bb3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C5', 'D5']
# 1 the calendar: one short note per corner (thinned), walking down and up the scale like a ruler
g0, g1 = seg['grid']
cs = [c['t'] for c in corners if c['seg'] == 'grid']; picked = []
for t in cs:
    if not picked or t - picked[-1] > 0.32: picked.append(t)
walk = [7, 6, 5, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 6, 7, 9, 8, 7]
stac([(t, SCALE[walk[i % len(walk)]], .42 + .1 * (i % 3 == 0)) for i, t in enumerate(picked)], gain=.75)
# 2 the loop round one day: an arpeggio that holds on the chosen day
c0, c1 = seg['circle']
legato([(c0 + .05, 'F4', .45), (c0 + .65, 'A4', .5), (c0 + 1.25, 'C5', .56), (c0 + 2.0, 'A4', .5), (c0 + 2.6, 'F4', .48)], tail=1.4)
cues['choice'] = c0 + 1.25
# 3 the lunch: a lilting phrase in the middle register (two bars of 3/4 feel inside 72 bpm)
r0 = seg['room'][0]; b = 60 / 72
lunch = [(0, 'C4'), (1, 'F4'), (1.5, 'E4'), (2, 'F4'), (3, 'A4'), (4, 'G4'), (4.5, 'F4'), (5, 'E4'), (6, 'C4'), (7, 'D4'), (7.5, 'E4'), (8, 'F4')]
legato([(r0 + k * b, p, .46) for k, p in lunch], overlap=.08)
# Mum calls: a rising fourth (C → F), then the table: a little turn
m0 = seg['mum'][0]
legato([(m0 + 1.4, 'C5', .5), (m0 + 1.75, 'F5', .58), (m0 + 2.6, 'E5', .5), (m0 + 3.1, 'C5', .46), (seg['table'][0] + .7, 'A4', .44), (seg['table'][0] + 1.3, 'Bb4', .44)], tail=.9)
# 4 the late one: three staccato blocks (one per block), then the louder call: the fourth again, an octave apart
l0 = seg['late'][0]
stac([(17.55, 'F4', .5), (17.95, 'G4', .5), (18.35, 'A4', .52)], gain=.9)
legato([(19.45, 'C4', .52), (19.8, 'F4', .6), (20.5, 'F4', .5)], tail=.6)
# 5 the years: a quick descending run along the calendar lines
t0, t1 = seg['travel']
stac([(t0 + i * (t1 - t0) / 8, p, .44) for i, p in enumerate(['C5', 'Bb4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4'])], gain=.7)
# 6 the growth marks: one rising note per mark
dc = [c['t'] for c in corners if c['seg'] == 'door' and c['t'] > 23.4]
marks = []
for t in dc:
    if not marks or t - marks[-1] > 0.28: marks.append(t)
marks = marks[:6]
legato([(t, p, .46 + .02 * i) for i, (t, p) in enumerate(zip(marks, ['C4', 'D4', 'E4', 'F4', 'G4', 'A4']))], overlap=.06, tail=.8)
# 7 the grown-ups and the laugh: a warm phrase climbing to the highest note on the rose loops; a hand chime doubles it
k0 = seg['tableB'][0]; lt = seg['laugh'][0] + 0.55
legato([(k0 + .1, 'F4', .48), (k0 + .9, 'A4', .5), (k0 + 1.7, 'C5', .54), (k0 + 2.3, 'D5', .56), (lt, 'F5', .66), (lt + 1.4, 'E5', .56), (lt + 2.1, 'C5', .5)], tail=0.8)
add(buf, S.note('hand_chimes', 'F6', 3.0, vel=.5), lt, .7, .3); cues['peak'] = lt
# 8 the stop: true silence while the ink pools
blot = [e for e in ev if e['type'] == 'blot'][0]
cues['silence'] = [blot['t'] + 0.05, blot['t'] + blot['dur'] - 0.05]
# 9 today: low and tender; a long note under the question
s0 = cues['silence'][1] + .15
today = [(s0, 'C4', .38), (s0 + 1.7, 'F3', .4), (s0 + 3.0, 'A3', .42), (s0 + 4.6, 'G3', .4), (38.1, 'C4', .44), (39.6, 'A3', .42), (41.0, 'Bb3', .42),
         (42.8, 'D4', .44), (44.84, 'C4', .44), (46.2, 'A3', .4), (47.6, 'G3', .38)]
legato(today, attack=.25, overlap=.15)
# 10 the book: a resolving phrase, the tonic held as the picture fades
b0 = seg['book'][0]
legato([(b0 + .2, 'A3', .42), (b0 + 1.0, 'C4', .46), (b0 + 1.9, 'E4', .48), (b0 + 2.9, 'F4', .5)], tail=E['dur'] - b0 - 2.6, overlap=.12)
add(buf, S.note('hand_chimes', 'C6', 3.5, vel=.35), b0 + 2.9, .5, .3)

mix = S.room(buf, size=.5, mix=.2)
a, z = cues['silence']; i0, i1 = int(a * SR), int(z * SR); f = int(.25 * SR)
g = np.ones(len(mix), np.float32); g[i0:i1] = 0; g[i0 - f:i0] = np.linspace(1, 0, f)
mix *= g[:, None]
mix = mix / (np.abs(mix).max() + 1e-9) * .8
sf.write(os.path.join(HERE, 'score.wav'), mix, SR)
json.dump(cues, open(os.path.join(HERE, 'cues.json'), 'w'), indent=1)
print('score.wav', len(mix) / SR, 's', cues)
print('\n'.join(S.credits(['clarinet', 'clarinet_stac', 'hand_chimes'])))
