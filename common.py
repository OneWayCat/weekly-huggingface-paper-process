"""
common.py — Shared utilities for weekly-paper-process skills.
All paths relative to skill root (auto-detected).
"""
import os, sys, json, subprocess, re, urllib.request, base64, shutil
from datetime import datetime, timedelta

SKILL_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPTS_DIR = os.path.join(SKILL_DIR, "scripts")
OUTPUT_DIR = os.path.join(SKILL_DIR, "output")
TEMP_DIR = os.path.join(SKILL_DIR, "Temp")
ASSETS_DIR = os.path.join(SKILL_DIR, "assets")
BGM_PATH = os.path.join(ASSETS_DIR, "bgm_struggle.mp3")
LOGO_DIR = os.path.join(ASSETS_DIR, "logos")
REMOTION_DIR = os.path.join(SKILL_DIR, "remotion_ainews")

FPS = 24

# ── Path helpers ──

def get_output_subdir():
    """Create and return output/YYYYWeekWW/"""
    now = datetime.now()
    year = now.strftime("%Y")
    week = now.strftime("%W").zfill(2)
    sub = os.path.join(OUTPUT_DIR, f"{year}Week{week}")
    os.makedirs(sub, exist_ok=True)
    return sub

def ensure_dirs():
    """Ensure all required directories exist"""
    for d in [SCRIPTS_DIR, OUTPUT_DIR, TEMP_DIR, ASSETS_DIR, LOGO_DIR, REMOTION_DIR]:
        os.makedirs(d, exist_ok=True)

# ── Dependency check ──

def check_dependencies():
    """Verify ffmpeg/ffprobe exist. Return list of warnings."""
    warnings = []
    for cmd in ["ffmpeg", "ffprobe"]:
        r = subprocess.run(["where", cmd], capture_output=True, text=True)
        if r.returncode != 0:
            warnings.append(f"{cmd} not found in PATH")
    return warnings

# ── Proxy ──

def get_proxy():
    """Read proxy from env, or None"""
    return (os.environ.get("HTTP_PROXY") or os.environ.get("https_proxy") or
            os.environ.get("http_proxy") or None)

def get_proxy_opener():
    """Return an opener with proxy if set"""
    proxy = get_proxy()
    if proxy:
        handler = urllib.request.ProxyHandler({"http": proxy, "https": proxy})
        return urllib.request.build_opener(handler)
    return urllib.request.build_opener()

# ── TTS ──

def tts_edge(text, out_path, voice="zh-CN-XiaoxiaoNeural"):
    """Edge TTS via bridge"""
    body = json.dumps({"text": text, "voice": voice}).encode("utf-8")
    req = urllib.request.Request("http://127.0.0.1:19876/api/tts",
        data=body, headers={"Content-Type": "application/json; charset=utf-8"})
    r = json.loads(urllib.request.urlopen(req, timeout=60).read())
    with open(out_path, "wb") as f:
        f.write(base64.b64decode(r["audio"]))
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", out_path],
        capture_output=True, text=True).stdout.strip())
    return dur

def tts_qwen3(text, out_path):
    """Qwen3-TTS via Eliza voice — handles both PCM and WAV responses."""
    body = json.dumps({"model": "tts-1", "input": text, "voice": "default",
        "response_format": "wav"}).encode("utf-8")
    req = urllib.request.Request("http://127.0.0.1:8765/v1/audio/speech",
        data=body, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req, timeout=120)
    data = resp.read()
    ct = resp.headers.get("Content-Type", "")
    # If server returns raw PCM instead of WAV, convert to WAV via ffmpeg
    if "pcm" in ct:
        # Use ffmpeg to convert raw PCM directly to MP3
        r = subprocess.run(["ffmpeg", "-y", "-f", "s16le", "-ar", "24000", "-ac", "1",
            "-i", "pipe:0", "-c:a", "libmp3lame", "-b:a", "128k", out_path],
            input=data, capture_output=True, timeout=30)
        if r.returncode != 0:
            raise RuntimeError(f"ffmpeg PCM→MP3 failed: {r.stderr.decode(errors='replace')[:200]}")
    else:
        with open(out_path, "wb") as f:
            f.write(data)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", out_path],
        capture_output=True, text=True).stdout.strip())
    return dur

# ── Number to Chinese ──

DIGIT_CN = ["零","一","二","三","四","五","六","七","八","九"]

def _digit_cn(d):
    return DIGIT_CN[d]

