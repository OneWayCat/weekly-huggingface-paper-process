import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { FONT_FAMILY, TAG_BG } from './style';

// Weekly color themes — match TitleCard exactly
const THEMES: Record<string, { accent: string; light: string; gradient: string }> = {
  indigo: { accent: '#6366f1', light: '#818cf8', gradient: '#4f46e5' },
  teal: { accent: '#0d9488', light: '#2dd4bf', gradient: '#0f766e' },
  rose: { accent: '#e11d48', light: '#fb7185', gradient: '#be123c' },
  amber: { accent: '#d97706', light: '#fbbf24', gradient: '#b45309' },
  emerald: { accent: '#059669', light: '#34d399', gradient: '#047857' },
  violet: { accent: '#7c3aed', light: '#a78bfa', gradient: '#6d28d9' },
  cyan: { accent: '#06b6d4', light: '#22d3ee', gradient: '#0891b2' },
};
const THEME_NAMES = Object.keys(THEMES);

type ExtraPaper = {
  title: string;
  highlight: string;
};

// Extra Papers Card — 无视频热点论文补充页（W32 新增）
// 白底信息页：标签 + 标题 + 分隔线 + 5 条论文（序号徽章 + 英文名 + 中文出彩点）
// 动效对齐 TitleCard：标题 fade+slide 入场、分隔线展开、整卡 exitOpacity 出场

export const ExtraPapersCard: React.FC<{
  title: string;
  tag?: string;
  papers?: ExtraPaper[];
  weekNumber?: number;
}> = ({ title, tag = '热点补充', papers = [], weekNumber = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const theme = THEMES[THEME_NAMES[weekNumber % THEME_NAMES.length]];

  // 标题入场：fade + slide 30px（对齐 TitleCard 内容行语言）
  const titleOpacity = interpolate(frame, [0, 20], [0.3, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 20], [30, 0], { extrapolateRight: 'clamp' });
  // 分隔线宽度展开（对齐 PaperTitleCard frame 0-30）
  const lineWidth = interpolate(frame, [0, 30], [0, 60], { extrapolateRight: 'clamp' });
  // 整卡出场淡出：最后 12→3 帧（对齐 PaperTitleCard exitOpacity）
  const exitStart = durationInFrames - 12;
  const exitEnd = durationInFrames - 3;
  const exitOpacity = interpolate(frame, [exitStart, exitEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#ffffff',
        fontFamily: FONT_FAMILY,
        opacity: exitOpacity,
      }}
    >
      {/* 轻微渐变背景 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(ellipse at 50% 0%, ${theme.light}14 0%, transparent 60%)`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '70px 120px',
        }}
      >
        {/* 分类标签 */}
        <div
          style={{
            backgroundColor: TAG_BG,
            color: '#fff',
            fontSize: 20,
            fontWeight: 700,
            padding: '8px 22px',
            borderRadius: 18,
            marginBottom: 28,
          }}
        >
          {tag}
        </div>

        {/* 主标题 */}
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            color: '#1a1a2e',
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            marginBottom: 24,
          }}
        >
          {title}
        </div>

        {/* 分隔线 */}
        <div
          style={{
            width: lineWidth,
            height: 3,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${theme.accent}, ${theme.light})`,
            marginBottom: 46,
          }}
        />

        {/* 论文列表 */}
        <div
          style={{
            width: '100%',
            maxWidth: 1580,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {papers.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
              {/* 序号徽章 */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: TAG_BG,
                  color: '#fff',
                  fontSize: 20,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {i + 1}
              </div>
              {/* 论文名 + 出彩点 */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#1a1a2e',
                    marginBottom: 4,
                  }}
                >
                  {p.title}
                </div>
                <div style={{ fontSize: 20, color: '#64748b', lineHeight: 1.5 }}>
                  {p.highlight}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
