# Edge TTS 后备方案

当 Qwen3-TTS 服务（端口 8765, llama-server）未启动时，使用 Microsoft Edge TTS 作为替代。

## 安装

```bash
pip install edge-tts
```

## 用法 (CLI)

```bash
python -m edge_tts --text "播报文本" --voice zh-CN-XiaoxiaoNeural --write-media output.mp3
```

## 用法 (Python)

```python
import edge_tts, asyncio

async def gen(text, path):
    await edge_tts.Communicate(text, voice="zh-CN-XiaoxiaoNeural").save(path)

asyncio.run(gen("文本", "out.mp3"))
```

## 在 pipeline 中替换

将 `from common import tts_qwen3` 改为本地 `tts_generate` 函数：

```python
import edge_tts, asyncio

def tts_generate(text, out_path):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(
            edge_tts.Communicate(text, voice="zh-CN-XiaoxiaoNeural").save(out_path)
        )
    finally:
        loop.close()
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", out_path],
        capture_output=True, text=True).stdout.strip())
    return dur
```

然后全文替换 `tts_qwen3` → `tts_generate`。

## 注意

- Edge TTS 需要网络连接（调用微软云服务），国内需代理。
- 语音为 zh-CN-XiaoxiaoNeural（中文女声）。
- 每次调用约 3-10 秒（取决于文本长度）。
- 标题 TTS（论文标题）约 3-6s，演示 TTS（100-150字播报）约 10-20s。
