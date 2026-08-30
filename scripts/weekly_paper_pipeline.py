"""
Weekly Paper Pipeline — reads from lines.md, renders via Remotion.
7 scenes: title → 5×demo → outro. No separate paper title cards. No transition black frames.

Architecture: ffmpeg muxes demo+TTS, Remotion only renders overlay layers (<Video> component).
No PNG frame extraction.
"""
import os, sys, json, subprocess, shutil, tempfile, urllib.request, re, hashlib, time
from datetime import datetime, timedelta
# 论文标题卡和演示卡已合并为演示页，不再分别渲染

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from common import (
    SKILL_DIR, OUTPUT_DIR, TEMP_DIR, ASSETS_DIR, BGM_PATH,
    LOGO_DIR, REMOTION_DIR, FPS,
    get_output_subdir, ensure_dirs, check_dependencies,
    tts_qwen3, normalize_tts,
    mux_av, concat_videos, mix_bgm, extract_frames,
    download_file, get_proxy_opener, get_proxy,
    get_week_date_range, get_week_number,
)

PAPER_COUNT = 5

# ── Parse lines.md ──

def parse_lines_md(md_path):
    """Parse lines.md and return {opening: str, papers: [str, ...], outro: str}
    Format: ## 开场 → text, ## 论文 N → text, ## 结尾 → text"""
    with open(md_path, "r", encoding="utf-8") as f:
        raw = f.read()

    result = {"opening": "", "papers": [], "outro": ""}
    current_section = None
    current_text = []

    for line in raw.split("\n"):
        stripped = line.strip()
        if not stripped or stripped.startswith(">"):
            continue

        if stripped == "## 开场":
            current_section = "opening"
            current_text = []
            continue
        if stripped.startswith("## 论文"):
            if current_section == "paper" and current_text:
                result["papers"].append("\n".join(current_text).strip())
            current_section = "paper"
            current_text = []
            continue
        if stripped == "## 结尾":
            if current_section == "paper" and current_text:
                result["papers"].append("\n".join(current_text).strip())
            current_section = "outro"
            current_text = []
            continue

        if current_section == "opening":
            result["opening"] += stripped + " "
        elif current_section == "paper":
            current_text.append(stripped)
        elif current_section == "outro":
            result["outro"] += stripped + " "

    if current_section == "paper" and current_text:
        result["papers"].append("\n".join(current_text).strip())
    result["opening"] = result["opening"].strip()
    result["outro"] = result["outro"].strip()
    return result

def parse_slice_md(md_path):
    """Parse slice.md and return paper_meta list."""
    with open(md_path, "r", encoding="utf-8") as f:
        raw = f.read()

    papers = []
    current = {}
    in_paper = False

    for line in raw.split("\n"):
        stripped = line.strip()
        if stripped.startswith("## 论文演示"):
            if current.get("title"):
                papers.append(current)
            current = {}
            in_paper = True
            continue
        if stripped in ("## 标题页", "## 结尾页"):
            if current.get("title"):
                papers.append(current)
            current = {}
            in_paper = False
            continue
        if not in_paper:
            continue
        if stripped.startswith("|") and stripped.endswith("|"):
            parts = [p.strip() for p in stripped.split("|")[1:-1]]
            if len(parts) >= 2:
                key = parts[0].replace("**", "")
                val = parts[1]
                if key == "标题":
                    current["title"] = val
                elif key == "机构":
                    current["institution"] = val
                elif key == "arXiv":
                    current["arxiv"] = val
                elif key == "分类标签":
                    current["tag"] = val
                elif key == "作者":
                    current["authors"] = val
                elif key == "GitHub":
                    current["github"] = val
                elif key == "演示素材":
                    m = re.search(r"(demo_\d+\.\w+)", val)
                    if m:
                        current["demo_file"] = m.group(1)
                elif key == "指标":
                    current["metrics"] = [m.strip() for m in val.split("·")]

    if current.get("title"):
        papers.append(current)
    return papers

