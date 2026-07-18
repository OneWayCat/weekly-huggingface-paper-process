import { AbsoluteFill, useCurrentFrame, interpolate, Video, staticFile } from 'remotion';
import { FONT_FAMILY, FONT_FAMILY_EN, COLORS } from './style';

export const PaperDemoCard: React.FC<{
  title: string;
  narration: string;
  paperIndex: number;
  tag: string;
  arxiv: string;
  github: string;
  metrics: string[];
  frameCount: number;
  videoPath: string;
}> = ({ title, paperIndex, tag, arxiv, github, metrics, videoPath }) => {
  const frame = useCurrentFrame();
  const entrance = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });

  // Filter out upvote-only metrics
  const realMetrics = (metrics || []).filter(
    (m) => !m.toLowerCase().includes('upvote')
  );

  // Format arxiv to short form
  const arxivShort = arxiv ? arxiv.replace('https://arxiv.org/abs/', '') : '';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        opacity: entrance,
      }}
    >
      {/* ═══ Full-screen demo video ═══ */}
      {videoPath && (
        <Video
          src={staticFile(videoPath)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}

      {/* ═══ Subtle bottom gradient (15%) for title readability ═══ */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '15%',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(10,10,26,0.85) 100%)',
          opacity: 1,
        }}
      />

      {/* ═══ Tag badge (top-left, uniform blue) ═══ */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 24,
          padding: '4px 14px',
          borderRadius: 14,
          fontSize: 13,
          fontWeight: 600,
          background: '#6366f1',
          color: '#ffffff',
          fontFamily: FONT_FAMILY_EN,
          opacity: 1,
          zIndex: 10,
        }}
      >
        {tag}
      </div>

      {/* ═══ Metrics (below tag, left-aligned, same style) ═══ */}
      {metrics && metrics.length > 0 && metrics.map((m, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: 58 + i * 30,
            left: 24,
            padding: '4px 14px',
            borderRadius: 14,
            fontSize: 13,
            fontWeight: 600,
            background: '#6366f1',
            color: '#ffffff',
            fontFamily: FONT_FAMILY_EN,
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
        >
          {m}
        </div>
      ))}

      {/* ═══ Paper title (bottom-left, white, with shadow) ═══ */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 24,
          right: realMetrics.length > 0 ? 200 : 24,
          opacity: 1,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.35,
            textShadow: '0 2px 8px rgba(0,0,0,0.7)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {title}
        </div>
        {/* arxiv + github line */}
        <div
          style={{
            fontSize: 14,
            color: '#94a3b8',
            marginTop: 4,
            textShadow: '0 1px 4px rgba(0,0,0,0.6)',
            fontFamily: FONT_FAMILY_EN,
          }}
        >
          {arxivShort && `arXiv:${arxivShort}`}
          {arxivShort && github && ' · '}
          {github && github}
        </div>
      </div>
    </AbsoluteFill>
  );
};
