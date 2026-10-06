# 关键脚本索引（W40）
- 全片管线主脚本：G:\Hermes\Temp\w40_srt_wx_full.py（两env协作：dump_words.py 转写 + align_words.py 对齐 + 装配断言）
- A方案装配：G:\Hermes\Temp\w40_srt_planA2.py（字符流滑窗映射 ✓ 终版逻辑）
- 标题条实测：G:\Hermes\Temp\w40_measure_titles3.py（faster-whisper 词级量每篇英文标题开口/收尾）
- B方案设计（W41 起）：TTS 逐句合成清单，见 SKILL.md

# 核心代码片段
## Silero VAD 加载对齐模型（whisperx env）
```python
import whisperx, torch
model_a, metadata = whisperx.load_align_model(language_code='zh', device='cuda')
# transcribe 阶段如需: whisperx.load_model('small', device, compute_type='float16', language='zh', vad_method='silero')
```

## 字符流滑窗映射（句→时间）
```python
# W = [{word,start,end},...]（对齐词表）；chars 流 + ctime 每字符时间
# lines.md 句 norm 后在 stream 上 difflib 滑窗（窗口 n±15%，步长 n/20）
# 句起点 = ctime[窗口首]；句尾词 end = 累计词长 >= 窗口尾的那个词的 end
```

## 数字规则全形态（按序执行）
```python
# ① 百分之([零一二两三四五六七八九十百]+) → N%
# ② ([零一二两三四五六七八九十百]+)点([零一二三四五六七八九]+) → N.M
# ③ (\d+)%点([零一二三四五六七八九]+) → N.M%（最易漏 ✗）
# ④ 特例直替：涨到七十四以上→涨到74以上
# 保持中文：两个/第二点/第一 等序数量词
```

## 已知坑
- align() 自带 transcribe 在 torch2.6 卡死 → 转写用生产 env faster-whisper ✓ 只用 align
- HF 直连断流 → snapshot_download 或 curl -C - 断点续传（阿里云镜像 mirrors.aliyun.com/pytorch-wheels/cu124/）
- 质量门 B6 宽度含软换行整条计算 → OneStreamer 全名 94 宽拆两行显示可接受(WARN)
- 结尾卡/静态卡 E1 误报可忽略
