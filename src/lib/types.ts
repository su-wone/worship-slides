export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  channelTitle: string;
}

export interface LyricsLine {
  time: number;
  text: string;
}

export interface SlideData {
  title: string;
  lines: string[];
  background: string;
  textColor: string;
}

export interface GenerateRequest {
  videoUrl: string;
  lyrics: string;
  theme: ThemeOption;
  linesPerSlide: number;
}

export type ThemeOption = 'dark' | 'light' | 'nature' | 'cross' | 'gradient' | 'custom';

export interface ThemeConfig {
  name: string;
  background: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
}

export const THEME_PRESETS: Record<ThemeOption, ThemeConfig> = {
  dark: {
    name: '어두운 테마',
    background: '1a1a2e',
    textColor: 'FFFFFF',
    accentColor: 'e94560',
    fontFamily: 'Arial',
  },
  light: {
    name: '밝은 테마',
    background: 'f8f9fa',
    textColor: '212529',
    accentColor: '4361ee',
    fontFamily: 'Arial',
  },
  nature: {
    name: '자연 테마',
    background: '2d6a4f',
    textColor: 'FFFFFF',
    accentColor: '95d5b2',
    fontFamily: 'Arial',
  },
  cross: {
    name: '십자가 테마',
    background: '1b1b3a',
    textColor: 'FFFFFF',
    accentColor: 'f0c38e',
    fontFamily: 'Arial',
  },
  gradient: {
    name: '그라데이션 테마',
    background: '667eea',
    textColor: 'FFFFFF',
    accentColor: '764ba2',
    fontFamily: 'Arial',
  },
  custom: {
    name: '커스텀 테마',
    background: '000000',
    textColor: 'FFFFFF',
    accentColor: 'FFD700',
    fontFamily: 'Arial',
  },
};
