import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { FONT_FAMILY, FONT_FAMILY_EN } from './style';
import { SubtitleText, Sub } from './SubtitleText';

const FPS = 30;

/**
 * HardwareIntro —— AI 硬件发布会专属开篇（皮克斯风格品牌片头）
 * 阶段1: "AI硬件发布会" 字母逐个弹性跳起（过冲回弹，仿皮克斯片头）
 * 阶段2: 标签/标题/副标题/机构依次入场 + 芯片装饰
 * 阶段3: 整卡淡出
 */
const BRAND = 'AI硬件发布会';
const LETTER_COLORS = ['#0284c7', '#6366f1', '#0d9488', '#0284c7', '#db2777', '#6366f1', '#0284c7', '#0d9488', '#db2777', '#6366f1'];

// 字母弹跳：每字母 i 在 frame 从 bounceStart 开始，下落+过冲+回弹
function letterBounce(frame: number, i: number) {
  const start = 10 + i * 5;
  const t = frame - start;
  if (t < 0) return { opacity: 0, y: -90, scale: 0.4, rot: -14 };
  // 弹性下落：先快速落下，过冲到底部再弹回
  const dur = 26;
  const progress = Math.min(t / dur, 1);
  // 过冲回弹曲线：y 从 -90 -> 0，过冲到 +14 再回 0
  const y = -90 * (1 - progress) + Math.sin(progress * Math.PI * 3) * 16 * (1 - progress) + 0;
  const scale = interpolate(progress, [0, 0.7, 1], [0.4, 1.08, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const rot = interpolate(progress, [0, 0.6, 1], [-14, 4, 0], {
    extrapolateRight: 'clamp',
  });
  const opacity = interpolate(progress, [0, 0.15], [0, 1], {
    extrapolateRight: 'clamp',
  });
  return { opacity, y, scale, rot };
}

export const HardwareIntro: React.FC<{
  title: string;
  tag: string;
  subtitle: string;
  institution: string;
  weekNumber?: number;
  subs?: Sub[];
}> = ({ title, tag, subtitle, institution, weekNumber = 0, subs = [] }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // ---- 阶段1: 品牌字母（0 ~ 70帧）----
  const brandDone = 70;

  // ---- 阶段2: 节目信息（brandDone 之后）----
  const infoStart = brandDone;
  const infoOpacity = interpolate(frame - infoStart, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const infoY = interpolate(frame - infoStart, [0, 18], [26, 0], {
    extrapolateLeft: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // 标签延迟
  const tagOpacity = interpolate(frame - infoStart - 10, [0, 14], [0, 1], {
    extrapolateLeft: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // 分隔流光条
  const lineL = interpolate(frame - infoStart - 20, [0, 18], [0, 200], {
    extrapolateLeft: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const lineR = interpolate(frame - infoStart - 20, [0, 18], [0, 200], {
    extrapolateLeft: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // 副标题
  const subOpacity = interpolate(frame - infoStart - 30, [0, 14], [0, 1], {
    extrapolateLeft: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // 背景网格渐显
  const gridOpacity = interpolate(frame, [0, 40], [0.15, 0.45], {
    extrapolateRight: 'clamp',
  });

  // 光晕呼吸
  const breathe = 1 + Math.sin(frame * 0.06) * 0.04;

  // 扫描线
  const scanY = ((frame * 1.4) % 1000) - 100;

  // 退出：整卡淡出（最后 12 帧）
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames - 3], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 品牌区上移：信息入场后字母组略微上移让位
  const brandShift = interpolate(frame, [infoStart, infoStart + 20], [0, -34], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const brandOpacity = interpolate(frame, [infoStart + 30, infoStart + 55], [1, 0.25], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: FONT_FAMILY,
        opacity: exitOpacity,
        overflow: 'hidden',
      }}
    >
      {/* 背景浅蓝渐变（呼吸） */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: `radial-gradient(ellipse at 50% 45%, #e0f2fecc 0%, #f0f9ffaa 45%, #ffffff 100%)`,
          transform: `scale(${breathe})`,
        }}
      />
      {/* 芯片网格线（浅蓝） */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage:
            'linear-gradient(rgba(56,189,248,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.14) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          opacity: gridOpacity,
        }}
      />
      {/* 扫描线（浅蓝） */}
      <div
        style={{
          position: 'absolute',
          left: '6%',
          right: '6%',
          top: scanY,
          height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(2,132,199,0.35), transparent)',
          boxShadow: '0 0 14px rgba(2,132,199,0.25)',
          opacity: 0.4,
        }}
      />

      {/* ===== 阶段1: AI硬件发布会 品牌字母 ===== */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, calc(-50% + ${brandShift}px))`,
          display: 'flex',
          alignItems: 'baseline',
          opacity: brandOpacity,
        }}
      >
        {BRAND.split('').map((ch, i) => {
          const b = letterBounce(frame, i);
          return (
            <span
              key={i}
              style={{
                fontSize: 110,
                fontWeight: 900,
                fontFamily: FONT_FAMILY_EN,
                color: LETTER_COLORS[i % LETTER_COLORS.length],
                textShadow: '0 2px 10px rgba(2,132,199,0.25), 0 4px 14px rgba(0,0,0,0.08)',
                display: 'inline-block',
                margin: '0 2px',
                opacity: b.opacity,
                transform: `translateY(${b.y}px) scale(${b.scale}) rotate(${b.rot}deg)`,
                letterSpacing: 2,
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>

      {/* ===== 阶段2: 节目信息 ===== */}
      <div
        style={{
          position: 'absolute',
          top: '62%',
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: infoOpacity,
          transform: `translateY(${infoY}px)`,
        }}
      >
        {/* 标签 */}
        <div
          style={{
            display: 'inline-block',
            padding: '7px 22px',
            borderRadius: 18,
            fontSize: 21,
            fontWeight: 700,
            letterSpacing: 3,
            color: '#0369a1',
            border: '1px solid rgba(2,132,199,0.4)',
            background: 'rgba(224,242,254,0.8)',
            fontFamily: FONT_FAMILY_EN,
            marginBottom: 20,
            opacity: tagOpacity,
          }}
        >
          {tag || 'AI HARDWARE SHOW'}
        </div>

        {/* 标题 */}
        <div
          style={{
            fontSize: title.length > 24 ? 42 : 52,
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: 1.3,
            textAlign: 'center',
            maxWidth: 1150,
            textShadow: '0 2px 14px rgba(2,132,199,0.18)',
          }}
        >
          {title}
        </div>

        {/* 分隔流光条 */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 18, marginBottom: 14 }}>
          <div style={{ width: lineL, height: 3, borderRadius: 2, background: 'linear-gradient(90deg, transparent, #0284c7)' }} />
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#0284c7', boxShadow: '0 0 10px rgba(2,132,199,0.5)', margin: '0 8px' }} />
          <div style={{ width: lineR, height: 3, borderRadius: 2, background: 'linear-gradient(90deg, #0284c7, transparent)' }} />
        </div>

        {/* 副标题 + 机构 */}
        {(subtitle || institution) && (
          <div
            style={{
              fontSize: 21,
              color: '#475569',
              lineHeight: 1.6,
              textAlign: 'center',
              fontFamily: FONT_FAMILY_EN,
              opacity: subOpacity,
            }}
          >
            {subtitle && <div style={{ fontWeight: 600 }}>{subtitle}</div>}
            {institution && <div style={{ color: '#64748b', marginTop: 4 }}>{institution}</div>}
          </div>
        )}
      </div>

      {/* 底部逐句字幕（共享 SubtitleText，全片样式统一） */}
      <SubtitleText subs={subs} timeSec={frame / FPS} />
    </AbsoluteFill>
  );
};
