import React from 'react';
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { SubtitleText, Sub } from './SubtitleText';

interface PptSceneProps {
  imagePath?: string;
  sceneTag?: string;
  subs?: Sub[];
}

const FPS = 30;

/**
 * PPT 讲解场景：PPT 图全屏背景 + 底部逐句字幕（共享 SubtitleText 组件）。
 * 无顶部标签、无渐变遮罩（本档节目风格：纯画面 + 字幕）。
 * 整卡最后 12 帧淡出。
 */
export const PptScene: React.FC<PptSceneProps> = ({
  imagePath = 'p01.png',
  sceneTag = '',
  subs = [],
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const exitOpacity =
    frame >= durationInFrames - 12 ? Math.max(0, (durationInFrames - frame) / 12) : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a1a', opacity: exitOpacity }}>
      <AbsoluteFill>
        <img
          src={staticFile(`/ppt/${imagePath}`)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>

      <SubtitleText subs={subs} timeSec={frame / FPS} />
    </AbsoluteFill>
  );
};
