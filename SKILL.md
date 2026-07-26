---
name: weekly-paper-process
description: 每周 HuggingFace 论文速览视频生成。从 lines.md 和 slice.md 读取数据，Qwen3-TTS 播报，Remotion 渲染叠加层，ffmpeg 混流合成，输出 1080p 视频。开源 GitHub OneWayCat 双分支（main稳定版/dev动效实验版）
---

# Weekly Paper Process

每周 HuggingFace 论文速览视频生成。**12 场景**线性流程：标题 → 5×[标题卡 + demo] → 结尾。
**白底 + Remotion 渲染叠加层 + ffmpeg 混流。**

## 项目仓库

完整代码、完整文档、故障排查指南全部在 GitHub：
**https://github.com/OneWayCat/weekly-huggingface-paper-process**

## 环境要求

| 依赖 | 最低版本 | 说明 |
|------|---------|------|
| Node.js | 18+ | Remotion 渲染引擎 |
| ffmpeg | 6+ | 视频处理（需含 libx264、libmp3lame） |
| Python | 3.10+ | Pipeline 脚本 |
| TTS 服务 | — | Qwen3-TTS 或 Edge TTS |

### 路径约定（全部自动推导）

所有路径基于 `common.py` 的 `SKILL_DIR`（`os.path.dirname(os.path.abspath(__file__))`），不硬编码任何本机路径。项目内部全部使用相对路径。

**项目结构：**
```
weekly-paper-process/
├── SKILL.md, .gitignore, common.py
├── scripts/weekly_paper_pipeline.py     # 主 pipeline（7步）
├── remotion_ainews/                      # Remotion 项目
│   ├── src/ (5个组件)
│   ├── render-scene.mjs (单场景渲染器)
│   └── package.json
├── output/YYYYWeekWW/                    # 每周输出（.gitignore）
│   ├── lines.md (播报文本)
│   ├── slice.md (显示素材)
│   └── demos/ (论文原视频)
├── Temp/ (.gitignore)
└── assets/ -- BGM 文件需用户自备
```

### BGM 说明

BGM 由用户指定当周网易云音乐歌曲（music.163.com）。使用浏览器从 music.163.com 获取歌曲信息（名称、艺人、时长），然后在 YouTube 搜索该歌曲并使用 yt-dlp 下载：
```bash
python -m yt_dlp --proxy http://127.0.0.1:7897 -x --audio-format mp3 --audio-quality 128k -o assets/bgm_struggle.mp3 "https://www.youtube.com/watch?v=VIDEO_ID"
```
注意用 Clash 代理（127.0.0.1:7897）翻墙下载 HF CDN 和 YouTube 内容。

BGM 文件建议长度接近视频总时长（~200s），过短会循环播放。默认音量 0.12，混合在 Step 7。

### TTS 说明

首选 **Qwen3-TTS**（端口 8765，`local-qwen3-tts` 技能，Elise 音色），使用 `faster-qwen3-tts` Python 服务。备选 **Edge TTS**（详见 `references/edge-tts-setup.md`）。

Edge TTS 快速用法：
```bash
python -m edge_tts --text "播报文本" --voice zh-CN-XiaoxiaoNeural --write-media output.mp3
```

标题 TTS 只需朗读论文标题本身，时长约 3-6s（80-132 帧 @24fps）。

## 快速使用

```bash
# 1. 安装依赖
cd remotion_ainews && npm install

# 2. 准备数据
#    output/YYYYWeekWW/lines.md -- TTS 播报文本
#    output/YYYYWeekWW/slice.md -- 论文元信息+指标+视频路径
#    output/YYYYWeekWW/demos/   -- 论文原 demo 视频

# 3. 启动 TTS 服务（Qwen3-TTS 端口 8765 或 Edge TTS）

# 4. 运行
python scripts/weekly_paper_pipeline.py output/YYYYWeekWW/lines.md
```

## 用户内容编写规则

### 论文中文名翻译

论文标题翻译要通俗易懂，格式为：`"中文名 -- 一句话解释"`。例如：
- GenCeption 翻译为 "自我审视 -- 视频生成模型作为通用视觉学习者"
- RoboTTT 翻译为 "机器人长程记忆 -- 让机器人的上下文扩展到8000步"

### 播报文本风格

每篇 100-150 字，结构：问题背景 + 团队 + 创新点 + 可量化成果。口语化自然，不卖萌不啰嗦。

