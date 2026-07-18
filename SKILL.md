---
name: weekly-paper-process
description: 每周 HuggingFace 论文速览视频生成。从 lines.md(播报文本) + slice.md(显示素材) 读取数据，Qwen3-TTS 播报，Remotion 渲染叠加层，ffmpeg 混流合成，输出 1080p 视频。
---

# Weekly Paper Process

每周从 HuggingFace `daily_papers` 精选 5 篇论文，生成 3 分钟速览视频。
7 场景线性流程：标题 → 5×demo → 结尾，无过渡黑帧，白底设计。

## 快速开始

### 环境要求

| 依赖 | 最低版本 | 说明 |
|------|---------|------|
| Node.js | 18+ | Remotion 渲染引擎 |
| ffmpeg | 6+ | 视频处理（需含 libx264、libmp3lame） |
| Python | 3.10+ | Pipeline 脚本 |
| TTS 服务 | — | Qwen3-TTS 或 Edge TTS |

### 路径约定

所有路径基于 `common.py` 的 `SKILL_DIR` 自动推导（`os.path.dirname(os.path.abspath(__file__))`），**无需手动配置**：

```
项目根目录
├── scripts/             → Pipeline 脚本
├── remotion_ainews/     → Remotion 项目
├── output/              → 视频输出（每周自动创建 YYYYWeekWW 子目录）
│   └── YYYYWeekWW/
│       ├── lines.md     ← 播报文本（用户编写）
│       ├── slice.md     ← 显示素材（用户编写）
│       ├── demos/       ← demo 视频（用户准备）
│       └── weekly_papers_YYYY_WWW_vN.mp4  ← 最终输出
├── assets/
│   └── bgm_struggle.mp3 → BGM 文件（用户自备，.gitignore）
└── Temp/                → 运行时临时文件（.gitignore，自动清理）
```

**版本号**：`_vN` 自动递增（扫描 `output/` 目录中最大 `_vN` 后缀 +1），不覆盖旧文件。

### 安装

```bash
cd remotion_ainews
npm install
# 确认 ffmpeg 可用
ffmpeg -version
```

### TTS 配置（二选一）

**A. Edge TTS（免费，无 GPU）** — 通过 HTTP bridge 的 `/api/tts` 端点：
```python
# common.py 中将 tts_qwen3 调用替换为 tts_edge
tts_edge(text, path)
```

**B. Qwen3-TTS（需要 GPU，音质好）** — 独立服务：
```bash
cd /path/to/VoiceAI && python server.py
# 监听 http://127.0.0.1:8765
```
注意：服务返回 `audio/pcm`（raw s16le 24kHz）而非 WAV，`tts_qwen3()` 内通过 ffmpeg `pipe:0` 自动转换。

### 首次运行

```bash
# 1. 编写本周内容
#    output/YYYYWeekWW/lines.md（播报文本）
#    output/YYYYWeekWW/slice.md（显示素材）

# 2. 放入 demo 视频
#    output/YYYYWeekWW/demos/demo_0.mp4 … demo_4.mp4

# 3. 确保 TTS 服务在运行

# 4. 执行
python scripts/weekly_paper_pipeline.py output/YYYYWeekWW/lines.md
```

## 项目结构

```
weekly-paper-process/
├── scripts/
│   └── weekly_paper_pipeline.py   # 主 Pipeline（7 步流程）
├── remotion_ainews/                # Remotion 4.0 项目
│   ├── src/
│   │   ├── Root.tsx               # Composition 注册
│   │   ├── TitleCard.tsx          # 标题页
│   │   ├── PaperDemoCard.tsx      # Demo 演示页（视频+叠加层）
│   │   ├── OutroCard.tsx          # 结尾页
│   │   └── style.ts              # 全局样式/颜色
│   ├── render-scene.mjs           # 独立场景渲染器（CLI）
│   └── package.json
├── common.py                      # 共享工具（路径/TTS/ffmpeg）
├── output/                        # 输出目录（.gitignore）
├── assets/
│   └── bgm_struggle.mp3           # BGM（用户自备）
└── Temp/                          # 运行时缓存（.gitignore）
```

> 注：`PaperTitleCard.tsx` 存在于 `src/` 但当前 7 场景流水线不使用它（标题→5×demo→结尾已合并），保留供扩展。

## Pipeline 7 步骤

