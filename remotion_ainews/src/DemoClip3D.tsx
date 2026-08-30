import React from 'react';
import { AbsoluteFill, staticFile, Video, useCurrentFrame, interpolate, Easing } from 'remotion';

export interface Clip {
  src: string;
  frames: number;
}

/**
 * 单人物逐个弹出展示（小红书竖屏 1080x1920）：
 * 每段人物：弹入（scale 0.85→1.10，ease-out 点击感）→ 保持 → 缩回（1.10→0.85）→ 间隔
 * 类似"按钮点击弹出"的轮播效果。
 */
export const DemoClip3D: React.FC<{
  clips?: Clip[];
  title?: string;
  tag?: string;
  subtitle?: string;
}> = ({ clips = [], title = '4DAnyone', tag = '新模型效果', subtitle = '单目视频 → 4D重建 → 逐个立体展示' }) => {
  const frame = useCurrentFrame();
  const POP_IN = 12;   // 弹入帧数（快）
  const POP_OUT = 10;  // 缩回帧数
  const GAP = 10;      // 段间空帧

  // 计算每段时间轴
  const segments: { start: number; end: number; clip: Clip }[] = [];
  let cursor = 0;
  for (const c of clips) {
    const total = POP_IN + c.frames + POP_OUT + GAP;
    segments.push({ start: cursor, end: cursor + total, clip: c });
    cursor += total;
  }

  // 定位当前段
  let cur = segments.find((s) => frame >= s.start && frame < s.end);

  // 缩放动画
  let scale = 1.0;
  let videoPath = '';
  if (cur) {
    videoPath = cur.clip.src;
    const t = frame - cur.start;
    if (t < POP_IN) {
      scale = interpolate(t, [0, POP_IN], [0.85, 1.10], { easing: Easing.out(Easing.cubic) });
    } else if (t < POP_IN + cur.clip.frames) {
      scale = 1.10;
    } else if (t < POP_IN + cur.clip.frames + POP_OUT) {
      scale = interpolate(t, [POP_IN + cur.clip.frames, POP_IN + cur.clip.frames + POP_OUT], [1.10, 0.85], { easing: Easing.in(Easing.cubic) });
    } else {
      scale = 0.85;   // gap：主体收起（不显示）
      videoPath = '';
    }
  }

  const boxW = 750;
  const boxH = 1330;
  const subjW = 900;
  const subjH = 1560;

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a1a' }}>
      {/* 顶部标题区 */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 280,
          padding: '56px 60px 0', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
          background: 'linear-gradient(180deg, rgba(10,10,26,1) 0%, rgba(10,10,26,0.95) 60%, rgba(10,10,26,0) 100%)',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'inline-flex', alignSelf: 'flex-start', background: '#6366f1', color: '#fff', fontSize: 26, fontWeight: 700, padding: '8px 22px', borderRadius: 18, marginBottom: 22 }}>
          {tag}
        </div>
        <div style={{ color: '#fff', fontSize: 50, fontWeight: 800, lineHeight: 1.25, textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
          {title}
        </div>
        <div style={{ color: '#cbd5e1', fontSize: 27, fontWeight: 500, marginTop: 12 }}>
          {subtitle}
        </div>
      </div>

      {/* 背景边界线框（保持固定） */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            width: boxW, height: boxH,
            border: '3px solid rgba(255,255,255,0.55)',
            borderRadius: 10,
            boxShadow: '0 0 40px rgba(99,102,241,0.25)',
            position: 'absolute',
            zIndex: 1,
          }}
        />
        {/* 主体：按动画缩放，弹出时溢出框线；gap 期间不渲染（黑场） */}
        {cur && videoPath && (
          <div
            style={{
              width: subjW, height: subjH,
              position: 'absolute', zIndex: 2,
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
            }}
          >
            <Video src={staticFile(videoPath)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
      </AbsoluteFill>

      {/* 底部渐变引导 */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 300,
          background: 'linear-gradient(0deg, rgba(10,10,26,1) 0%, rgba(10,10,26,0.9) 50%, rgba(10,10,26,0) 100%)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 64, zIndex: 20,
        }}
      >
        <div style={{ color: '#94a3b8', fontSize: 28, fontWeight: 600 }}>关注我 · 每周看新模型效果</div>
      </div>
    </AbsoluteFill>
  );
};
