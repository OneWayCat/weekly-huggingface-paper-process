import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { FONT_FAMILY, FONT_FAMILY_EN, COLORS, TAG_COLORS } from './style';

// Paper Title Card — Shows paper title/authors/info before demo
// Props: { title: string, authors: string, institution: string, arxiv: string, tag: string }

export const PaperTitleCard: React.FC<{
  title: string;
  authors: string;
  institution: string;
  arxiv: string;
  tag: string;
}> = ({ title, authors, institution, arxiv, tag }) => {
  const frame = useCurrentFrame();
  const DUR = 96; // ~4s at 24fps

  // Entrance
  const cardOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });

  // Exit
  const exitOpacity = interpolate(frame, [DUR - 15, DUR - 5], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tagStyle = TAG_COLORS[tag] ?? TAG_COLORS.default;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: FONT_FAMILY,
        opacity: exitOpacity,
      }}
    >
      {/* Tag */}
      <div
        style={{
          display: 'inline-block',
          padding: '4px 16px',
          borderRadius: 20,
          fontSize: 14,
          fontWeight: 600,
          background: tagStyle.bg,
          color: tagStyle.text,
          marginBottom: 16,
          fontFamily: FONT_FAMILY_EN,
          opacity: cardOpacity,
        }}
      >
        {tag}
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          color: COLORS.text,
          lineHeight: 1.4,
          opacity: cardOpacity,
          textAlign: 'center',
          maxWidth: 960,
        }}
      >
        {title}
      </div>

      {/* Divider */}
      <div
        style={{
          width: 60,
          height: 3,
          background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accentLight})`,
          borderRadius: 2,
          marginTop: 20,
          marginBottom: 20,
          opacity: titleOpacity,
        }}
      />

      {/* Authors & Institution */}
      <div
        style={{
          fontSize: 18,
          color: COLORS.textMuted,
          lineHeight: 1.6,
          opacity: titleOpacity,
          textAlign: 'center',
        }}
      >
        {authors && <div>{authors}</div>}
        {institution && (
          <div style={{ color: COLORS.textDim, marginTop: 4 }}>{institution}</div>
        )}
      </div>

      {/* Arxiv link */}
      {arxiv && (
        <div
          style={{
            fontSize: 14,
            color: COLORS.accentLight,
            marginTop: 16,
            fontFamily: FONT_FAMILY_EN,
            opacity: titleOpacity,
          }}
        >
          {arxiv.replace('https://', '')}
        </div>
      )}
    </AbsoluteFill>
  );
};