**TTS 标音规则（重要）**：数字在 lines.md 中直接写 TTS 标音，不要依赖 normalize_tts() 的自动转换。已知问题：

| 原文 | TTS 标音写法 | 说明 |
|------|-------------|------|
| `RTX 5090` | `RTX 五零九零` | 型号数字逐位读，非五千零九十 |
| `720P` | `七二零P` | 分辨率逐位读+P |
| `540P/720P` | `五四零P和七二零P` | 斜杠改"和"防停顿异常 |
| `4K` | `四K` | (正则在 normalize_tts 中自动处理) |
| `2B/9B` | `2B/9B` | (正则在 normalize_tts 中自动转"二十亿") |
| `57.4%` | `百分之五十七点四` | 带小数百分比直接写中文，不可依赖自动转换 |
| `46.6%` | `百分之四十六点六` | 同上 |
| `50%` | `百分之五十` | 整数百分比同理 |
| `20.07` | `二十点零七` | 小数直接写中文 |
| `57.4%的成功率` | `百分之五十七点四的成功率` | 百分比后接文字，防止正则误匹配 |
| `HOMIE` | `Home Me` | 按英文发音写 |
| `DAMO` | `达摩` | 中文机构名写汉字 |

**原则**：所有数字+字母组合（分辨率、型号）统一在 lines.md 写中文读音。normalize_tts() 中的正则作为后备，但不可完全信赖。写完后用 `tts_qwen3()` 逐段测试确认。

### normalize_tts() 自动转换规则（common.py）

| 匹配模式 | 转换示例 | 说明 |
|---------|---------|------|
| `(\d+(?:\.\d+)?)%` | 57.4%→百分之五十七点四 | **优先于小数正则**，需防顺序问题 |
| `(\d+)B` | 15B→一百五十亿 | |
| `(\d+)M` | 100M→一亿 | |
| `(\d+)P` | 720P→七二零P | 分辨率逐位读 |
| `(\d+)K(?!\w)` | 4K→四K | Unicode 环境下 `(?!\w)` 不生效，改用 `(?![a-zA-Z])` |
| `(?<=RTX\s)(\d{4})` | RTX 5090→RTX 五零九零 | 型号逐位读 |
| `(\d+)%` 后置 | 已合并到带小数版 | 删除了重复的 `(\d+)%` 正则 |
| `(\d+)([\u4e00-\u9fff])` | 16帧→十六帧 | 数字+中文 |

**注意**：`(\d+\.\d+)`（小数转中文）必须在 `(\d+)%` 等专用模式**之后**，否则 `57.4%` 会被小数正则吃掉 `.4` 导致 `57.百分之四`。
**注意**：`4K` 后的中文(`\u4e00`)在 Python 3 中被视为 `\w`，`\b`/`(?!\w)` 不生效，使用 `(?![a-zA-Z])` 替代。

### slice.md 格式—每篇论文

每篇论文对应一个 `## 论文演示 N` 板块，表格字段：

| 字段 | 说明 | 必填 |
|------|------|------|
| 标题 | 论文英文标题 | 是 |
| 作者 | 论文作者（如 "Y. Chen et al."） | 否，留空不显示 |
| 机构 | 机构名 | 推荐填写 |
| arXiv | arxiv 链接 | 推荐填写 |
| GitHub | GitHub 仓库链接 | 否，留空不显示 |
| 分类标签 | "计算机视觉"、"机器人"、"世界模型" 等 | 是 |
| 指标 | 可量化数据项，用 `·` 分隔多个 | 是，铁律见下 |
| 演示素材 | demo_N.mp4 | 是 |

**指标铁律**：必须有具体数字（百分比、分数、倍数、速度、参数量等）。论文摘要里的 leads all metrics、state-of-the-art 这类定性结论不算可量化指标。没有具体数字则指标列留空，该论文不收录。

### 选论文三阶段筛选

1. HF daily_papers 按 upvotes 排序
2. 检查 mediaUrls 有 mp4 视频
3. 验证可量化指标（无具体数字则不收录）

宁缺毋滥，指标列为空则整篇不收录。

## Pipeline 11 步骤详解

