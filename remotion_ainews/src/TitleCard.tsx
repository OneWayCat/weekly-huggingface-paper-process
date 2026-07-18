import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { FONT_FAMILY, COLORS } from './style';

// Title Card — Opening scene
// Props: { title: string, dateRange: string }

export const TitleCard: React.FC<{ title: string; dateRange: string }> = ({ title, dateRange }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Fade in & slide up — stay visible, no exit fade
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 20], [30, 0], { extrapolateRight: 'clamp' });

  // Accent line — static width, no pulse
  const lineWidth = interpolate(frame, [0, 30], [0, 200], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* Background gradient */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(ellipse at center, ${COLORS.gradientMid} 0%, ${COLORS.gradientStart} 70%)`,
          opacity: 0.6,
        }}
      />

      {/* Decorative circles */}
      <div
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.accent}22 0%, transparent 70%)`,
          top: '10%',
          right: '5%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.accentLight}15 0%, transparent 70%)`,
          bottom: '5%',
          left: '10%',
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

      {/* Accent line */}
      <div
        style={{
          width: lineWidth,
          height: 3,
          borderRadius: 2,
          background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accentLight})`,
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

      {/* PeperPaper logo */}
      <div
        style={{
          position: 'absolute',
          bottom: 30,
          fontSize: 20,
          fontWeight: 400,
          color: COLORS.textDim,
          opacity: 1,
        }}
      >
        PeperPaper
      </div>
    </AbsoluteFill>
  );
};
