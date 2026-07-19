---
name: weekly-paper-process
description: 每周 HuggingFace 论文速览视频生成。从 lines.md + slice.md 读取数据，Qwen3-TTS 播报，Remotion 渲染叠加层，ffmpeg 混流合成，输出 1080p 视频。项目已开源至 GitHub。
---

# Weekly Paper Process

每周 HuggingFace 论文速览视频生成。7 场景线性流程：标题 → 5×demo → 结尾。
**白底 + Remotion 渲染叠加层 + ffmpeg 混流。**

## 项目仓库

完整代码、完整文档、故障排查指南全部在 GitHub：

**https://github.com/OneWayCat/weekly-huggingface-paper-process**

`SKILL.md` 包含：
- 环境要求与一键安装
- 路径约定（全部基于 `common.py` 自动推导，无需手动配置）
- BGM 说明
- 数据文件（lines.md / slice.md）格式
- Pipeline 7 步骤详解
- 颜色系统
- 常见问题排查（C 盘爆满、指标不显示、TTS 失败、缓存问题等）
- 调试 checklist（`metrics` 写死空数组的 15 版本 debug 经验）

**两条分支：**
- `main` — 生产稳定版
- `dev` — Apple Design 启发的动效实验

## Reference 文档

本技能附带以下参考文档（`references/` 目录）：

| 文件 | 用途 |
|------|------|
| `setup-requirements.md` | 环境安装参考（ffmpeg/Node/Python/TTS） |

## 快速使用

```bash
git clone https://github.com/OneWayCat/weekly-huggingface-paper-process.git
cd weekly-huggingface-paper-process
cd remotion_ainews && npm install

# 编辑 output/YYYYWeekWW/lines.md 和 slice.md
# 放入 demo 视频到 output/YYYYWeekWW/demos/
# 启动 TTS 服务

python scripts/weekly_paper_pipeline.py output/YYYYWeekWW/lines.md
```

## 关键设计决策

| 决策 | 说明 |
|------|------|
| 所有路径自动推导 | `common.py` 的 `SKILL_DIR` 基于 `__file__`，不依赖任何本机路径 |
| 临时文件不过系统盘 | `set TMP=...&&set TEMP=...&&` 重定向到项目 `Temp/`，避免 C 盘写满 |
| bundle 一次复用 | 7 场景共享同一次 `bundle()` 结果，不重复打包 |
| ffmpeg 线程限制 | 全部调用加 `-threads 4`，不抢 CPU |
| 视频流拷贝 | `mux_av()` 用 `-c:v copy` 避免不必要重编码 |
| 版本号自动递增 | 扫描 `output/` 目录取最大 `_vN` +1，不覆盖旧文件 |
| `<Video>` 层遮盖 | `zIndex: 10` 确保所有叠加层在 Chromium 视频层之上 |
| 硬链接替代 copy2 | `os.link()` 省磁盘 I/O（同盘生效） |

## 动效规范（dev 分支实验）

基于 Apple Design 原则的动效已在 `dev` 分支实验：

- **ease-out 缓动**：所有 `interpolate()` 使用 `Easing.out(Easing.cubic)` 替代默认线性，模拟 spring settle
- **指标渐进淡入**：每个指标延迟 4 帧依次出现（仅 opacity，无位移）
- **标题/arXiv/渐变统一 fade**：底部渐变 → 指标 → 标题 + arXiv 按顺序淡入，节奏一致
- **标题自适应**：`>60字符` 用 20px+3行，其余 22px+2行
- **底部渐变高度**：10%（从 15% 调低）
- **arXiv 颜色**：`#cbd5e1`（slate-300），比主标题暗一个层级
- **无装饰元素**：标题页去掉装饰圆圈，只保留渐变背景+标题+日期
- **PeperPaper 延迟淡入**：延迟 25 帧后 10 帧淡入完成

### 标题页每周主题色

`TitleCard.tsx` 内置 7 色调色板，通过 `weekNumber` 参数循环切换。每期标题页的渐变背景、强调线、装饰圆点、tag 标签颜色都跟随主题色变化。pipeline 自动传入 `weekNumber`。

### 标题页论文分类标签

标题页日期下方显示本期论文的分类标签（蓝底白字，与主题色同色），从各篇论文的 `tag` 字段去重后渲染。标签在标题稳定后（延迟 15 帧）渐入。宽度不够时自动换行。

## 故障排查增补

### 指标数据显示在 Python 但不在渲染中

| 排查层 | 检查点 | 修复 |
|--------|--------|------|
| 1. `parse_slice_md()` | `slice.md` 的 `指标` 行格式 | 用 `·` 分隔多个指标 |
| 2. `paper_data` 构建 | `"metrics": p.get("metrics", [])` 而非 `"metrics": []` | 这是 W28 实际 bug 根因——Step 1 硬编码空数组，无论 parse 多正确都没用 |
| 3. `render_remotion()` 传参 | `paper.get("metrics", [])` | 确认从 `paper_data` 取值 |
| 4. render-scene.mjs mapper | `data.metrics \|\| []` | 确认通过 inputPropsMapper |
| 5. PaperDemoCard 渲染 | `zIndex: 10` + 位置不被渐变遮住 | 右上角放不下时改左上角 tag 下方 |
