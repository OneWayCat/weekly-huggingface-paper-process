# 环境搭建指南（新手友好）

从零搭建论文视频生成环境。适用于 Windows + Linux，每一步都标注了注意事项。

---

## 一、系统要求

| 项目 | 最低要求 | 推荐 |
|------|---------|------|
| 操作系统 | Windows 10 / Ubuntu 20.04+ | Windows 10+ |
| Python | 3.10+ | 3.11 |
| Node.js | 18+ | 20 LTS |
| 磁盘空间 | 5GB（项目+依赖） | 10GB（留出视频输出空间）|
| C 盘空间 | Windows 注意：Remotion 临时文件默认写 C 盘，需配置到其他盘 | 至少 10GB 空闲 |
| GPU（可选） | 无（CPU 渲染可运行但慢） | 8GB+ VRAM 用于加速 |
| 内存 | 8GB | 16GB |
| ffmpeg | 6.0+（含 ffprobe） | 8.0+（从 gyan.dev 下载 full build）|

---

## 二、首次安装

### 2.1 克隆项目

```bash
git clone <你的仓库URL>
cd weekly-paper-process
```

### 2.2 安装 ffmpeg

**Windows：**
1. 访问 https://www.gyan.dev/ffmpeg/builds/
2. 下载 `ffmpeg-release-full.7z`
3. 解压到 `C:\ffmpeg`
4. 将 `C:\ffmpeg\bin` 加入系统 PATH
5. 验证：`ffmpeg -version` 和 `ffprobe -version` 都要成功

**Linux：**
```bash
sudo apt install ffmpeg
ffmpeg -version
```

### 2.3 安装 Node.js 和 Remotion 依赖

```bash
# 安装 Node.js 20 LTS（推荐用 nvm 管理版本）
# Windows: 从 https://nodejs.org 下载安装包
# Linux:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证
node --version  # 应显示 v20.x
npm --version

# 安装 Remotion 依赖
cd remotion_ainews
npm install
# 如果网络慢或用镜像：npm config set registry https://registry.npmmirror.com
# 如果 peer dep 冲突：npm install --legacy-peer-deps
```

`npm install` 会安装 `@remotion/bundler`、`@remotion/renderer`、React、TypeScript 等。安装过程约 2-5 分钟。成功后会生成 `node_modules/` 目录。

### 2.4 Python 环境

项目 Python 代码只用标准库，**理论上无需额外 pip 包**。但推荐用 conda 管理环境：

```bash
# 安装 Miniconda（如没有）
# Windows: 从 https://docs.conda.io/en/latest/miniconda.html 下载
# Linux:
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh

# 创建环境
conda create -n weekly-paper python=3.11 -y
conda activate weekly-paper
python --version  # 确认 3.11.x
```

### 2.5 一键验证

```bash
cd weekly-paper-process
python -c "
import sys, subprocess
# ffmpeg
r = subprocess.run(['ffmpeg', '-version'], capture_output=True)
print(f'ffmpeg: {\"OK\" if r.returncode==0 else \"MISSING\"}')
r = subprocess.run(['ffprobe', '-version'], capture_output=True)
print(f'ffprobe: {\"OK\" if r.returncode==0 else \"MISSING\"}')
# Node
r = subprocess.run(['node', '--version'], capture_output=True, text=True)
print(f'Node: {r.stdout.strip() if r.returncode==0 else \"MISSING\"}')
# Python
print(f'Python: {sys.version.split()[0]}')
"
```

全部显示 OK 即可。

---

## 三、运行首次渲染

### 3.1 准备 demo 视频

项目已提供 2026 Week 28 的 demo 视频在 `output/2026Week28/demos/`。如果为空，需要手动下载：

```bash
# 国内需设置代理
export HTTP_PROXY=http://127.0.0.1:7897
export HTTPS_PROXY=http://127.0.0.1:7897

# 用 Python 下载 HF daily_papers 的 mediaUrls
python -c "
import json, urllib.request, os
# 示例：下载第一篇论文的 demo 视频
url = 'https://cdn-uploads.huggingface.co/production/uploads/xxxx/demo.mp4'
dest = 'output/2026Week28/demos/demo_0.mp4'
urllib.request.urlretrieve(url, dest)
"
```

### 3.2 配置 TTS（二选一）

