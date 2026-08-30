import { Composition } from 'remotion';
import { TitleCard } from './TitleCard';
import { PaperTitleCard } from './PaperTitleCard';
import { HardwareIntro } from './HardwareIntro';
import { PaperDemoCard } from './PaperDemoCard';
import { OutroCard } from './OutroCard';
import { ExtraPapersCard } from './ExtraPapersCard';
import { PptScene } from './PptScene';
import { DemoClip } from './DemoClip';
import { DemoClip3D } from './DemoClip3D';
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
          tags: [],
          weekNumber: 0,
        }}
      />
      <Composition
        id="hardwareIntro"
        component={HardwareIntro}
        durationInFrames={120}  // 4s 占位，渲染时按音频时长覆盖
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          title: '2026 Mac AI 硬件',
          tag: 'AI HARDWARE SHOW',
          subtitle: '新 Mac mini 与 Mac Studio 全解析',
          institution: 'Apple · 2026-08-25',
          weekNumber: 1,
          subs: [],
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
          tag: 'CV',
          arxiv: 'https://arxiv.org/abs/2607.00000',
          github: '',
          weekNumber: 28,
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
      <Composition
        id="extraPapers"
        component={ExtraPapersCard}
        durationInFrames={1200}  // 50s max，渲染时按 TTS 时长覆盖
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          title: '本周热点论文补充',
          tag: '热点补充',
          papers: [],
          weekNumber: 0,
        }}
      />
      <Composition
        id="pptScene"
        component={PptScene}
        durationInFrames={900}  // 30s 占位，渲染时按音频时长覆盖
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          imagePath: 'p01.png',
          sceneTag: '',
          subs: [],
        }}
      />
      <Composition
        id="demoClip"
        component={DemoClip}
        durationInFrames={720}  // 30s 占位
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          videoPath: 'demos/demo_2.mp4',
          title: '4DAnyone',
          tag: '新模型效果',
          subtitle: '从一段单目视频重建 4D 数字人',
        }}
      />
      <Composition
        id="demoClip3D"
        component={DemoClip3D}
        durationInFrames={720}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          videoPath: 'demos/demo_3d_clip.mp4',
          title: '4DAnyone',
          tag: '新模型效果',
          subtitle: '2D视频 → 3D立体感',
        }}
      />
    </>
  );
};
