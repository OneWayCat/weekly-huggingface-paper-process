# Weekly HuggingFace Paper Process

每周 HuggingFace 论文速览视频生成。从 lines.md(播报文本) + slice.md(显示素材) 读取数据，TTS 播报，Remotion 渲染叠加层，ffmpeg 混流合成，输出 1080p 视频。

## 快速开始

详见 [SKILL.md](SKILL.md)

## 环境

- Node.js 18+
- ffmpeg 6+（libx264 + libmp3lame）
- Python 3.10+
- TTS 服务（Qwen3-TTS 或 Edge TTS）

