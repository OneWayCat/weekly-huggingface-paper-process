"""
pipeline/templates/ainews_weekly.py - AI Weekly News Broadcast
Generates a ~3-minute AI news broadcast video with title + news cards + BGM.
Usage: python scripts/ainews_weekly.py
"""
import os, sys, json, urllib.request, base64, subprocess, tempfile, shutil, glob, re

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from common import (
    SKILL_DIR, OUTPUT_DIR, TEMP_DIR, ASSETS_DIR, BGM_PATH, LOGO_DIR,
    get_output_subdir, ensure_dirs,
    tts_edge as _edge_tts,
    normalize_tts as _normalize_for_tts,
    mux_av as _mux_scene,
    concat_videos as _concat_scenes,
)

from PIL import Image

MODEL_LOGOS = {
    "openai": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/OpenAI_Logo.svg/256px-OpenAI_Logo.svg.png",
    "anthropic": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Anthropic_logo.svg/256px-Anthropic_logo.svg.png",
    "google": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/256px-Google_%22G%22_logo.svg.png",
    "zhipu": "https://www.zhipuai.cn/favicon.ico",
    "microsoft": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/256px-Microsoft_logo.svg.png",
    "weibo": "https://h5.sinaimg.cn/upload/2016/05/26/319/5333.png",
    "xai": "https://x.ai/favicon.ico",
    "adobe": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Adobe_Corporate_Logo.png/256px-Adobe_Corporate_Logo.png",
}

def _download_logo(name, workdir):
    for ext in ['.png', '.jpg', '.ico']:
        asset = os.path.join(LOGO_DIR, name + ext)
        if os.path.exists(asset) and os.path.getsize(asset) > 500:
            return asset
    url = MODEL_LOGOS.get(name)
    png_path = os.path.join(workdir, f"logo_{name}.png")
    if url:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            data = urllib.request.urlopen(req, timeout=10).read()
            if len(data) > 500:
                with open(png_path, "wb") as f: f.write(data)
                try: Image.open(png_path).save(png_path, "PNG")
                except: pass
                return png_path
        except: pass
    return None

def _render_title_card(week_start, week_end, duration, out_path):
    """Render title card with manim"""
    cmd = f"""
import sys, os, json, tempfile, subprocess, glob, shutil
sys.path.insert(0, '{os.path.dirname(os.path.abspath(__file__))}')
from manim_render import render_title_card
render_title_card('{week_start}', '{week_end}', {duration}, '{out_path}')
"""
    r = subprocess.run([sys.executable, "-c", cmd.strip()], capture_output=True, text=True, timeout=120)
    return r.returncode == 0 and os.path.exists(out_path)

def _render_news_card(scene_name, title, bullets, logo_path, duration, out_path):
    cmd = """
import sys, os
sys.path.insert(0, '%s')
from manim_render import render_news_card
render_news_card('%s', '%s', '%s', '%s', %s, '%s')
""" % (os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
       scene_name, title, json.dumps(bullets, ensure_ascii=False), logo_path, duration, out_path)
    r = subprocess.run([sys.executable, "-c", cmd.strip()], capture_output=True, text=True, timeout=120)
    return r.returncode == 0 and os.path.exists(out_path)

def get_this_week_news():
    week_start = "6月12日"; week_end = "6月19日"
    news_items = [
        {"company":"Anthropic","logo_key":"anthropic","headline":"Mythos 5被美国政府强制叫停",
         "point1":"美国政府发出最后通牒","point2":"传言和模型越狱风险有关"},
        {"company":"智谱AI","logo_key":"zhipu","headline":"GLM-5.2开源发布",
         "point1":"753B参数MIT开源","point2":"编码基准超越GPT-5.5"},
        {"company":"新浪微博","logo_key":"weibo","headline":"VibeThinker-3B震撼学界",
         "point1":"3B参数挑战671B大模型","point2":"AIME 2026得分94.3"},
        {"company":"OpenAI","logo_key":"openai","headline":"Google Gemini负责人加入OpenAI",
         "point1":"Noam Shazeer离开Google","point2":"此前Google以27亿美元将其请回"},
        {"company":"微软","logo_key":"microsoft","headline":"CEO警告AI产业空心化",
         "point1":"少数模型吞噬行业价值","point2":"建议企业将智能与模型解耦"},
        {"company":"Sakana AI","logo_key":"sakana","headline":"Marlin超深度Agent上线",
         "point1":"定位虚拟CSO战略官","point2":"单次任务最长8小时"},
    ]
    trends = [
        "开源加出口管制重塑全球AI格局",
        "小模型路线引发基准争议",
        "Agent从秒级向小时级深度思考跃迁",
    ]
    return week_start, week_end, news_items, trends

def generate_weekly_broadcast(week_start, week_end, news_items, trends,
                               orientation="landscape", fps=24,
                               width=1280, height=720, output=None, bgm_path=None):
    ensure_dirs()
    if output is None:
        output = os.path.join(get_output_subdir(), "ainews_weekly.mp4")
    workdir = os.path.join(TEMP_DIR, ".ainews_weekly_work")
    os.makedirs(workdir, exist_ok=True)

    logo_paths = {}
    for item in news_items:
        key = item.get("logo_key","")
        if key and key not in logo_paths:
            lp = _download_logo(key, workdir)
            if lp: logo_paths[key] = lp

    headlines = [it["headline"] for it in news_items[:6]]
    tts_scripts = [("opening", "大家好，欢迎收看本周的AI动态。")]
    tts_scripts.append(("overview", "本周头条。" + "。".join(headlines) + "。下面来看详细报道。"))
    for i, item in enumerate(news_items):
        parts = [item["company"], item["headline"]]
        for k in ["point1","point2","point3"]:
            v = item.get(k,"")
            if v: parts.append(v)
        tts_scripts.append((f"news_{i}", "。".join(parts) + "。"))
    tts_scripts.append(("outro", "本周趋势总结。" + "。".join(trends) + "。以上是本期内容，下期再见。"))

    tts_durations = []; tts_files = []
    for name, text in tts_scripts:
        normalized = _normalize_for_tts(text)
        out = os.path.join(workdir, f"tts_{name}.mp3")
        dur = _edge_tts(normalized, out)
        tts_durations.append(dur); tts_files.append(out)

    content_cards = []
    title_card = os.path.join(workdir, "title_card.mp4")
    _render_title_card(week_start, week_end, tts_durations[0], title_card)
    content_cards.append(title_card)

    muxed = []
    for i, card in enumerate(content_cards):
        dur = tts_durations[i]
        mx = os.path.join(workdir, f"mux_{i}.mp4")
        _mux_scene(card, tts_files[i], mx)
        muxed.append(mx)

    concat_out = os.path.join(workdir, "_concat.mp4")
    _concat_scenes(muxed, concat_out)

    if bgm_path and os.path.exists(bgm_path):
        from common import mix_bgm
        mix_bgm(concat_out, bgm_path, output, volume=0.12)
    else:
        shutil.copy2(concat_out, output)

    total_dur = sum(tts_durations)
    size = os.path.getsize(output) if os.path.exists(output) else 0
    print(f"[AINews] Done: {output} ({size/1024:.0f} KB, {total_dur:.0f}s)")
    return output

if __name__ == "__main__":
    w1, w2, items, tr = get_this_week_news()
    generate_weekly_broadcast(w1, w2, items, tr,
        output=os.path.join(get_output_subdir(), "ainews_weekly_2026.mp4"),
        bgm_path=BGM_PATH)
