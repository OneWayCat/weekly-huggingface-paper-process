import React from 'react';

export interface Sub {
  text: string;
  start: number;
  end: number;
}

interface SubtitleTextProps {
  subs: Sub[];
  timeSec: number;
}

/**
 * 共享字幕层：按时间戳显示当前句。
 * 粘滞显示：字幕窗口 = [start, 下一句 start)——句间停顿间隙保持上一句，
 * 字幕连续不闪烁（修复 subs.find 在停顿间隙返回 null 导致的字幕滞后/消失）。
 * 全片统一样式：白字 + 黑色光晕阴影，底部 40px，居中，宽度 ≤85% 画面（1632px）。
 */
export const SubtitleText: React.FC<SubtitleTextProps> = ({ subs, timeSec }) => {
  // 粘滞查找：取最后一个 start <= timeSec 的字幕（句间间隙显示上一句）
  let current: Sub | null = null;
  for (const s of subs) {
    if (timeSec >= s.start) {
      current = s;
    } else {
      break;
    }
  }
  if (!current) {
    return null;
  }
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          color: '#fff',
          fontSize: 30,
          fontWeight: 700,
          textAlign: 'center',
          textShadow: '0 0 6px rgba(0,0,0,0.9), 0 2px 12px rgba(0,0,0,0.85)',
          maxWidth: 1632,
          lineHeight: 1.5,
        }}
      >
        {current.text}
      </div>
    </div>
  );
};