def _num_to_cn(n):
    if isinstance(n, float):
        if n == int(n):
            n = int(n)
        else:
            ip = int(n)
            dp = str(n).split('.')[1]
            return _num_to_cn(ip) + "点" + "".join(_digit_cn(int(d)) for d in dp)
    if n == 0:
        return "零"
    units = ["","十","百","千","万","十万","百万","千万","亿","十亿"]
    digits = list(str(n))
    result = []
    for i, d in enumerate(reversed(digits)):
        di = int(d)
        if di == 0:
            continue
        if i < len(units):
            result.append(units[i])
        result.append(_digit_cn(di))
    result.reverse()
    s = "".join(result)
    if s.startswith("一十"):
        s = s[1:]
    return s

def normalize_tts(text):
    """Normalize numbers and units for TTS"""
    text = re.sub(r'(\d+)%', lambda m: '百分之' + _num_to_cn(int(m.group(1))), text)
    text = re.sub(r'(\d+)B', lambda m: _num_to_cn(int(m.group(1))*10) + "亿", text)
    text = re.sub(r'(\d+)M', lambda m: _num_to_cn(int(m.group(1))) + "百万", text)
    text = re.sub(r'\$(\d+\.?\d*)', lambda m: _num_to_cn(float(m.group(1))) + "美元", text)
    text = re.sub(r'1/(\d+)', lambda m: _num_to_cn(int(m.group(1))) + "分之一", text)
    text = re.sub(r'(\d+\.\d+)', lambda m: _num_to_cn(float(m.group(1))), text)
    text = re.sub(r'(\d+)([\u4e00-\u9fff])', lambda m: _num_to_cn(int(m.group(1))) + m.group(2), text)
    replacements = {
        'GitHub Star': 'GitHub 星标',
        'NVIDIA': '英伟达',
        'Meta': 'Meta',
        'LLM': '大语言模型',
        'API': 'API',
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text

# ── ffmpeg helpers ──

def mux_av(video, audio, output):
    """Mux video + audio — stream copy video, only encode audio. Threads limited."""
    subprocess.run(["ffmpeg", "-y", "-threads", "4", "-i", video, "-i", audio,
        "-c:v", "copy",  # no video re-encode
        "-c:a", "aac", "-b:a", "128k",
        "-map", "0:v:0", "-map", "1:a:0", "-shortest", output], capture_output=True)

def concat_videos(files, output):
    """Concatenate multiple video files. All scene files are already 24fps H.264 1080p from Remotion."""
    n = len(files)
    if n == 0:
        return
    if n == 1 and os.path.exists(files[0]):
        shutil.copy2(files[0], output)
        return
    inputs = []
    for f in files:
        inputs.extend(["-i", f])
    fp = "".join(f"[{i}:v][{i}:a]" for i in range(n))
    subprocess.run(["ffmpeg", "-y", "-threads", "4"] + inputs +
        ["-filter_complex", f"{fp}concat=n={n}:v=1:a=1[ov][oa]",
         "-map", "[ov]", "-map", "[oa]",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-b:v", "8M",
         "-c:a", "aac", "-b:a", "128k", output], capture_output=True)

def mix_bgm(video, bgm, output, volume=0.12):
    """Mix background music into video"""
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", video],
        capture_output=True, text=True).stdout.strip())
    bgm_dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", bgm],
        capture_output=True, text=True).stdout.strip())
    bgm_loop = video.replace(".mp4", "_bgm.wav")
    lc = int(dur / bgm_dur) + 2
    subprocess.run(["ffmpeg", "-y", "-threads", "4", "-stream_loop", str(lc), "-i", bgm, "-t", str(dur + 2),
        "-af", f"volume={volume},afade=t=in:d=1.5,afade=t=out:st={dur-1}:d=2",
        "-c:a", "pcm_s16le", bgm_loop], capture_output=True)
    subprocess.run(["ffmpeg", "-y", "-threads", "4", "-i", video, "-i", bgm_loop,
        "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2[out]",
        "-map", "0:v", "-map", "[out]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", output],
        capture_output=True)
    if os.path.exists(bgm_loop):
        os.remove(bgm_loop)

