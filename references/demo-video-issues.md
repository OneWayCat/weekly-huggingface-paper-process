# Demo Video Issues

## HEVC → H.264 转码

**症状**：Remotion `<Video>` 渲染时报 `A delayRender() ... was called but not cleared after 28000ms`。

**原因**：部分 HF demo 视频是 HEVC/H.265 编码（`ffprobe -v error -show_entries stream=codec_name` 显示 `hevc`），Remotion 不支持 HEVC。

**修复**：
```bash
# 检查编码
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name demo.mp4

# 转码到 H.264
ffmpeg -i demo.mp4 -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 -c:a copy demo_h264.mp4

# 在 pipeline 的 Step 3 中使用 H.264 版本
```

注意：如果是下载前转码，直接在 demos/ 目录替换原文件。如果是 pipeline 跑了一半发现，需要找到 workdir（`Temp/wNN_*/`）中的 `voiced_N.mp4`，替换为 H.264 版本后重新渲染对应 scene。

## HF demo 视频失效（AccessDenied）恢复

**症状**：curl 下载 HF demo mp4 得到几百字节文件，`head -c 200` 看到 `<Error><Code>AccessDenied</Code></Error>` XML。hf-mirror 和 huggingface.co（走 Clash 代理）都返回同样的错误 → 该 HF 上传文件已失效，无法从 HF 拿到。

**恢复路径**（实例：LongHorizon-Harness 项目页 lh-harness.pages.dev，2026-08 实测）：
1. curl 抓项目页 HTML：`curl -s -k "https://<project-site>/" -H "User-Agent: Mozilla/5.0" -o page.html`。静态站（Cloudflare Pages 等）直连可行；若返回的是 SPA index.html，去 JS bundle 找：`grep -oE '"[^"]*\.mp4[^"]*"' page.js`
2. 找视频文件名：`grep -oE 'data-src="[^"]*"' page.html` → `video/promotional_video.mp4`，文件名 = 去路径去扩展名 `promotional_video`
3. 若 JS 里有 `video/hls/` 说明视频是 HLS 流，m3u8 URL 模式为 `{site}/video/hls/{文件名}_{480p|720p|1080p}/index.m3u8`（如 `promotional_video_1080p/index.m3u8`）。先 curl 各档 m3u8 确认 200
4. ffmpeg 拼接成 mp4：`ffmpeg -y -threads 4 -i "<m3u8>" -c copy -movflags +faststart demo_0.mp4`（H.264 输出，直接可用，免转码）

**判定要点**：下载后文件大小异常小（几百字节）先 `head -c 200` 看是否 XML 错误页；ffprobe 报 `moov atom not found` / `Invalid data found` 即为无效文件，不要带进 pipeline。

## TTS 服务故障处理

### Qwen3-TTS 服务未启动
1. 检查端口 8765 是否监听：`curl -s http://127.0.0.1:8765/health`
2. 启动：参考 `local-qwen3-tts` skill
3. 后备方案：在 pipeline 中替换为 Edge TTS

### Edge TTS 后备方案
```python
# 在 pipeline 顶部加入：
import edge_tts
import asyncio

def tts_generate(text, out_path):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(
            edge_tts.Communicate(text, voice="zh-CN-XiaoxiaoNeural").save(out_path)
        )
    finally:
        loop.close()
    # 获取时长
    dur = float(subprocess.run(["ffprobe", ...]).stdout.strip())
    return dur

# 然后将所有 tts_qwen3() 调用替换为 tts_generate()
```
注意恢复时记得改回 `tts_qwen3` 并清理 edge_tts 相关代码。

### normalize_tts() 正则顺序坑

`common.py` 中的 `normalize_tts()` 有严格的正则执行顺序：

1. `%` → 必须先于小数正则，否则 `57.4%` 中的 `.4` 会被小数正则吃掉
2. 小数 → 处理剩余小数点数字
3. `P/K` 后缀 → 分辨率
4. RTX 型号 → 逐位读
5. 数字+中文 → 量词

如果增删正则，务必运行 `scripts/verify_tts_normalization.py` 验证。