FFMPEG_THREADS = os.environ.get("FFMPEG_THREADS", "4")  # limit CPU usage

# ── ffmpeg: mux demo video with TTS audio ──

def mux_demo_tts(video_path, tts_path, output_path):
    """Mux demo video (visual only) with TTS audio — stream copy when possible, threads limited."""
    vid_dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", video_path],
        capture_output=True, text=True).stdout.strip())
    tts_dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", tts_path],
        capture_output=True, text=True).stdout.strip())
    # Base ffmpeg args: threads limit + no stdin
    base = ["-y", "-threads", FFMPEG_THREADS]
    # If TTS is longer than demo video, loop the demo video (requires re-encode)
    if tts_dur > vid_dur:
        loops = int(tts_dur / vid_dur) + 2
        subprocess.run(["ffmpeg"] + base + [
            "-stream_loop", str(loops), "-i", video_path,
            "-i", tts_path,
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k",
            "-map", "0:v:0", "-map", "1:a:0",
            "-shortest", output_path], capture_output=True)
    else:
        # TTS <= demo video length: stream copy video, no re-encode
        subprocess.run(["ffmpeg"] + base + [
            "-i", video_path,
            "-i", tts_path,
            "-c:v", "copy",  # no re-encode
            "-c:a", "aac", "-b:a", "128k",
            "-map", "0:v:0", "-map", "1:a:0",
            "-shortest", output_path], capture_output=True)
    return tts_dur

# ── Remotion render (bundle-once reuse) ──

_REMOTION_BUNDLE = None  # global: bundle once, reuse for all scenes

