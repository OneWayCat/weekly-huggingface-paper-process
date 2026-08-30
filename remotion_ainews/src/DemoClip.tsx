import React from 'react';
import { AbsoluteFill, staticFile, Video } from 'remotion';

/**
 * 新模型效果视频（小红书竖屏）：1080x1920
 * 顶部标题卡（标签+标题+一句话）+ 中部横屏 demo 视频 + 底部渐变引导
 */
export const DemoClip: React.FC<{
  videoPath?: string;
  title?: string;
  tag?: string;
  subtitle?: string;
}> = ({ videoPath = 'demos/demo_2.mp4', title = '4DAnyone', tag = '新模型效果', subtitle = '从一段单目视频重建 4D 数字人' }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a1a' }}>
      {/* 顶部标题区 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 300,
          padding: '60px 60px 0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          background: 'linear-gradient(180deg, rgba(10,10,26,1) 0%, rgba(10,10,26,0.95) 70%, rgba(10,10,26,0) 100%)',
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignSelf: 'flex-start',
            background: '#6366f1',
            color: '#fff',
            fontSize: 26,
            fontWeight: 700,
            padding: '8px 22px',
            borderRadius: 18,
            marginBottom: 24,
          }}
        >
          {tag}
        </div>
        <div style={{ color: '#fff', fontSize: 52, fontWeight: 800, lineHeight: 1.25, textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
          {title}
        </div>
        <div style={{ color: '#cbd5e1', fontSize: 28, fontWeight: 500, marginTop: 14 }}>
          {subtitle}
        </div>
      </div>

      {/* 中部 demo 视频（16:9 居中） */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 1920, height: 1080 }}>
          <Video src={staticFile(videoPath)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      </AbsoluteFill>

      {/* 底部渐变引导 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 320,
          background: 'linear-gradient(0deg, rgba(10,10,26,1) 0%, rgba(10,10,26,0.9) 50%, rgba(10,10,26,0) 100%)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 70,
          zIndex: 10,
        }}
      >
        <div style={{ color: '#94a3b8', fontSize: 28, fontWeight: 600 }}>
          关注我 · 每周看新模型效果
        </div>
      </div>
    </AbsoluteFill>
  );
};
