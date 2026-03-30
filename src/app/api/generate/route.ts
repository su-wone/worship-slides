import { NextRequest } from 'next/server';
import PptxGenJS from 'pptxgenjs';
import { formatLyrics, groupLyricsForSlides } from '@/lib/lyrics-formatter';

const THEMES: Record<string, { bg: string; text: string; accent: string }> = {
  basic: { bg: 'FFFFFF', text: '000000', accent: '333333' },
  dark: { bg: '1a1a2e', text: 'FFFFFF', accent: 'e94560' },
  light: { bg: 'f5f0eb', text: '2d2016', accent: 'c49a6c' },
  cross: { bg: '1b1b3a', text: 'FFFFFF', accent: 'f0c38e' },
  royal: { bg: '1a0a2e', text: 'FFFFFF', accent: 'd4af37' },
  holiness: { bg: '0d0d0d', text: 'FFFFFF', accent: 'c9b037' },
  nature: { bg: '2d6a4f', text: 'FFFFFF', accent: '95d5b2' },
  ocean: { bg: '0c2d48', text: 'FFFFFF', accent: '6cb4ee' },
  dawn: { bg: '2d1b4e', text: 'FFFFFF', accent: 'ff9a76' },
  sky: { bg: '4a90d9', text: 'FFFFFF', accent: 'ffe066' },
  autumn: { bg: '5c3317', text: 'FFFFFF', accent: 'e8a838' },
  calm: { bg: '1a2332', text: 'e8e4df', accent: '7eb8c9' },
  fire: { bg: '2d0a0a', text: 'FFFFFF', accent: 'ff4500' },
  joy: { bg: 'fff8e7', text: '3d2b1f', accent: 'ff6b35' },
  grace: { bg: '1e1233', text: 'FFFFFF', accent: 'c4a7e7' },
  christmas: { bg: '1a3c2a', text: 'FFFFFF', accent: 'e8383b' },
  easter: { bg: 'f9f4ef', text: '3b2d23', accent: 'd4a76a' },
  // 키즈
  'kids-rainbow': { bg: 'fff0f5', text: '8b008b', accent: 'ff69b4' },
  'kids-space': { bg: '0b0b3b', text: 'FFFFFF', accent: '00d4ff' },
  'kids-animal': { bg: 'fff8dc', text: '8b4513', accent: 'ff8c00' },
  'kids-candy': { bg: 'ffe4f0', text: 'c71585', accent: 'ff1493' },
  'kids-ocean': { bg: '006994', text: 'FFFFFF', accent: '00e5ff' },
  'kids-forest': { bg: '228b22', text: 'FFFFFF', accent: 'ffd700' },
};

// 장식 이모지 매핑
const DECORATIONS: Record<string, { corners: string[]; divider: string }> = {
  none: { corners: [], divider: '' },
  stars: { corners: ['⭐', '✨', '🌟', '💫'], divider: '✦ ✦ ✦' },
  hearts: { corners: ['❤️', '💛', '💚', '💙'], divider: '♥ ♥ ♥' },
  notes: { corners: ['🎵', '🎶', '🎤', '🎹'], divider: '♪ ♫ ♪' },
  clouds: { corners: ['☁️', '🌤️', '🕊️', '☁️'], divider: '☁ ☁ ☁' },
  animals: { corners: ['🐑', '🐣', '🦋', '🐟'], divider: '🐾 🐾 🐾' },
  flowers: { corners: ['🌸', '🌻', '🌷', '🌺'], divider: '❀ ❀ ❀' },
  rainbow: { corners: ['🌈', '⭐', '🌈', '⭐'], divider: '🌈 🌈 🌈' },
  cross: { corners: ['✝️', '🕊️', '✝️', '🕊️'], divider: '✟ ✟ ✟' },
};

interface SongInput {
  title: string;
  lyrics: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { theme = 'dark', deco = 'none', font = 'Malgun Gothic', linesPerSlide = 4 } = body;
    const decoConfig = DECORATIONS[deco] || DECORATIONS.none;

    // Support both single song and multi-song
    let songs: SongInput[];
    if (body.songs && Array.isArray(body.songs)) {
      songs = body.songs;
    } else if (body.lyrics) {
      songs = [{ title: body.title || '찬양', lyrics: body.lyrics }];
    } else {
      return Response.json({ error: '가사가 필요합니다.' }, { status: 400 });
    }

    const validSongs = songs.filter(s => s.lyrics.trim());
    if (validSongs.length === 0) {
      return Response.json({ error: '가사가 필요합니다.' }, { status: 400 });
    }