def render_remotion(scene_type, data, output, bundle_path=None):
    global _REMOTION_BUNDLE
    data_file = os.path.join(REMOTION_DIR, "_tmp_data.json")
    with open(data_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    # On first call, don't pass bundle_path — bundle() runs
    # On subsequent calls, pass the cached bundle path
    bp_arg = bundle_path if bundle_path else ""
    # Override TMPDIR so Node's os.tmpdir() uses Temp/, not system temp
    g_temp = TEMP_DIR.replace('/', os.sep)
    r = subprocess.run(
        ["cmd", "/c", f"set TMP={g_temp}&&set TEMP={g_temp}&&"
         f"set REMOTION_CACHE_DIR={g_temp}&&"
         f"cd /d {REMOTION_DIR} && "
         f"node render-scene.mjs {scene_type} {data_file} {output} {bp_arg}"],
        capture_output=True, text=True, timeout=600
    )
    if r.returncode != 0:
        print(f"  [ERROR] {r.stderr[-500:]}")
        return (False, None)
    ok = os.path.exists(output)
    if ok:
        print(f"  [OK] {output} ({os.path.getsize(output)/1024:.0f} KB)")
    # Extract bundle path from first run's stderr
    if not bundle_path and ok:
        for line in r.stderr.split("\n"):
            if "Bundle at:" in line:
                bp = line.split("Bundle at:")[-1].strip()
                _REMOTION_BUNDLE = bp
                break
    return (ok, _REMOTION_BUNDLE if not bundle_path else bundle_path)

# ── Main render ──

def run_render(md_data, meta, monday_str, friday_str, lines_md_path):
    ensure_dirs()
    workdir = tempfile.mkdtemp(prefix=f"w{get_week_number()}_", dir=TEMP_DIR)
    os.makedirs(os.path.join(REMOTION_DIR, "public", "videos"), exist_ok=True)

    output_subdir = os.path.dirname(lines_md_path)  # output/2026Week28/
    demos_dir = os.path.join(output_subdir, "demos")
    os.makedirs(demos_dir, exist_ok=True)
    week_num = get_week_number()
    year = datetime.now().year
    # Auto-increment version: scan existing files for _vN suffix
    existing = [f for f in os.listdir(output_subdir) if f.startswith(f"weekly_papers_{year}_W{week_num}") and f.endswith(".mp4")]
    v = 1
    for ef in existing:
        m = re.search(r'_v(\d+)\.mp4$', ef)
        if m:
            v = max(v, int(m.group(1)) + 1)
    output_path = os.path.join(output_subdir, f"weekly_papers_{year}_W{week_num}_v{v}.mp4")

    # Step 1: Locate demo videos + build paper_data from meta + narration
    print("\n[Step 1] Preparing paper data...")
    narrations = md_data["papers"]
    paper_data = []
    for i in range(min(PAPER_COUNT, len(narrations), len(meta))):
        p = meta[i]
        narration = narrations[i] if i < len(narrations) else ""
        # Find demo
        demo_file = p.get("demo_file", "")
        demo_path = os.path.join(demos_dir, demo_file) if demo_file else None
        if not demo_path or not os.path.exists(demo_path):
            print(f"  Paper {i}: demo not found, skipping")
            continue
        # Copy demo to workdir (already exists, just reference it)
        video_path = os.path.join(workdir, f"demo_{len(paper_data)}.mp4")
        shutil.copy2(demo_path, video_path)
        print(f"  Paper {i}: {p['title'][:50]}... ({os.path.getsize(video_path)/1024:.0f} KB)")

        paper_data.append({
            "id": i, "title": p["title"],
            "authors": p.get("authors", ""),
            "institution": p.get("institution", ""),
            "arxiv": p.get("arxiv", ""),
            "github": p.get("github", ""),
            "tag": p.get("tag", "AI研究"),
            "demo_url": video_path,
            "metrics": p.get("metrics", []),
            "narration": narration,
        })

    actual_count = len(paper_data)
    if actual_count == 0:
        print("  [ERROR] Nothing to render!"); sys.exit(1)
    if actual_count < PAPER_COUNT:
        print(f"\n[WARN] Only got {actual_count} papers (wanted {PAPER_COUNT})")

    # Step 2: Generate TTS — opening, then per-paper: title TTS + demo TTS, then outro
    print(f"\n[Step 2] Generating TTS narration ({actual_count} papers)...")
    tts_files = []; tts_durations = []

    # Opening
    opening_text = md_data.get("opening", "欢迎收看HuggingFace一周论文速览")
    print("  Opening...")
    tts0 = os.path.join(workdir, "tts_00.mp3")
    d0 = tts_qwen3(opening_text, tts0)
    tts_files.append(tts0); tts_durations.append(d0)
    print(f"    {d0:.1f}s")

    # Each paper: title TTS (paper title) + demo narration TTS
    for i, paper in enumerate(paper_data):
        print(f"  Paper {i}...")
        # Title TTS — short, reads the paper title (also normalized)
        title_tts_text = normalize_tts(paper["title"])
        tts_t = os.path.join(workdir, f"tts_{2*i+1}_title.mp3")
        dt = tts_qwen3(title_tts_text, tts_t)
        tts_files.append(tts_t); tts_durations.append(dt)
        print(f"    Title TTS: {dt:.1f}s")
        # Demo narration TTS
        tts_d = os.path.join(workdir, f"tts_{2*i+2}_demo.mp3")
        d = tts_qwen3(normalize_tts(paper["narration"]), tts_d)
        tts_files.append(tts_d); tts_durations.append(d)
        print(f"    Demo: {d:.1f}s")

    # Outro
    outro_text = md_data.get("outro", "以上是本周论文精选，我们下期再见。")
    print("  Outro...")
    tts_last = os.path.join(workdir, "tts_last.mp3")
    d_last = tts_qwen3(outro_text, tts_last)
    tts_files.append(tts_last); tts_durations.append(d_last)
    print(f"    {d_last:.1f}s")

    # Step 3: Mux demo video with TTS audio (for video playback in Remotion)
    print(f"\n[Step 3] Muxing demo videos with TTS audio ({actual_count} papers)...")
    # Link remotion public/videos/ → workdir so Remotion <Video> can access voiced files
    # without copying (avoid redundant 2x disk I/O)
    videos_link = os.path.join(REMOTION_DIR, "public", "videos")
    if not os.path.exists(videos_link):
        os.makedirs(videos_link, exist_ok=True)
    voiced_videos = []
    for i, paper in enumerate(paper_data):
        print(f"  Paper {i}: muxing demo + TTS...")
        video_in = paper["demo_url"]
        tts_in = tts_files[2 * i + 2]  # tts_files[0]=opening, [1]=p0title, [2]=p0demo...
        voiced_out = os.path.join(workdir, f"voiced_{i}.mp4")
        dur = mux_demo_tts(video_in, tts_in, voiced_out)
        voiced_videos.append(voiced_out)
        # Hard link into public/videos/ — no data copy, same file on disk
        remotion_video = os.path.join(videos_link, f"voiced_{i}.mp4")
        if os.path.exists(remotion_video):
            os.remove(remotion_video)
        try:
            os.link(voiced_out, remotion_video)
            print(f"    voiced_{i}.mp4 ({os.path.getsize(voiced_out)/1024:.0f} KB, TTS={dur:.1f}s) [link]")
        except OSError:
            # Fallback to copy if hard link fails (cross-device)
            shutil.copy2(voiced_out, remotion_video)
            print(f"    voiced_{i}.mp4 ({os.path.getsize(voiced_out)/1024:.0f} KB, TTS={dur:.1f}s) [copy]")

    # Step 4: Render Remotion scenes (bundle once, reuse for all)
    # 1 + 2*N + 1 scenes: title → (titleCardN → demoN) × N → outro
    total_scenes = 1 + 2 * actual_count + 1
    print(f"\n[Step 4] Rendering Remotion scenes ({total_scenes} scenes)...")
    scene_files = []
    bundle_path = None

    # Scene 0: Title (duration = opening TTS)
    print("  [Title] Opening...")
    title_dur_frames = int(tts_durations[0] * FPS)
    scene0 = os.path.join(workdir, "scene_00_title.mp4")
    all_tags = list(dict.fromkeys(p.get("tag", "") for p in meta if p.get("tag")))
    ok, bundle_path = render_remotion("title", {
        "title": "HuggingFace一周论文速览",
        "dateRange": f"{monday_str} - {friday_str}",
        "tags": all_tags,
        "weekNumber": week_num,
        "demoDurationFrames": title_dur_frames,
    }, scene0, bundle_path)
    if not ok:
        print("  [WARN] Title render failed, continuing...")
    scene_files.append(scene0)

    # Scenes 1-N*2: Per paper — title card then demo
    # TTS index for paper i: title at 2*i+1, demo at 2*i+2
    for i, paper in enumerate(paper_data):
        # Title card scene
        title_i = 2 * i + 1  # tts index for this paper's title
        print(f"  [Paper {i} Title Card] {paper['title'][:40]}...")
        title_dur_frames = int(tts_durations[title_i] * FPS)
        title_out = os.path.join(workdir, f"scene_{title_i}_titlecard.mp4")
        ok, bundle_path = render_remotion("paperTitle", {
            "title": paper["title"],
            "authors": paper.get("authors", ""),
            "institution": paper.get("institution", ""),
            "tag": paper["tag"],
            "arxiv": paper["arxiv"],
            "github": paper.get("github", ""),
            "weekNumber": week_num,
            "demoDurationFrames": title_dur_frames,
        }, title_out, bundle_path)
        if not ok:
            print(f"  [WARN] Paper {i} title card render failed, continuing...")
        scene_files.append(title_out)

        # Demo scene
        demo_i = 2 * i + 2  # tts index for this paper's demo
        print(f"  [Paper {i} Demo] {paper['title'][:40]}...")
        demo_dur_frames = int(tts_durations[demo_i] * FPS)
        demo_out = os.path.join(workdir, f"scene_{demo_i}_demo.mp4")
        ok, bundle_path = render_remotion("paperDemo", {
            "title": paper["title"],
            "narration": paper["narration"],
            "tag": paper["tag"],
            "arxiv": paper["arxiv"],
            "github": paper.get("github", ""),
            "metrics": paper.get("metrics", []),
            "paperIndex": i,
            "demoDurationFrames": demo_dur_frames,
            "videoPath": f"videos/voiced_{i}.mp4",
        }, demo_out, bundle_path)
        if not ok:
            print(f"  [WARN] Paper {i} demo render failed, continuing...")
        scene_files.append(demo_out)

    # Last scene: Outro
    outro_idx = len(tts_files) - 1
    print("  [Outro]...")
    outro_dur_frames = int(tts_durations[outro_idx] * FPS)
    outro_out = os.path.join(workdir, "scene_outro.mp4")
    ok, bundle_path = render_remotion("outro", {
        "text": "欢迎关注\n下期再见",
        "demoDurationFrames": outro_dur_frames,
    }, outro_out, bundle_path)
    if not ok:
        print("  [WARN] Outro render failed, continuing...")
    scene_files.append(outro_out)

    # Step 5: Concat all scenes (no TTS mux needed — already in voiced videos)
    # Title and Outro scenes need their TTS muxed separately
    print(f"\n[Step 5] Muxing Title/Outro with TTS, then concatenating...")
    muxed = []
    for i, (scene, tts_f) in enumerate(zip(scene_files, tts_files)):
        # Scene 0=Title(no video), Scene 6=Outro(no video) — need TTS mux
        # Scene 1-5=Demos — already have TTS in voiced video, but Remotion rendered
        # them without audio. We need to mux the scene with TTS.
        mx = os.path.join(workdir, f"mux_{i}.mp4")
        mux_av(scene, tts_f, mx)
        muxed.append(mx)
        print(f"  Scene {i}: {tts_durations[i]:.1f}s")

    # Step 6: Concat
    print(f"\n[Step 6] Concatenating...")
    concat_out = os.path.join(workdir, "_concat.mp4")
    concat_videos(muxed, concat_out)

    # Step 7: Mix BGM
    print(f"\n[Step 7] Mixing BGM...")
    if os.path.exists(BGM_PATH):
        mix_bgm(concat_out, BGM_PATH, output_path, volume=0.12)
    else:
        shutil.copy2(concat_out, output_path)

    total_dur = sum(tts_durations)
    size = os.path.getsize(output_path)
    print("=" * 50)
    print(f"Done: {output_path}")
    print(f"Duration: {total_dur:.0f}s | Size: {size/1024:.0f} KB")
    print("=" * 50)

# ── Entry ──

if __name__ == "__main__":
    warnings = check_dependencies()
    if warnings:
        print("Warnings:", warnings)
    ensure_dirs()

    # Find latest lines.md in output/
    # Support both: current week output dir, or command line arg
    if len(sys.argv) > 1:
        lines_path = sys.argv[1]
    else:
        # Auto-detect: use the latest output subdir with lines.md
        output_base = OUTPUT_DIR
        candidates = sorted(
            [d for d in os.listdir(output_base) if os.path.isdir(os.path.join(output_base, d)) and d.startswith("2026Week")],
            reverse=True
        )
        lines_path = None
        for c in candidates:
            p = os.path.join(output_base, c, "lines.md")
            if os.path.exists(p):
                lines_path = p
                break
        if not lines_path:
            print("  [ERROR] No lines.md found in output/"); sys.exit(1)

    print(f"Reading: {lines_path}")
    md_data = parse_lines_md(lines_path)
    print(f"  Opening: {md_data['opening'][:40]}...")
    print(f"  Papers: {len(md_data['papers'])}")
    print(f"  Outro: {md_data['outro'][:40]}...")

    # Read slice.md
    slice_path = os.path.join(os.path.dirname(lines_path), "slice.md")
    if os.path.exists(slice_path):
        meta = parse_slice_md(slice_path)
        print(f"  Slice metadata: {len(meta)} papers")
    else:
        print("  [WARN] slice.md not found")
        meta = []

    monday_str, friday_str = get_week_date_range()
    run_render(md_data, meta, monday_str, friday_str, lines_path)
