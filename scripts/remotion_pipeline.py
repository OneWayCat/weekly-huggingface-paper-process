"""
remotion_pipeline.py — Full AI Weekly News pipeline using Remotion for rendering.
Usage: python remotion_pipeline.py
"""
import os, sys, json, subprocess, tempfile, shutil, urllib.request, base64

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from common import (
    SKILL_DIR, SCRIPTS_DIR, OUTPUT_DIR, TEMP_DIR, ASSETS_DIR, BGM_PATH,
    LOGO_DIR, REMOTION_DIR, FPS,
    get_output_subdir, ensure_dirs, check_dependencies,
    get_proxy_opener,
    mux_av, concat_videos, mix_bgm,
    tts_edge, tts_qwen3, normalize_tts,
)

BRIDGE = "http://127.0.0.1:19876"
VOICE = "zh-CN-XiaoxiaoNeural"

# ── Logo resolver ──
COMPANY_COLORS = {
    "anthropic": "#D97757", "zhipu": "#4169E1", "weibo": "#E6162D",
    "openai": "#10A37F", "microsoft": "#00A4EF", "sakana": "#E84D8A",
    "google": "#4285F4", "xai": "#1DA1F2", "adobe": "#FF0000",
    "baidu": "#2932E1", "alibaba": "#FF6A00", "tencent": "#1DA1F2",
    "bytedance": "#00F0FF", "meta": "#0668E1", "amazon": "#FF9900",
    "nvidia": "#76B900", "apple": "#555555", "samsung": "#1428A0",
    "ai-policy": "#8B5CF6",
}

def get_logo_path(logo_key):
    for ext in [".png", ".jpg", ".webp", ".ico"]:
        p = os.path.join(LOGO_DIR, logo_key + ext)
        if os.path.exists(p) and os.path.getsize(p) > 500:
            return p
    return ""

def get_accent_color(logo_key):
    return COMPANY_COLORS.get(logo_key, "#6C5CE7")