    const themeConfig = THEMES[theme] || THEMES.dark;
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';

    for (let songIdx = 0; songIdx < validSongs.length; songIdx++) {
      const song = validSongs[songIdx];

      // Title slide
      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: themeConfig.bg };

      if (validSongs.length > 1) {
        titleSlide.addText(`${songIdx + 1} / ${validSongs.length}`, {
          x: '85%', y: '5%', w: '12%', h: 0.4,
          fontSize: 12, fontFace: font, color: themeConfig.accent, align: 'center',
        });
      }

      // 타이틀 슬라이드 장식
      if (decoConfig.corners.length === 4) {
        const pos = [
          { x: 0.2, y: 0.15 }, { x: 12.0, y: 0.15 },
          { x: 0.2, y: 6.6 },  { x: 12.0, y: 6.6 },
        ];
        decoConfig.corners.forEach((emoji, idx) => {
          titleSlide.addText(emoji, {
            x: pos[idx].x, y: pos[idx].y, w: 0.8, h: 0.8,
            fontSize: 28, align: 'center', valign: 'middle',
          });
        });
      }

      titleSlide.addText(song.title, {
        x: 0.5, y: '30%', w: '90%', h: 1.5,
        fontSize: 44, fontFace: font, color: themeConfig.text, align: 'center', bold: true,
      });
      titleSlide.addText('WorshipSlides', {
        x: 0.5, y: '70%', w: '90%', h: 0.5,
        fontSize: 14, fontFace: font, color: themeConfig.accent, align: 'center',
      });
      titleSlide.addShape(pptx.ShapeType.rect, {
        x: '30%', y: '90%', w: '40%', h: 0.05,
        fill: { color: themeConfig.accent },
      });

      // Lyrics slides
      const formattedLyrics = formatLyrics(song.lyrics);
      const slideGroups = groupLyricsForSlides(formattedLyrics, linesPerSlide);
      for (let groupIdx = 0; groupIdx < slideGroups.length; groupIdx++) {
        const chunk = slideGroups[groupIdx];
        const slide = pptx.addSlide();
        slide.background = { color: themeConfig.bg };

        slide.addText(chunk.join('\n'), {
          x: 0.5, y: 0.5, w: '90%', h: '80%',
          align: 'center', valign: 'middle',
          fontSize: 32, fontFace: font, color: themeConfig.text,
          lineSpacingMultiple: 1.5,
        });

        // 장식: 네 모서리 이모지
        if (decoConfig.corners.length === 4) {
          const pos = [
            { x: 0.2, y: 0.15 }, { x: 12.0, y: 0.15 },
            { x: 0.2, y: 6.6 },  { x: 12.0, y: 6.6 },
          ];
          decoConfig.corners.forEach((emoji, idx) => {
            slide.addText(emoji, {
              x: pos[idx].x, y: pos[idx].y, w: 0.8, h: 0.8,
              fontSize: 24, align: 'center', valign: 'middle',
            });
          });
        }

        // 장식: 하단 구분선 (이모지 or 도형)
        if (decoConfig.divider) {
          slide.addText(decoConfig.divider, {
            x: '30%', y: '92%', w: '40%', h: 0.4,
            fontSize: 12, align: 'center', valign: 'middle', color: themeConfig.accent,
          });
        } else {
          slide.addShape(pptx.ShapeType.rect, {
            x: '35%', y: '93%', w: '30%', h: 0.03,
            fill: { color: themeConfig.accent },
          });
        }

        slide.addText(`${groupIdx + 1}`, {
          x: '90%', y: '92%', w: 0.5, h: 0.3,
          fontSize: 10, color: themeConfig.accent, align: 'center',
        });
      }
    }

    // Closing slide
    const closingSlide = pptx.addSlide();
    closingSlide.background = { color: themeConfig.bg };
    closingSlide.addText('아멘', {
      x: 0.5, y: '35%', w: '90%', h: 1.5,
      fontSize: 48, fontFace: font, color: themeConfig.text, align: 'center', bold: true,
    });
    closingSlide.addShape(pptx.ShapeType.rect, {
      x: '30%', y: '60%', w: '40%', h: 0.05,
      fill: { color: themeConfig.accent },
    });

    const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
    const bytes = new Uint8Array(buffer);

    const mainTitle = validSongs.length === 1 ? validSongs[0].title : '예배찬양';
    return new Response(bytes, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(mainTitle)}.pptx"`,
      },
    });
  } catch (e) {
    console.error('PPT generation error:', e);
    return Response.json({ error: 'PPT 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