**选项 A：跳过 TTS（静音视频）**

直接在 `lines.md` 里放空白占位，pipeline 会走通但没有旁白。

**选项 B：Qwen3 TTS（推荐，需 8GB+ VRAM GPU）**

```bash
# 独立 conda 环境
conda create -n qwen3-tts python=3.10 -y
conda activate qwen3-tts
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install fastapi uvicorn soundfile

# 下载 Qwen3 TTS 模型权重（约 2GB）
# 然后启动服务
cd G:/VoiceAI  # 或你的部署路径
python server.py
# 服务运行在 http://127.0.0.1:8765
# 返回 Content-Type: audio/pcm（raw 16-bit PCM, 24kHz）
```

**选项 C：Edge TTS（CPU 可运行，不需要 GPU）**

```bash
pip install edge-tts
# 修改 common.py 的 tts_qwen3 调用为 tts_edge
```

### 3.3 运行 pipeline

```bash
conda activate weekly-paper
cd weekly-paper-process

# 完整渲染
python scripts/weekly_paper_pipeline.py output/2026Week28/lines.md

# 输出在 output/2026Week28/weekly_papers_2026_W28_vN.mp4
# vN 会自动递增（v1→v2→...），不会覆盖旧文件
```

首次运行流程：
1. Step 1: 复制 demo 视频 → 瞬间
2. Step 2: TTS 生成（如有服务）→ 每段 3-6 秒，共约 30-40 秒
3. Step 3: 混流 demo+TTS → 每篇约 5-15 秒
4. Step 4: **Remotion 渲染（最耗时）** → bundle 首次 ~60 秒，7 场景各 30-60 秒
5. Step 5: Mux Title/Outro → 约 10 秒
6. Step 6: Concat → 约 10 秒
7. Step 7: BGM → 约 5 秒
总计约 **5-8 分钟**（首次）。后续版本由于 bundle 复用约 3-5 分钟。

---

## 四、Windows 特有配置

### 4.1 终端选择

**必须用 git-bash**（或 MSYS2），不支持 PowerShell 和 cmd。
- 下载：https://git-scm.com/downloads
- 安装时勾选 「Git Bash Here」
- 项目路径建议放 G 盘（或其他非 C 盘）避免空间问题

### 4.2 C 盘空间保护

Remotion 的 `bundle()` 默认写 `C:\Users\用户名\AppData\Local\Temp\remotion-webpack-bundle-*`。
本项目已通过 pipeline 的 `render_remotion()` 函数中的 `set TMP=G:\...\Temp` 覆盖。

如需修改临时目录：
- 改 `common.py` 的 `TEMP_DIR` 变量
- 改 `weekly_paper_pipeline.py` 的 `render_remotion()` 中 `set TMP=...` 路径

### 4.3 科学上网（国内用户——必须配置）

HuggingFace CDN（`cdn-uploads.huggingface.co`）、网易云音乐 API、arXiv 都被 DNS 污染或封锁。

**方案：Clash 等代理工具**

1. 启动 Clash，开启「允许局域网连接」
2. 默认端口 `127.0.0.1:7897`（HTTP 代理）
3. 验证：
```bash
curl -x http://127.0.0.1:7897 -s -o /dev/null -w "%{http_code}" https://www.google.com
# 应该返回 200
```

**代码中自动使用代理：**

`common.py` 的 `get_proxy()` 会读取 `HTTP_PROXY` / `HTTPS_PROXY` 环境变量。如果没设：

```bash
# 终端设置
export HTTP_PROXY=http://127.0.0.1:7897
export HTTPS_PROXY=http://127.0.0.1:7897

# 或直接在 common.py 硬编码（不推荐，但快速）
proxy = urllib.request.ProxyHandler({"http": "http://127.0.0.1:7897", "https": "http://127.0.0.1:7897"})
opener = urllib.request.build_opener(proxy)
```

**注意**：Remotion 的 npm install 也需要代理：
```bash
npm config set proxy http://127.0.0.1:7897
npm config set https-proxy http://127.0.0.1:7897
```

---

## 五、自定义内容

### 5.1 换论文

编辑两个文件：
- `output/2026WeekWW/lines.md` — 播报文本（按 ## 论文 N 分节）
- `output/2026WeekWW/slice.md` — 显示素材表格

