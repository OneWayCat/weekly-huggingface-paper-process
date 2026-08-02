import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { FONT_FAMILY, FONT_FAMILY_EN, COLORS, TAG_BG } from './style';

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

// Paper Title Card — Shown before each paper demo
// Animation style matches TitleCard (fade+slide, line expand, delayed tags)

export const PaperTitleCard: React.FC<{
  title: string;
  authors: string;
  institution: string;
  tag: string;
  arxiv: string;
  github: string;
  weekNumber?: number;
}> = ({ title, authors, institution, tag, arxiv, github, weekNumber = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const theme = THEMES[THEME_NAMES[weekNumber % THEME_NAMES.length]];

  // Exit fade-out starts in last 12 frames, completes by last 3 frames
  const contentOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const contentY = interpolate(frame, [0, 20], [30, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Accent line — smooth width expansion
  const lineWidth = interpolate(frame, [0, 30], [0, 80], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Tag — delayed fade-in like TitleCard's tags
  const tagOpacity = interpolate(frame - 15, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Links — delayed reveal like TitleCard's logo
  const linkOpacity = interpolate(frame - 25, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Exit
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames - 3], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Format arXiv
  const arxivShort = arxiv ? arxiv.replace('https://arxiv.org/abs/', 'arXiv:') : '';
  const githubShort = github ? github.replace('https://github.com/', '') : '';

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
      {/* Background gradient — themed like TitleCard */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: `radial-gradient(ellipse at center, ${theme.light}22 0%, ${theme.gradient}11 70%)`,
          opacity: 0.6,
        }}
      />

      {/* Decorative circle — themed */}
      <div
        style={{
          position: 'absolute',
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.accent}15 0%, transparent 70%)`,
          top: '12%',
        }}
      />

      {/* Tag — themed, delayed fade-in */}
      <div
        style={{
          display: 'inline-block',
          padding: '8px 22px',
          borderRadius: 18,
          fontSize: 20,
          fontWeight: 700,
          background: TAG_BG,
          color: '#ffffff',
          fontFamily: FONT_FAMILY_EN,
          marginBottom: 24,
          opacity: tagOpacity,
        }}
      >
        {tag}
      </div>

      {/* Title — fade + slide */}
      <div
        style={{
          fontSize: title.length > 60 ? 36 : 42,
          fontWeight: 700,
          color: COLORS.text,
          lineHeight: 1.4,
          textAlign: 'center',
          maxWidth: 1000,
          opacity: contentOpacity,
          transform: `translateY(${contentY}px)`,
        }}
      >
        {title}
      </div>

      {/* Authors + Institution — fade + slide */}
      {(authors || institution) && (
        <div
          style={{
            fontSize: 20,
            color: COLORS.textMuted,
            lineHeight: 1.6,
            textAlign: 'center',
            marginTop: 16,
            fontFamily: FONT_FAMILY_EN,
            opacity: contentOpacity,
            transform: `translateY(${contentY}px)`,
          }}
        >
          {authors && <div style={{ fontWeight: 500 }}>{authors}</div>}
          {institution && (
            <div style={{ color: COLORS.textDim, marginTop: 2 }}>{institution}</div>
          )}
        </div>
      )}

      {/* Accent line — themed width expansion */}
      <div
        style={{
          width: lineWidth,
          height: 3,
          borderRadius: 2,
          background: `linear-gradient(90deg, ${theme.accent}, ${theme.light})`,
          marginTop: 20,
          marginBottom: 18,
        }}
      />

      {/* Links row: arXiv · GitHub — delayed reveal */}
      <div
        style={{
          display: 'flex',
          gap: 14,
          alignItems: 'center',
          fontFamily: FONT_FAMILY_EN,
          opacity: linkOpacity,
        }}
      >
        {arxivShort && (
          <span style={{ fontSize: 18, color: '#4f46e5', fontWeight: 600 }}>
            {arxivShort}
          </span>
        )}
        {arxivShort && githubShort && (
          <span style={{ fontSize: 18, color: '#94a3b8' }}>·</span>
        )}
        {githubShort && (
          <span style={{ fontSize: 18, color: '#64748b', fontWeight: 500 }}>
            github/{githubShort}
          </span>
        )}
      </div>
    </AbsoluteFill>
  );
};