| 步骤 | 功能 |
|------|------|
| Step 1 | 读取 lines.md + slice.md 构建 paper_data。paper_data 结构：{id, title, authors, institution, arxiv, github, tag, demo_url, metrics[], narration}。authors 为空字符串则 PaperTitleCard 不显示作者行 |
| Step 2 | Edge TTS 生成播报音频。**每篇论文生成两个 TTS 片段**：①标题 TTS（论文标题朗读，混入 PaperTitleCard 场景）②演示 TTS（论文播报正文，混入 PaperDemo 场景）。标题 TTS 约 5s，演示 TTS 约 15-40s |
| Step 3 | 混流 demo 视频 + 演示 TTS 音频，用 -map 0:v:0 -map 1:a:0 -shortest |
| Step 4 | Remotion 渲染 **12 场景**（title → 5×[paperTitle + demo] → outro），bundle 一次复用 |
| Step 5 | 混流 Remotion 场景 + 对应 TTS，时长精确匹配（标题卡→标题 TTS, demo→演示 TTS） |
| Step 6 | concat 合并 12 场景，硬切不加过渡 |
| Step 7 | 混合 BGM，音量 0.12 |

**12 场景序列**：`title → paperTitle_0 → demo_0 → paperTitle_1 → demo_1 → ... → paperTitle_4 → demo_4 → outro`

**TTS 对应关系**：`tts[0]=开场 → tts[1]=标题0 → tts[2]=demo0 → tts[3]=标题1 → tts[4]=demo1 → tts[5]=标题2 → tts[6]=demo2 → tts[7]=标题3 → tts[8]=demo3 → tts[9]=标题4 → tts[10]=demo4 → tts[11]=结尾`
Demo TTS 索引计算公式：`tts_files[2 * i + 2]`（i 为论文序号 0-4）

## 关键设计决策

| 决策 | 说明 |
|------|------|
| 先预览再渲染 | UI 改动必须 node render-scene.mjs 单场景预览后再跑完整 pipeline |
| 所有路径自动推导 | common.py 的 SKILL_DIR 基于 __file__，不依赖本机路径 |
| 临时文件不过系统盘 | set TMP + set TEMP + && 重定向到项目 Temp/ |
| bundle 一次复用 | 11 场景共享同一次 bundle() 结果 |
| ffmpeg 线程限制 | 全部调用加 -threads 4 |
| 视频流拷贝 | mux_av 用 -c:v copy |
| 版本号自动递增 | 扫描 output/ 取最大 _vN +1 |
| zIndex 图层修复 | zIndex:10 确保叠加层在 Chromium Video 层之上 |
| 硬链接替代 copy2 | os.link 省磁盘 I/O |
| concat 硬切 | 不用 xfade（画质不稳定）|

## 动效与字体规范（Apple Design 风格）

完整的布局、字号、颜色数值见 `references/ui-components.md`，改 UI 前务必先查阅。

### 动画原则（结合 PaperTitleCard 与 TitleCard）
- PaperTitleCard 的动效必须**完全对标题页 TitleCard 对齐**：标签延迟淡入(frame 15-27)、主内容淡入+上滑(frame 0-20)、分隔线宽度展开(frame 0-30)、链接延迟展现(frame 25-37)。不要创造独立的新动画模式。**
- **拒绝单元素 opacity 0→1 淡入**（用户明确拒绝"变淡"效果），使用整卡级 exitOpacity 或 color light→deep 渐变（`lerpRGB()` 插值 RGB）。如果要用 opacity，起始值设 0.3→1.0（"逐渐变深"而非"淡入"）。
- PaperTitleCard 内容文字**直出无动画**（无 opacity 淡入、无 slide-up），仅通过整卡 `exitOpacity` 做最后 12→3 帧的出场淡出。不在每个元素上额外加 entrance 动画。
- 标题卡（TitleCard）与标题页（PaperTitleCard）整卡只有 `exitOpacity`，文字直出无动画。仅限于内容行采用 fade+slide 作为统一的"入场语言"（title, authors 等主要内容），标签、链接等辅助元素使用延迟淡入。
- ease-out 缓动用于所有插值。
- 标题页每周主题色（7 色调色板循环，weekNumber % 7 决定色调）。
- **拒绝**：translateX 滑入、装饰圆圈、xfade/fadewhite 过渡（画质不稳）。

