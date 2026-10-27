"""ep02 timeline.json → .srt (the question is the only on-screen text). python srt_ep02.py timeline.json out.srt"""
import sys, json
q = json.load(open(sys.argv[1]))['question']
ts = lambda t: f'{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(round(t % 1 * 1000)) % 1000:03d}'
open(sys.argv[2], 'w', encoding='utf-8').write(f"1\n{ts(q['t0'])} --> {ts(q['t1'])}\n" + '\n'.join(q['lines']) + '\n')
print(sys.argv[2])
