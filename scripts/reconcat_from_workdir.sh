#!/bin/bash
# reconcat_from_workdir.sh — 在 Temp workdir 里重拼 12 个 mux 片段 + 混 BGM。
# 用途：TTS 修正或单场景重渲染后，替换了某个 mux_N.mp4，需要重拼成品。
# 用法：bash reconcat_from_workdir.sh <workdir> <bgm_path> <output_mp4>
#   例：bash reconcat_from_workdir.sh \
#         "G:/Hermes/skills/weekly-paper-process/Temp/w30_76hose4b" \
#         "G:/Hermes/skills/weekly-paper-process/assets/bgm_struggle.mp3" \
#         "G:/Hermes/skills/weekly-paper-process/output/2026Week31/weekly_papers_2026_W31_v2.mp4"
# 注意：必须用 -b:v 8M（与 pipeline concat_videos() 一致），否则成品码率掉到 ~1Mbps（30MB vs 214MB）。

set -euo pipefail

WORKDIR="${1:?usage: reconcat_from_workdir.sh <workdir> <bgm> <output>}"
BGM="${2:?missing bgm path}"
OUT="${3:?missing output path}"

cd "$WORKDIR"

# 1. 重建 concat 列表（按 mux_N 数字序）
python -c "
import glob
files = sorted(glob.glob('mux_*.mp4'), key=lambda x: int(x.replace('mux_','').replace('.mp4','')))
assert len(files) == 12, f'expect 12 mux files, got {len(files)}: {files}'
with open('_concat.txt', 'w') as f:
    for fn in files:
        f.write(f\"file '{fn}'\n\")
print(f'{len(files)} mux files')
"

# 2. concat（-b:v 8M 关键！）
ffmpeg -y -threads 4 -f concat -safe 0 -i _concat.txt \
  -c:v libx264 -pix_fmt yuv420p -b:v 8M \
  -c:a aac -b:a 128k \
  _concat_tmp.mp4

# 3. 混 BGM（音量 0.12，循环，与 mix_bgm 同逻辑）
ffmpeg -y -threads 4 -i _concat_tmp.mp4 \
  -stream_loop -1 -i "$BGM" \
  -filter_complex "[1:a]volume=0.12[a1];[0:a][a1]amix=inputs=2:duration=first:weights=1 1[aout]" \
  -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 128k -shortest -threads 4 \
  "$OUT"

rm -f _concat_tmp.mp4
echo "Done: $OUT"
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUT"
