"""
verify_tts_normalization.py — Run this after writing lines.md to catch
TTS mispronunciations before running the full pipeline.

Usage:
    python scripts/verify_tts_normalization.py output/2026WeekWW/lines.md

Scans for common patterns the TTS model mispronounces and warns.
"""
import sys, re, os

# Patterns that Qwen3-TTS / Edge TTS typically handle wrong
WARN_PATTERNS = [
    (r'(?<!\d)(\d{4})(?!\d)(?!\s*[PpKk%年])', '四位数（如 5090）可能被读成五千零九十而非五零九零。如果是型号 → 写 "五零九零"'),
    (r'\b(\d+)[Pp]\b', '分辨率如 720P → 应写 "七二零P"'),
    (r'\b(\d+)[Kk]\b(?!\s*[Hh][Zz])', '4K → 应写 "四K"（非 K 的单位后缀）'),
    (r'RTX\s+\d+', 'RTX 型号 → 应写 "RTX 五零九零" 格式'),
    (r'(\d+\.\d+)%', '百分比如 57.4% → normalize_tts 已处理，确认 lines.md 中为原始数字'),
    (r'/.*/', '斜杠分隔 → TTS 可能停顿异常，建议改"和"或"或"'),
    (r'(?<!\d)\d{2,}(?!\s*[%PpKkB])', '纯数字 → 确认是数量词（用 _num_to_cn）还是型号（用 digit_by_digit）'),
]

def check_lines(md_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        text = f.read()

    # Extract narration sections only (not metadata)
    papers = re.split(r'^## (?:论文 \d+|开场|结尾)', text, flags=re.MULTILINE)
    issues = []
    for i, section in enumerate(papers):
        if not section.strip():
            continue
        for pattern, msg in WARN_PATTERNS:
            for m in re.finditer(pattern, section):
                issues.append((i, m.group(), msg))

    if issues:
        print(f"⚠️  Found {len(issues)} potential TTS issues in {os.path.basename(md_path)}:")
        for idx, match, msg in issues:
            print(f"  Section {idx}: '{match}' — {msg}")
    else:
        print(f"✅ No TTS pronunciation warnings in {os.path.basename(md_path)}")

if __name__ == '__main__':
    if len(sys.argv) > 1:
        check_lines(sys.argv[1])
    else:
        print("Usage: python scripts/verify_tts_normalization.py output/2026WeekWW/lines.md")