def extract_frames(video_path, frames_dir, fps=24, max_seconds=30):
    """Extract frames as PNG sequence (max 30s, scale 4K→1080p to avoid freezing)"""
    os.makedirs(frames_dir, exist_ok=True)
    # Check if video is 4K (width > 1920), if so scale down first
    import subprocess as _sp
    info = _sp.run(["ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width", "-of", "default=noprint_wrappers=1:nokey=1",
        video_path], capture_output=True, text=True)
    width_str = info.stdout.strip()
    scale_filter = f"fps={fps},scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2"
    if width_str and width_str.isdigit() and int(width_str) > 1920:
        # 4K: use 2 threads to avoid freezing
        _sp.run(["ffmpeg", "-y", "-threads", "2", "-i", video_path, "-t", str(max_seconds),
            "-vf", scale_filter, "-threads", "2",
            os.path.join(frames_dir, "frame_%04d.png")], capture_output=True)
    else:
        # Normal video: use limited threads
        _sp.run(["ffmpeg", "-y", "-threads", "4", "-i", video_path, "-t", str(max_seconds),
            "-vf", scale_filter,
            os.path.join(frames_dir, "frame_%04d.png")], capture_output=True)
    count = len([f for f in os.listdir(frames_dir) if f.endswith(".png")])
    return count

def download_file(url, output_path, proxy=None):
    """Download file with retry"""
    if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
        return True
    opener = get_proxy_opener() if proxy is None else urllib.request.build_opener(
        urllib.request.ProxyHandler({"http": proxy, "https": proxy}))
    for attempt in range(3):
        try:
            data = opener.open(urllib.request.Request(url,
                headers={"User-Agent": "Mozilla/5.0", "Referer": "https://huggingface.co/"}),
                timeout=120).read()
            with open(output_path, "wb") as f:
                f.write(data)
            if os.path.getsize(output_path) > 1000:
                return True
        except Exception as e:
            if attempt < 2:
                import time
                time.sleep(5)
    return False

def get_week_date_range():
    """Return Monday-Friday date strings"""
    today = datetime.now()
    monday = today - timedelta(days=today.weekday())
    friday = monday + timedelta(days=4)
    return monday.strftime("%Y.%#m.%#d"), friday.strftime("%Y.%#m.%#d")

def get_week_number():
    """Return ISO week number"""
    return datetime.now().strftime("%W").zfill(2)

# ── arXiv / Paper tag helpers ──

ARXIV_CATEGORY_MAP = {
    "cs.CV": "计算机视觉", "cs.CL": "自然语言处理",
    "cs.LG": "机器学习", "stat.ML": "机器学习",
    "cs.AI": "人工智能", "cs.RO": "机器人",
    "cs.CR": "安全", "cs.NE": "神经网络",
    "cs.IR": "信息检索", "cs.MM": "多媒体",
    "cs.GR": "计算机图形学", "cs.HC": "人机交互",
    "cs.SD": "声音", "cs.SI": "社交网络",
    "cs.MA": "多智能体", "cs.CY": "计算与社会",
    "cs.DC": "分布式计算", "cs.AR": "增强现实",
    # 兜底: 保留原文标签
}
KEYWORD_CATEGORY_MAP = [
    (r'(image|vision|visual|detect|segment|recognition|ocr|face|video)', "计算机视觉"),
    (r'(language|text|nlp|translation|qa|question|answer|semantic|token)', "自然语言处理"),
    (r'(robot|drone|navigation|control|grasp|manipulation)', "机器人"),
    (r'(audio|speech|voice|music|sound|sing)', "语音/音频"),
    (r'(graph|knowledge|recommend|embed|ranking)', "知识图谱/推荐"),
    (r'(diffusion|generation|gen.*model|image.*synthesis)', "生成模型"),
    (r'(reinforcement|rl|game|decision|agent|planning)', "强化学习/决策"),
    (r'(medical|health|clinical|diagnos|drug)', "医疗AI"),
    (r'(code|program|debug|compile|software)', "代码智能"),
    (r'(adversarial|backdoor|poison|privacy|fairness)', "安全/隐私"),
]

def fetch_arxiv_category(arxiv_id):
    """Fetch primary arXiv category for a paper. Returns Chinese label."""
    try:
        arxiv_id_clean = arxiv_id.split("/")[-1].split("v")[0]
        url = f"http://export.arxiv.org/api/query?id_list={arxiv_id_clean}&max_results=1"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        opener = get_proxy_opener()
        data = opener.open(req, timeout=10).read()
        import xml.etree.ElementTree as ET
        ns = {"a": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}
        root = ET.fromstring(data)
        primary = root.find(".//arxiv:primary_category", ns)
        if primary is not None:
            cat = primary.get("term", "")
            if cat in ARXIV_CATEGORY_MAP:
                return ARXIV_CATEGORY_MAP[cat]
            return cat  # 未映射的保留原文
    except Exception:
        pass
    return None