### Demo 页（PaperDemoCard）布局
- **分类标签（左上）**：20px, padding 8×22, borderRadius 18, fontWeight 700, 蓝底#6366f1 白字，top:28 left:28
- **指标（右下）**：19px, padding 8×22, borderRadius 18, fontWeight 700, 蓝底#6366f1 白字, bottom:100 + i×40, right:28。已从左上（top:58 left:24, 13px）移动到右下。
- **论文标题（左下）**：28px(长标题>60字符) / 32px(短标题), fontWeight 700, 白字 + textShadow, 右边界留 280px 防与右下指标重叠
- **arXiv/GitHub 行**：18px, 颜色 #cbd5e1, 位于标题下方
- **底部渐变**：height 10%, rgba(10,10,26,0.85)

### 标题卡（PaperTitleCard）布局 — 插入每个 demo 前
- **标签**：20px, padding 8×22, borderRadius 18, 蓝底#6366f1 白字
- **论文标题**：36px(长>60字符) / 42px(短标题), 居中, maxWidth 1000, fontWeight 700
- **作者/机构**：20px, 灰色 (#64748b/#94a3b8), fontWeight 500, 居中
- **分隔线**：width 60, height 3, accent 渐变色
- **arXiv**：18px, 颜色 **#4f46e5**（深蓝醒目，不要淡色）, fontWeight 600
- **GitHub**：18px, 颜色 #64748b, fontWeight 500
- 两者水平居中，间距 14px，用 `·` 分隔
- **时长**：80 帧 (3.3s @24fps)
- **无单独淡入**：整卡只通过 exitOpacity 出场淡出

### 标题页（TitleCard）
- 主标题：64px, fade+slide 30px, ease-out cubic
- 日期：28px
- **分类标签**：20px, padding 8×22, borderRadius 18, 已从 13px 统一加大

### 结尾页（OutroCard）
- 文字：**40px**（已从 36px 加大）

## render-scene.mjs 场景配置

| 场景类型 | compositionId | 关键字段 | 说明 |
|---------|--------------|---------|------|
| title | title | title, dateRange, tags[], weekNumber | 开篇标题页，主题色 weekNumber 决定 |
| paperTitle | paperTitle | title, authors, institution, tag, arxiv, github, weekNumber | 论文标题卡，**必须传 weekNumber 保持主题色一致** |
| paperDemo | paperDemo | title, narration, tag, arxiv, github, metrics[], paperIndex, videoPath, demoDurationFrames | Demo 演示叠加层 |
| outro | outro | text | 结尾页 |

`paperTitle` 的 props mapper 已更新：传入 `data.authors`（数组或字符串）自动格式化为 "Author One et al."，机构从 `data.institution || data.organization` 读取。

## 先预览再渲染工作流（必须遵守）

对 UI 改动禁止直接跑完整 pipeline：

```bash
cd remotion_ainews
# 1. 写测试数据到 JSON
python -c "import json; json.dump(data, open('_tmp_data.json','w'))"
# 2. 单场景渲染
set TMP=..\Temp&&set TEMP=..\Temp&&node render-scene.mjs paperDemo _tmp_data.json watch.mp4
# 3. 抽帧确认
ffmpeg -y -ss 1 -i watch.mp4 -vframes 1 -q:v 2 -update 1 preview.jpg
```

## 动效规范（dev 分支实验后已合并到 main）

基于 Apple Design 原则的动效：

**已采纳**:
- ease-out 缓动替代线性 interpolate
- 指标渐进淡入（仅 opacity，用户拒绝 translateX 位移）
- 标题/arXiv/渐变统一 fade 节奏
- 标题自适应（超过60字符用 20px+3行，其余 22px+2行）
- 底部渐变 10%
- arXiv 颜色 cbd5e1
- 无装饰圆圈
- PepperPaper 延迟 25 帧后淡入（注意双 p 不是 PeperPaper）
- 指标放左上角 tag 下方
- 标题页每周主题色（7 色调色板循环）
- 标题页日期下方分类标签（蓝底白字主题色）

**用户拒绝**:
- translateX 滑入（太乱）
- 装饰圆圈（不必要）
- xfade/fadewhite 过渡（画质不稳定，长 chain 易出错）

## W30 新增优化

### 论文标题卡（PaperTitleCard）
- 每篇论文前插入独立标题卡场景，展示：标签 + 标题 + 作者/机构 + arXiv + GitHub
- 动画对标开篇 TitleCard：淡入+上滑30px/0-20帧，标签延迟15帧，分隔线宽度展开0-30帧，链接延迟25帧
- 每周主题色联动（THEMES 色板，weekNumber 决定色调）
- 时长由 `useVideoConfig().durationInFrames` 动态获取（修复硬编码 DUR 导致 TTS 未播完画面黑屏的 bug）

### 字体加大（W30 统一标准）
| 元素 | 旧值 | 新值 |
|------|------|------|
| 分类标签（PaperDemoCard） | 13px | **20px** |
| 分类标签（TitleCard） | 13px | **20px** |
| 指标 | 13px | **19px** |
| 论文标题（Demo覆盖层） | 20/22px | **28/32px** |
| arxiv/GitHub 行 | 14px | **18px** |
| PaperTitleCard 标题 | 36px | 36/42px（自适应） |
| OutroCard 文字 | 36px | **40px** |
| 标签 padding | 4×14 | **8×22** |

### 指标位置调整
- 从左上（tag 下方）移到 **右下**（bottom-right, right-aligned）
- 标题右边界从 200px 扩大到 **280px** 防重叠

### Pipeline 场景扩展
- 7 场景 → **12 场景**：标题 → 5×(标题卡 → demo) → 结尾
- 每篇论文生成 2 段 TTS：标题播报 + demo 播报
- TTS 索引：`2*i+1`=标题, `2*i+2`=demo

### TTS 标音规则（W30 实战总结）
见上方"播报文本风格"→"TTS 标音规则"表格。**原则**：lines.md 直接写中文读音，不依赖自动转换。

### Demo 视频兼容性
- **HEVC (H.265) 编码的视频**会导致 Remotion `<Video>` 超时渲染失败
- 修复：`ffmpeg -c:v libx264 -pix_fmt yuv420p` 转码后再渲染

## 常见问题

**指标不显示**: 查 Step 1 paper_data 的 metrics 是否硬编码空数组。先查那个再查 bundle 缓存——曾经在 `paper_data.append({"metrics": []})` 处硬编码空数组导致 4 个版本指标不可见，实际 Step 4 传 `paper.get("metrics", [])` 永远取不到。修复：改为 `"metrics": p.get("metrics", [])`。

**临时文件写满 C 盘**: 检查 remotion bundle outDir 是否用了 os.tmpdir。pipeline 已有 TMP/TEMP 重定向。

**TTS 报错**: Qwen3-TTS 返回 raw PCM 非 WAV。tts_qwen3 已内 PCM pipe 分支。

**Qwen3 TTS 服务未启动**: 改用 Edge TTS 后备方案——在 pipeline 中替换 `tts_qwen3` 为 `tts_generate`（使用 `python -m edge_tts` 模块）。在 pipeline 顶部导入 `edge_tts` + `asyncio`，用 `asyncio.new_event_loop().run_until_complete()` 调用 `edge_tts.Communicate(text, voice="zh-CN-XiaoxiaoNeural").save(out_path)`。

**PaperTitleCard 黑屏 Bug**: PaperTitleCard 的退出淡出必须使用 `useVideoConfig().durationInFrames`，不能用硬编码 `DUR=80`。否则当场景被 render-scene.mjs 设为更长帧数（如132帧）时，退出淡出提前完成导致剩下 N 帧全黑屏。

**HEVC 编码报错**: 如果 Remotion `<Video>` 组件渲染时报 `A delayRender() ... was called but not cleared after 28000ms`，检查 demo 视频是否为 HEVC/H.265 编码（`ffprobe -v error -show_entries stream=codec_name`）。Remotion 不支持 HEVC，需重新编码为 H.264：`ffmpeg -i input.mp4 -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 -c:a copy output.mp4`。编码后在 pipeline 的 Step 3 中使用 H.264 版本。

**PepperPaper 少个 p**: TitleCard.tsx 的 PeperPaper 必须写成 PepperPaper。

**GPU 项目编译**: pip 隔离环境不继承 CUDA_HOME 和 PATH。setup.py 内要显式设置。

**cuml 下载**: pypi.nvidia.com 被墙，代理不穿透 wheel_stub 下载器。替代方案是 sklearn KMeans。

## commit 纪律

git add -A 会包含测试产的 mp4、jpg、pipeline.md。commit 前 git status 确认只包含源码文件。如果测试文件意外进 commit，用 git rm --cached 清理。