slice.md 格式：
```markdown
## 论文演示 1

| 项目 | 内容 |
|------|------|
| 标题 | 论文标题 |
| 机构 | 机构名 |
| arXiv | https://arxiv.org/abs/xxxx.xxxxx |
| GitHub | （留空不显示）|
| 分类标签 | 计算机视觉 |
| 指标 | 要显示的数字 · 用间隔号分隔 |
| 演示素材 | demo_0.mp4 |
```

### 5.2 换 BGM

直接替换 `assets/bgm_struggle.mp3` 即可。pipeline 读的是固定路径，不需要改代码。

从网易云音乐下载（需要代理和音乐 ID）：
```python
import urllib.request, json

proxy = urllib.request.ProxyHandler({'http': 'http://127.0.0.1:7897', 'https': 'http://127.0.0.1:7897'})
opener = urllib.request.build_opener(proxy)

# 用歌曲 ID 获取下载地址
id = 1498098628  # Destined for Greatness
url = f'https://music.163.com/api/song/enhance/player/url?id={id}&ids=%5B{id}%5D&br=128000'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://music.163.com/'})
data = json.loads(opener.open(req, timeout=15).read())
dl_url = data['data'][0]['url']

# 下载
req2 = urllib.request.Request(dl_url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://music.163.com/'})
audio = opener.open(req2, timeout=60).read()
with open('assets/bgm_struggle.mp3', 'wb') as f:
    f.write(audio)
```

---

## 六、目录结构（完整）

```
weekly-paper-process/
├── assets/                     # 资源文件
│   ├── bgm_struggle.mp3       # BGM（替换即换音乐）
│   └── logos/                  # 机构 logo（备用）
├── output/                     # 输出（.gitignore 忽略）
│   └── 2026Week28/
│       ├── lines.md           # 播报文本
│       ├── slice.md           # 显示素材
│       ├── demos/             # demo 视频（.gitignore 忽略）
│       └── weekly_papers_...  # 成品 MP4
├── remotion_ainews/           # Remotion 渲染项目
│   ├── src/                   # React 组件
│   │   ├── Root.tsx           # Composition 注册
│   │   ├── PaperDemoCard.tsx  # Demo 页叠加层
│   │   ├── TitleCard.tsx      # 标题页
│   │   ├── OutroCard.tsx      # 结尾页
│   │   └── style.ts           # 颜色/字体常量
│   ├── render-scene.mjs       # Node 渲染入口
│   ├── package.json
│   └── public/videos/         # voiced 视频（自动生成）
├── scripts/
│   └── weekly_paper_pipeline.py  # 主 pipeline
├── common.py                  # 共享工具函数
├── Temp/                      # 临时文件（.gitignore 忽略）
├── references/                # 参考文档
│   ├── setup-requirements.md  # 本文件
│   ├── qwen3-tts-pcm-compat.md
│   ├── resource-control.md
│   └── ...
└── SKILL.md                   # 完整文档
```

---

## 七、常见故障

| 症状 | 原因 | 修复 |
|------|------|------|
| `ffprobe: command not found` | ffmpeg 没安装或 PATH 没配 | 安装 ffmpeg 并确认 `ffprobe` 也在 PATH |
| `ENOSPC: no space left on device` | C 盘写满了 `remotion-webpack-bundle` | 确保 cmd 中设了 `set TMP=G:\Temp` 指向非 C 盘 |
| `ValueError: could not convert string to float` | TTS 返回 raw PCM 但代码当 WAV 写入 | 更新 `common.py` 的 `tts_qwen3()` 含 PCM 检测和 pipe 转换 |
| `Error: Cannot find module '@remotion/bundler'` | 没跑 `npm install` | 进 `remotion_ainews/` 执行 `npm install` |
| 视频没有声音 | TTS 服务没启动或 mux 参数不对 | 检查 TTS 服务，检查 `-map 0:v:0 -map 1:a:0` |
| 右下角指标不显示 | 图层被 `<Video>` 盖住 / bundle 缓存 | 加 `zIndex: 10`，清 `node_modules/.cache` |
| `.tsx` 改了但渲染没变 | Webpack bundle 缓存 | 清 `remotion_ainews/node_modules/.cache` + C 盘 `%TEMP%/remotion-webpack-bundle-*` |
