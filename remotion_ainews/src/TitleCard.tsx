import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { FONT_FAMILY, FONT_FAMILY_EN, COLORS } from './style';

// Weekly color themes — cycle by week number
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

// Title Card — Opening scene
// Props: { title: string, dateRange: string, tags: string[], weekNumber?: number }

export const TitleCard: React.FC<{ title: string; dateRange: string; tags?: string[]; weekNumber?: number }> = ({ title, dateRange, tags = [], weekNumber = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Pick theme by week number
  const theme = THEMES[THEME_NAMES[weekNumber % THEME_NAMES.length]];

  // Fade in & slide up with ease-out (spring-like settle)
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const titleY = interpolate(frame, [0, 20], [30, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Accent line — smooth width expansion
  const lineWidth = interpolate(frame, [0, 30], [0, 200], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // PeperPaper fades in after title is stable (Apple: delayed reveal)
  const logoOpacity = interpolate(frame - 25, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Tags stagger fade-in
  const tagsOpacity = interpolate(frame - 15, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* Background gradient — themed */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(ellipse at center, ${theme.light}22 0%, ${theme.gradient}11 70%)`,
          opacity: 0.6,
        }}
      />

      {/* Small decorative dot — themed */}
      <div
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.accent}15 0%, transparent 70%)`,
          top: '15%',
          right: '10%',
        }}
      />

      {/* Main title */}
      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          color: COLORS.text,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textShadow: '0 2px 20px rgba(0,0,0,0.5)',
          letterSpacing: '0.05em',
          textAlign: 'center',
        }}
      >
        {title}
      </div>

      {/* Accent line — themed */}
      <div
        style={{
          width: lineWidth,
          height: 3,
          borderRadius: 2,
          background: `linear-gradient(90deg, ${theme.accent}, ${theme.light})`,
          marginTop: 20,
        }}
      />

      {/* Date range */}
      <div
        style={{
          fontSize: 28,
          fontWeight: 400,
          color: COLORS.textMuted,
          opacity: 1,
          marginTop: 16,
        }}
      >
        {dateRange}
      </div>

      {/* Tags row — shows paper categories for this week */}
      {tags.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 20,
            opacity: tagsOpacity,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {tags.map((t, i) => (
            <span
              key={i}
              style={{
                padding: '8px 22px',
                borderRadius: 18,
                fontSize: 20,
                fontWeight: 700,
                background: theme.accent,
                color: '#ffffff',
                fontFamily: FONT_FAMILY_EN,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* PeperPaper logo */}
      <div
        style={{
          position: 'absolute',
          bottom: 30,
          fontSize: 20,
          fontWeight: 400,
          color: COLORS.textDim,
          opacity: logoOpacity,
        }}
      >
        PepperPaper
      </div>
    </AbsoluteFill>
  );
};