def categorize_paper(title, summary=""):
    """Categorize a paper by arXiv category or keyword fallback. Returns Chinese label."""
    # Try keyword from title first
    text = (title + " " + summary).lower()
    for pattern, label in KEYWORD_CATEGORY_MAP:
        if re.search(pattern, text, re.IGNORECASE):
            return label
    return "AI研究"  # 兜底

# ── Metrics extraction ──

BENCHMARK_PATTERNS = [
    # 英文 benchmark
    (r'(MMLU|GSM8K|AIME|HumanEval|Swe[-\s]?bench|ImageNet|COCO|SQuAD|GLUE|SuperGLUE|BigBench|HellaSwag|WinoGrande|ARC[-\s]?Challenge|CIFAR[-\s]?10|CIFAR[-\s]?100)\s*(\d+[\.\d]*%?)',
     lambda m: f"{m.group(1)} {m.group(2)}"),
    (r'(accuracy|precision|recall|F1|BLEU|ROUGE|perplexity)\s*(?:of|:)?\s*(\d+[\.\d]*%?)',
     lambda m: f"{m.group(1)} {m.group(2)}"),
    # 中文基准
    (r'(准确率|精确率|召回率|F1)\s*(?:达到|为|：)?\s*(\d+[\.\d]*%?)',
     lambda m: f"{m.group(1)} {m.group(2)}"),
    # 参数量
    (r'(\d+[\.\d]*)\s*(M|B|K)\s*(?:参数|params|parameters)',
     lambda m: f"{m.group(1)}{m.group(2)} params"),
    # 子任务描述
    (r'(开源|open[-\s]?source|多模态|并行|zero[-\s]?shot|real[-\s]?time|端到端)',
     lambda m: m.group(1)),
    # 性能提升
    (r'(提升|提高|增加|improves?|increases?|enhances?|boosts?)\s+(?:了|约|by\s+)?(\d+[\.\d]*\s*%?)',
     lambda m: f"+{m.group(2)}"),
    (r'(降低|减少|缩减|reduces?|decreases?|cuts?)\s+(?:了|约|by\s+)?(\d+[\.\d]*\s*%?)',
     lambda m: f"-{m.group(2)}"),
    (r'(\d+[\.\d]*)\s*(?:×|x|times)\s*(?:加速|faster|speedup|efficiency)',
     lambda m: f"{m.group(1)}×"),
    (r'(\d+[\+]?\s*FPS)',
     lambda m: m.group(1)),
    # HF 指标
    (r'(\d+[\.\d]*[Kk]?)\s*(?:citations|引用|upvotes|stars)',
     lambda m: f"{m.group(1)} citations"),
]

def extract_metrics(paper):
    """Extract metrics from paper data. Returns list of metric strings (max 2)."""
    summary = paper.get("ai_summary", paper.get("summary", ""))
    title = paper.get("title", "")
    upvotes = paper.get("upvotes", 0)

    metrics = []
    text = summary or title

    # 1. Benchmark + score
    for pattern, formatter in BENCHMARK_PATTERNS:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            formatted = formatter(m)
            if formatted not in metrics:
                metrics.append(formatted)
            if len(metrics) >= 2:
                return metrics

    # 2. Old SOTA patterns (original fallback)
    sota_patterns = [
        (r'state-of-the-art.*?(?:on|for|in)\s+([^.]+)', 'SOTA on {0}'),
        (r'achieves?\s+([^.,;]+?(?:performance|accuracy|results|FPS|rate))', '{0}'),
        (r'outperforms?\s+([^.,;]+?(?:method|approach|baseline))', '{0}'),
        (r'(\d+[\+]?\s*FPS)', '{0}'),
        (r'(zero-shot\s+[^.,;]{1,40})', '{0}'),
        (r'(real-time\s+[^.,;]{1,30})', '{0}'),
    ]
    for pattern, template in sota_patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            val = m.group(1).strip()[:35]
            formatted = template.format(val) if '{0}' in template else val
            if formatted not in metrics:
                metrics.append(formatted)
            if len(metrics) >= 2:
                return metrics

    # 3. Fallback: citations or upvotes
    if not metrics:
        # Try to get citations from semantic scholar (optional, disabled by default)
        metrics.append(f"{upvotes} upvotes")
    return metrics
