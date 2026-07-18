import { Composition } from 'remotion';
import { TitleCard } from './TitleCard';
import { PaperTitleCard } from './PaperTitleCard';
import { PaperDemoCard } from './PaperDemoCard';
import { OutroCard } from './OutroCard';
import { FPS, WIDTH, HEIGHT } from './style';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="title"
        component={TitleCard}
        durationInFrames={120}  // 5s
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          title: 'HuggingFace一周论文速览',
          dateRange: '2026.7.13 - 2026.7.17',
        }}
      />
      <Composition
        id="paperTitle"
        component={PaperTitleCard}
        durationInFrames={96}  // 4s
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          title: 'Sample Paper Title',
          authors: 'Author One et al.',
          institution: 'University',
          arxiv: 'https://arxiv.org/abs/2607.00000',
          tag: 'CV',
        }}
      />
      <Composition
        id="paperDemo"
        component={PaperDemoCard}
        durationInFrames={720}  // 30s max
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          title: 'Sample Paper Title',
          narration: 'Narration text here.',
          paperIndex: 0,
          tag: 'CV',
          arxiv: 'https://arxiv.org/abs/2607.00000',
          github: '',
          metrics: [],
          frameCount: 0,
          videoPath: '',
        }}
      />
      <Composition
        id="outro"
        component={OutroCard}
        durationInFrames={60}  // 2.5s
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          text: '欢迎关注\n下期再见',
        }}
      />
    </>
  );
};
