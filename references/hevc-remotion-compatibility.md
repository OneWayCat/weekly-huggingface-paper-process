# HEVC (H.265) 视频与 Remotion 不兼容

## 问题

Remotion 的 `<Video>` 组件（`<Html5Video>`）依赖浏览器原生 `<video>` 标签播放视频。**HEVC (H.265) 编码的 MP4 文件在浏览器中解码不保证支持**，导致渲染超时：

```
A delayRender() "Rendering <Html5Video /> with src="/public/videos/voiced_N.mp4"
at time 0.083" was called but not cleared after 28000ms.
```

## 诊断

用 ffprobe 检查编码：
```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,pix_fmt video.mp4
# codec_name=hevc → HEVC, 不兼容
# codec_name=h264 → H.264, 兼容
```

## 修复

将 HEVC 视频转码为 H.264：

```bash
ffmpeg -y -i input_hevc.mp4 \
  -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 \
  -c:a copy -threads 4 \
  output_h264.mp4
```

然后替换原文件（或在 pipeline 中加 H.264 保底）。

## 预防

下载 demo 视频时自动检测并转码：
```python
probe = subprocess.run(["ffprobe", "-v", "error",
  "-select_streams", "v:0",
  "-show_entries", "stream=codec_name",
  "-of", "default=noprint_wrappers=1:nokey=1", video_path],
  capture_output=True, text=True)
if "hevc" in probe.stdout.lower():
    # 转码为 H.264
```