| 步骤 | 操作 | 资源瓶颈 | 优化说明 |
|------|------|---------|---------|
| Step 1 | 读取 lines.md + slice.md，复制 demo | 磁盘 ~70MB 读 | — |
| Step 2 | Qwen3-TTS 生成 7 段 MP3 | 网络/GPU 首次加载 10-15s | 每段串行 |
| Step 3 | ffmpeg 混流 demo+TTS | CPU 4线程 | 流拷贝 `-c:v copy`（TTS≤视频时）；硬链接 `os.link()` 避免冗余 copy2 |
| Step 4 | Remotion 渲染 7 场景 | **GPU 高** / 内存 ~2GB | bundle 一次复用 7 次；`zIndex:10` 避免 `<Video>` 层遮挡叠加层 |
| Step 5 | Mux Title/Outro 音轨 | CPU 低 | `-c:v copy` 不重编码视频 |
| Step 6 | Concat 7 段 | CPU 中 | 跳过 per-file 预编码；`-b:v 8M` |
| Step 7 | 混 BGM | CPU 低 | `volume=0.12` |

### 硬性资源约束

1. **ffmpeg 全部加 `-threads 4`** — 通过 `FFMPEG_THREADS` 环境变量控制
2. **Remotion bundle 禁止写系统盘** — 必须在 cmd 开头 `set TMP={Temp}&&set TEMP={Temp}&&`
3. **bundle 只调一次** — `render_remotion()` 从 stderr 提取 bundle 路径，后续 scene 复用
4. **Step 3 用硬链接** — `os.link()` 替代 `shutil.copy2()`，同盘省 ~70MB I/O

## 数据文件格式

### lines.md（播报文本）

```markdown
## 开场
欢迎收看HuggingFace一周论文速览…

## 论文 1
第一段的解说词，口语化，100-150字…

## 结尾
以上是本周论文精选，我们下期再见。
```

**TTS 发音标音**：在 lines.md 中直接写标音（`normalize_tts()` 处理不了年份和连接符）：
```
ECCV 2026 → ECCV二零二六
SOTA → SOTA索塔
1920×1080 → 一九二零×一零八零
73FPS → 保持原样
```

### slice.md（显示素材）

```markdown
## 论文演示 1

| 项目 | 内容 |
|------|------|
| 标题 | Video Generation Models are General-Purpose Vision Learners |
| 机构 | Google DeepMind |
| arXiv | https://arxiv.org/abs/2607.09024 |
| GitHub | https://github.com/xxx（没有则留空） |
| 分类标签 | 计算机视觉 |
| 指标 | 7-500×更少数据 · ECCV 2026 |
| 演示素材 | demo_0.mp4 |
```

**指标列铁律**：必须有可量化数字（百分比/分数/倍数/FPS/参数量），用 `·` 分隔。没有具体数字 → 不收录该论文。

## 颜色系统

```css
背景:         #ffffff
渐变:         #f8fafc → #f1f5f9
主文字:       #1a1a2e
次要文字:     #64748b
强调:         #6366f1 → #818cf8
标签/指标:    bg=#6366f1, text=#ffffff, borderRadius=14, fontSize=13, fontWeight=600
arxiv/GitHub: #94a3b8, 14px
```

## BGM

文件 `assets/bgm_struggle.mp3`（pipeline 读此固定路径，.gitignore 排除不上传）。
用户自备免版税 MP3，建议 2-5 分钟。音量 `volume=0.12`（`mix_bgm()` 可调）。

## 调试指南

### 指标不显示的经典排查

遍历了 15 个版本才根除的 bug，直接给 checklist：

```python
# [1] parse_slice_md 是否解析了"指标"键？
# 在 pipeline.py 的 parse_slice_md() 中必须有：
elif key == "指标":
    current["metrics"] = [m.strip() for m in val.split("·")]

# [2] paper_data 构建时 metrics 是否来自 p？
# 在 run_render() Step 1 中：
"metrics": p.get("metrics", []),     # ✅ 正确
"metrics": [],                        # ❌ 写死空数组——元凶！

# [3] Step 4 传参是否正确？
"metrics": paper.get("metrics", []),  # 必须用 paper_data 中的 metrics

# [4] PaperDemoCard.tsx 中 z-index 足够？
zIndex: 10,  # Chromium <Video> 层默认在叠加层之上
```

### Remotion bundle 缓存问题

`.tsx` 修改后渲染没变化 → 清缓存：
```bash
rm -rf remotion_ainews/node_modules/.cache
# Windows 下还需清理系统盘：
rm -rf /c/Users/*/AppData/Local/Temp/remotion-webpack-bundle-*
```

### TTS 问题

| 症状 | 原因 | 解决 |
|------|------|------|
| `ValueError` / `'N/A'` | Qwen3 返回 PCM 而非 WAV | `tts_qwen3()` 已自动处理，查服务是否正常 |
| `RuntimeError: ffmpeg PCM→MP3 failed` | ffmpeg 缺 `libmp3lame` | 换 gyan.dev 构建或 `-c:a aac` |
| 首次 TTS 调用慢（10-15s） | 模型加载到 GPU | 正常现象 |
