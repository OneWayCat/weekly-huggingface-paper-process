# UI Component Reference

## PaperDemoCard (Demo Overlay Layer)

Overlaid on top of the full-screen demo video. White bg → video fills entire frame.

### Layout

```
┌────────────────────────────────────────────┐
│ [分类标签]      20px bold #6366f1           │  ← top:28, left:28
│                                            │
│     ████████ DEMO VIDEO ████████           │
│                                            │
│  论文标题 (28px long / 32px short)         │  ← bottom:24, left:24, right:280
│  arXiv:2607.09024 · github/repo  18px      │  ← arxiv #cbd5e1, github #64748b
│                                            │
│                        [指标1]  19px       │  ← bottom:100 + i*40, right:28
│                        [指标2]             │
└────────────────────────────────────────────┘
        ← 10% gradient (rgba(10,10,26,0.85)) →
```

### Font Sizes (统一加大后)
| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Tag badge (左上) | **20px** (原13px) | 700 | bg:#6366f1, text:#fff, padding 8×22, bdrs 18 |
| Metrics (右下) | **19px** (原13px) | 700 | bg:#6366f1, text:#fff, padding 8×22, bdrs 18 |
| Title (short ≤60 chars) | **32px** (原22px) | 700 | #ffffff, textShadow 0 2px 8px |
| Title (long >60 chars) | **28px** (原20px) | 700 | #ffffff, lineClamp 3 |
| arXiv/GitHub | **18px** (原14px) | 600/500 | #cbd5e1 / #64748b |

### Metrics positioning
- 旧：top-left (top:58 + i×30, left:24, fontSize 13) — 太小，位置不合适
- **新：bottom-right (bottom:100 + i×40, right:28, fontSize 19)** — 更大，不遮挡标题

### Animations
- All entrance: ease-out cubic
- Metrics: staggered fade-in (frame 5 + i*4, 8 frames) — 仅 opacity，不滑入
- Title/arXiv: fade in (frame 8-18)
- Gradient: fade in (frame 4-10)

## PaperTitleCard (Pre-Demo Title Page)

Inserted before each paper demo. Shows tag, title, authors, institution, arXiv, GitHub.

### Layout
```
┌────────────────────────────────────────────┐
│          ┌──────────┐                       │
│          │ 分类标签  │  20px themed bg       │  ← delayed fade-in frame 15-27
│          └──────────┘                       │
│                                            │
│     36/42px Paper Title (long/short)        │  ← fade + slide up 30px, frame 0-20
│                                            │
│    Y. Chen et al.          20px #64748b     │  ← fade + slide, frame 0-20
│    Google DeepMind         20px #94a3b8     │
│                                            │
│    ──────── accent line width 0→80 ─────── │  ← ease-out, frame 0-30
│                                            │
│    arXiv:2607.09024 · github/repo          │  ← delayed reveal, frame 25-37
│        18px #4f46e5  ·  18px #64748b       │
└────────────────────────────────────────────┘
    Background: radial-gradient(theme.light + gradient)
```

### Animations (必须完全对标 TitleCard)
| Element | Animation | Timing |
|---------|-----------|--------|
| Tag | Delayed fade-in opacity 0→1, ease-out cubic | frame 15-27 |
| Title | Opacity 0→1 + translateY 30→0, ease-out cubic | frame 0-20 |
| Authors/Institution | Same as title (opacity+slide) | frame 0-20 |
| Accent line | Width 0→80px expand, ease-out cubic | frame 0-30 |
| arXiv/GitHub | Delayed fade-in opacity 0→1 | frame 25-37 |
| Exit (整卡) | Opacity 1→0 | `durationInFrames-12` to `durationInFrames-3` |

### ⚠️ 关键陷阱
**必须使用 `useVideoConfig().durationInFrames` 而不是硬编码常量。** 如果用 `DUR=80` 但场景实际被 render-scene.mjs 设为 132 帧，退出淡出会在 frame 68-77 执行，之后 55 帧全黑屏。正确做法：
```tsx
const { durationInFrames } = useVideoConfig();
const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames - 3], [1, 0], ...);
```

### Font Sizes
| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Tag | **20px**, padding 8×22, bdrs 18 | 700 | theme.accent bg, #fff text |
| Title (>60 chars) | **36px** | 700 | #1a1a2e, maxWidth 1000 |
| Title (≤60 chars) | **42px** | 700 | #1a1a2e |
| Authors | **20px** | 500 | #64748b |
| Institution | **20px** | 400 | #94a3b8 |
| arXiv | **18px** | **600** | **#4f46e5** (深蓝醒目！) |
| GitHub | **18px** | 500 | #64748b |
| Separator dot | 18px | — | #94a3b8 |

### 内容规则
- 作者/机构必须保留（用户明确要求），不要去掉
- arXiv 颜色用深蓝 #4f46e5，不要用淡色（用户要求"不要变淡"）

## TitleCard (Opening Scene)

Shows "HuggingFace一周论文速览" with date, tags, PepperPaper watermark.

### Key Specs
| Element | Size | Notes |
|---------|------|-------|
| Main title | 64px, 700 | fade+slide 30px, ease-out cubic, frames 0-20 |
| Date range | 28px, 400 | #64748b, marginTop 16 |
| Tags | **20px** (原13px), **700** (原600) | 主题色底白字, padding 8×22, bdrs 18 |
| Tags animation | delayed fade-in | frames 15-27 |
| PepperPaper | 20px | delayed reveal (frame 25-35) |
| Accent line | width 0→200, h 3 | frame 0-30, themed gradient |
| Background | radial-gradient | theme light + gradient, opacity 0.6 |

## OutroCard (Ending Scene)

Simple centered text with radial gradient background.

| Element | Size | Weight |
|---------|------|--------|
| Text | **40px** (原36px) | 600 |

## 每周主题色 (THEMES)

```
indigo  (week%7=0):  accent #6366f1, light #818cf8, gradient #4f46e5
teal    (week%7=1):  accent #0d9488, light #2dd4bf, gradient #0f766e
rose    (week%7=2):  accent #e11d48, light #fb7185, gradient #be123c   ← Week30使用
amber   (week%7=3):  accent #d97706, light #fbbf24, gradient #b45309
emerald (week%7=4):  accent #059669, light #34d399, gradient #047857
violet  (week%7=5):  accent #7c3aed, light #a78bfa, gradient #6d28d9
cyan    (week%7=6):  accent #06b6d4, light #22d3ee, gradient #0891b2
```

选择：`THEMES[THEME_NAMES[weekNumber % 7]]`

## Design Principles
1. **Animation consistency**: 所有卡片共享同一套动画语言（ease-out cubic，主内容 fade+slide，辅助元素延迟展现）
2. **Font hierarchy**: 主信息（标题）最大，元数据（作者/arXiv）≥18px。拒绝小于16px的字体
3. **Color**: 每周主题色循环防视觉疲劳，标签/分隔线/渐变全部联动
4. **Preview first**: 改 UI 必须先 node render-scene.mjs 预览单场景
5. **Metrics 右下 vs 左上**: 指标在右下角（bottom:100+i×40, right:28），不遮挡左下标题