# ── Remotion renderer ──
def render_remotion(scene_type, data, output):
    data_file = os.path.join(REMOTION_DIR, "_tmp_data.json")
    with open(data_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    r = subprocess.run(
        ["cmd", "/c", f"cd /d {REMOTION_DIR} && node render-scene.mjs {scene_type} {data_file} {output}"],
        capture_output=True, text=True, timeout=120
    )
    if r.returncode != 0:
        print(f"  [ERROR] {r.stderr[-300:]}")
        return False
    return os.path.exists(output)

# ── News data ──
def get_this_week_news():
    week_start, week_end = "6月1日", "6月10日"
    news_items = [
        {"company":"Anthropic","logo_key":"anthropic","headline":"Anthropic发布Claude Fable 5 / Mythos 5"},
        {"company":"Apple","logo_key":"apple","headline":"WWDC 2026发布Siri AI"},
        {"company":"Google","logo_key":"google","headline":"Google与SpaceX签署AI算力协议"},
        {"company":"OpenAI","logo_key":"openai","headline":"ChatGPT记忆系统全面升级"},
        {"company":"纽约州","logo_key":"ai-policy","headline":"纽约州通过法案禁止AI聊天机器人"},
        {"company":"微软","logo_key":"microsoft","headline":"CEO Nadella警告AI产业空心化"},
    ]
    trends = [
        "中美AI模型竞争白热化",
        "政府介入AI监管加速",
        "AI算力供应链紧张",
        "AI产品形态从聊天转向平台",
        "AI安全与开放的拉锯战",
    ]
    return week_start, week_end, news_items, trends

# ── Main pipeline ──
def main():
    ensure_dirs()
    workdir = os.path.join(TEMP_DIR, "_remotion_work")
    os.makedirs(workdir, exist_ok=True)
    output = os.path.join(get_output_subdir(), "ainews_weekly_remotion.mp4")

    week_start, week_end, news_items, trends = get_this_week_news()
    headlines = [it["headline"] for it in news_items]

    # Step 1: Generate TTS
    print("=" * 50)
    print("Step 1: Generating TTS...")
    print("=" * 50)
    tts_scripts = [
        ("opening", "大家好，欢迎收看本周的AI动态。"),
        ("overview", "本周头条。" + "。".join(headlines) + "。下面来看详细报道。"),
    ]
    for i, item in enumerate(news_items):
        parts = [item["company"], item["headline"]]
        for k in ["point1", "point2", "point3"]:
            v = item.get(k, "")
            if v:
                parts.append(v)
        tts_scripts.append((f"news_{i}", "。".join(parts) + "。"))
    tts_scripts.append(("outro", "本周趋势总结。" + "。".join(trends) + "。以上就是本期大模型周报的全部内容，我们下期再见。"))

    tts_files = []
    tts_durations = []
    for name, text in tts_scripts:
        normalized = normalize_tts(text)
        out = os.path.join(workdir, f"tts_{name}.mp3")
        dur = tts_edge(normalized, out)
        tts_files.append(out)
        tts_durations.append(dur)
        print(f"  {name}: {dur:.1f}s")

    # Step 2: Render scenes with Remotion
    print("=" * 50)
    print("Step 2: Rendering scenes with Remotion...")
    print("=" * 50)
    scene_files = []

    print("  Title card...")
    title_out = os.path.join(workdir, "scene_title.mp4")
    render_remotion("title", {"weekStart": week_start, "weekEnd": week_end}, title_out)
    scene_files.append(title_out)

    print("  Overview card...")
    overview_out = os.path.join(workdir, "scene_overview.mp4")
    render_remotion("overview", {"headlines": headlines}, overview_out)
    scene_files.append(overview_out)

    for i, item in enumerate(news_items):
        print(f"  News card {i}: {item['company']}...")
        news_out = os.path.join(workdir, f"scene_news_{i}.mp4")
        logo = get_logo_path(item.get("logo_key", ""))
        bullets = [item.get(k, "") for k in ["point1", "point2", "point3"] if item.get(k)]
        render_remotion("news", {
            "company": item["company"],
            "logoPath": logo,
            "bullets": bullets,
            "accentColor": get_accent_color(item.get("logo_key", "")),
        }, news_out)
        scene_files.append(news_out)

    print("  Trends card...")
    trends_out = os.path.join(workdir, "scene_trends.mp4")
    render_remotion("trends", {"trends": trends}, trends_out)
    scene_files.append(trends_out)

    # Step 3: Trim scenes to TTS duration + mux audio
    print("=" * 50)
    print("Step 3: Trimming + muxing...")
    print("=" * 50)
    muxed = []
    for i, (scene, tts_file) in enumerate(zip(scene_files, tts_files)):
        dur = tts_durations[i]
        trim = os.path.join(workdir, f"trim_{i}.mp4")
        subprocess.run(["ffmpeg", "-y", "-stream_loop", "-1", "-i", scene, "-t", str(dur),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", trim], capture_output=True)
        mx = os.path.join(workdir, f"mux_{i}.mp4")
        mux_av(trim, tts_file, mx)
        muxed.append(mx)
        print(f"  Scene {i}: {dur:.1f}s")

    # Step 4: Concatenate
    print("=" * 50)
    print("Step 4: Concatenating...")
    print("=" * 50)
    concat_out = os.path.join(workdir, "_concat.mp4")
    concat_videos(muxed, concat_out)

    # Step 5: Mix BGM
    print("=" * 50)
    print("Step 5: Mixing BGM...")
    print("=" * 50)
    if os.path.exists(BGM_PATH):
        mix_bgm(concat_out, BGM_PATH, output, volume=0.12)
    else:
        shutil.copy2(concat_out, output)

    total_dur = sum(tts_durations)
    size = os.path.getsize(output)
    print("=" * 50)
    print(f"Done: {output}")
    print(f"Duration: {total_dur:.0f}s | Size: {size/1024:.0f} KB")
    print("=" * 50)

if __name__ == "__main__":
    main()
