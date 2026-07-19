# Animation Guidelines (dev branch)

Based on Apple Design principles — applied to the paper video overlays.

## Core Principle

> An interface feels alive when motion starts from the current on-screen value, inherits the user's velocity, projects momentum forward, and can be grabbed and reversed at any instant.

For pre-rendered video (Remotion), "interruptibility" doesn't apply. But **easing, stagger, and hierarchy** do.

## Easing

All `interpolate()` calls use `Easing.out(Easing.cubic)` instead of default linear:

```tsx
// ✅ Correct
const entrance = interpolate(frame, [0, 10], [0, 1], {
  extrapolateRight: 'clamp',
  easing: Easing.out(Easing.cubic),
});

// ❌ Wrong — too abrupt
const entrance = interpolate(frame, [0, 10], [0, 1]);
```

This produces a spring-like settle: fast start, graceful end.

## Staggered Reveal Order

Within a demo scene, elements appear in this sequence:

```
Frame 0-10:   Scene fade-in + bottom gradient appears  (gradientFade)
Frame 5-13:   First metric badge appears                (metricsStagger[0])
Frame 9-17:   Second metric badge appears               (metricsStagger[1])
Frame 8-18:   Bottom title + arXiv line appears         (bottomFade)
```

- Each metric is delayed by 4 frames from the previous one
- Title waits until metrics are mostly visible
- All use ease-out cubic

## Typography Hierarchy

| Element | Font Size | Weight | Color |
|---------|-----------|--------|-------|
| Title (short, ≤60 chars) | 22px | 700 | `#ffffff` |
| Title (long, >60 chars) | 20px | 700 | `#ffffff` |
| arXiv / GitHub | 14px | 400 | `#cbd5e1` (slate-300) |
| Tag / Metrics badge | 13px | 600 | `#ffffff` on `#6366f1` |

## Layout Constants

- **Bottom gradient height:** 10% of viewport (was 15%, reduced in dev)
- **Gradient opacity:** `rgba(10,10,26,0.85)` at bottom, `transparent` at top
- **Metrics below tag:** `top: 58` (tag bottom + gap), 30px spacing between items
- **Title right limit:** `realMetrics.length > 0 ? 200 : 24` (leave room for metrics if present)
- **zIndex:** All overlay elements = `10` (above `<Video>` layer)

## Scene Crossfade

Between demo scenes, `concat_videos()` applies ffmpeg xfade:
- **Duration:** 12 frames (0.5s at 24fps)
- **Type:** `fade` (crossfade)
- **Audio:** `acrossfade` with same duration
- **Fallback:** If xfade fails, falls back to standard concat hard cut

## What NOT to Do

- Don't add decorative elements (circles, pulse lines, "confetti") — user rejected these
- Don't use translateX/translateY for metric entrance — pure opacity only
- Don't make arXiv/GitHub text too bright — it must remain visually subordinate to the title
- Don't set gradient height >10% — covers too much demo content
