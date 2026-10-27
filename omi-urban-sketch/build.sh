#!/bin/sh
# One command, from scratch: events → score → mixes (effects-only + with music) → frame-by-frame render → mux (−14 LUFS, no grain) → subtitles, poster.
# LIB = the Lemo-Opuscar library (default /root/lemo-opuscar). WORKERS = render workers (default 3).
set -e
LIB=${LIB:-/root/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
NAME=omi-urban-sketch
cp "$HERE/../omi-shared/timeline.json" "$HERE/timeline.json"
cd "$LIB"
node core/render/events.mjs "$HERE" --size 1080x1920
"$LIB/.venv/bin/python" "$HERE/music/score.py"
MUSIC=0 "$LIB/.venv/bin/python" "$HERE/mix.py"
MUSIC=1 "$LIB/.venv/bin/python" "$HERE/mix.py"
node core/render/video.mjs "$HERE" --fps 24 --size 1080x1920 --workers ${WORKERS:-3} --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/$NAME.mp4" 24 0
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix-music.wav" "$HERE/$NAME-music.mp4" 24 0
"$LIB/.venv/bin/python" "$HERE/../omi-shared/srt.py" "$HERE/timeline.json" "$HERE/$NAME.srt"
node core/render/still.mjs "$HERE" 44 --size 1080x1920 --out "$HERE/out/poster" --prefix p_ && cp "$HERE/out/poster/p_44.jpg" "$HERE/poster.jpg"
echo done
