export const FPS = 24;

export const WIDTH = 1920;
export const HEIGHT = 1080;

export const FONT_FAMILY = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
export const FONT_FAMILY_EN = '"Inter", "SF Pro Display", "Segoe UI", sans-serif';

export const COLORS = {
  bg: '#ffffff',
  bgCard: '#ffffff',
  accent: '#6366f1',
  accentLight: '#818cf8',
  accentDark: '#4f46e5',
  text: '#1a1a2e',
  textMuted: '#64748b',
  textDim: '#94a3b8',
  tagBg: '#f0f0ff',
  tagText: '#6366f1',
  cardBorder: '#e2e8f0',
  success: '#22c55e',
  warning: '#f59e0b',
  gradientStart: '#f8fafc',
  gradientMid: '#f1f5f9',
  gradientEnd: '#e2e8f0',
};

export const TITLE_FONT_SIZE = 56;
export const SUBTITLE_FONT_SIZE = 28;
export const BODY_FONT_SIZE = 22;
export const CAPTION_FONT_SIZE = 18;
export const SMALL_FONT_SIZE = 14;

export const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  default: { bg: '#eef2ff', text: '#6366f1' },
  CV: { bg: '#ecfdf5', text: '#059669' },
  NLP: { bg: '#eef2ff', text: '#3b82f6' },
  Agent: { bg: '#f5f3ff', text: '#8b5cf6' },
  Generation: { bg: '#fff7ed', text: '#d97706' },
  Audio: { bg: '#ecfeff', text: '#0891b2' },
  Video: { bg: '#f0fdf4', text: '#16a34a' },
  Robotics: { bg: '#fef2f2', text: '#dc2626' },
};

// ═══ 全局标签/指标背景色 ═══
// 所有标签徽章（开场标题页、论文标题页、演示页的分类标签和指标）统一使用此色。
// 换主题色时只需改这里一处。
export const TAG_BG = '#6366f1';
