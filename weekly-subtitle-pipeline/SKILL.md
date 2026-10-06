---
name: weekly-subtitle-pipeline
version: 1.0.0
author: Hermes
license: MIT
description: 周更论文视频字幕管线：WhisperX 对齐/TTS逐句清单B方案/双音色/数字规则/标题条实测。每周出片必用。
metadata:
  hermes:
    tags: [subtitle, whisperx, tts, weekly-paper]
    related_skills: [weekly-paper-process, video-subtitles]
---

# 周更字幕管线（W40 定稿 ✓）

## When to Use
每周论文速览视频出片时（烧录字幕前）；或字幕时间轴出现抢跑/滞后/错位时定位根因。

## 唯一真相原则（血泪教训 ✗→✓）
- 字幕时间的唯一真相 = 音频本身 ✓ 任何"手搓规则再加工"都是引入误差 ✗
- 禁止叠加：链式顺延 / 终点改写 / clamp 补丁 / 多层修正 ✗（W40 七层补丁的代价 ✗）
- lines.md 的断句 ≠ TTS 实际呼吸断句 ✗（TTS 会合并/重排短句 ✓）

## 管线（W40 已验证 ✓ 脚本 G:\Hermes\Temp\w40_srt_wx_full.py）
1. 母版拼完 → ffmpeg 切音轨为段（段锚 = 各 mux 时长累加 ✓）
2. 转写：qwen3-tts env 的 faster-whisper（nb_align_subs.asr_words ✓ 快稳 ✓）
3. 对齐：whisperx env（G:\conda_envs\whisperx ✓ 独立不碰生产 ✓）
   - vad_method='silero'（pyannote 与 torch2.6 cuDNN 符号冲突挂死 ✗ 永不装 pyannote 到生产 env ✗）
   - align() 吃现成转写 JSON ✓ 不用它自己的 transcribe（卡死 18 分钟 ✗）
   - 对齐模型 jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn（bin 已入 HF 缓存 ✓）
   - 需要 nltk punkt_tab（已装 whisperx env nltk_data ✓）
4. 句映射：对齐词表拼字符流 → lines.md 句（归一化）滑窗 difflib 定位（同音字容忍 ✓）
   → 句起点=句首字符词时间 ✓ 句终点=句尾字符词尾时间 ✓
5. 终点规则：句终点=ASR 词尾 ✓（"下一句起点-0.08"会造成抢跑 ✗）
6. 数字规则（文本层）：百分之X→X% / X点Y→X.Y / **N%点M→N.M%**（易漏 ✗ W40 被抓两次 ✗）
   保持中文：两个/第二点/第一 等序数量词 ✗ 不转
   替换必须在锚定之后跑 ✗（先转再锚 = 锚词对不上 ✗）
7. 标题条：仅当 TTS 有独立英文标题遍（词级 ASR 实测开口/收尾 ✓ 篇3 LEGO 无独立遍=嵌在正文句 ✗
   → 也插条，区间=「第三篇，」到正文名开口 ✓）
   英文标题条两行显示用 \n 软换行 ✓ 质量门 B6 按整条算宽 → 拆两条或接受 WARN ✓

## B 方案（根治 ✓ W41 起新内容用）
TTS 逐句合成：lines.md 按句切 → 每句独立 synth → (文本,时长) 清单 → 拼接累加偏移 = SRT 源头 100% 准
零 ASR 零对齐 ✓ 本期不用于已验收音频（回归风险 ✓）仅新内容 ✓

## 质量门
quality_gate.py FAIL=0 交付；已知可接受：B6 两行软换行宽(94) / E1 静态结尾卡
B2 空隙>3s：先查是否 TTS 真实停顿（篇间呼吸 ✓ 用词级 ASR 验证再决定铺满或保留）

## 双音色（本期定案 ✓）
正文 = IndexTTS2 Elise（G:\VoiceAI\index-tts-main + indextts2-venv ✓ 权重D盘 ✓ RTF≈1.9）
补充 = qwen3-tts rem（8765 端口 无 ref-text ✓）
两引擎显存不共存 ✗ 跑 Index 前停 8765/8766 ✓

## weekcache
TTS 缓存放周目录 output/<week>/tts_*_elise.mp3 ✓ 跨跑复用 ✓（workdir 每跑新建 ✗ 别放 workdir ✗）

## env 岗位纪律
生产 env（qwen3-tts）永不直装重依赖 ✗（pyannote 曾把 torch 升到 2.14 ✗ 差点全毁 ✓）
所有实验依赖进独立 env（G:\conda_envs\whisperx ✓ G盘 ✓）