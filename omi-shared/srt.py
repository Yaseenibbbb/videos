"""timeline.json → .srt (the on-screen words; c1a + c1b are one cue). python srt.py timeline.json out.srt"""
import sys, json
tl = json.load(open(sys.argv[1])); cues = []
for c in tl['cards']:
    if c['id'] == 'c1b': cues[-1]['text'] += '\n' + c['text']; continue
    cues.append(dict(t0=c['t0'], t1=c['t1'], text=c['text']))
cues.append(dict(t0=tl['cta']['t0'] + 1.5, t1=tl['dur'] - 0.4, text=tl['cta']['sub'] + '\n' + tl['cta']['url']))
ts = lambda t: f'{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(round(t % 1 * 1000)) % 1000:03d}'
open(sys.argv[2], 'w', encoding='utf-8').write('\n'.join(f'{i + 1}\n{ts(c["t0"])} --> {ts(c["t1"])}\n{c["text"]}\n' for i, c in enumerate(cues)))
print(sys.argv[2], len(cues), 'cues')
