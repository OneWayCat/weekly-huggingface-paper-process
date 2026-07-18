import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { FONT_FAMILY, COLORS } from './style';

// Outro Card — End screen
// Props: { text: string }

export const OutroCard: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const DUR = 60;

  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const scale = interpolate(frame, [0, 15], [0.8, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* Background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(ellipse at center, ${COLORS.gradientMid} 0%, ${COLORS.gradientStart} 70%)`,
          opacity: 0.5,
        }}
      />

      {/* Decorative */}
      <div
        style={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.accent}33 0%, transparent 70%)`,
          top: '15%',
        }}
      />

      {/* Text */}
      <div
        style={{
          fontSize: 36,
          fontWeight: 600,
          color: COLORS.text,
          textAlign: 'center',
          lineHeight: 1.6,
          opacity,
          transform: `scale(${scale})`,
          textShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }}
      >
        {text.split('\\n').map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
