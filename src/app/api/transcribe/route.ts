import { NextRequest } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';
import { readFile } from 'fs/promises';
import path from 'path';
import { fuzzySearchLyrics } from '@/lib/lyrics-db';

// 커스텀 DB 검색
async function searchCustomDB(query: string): Promise<{ title: string; lyrics: string } | null> {
  try {
    const data = await readFile(path.join(process.cwd(), 'data', 'custom-lyrics.json'), 'utf-8');
    const db: Array<{ title: string; lyrics: string }> = JSON.parse(data);
    const q = query.toLowerCase();
    const match = db.find(s => s.title.toLowerCase().includes(q) || q.includes(s.title.toLowerCase()));
    return match || null;
  } catch {
    return null;
  }
}

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

export async function POST(request: NextRequest) {
  try {
    const { videoId, title, mode = 'auto' } = await request.json();

    if (!videoId && mode !== 'search') {
      return Response.json({ error: '비디오 ID가 필요합니다.' }, { status: 400 });
    }

    // Mode: 'search' - Search for lyrics by title
    if (mode === 'search' && title) {
      // 0. First try custom (saved) DB
      const customMatch = await searchCustomDB(title);
      if (customMatch) {
        return Response.json({
          lyrics: customMatch.lyrics,
          source: 'custom_db',
          message: `저장된 가사에서 "${customMatch.title}"을(를) 찾았습니다.`,
        });
      }

      // 1. Try built-in DB
      const dbResults = fuzzySearchLyrics(title);
      if (dbResults.length > 0) {
        return Response.json({
          lyrics: dbResults[0].lyrics,
          source: 'database',
          message: `내장 DB에서 "${dbResults[0].title}" 가사를 찾았습니다.`,
          alternatives: dbResults.slice(1, 5).map((s: { title: string }) => s.title),
        });
      }

      // 2. Try web search (Naver/Google)
      const webLyrics = await searchLyricsFromWeb(title);
      if (webLyrics) {
        return Response.json({
          lyrics: webLyrics,
          source: 'web_search',
          message: `웹에서 "${title}" 가사를 찾았습니다. 정확도를 확인해주세요.`,
        });
      }

      // 3. Fallback to Gemini AI
      if (genAI) {
        return await searchLyricsWithAI(title);
      }

      return Response.json({
        lyrics: '',
        source: 'none',
        message: `"${title}" 가사를 찾을 수 없습니다. 직접 입력해주세요.`,
      });
    }

    // Mode: 'auto' - Try custom DB, built-in DB, web search, then YouTube captions
    if (title) {
      // 0. Custom (saved) DB
      const customMatch = await searchCustomDB(title);
      if (customMatch) {
        return Response.json({
          lyrics: customMatch.lyrics,
          source: 'custom_db',
          message: `저장된 가사에서 "${customMatch.title}"을(를) 찾았습니다.`,
        });
      }

      // 1. Built-in DB
      const dbResults = fuzzySearchLyrics(title);
      if (dbResults.length > 0) {
        return Response.json({
          lyrics: dbResults[0].lyrics,
          source: 'database',
          message: `내장 DB에서 "${dbResults[0].title}" 가사를 찾았습니다.`,
          alternatives: dbResults.slice(1, 5).map((s: { title: string }) => s.title),
        });
      }

      // 2. Web search
      const webLyrics = await searchLyricsFromWeb(title);
      if (webLyrics) {
        return Response.json({
          lyrics: webLyrics,
          source: 'web_search',
          message: `웹에서 "${title}" 가사를 찾았습니다. 정확도를 확인해주세요.`,
        });
      }
    }

    // 3. Try YouTube captions (Korean only)
    let rawTranscript = '';
    if (videoId) {
      try {
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ko' });
        if (transcriptItems && transcriptItems.length > 0) {
          const text = formatTranscriptToLyrics(transcriptItems);
          if (isKoreanText(text)) {
            rawTranscript = text;
          }
        }
      } catch {
        try {
          const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
          if (transcriptItems && transcriptItems.length > 0) {
            const text = formatTranscriptToLyrics(transcriptItems);
            if (isKoreanText(text)) {
              rawTranscript = text;
            }
          }
        } catch {
          // No captions available
        }
      }
    }

    // If we have raw transcript and Gemini is available, correct it
    if (rawTranscript && genAI) {
      const corrected = await correctLyricsWithAI(rawTranscript, title || '');
      if (corrected) {
        return Response.json({
          lyrics: corrected,
          source: 'ai_corrected',
          message: 'Gemini AI가 YouTube 자막을 교정하여 가사를 생성했습니다.',
        });
      }
    }

    // If no transcript but we have Gemini and title
    if (!rawTranscript && genAI && title) {
      return await searchLyricsWithAI(title);
    }

    // Fallback: return raw transcript or empty
    if (rawTranscript) {
      return Response.json({
        lyrics: rawTranscript,
        source: 'youtube_caption',
        message: 'YouTube 자막에서 가사를 추출했습니다. (자동자막이라 부정확할 수 있습니다)',
      });
    }

    return Response.json({
      lyrics: '',
      source: 'none',
      message: '가사를 찾을 수 없습니다. "제목으로 검색" 버튼을 시도하거나 직접 입력해주세요.',
    });
  } catch (e) {
    console.error('Transcribe error:', e);
    return Response.json({ error: '가사 추출 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// ─── Web Search for Lyrics (Bugs.co.kr) ─────────────────────────────

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function searchLyricsFromWeb(title: string): Promise<string | null> {
  // Clean title: remove common YouTube noise
  const cleanTitle = title
    .replace(/\(.*?\)/g, '')       // (47집), (USB원본) 등
    .replace(/\[.*?\]/g, '')       // [파이디온] 등
    .replace(/official|mv|music video|lyrics|가사|audio|live|율동|MR|영상|동영상|찬양\s*상자|USB원본/gi, '')
    .replace(/\d{4}\s*(여름|겨울)?성경학교?/g, '')
    .replace(/\d+\.\s*/g, '')      // "12. " 트랙 번호
    .replace(/^\d+\s+/g, '')       // 앞쪽 숫자 "10 믿음이란" → "믿음이란"
    .replace(/\s+\d+\s+/g, ' ')    // 중간 숫자 "노래 10 믿음이란" → "노래 믿음이란"
    .replace(/\d{4}/g, '')         // 연도
    .replace(/주제가|파이디온|고신|합신|통합/gi, '')
    .replace(/즐거운\s*노래|즐거운\s*찬양|찬양\s*모음|워십\s*송/gi, '') // 앨범명
    .replace(/\d+집/g, '')         // "48집" 등
    .replace(/\s{2,}/g, ' ')
    .trim();

  try {
    // Step 1: Search Bugs.co.kr for the track
    const searchUrl = `https://music.bugs.co.kr/search/track?q=${encodeURIComponent(cleanTitle)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!searchRes.ok) return null;
    const searchHtml = await searchRes.text();
    const searchDoc = cheerio.load(searchHtml);

    // Find first track link
    let trackId: string | null = null;
    searchDoc('a[href*="/track/"]').each((_, el) => {
      if (trackId) return;
      const href = searchDoc(el).attr('href') || '';
      const match = href.match(/\/track\/(\d+)/);
      if (match) trackId = match[1];
    });

    if (!trackId) return null;

    // Step 2: Fetch lyrics from the track page
    const trackUrl = `https://music.bugs.co.kr/track/${trackId}`;
    const trackRes = await fetch(trackUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!trackRes.ok) return null;
    const trackHtml = await trackRes.text();
    const trackDoc = cheerio.load(trackHtml);

    // Bugs uses .lyricsContainer or xmp tags for lyrics
    const lyricsEl = trackDoc('.lyricsContainer xmp, xmp, [class*="lyrics"] xmp');
    if (lyricsEl.length > 0) {
      const raw = lyricsEl.first().text().trim();
      if (raw.length > 10) {
        const cleaned = cleanBugsLyrics(raw);
        if (cleaned) return cleaned;
      }
    }

    // Fallback: try any text in .lyricsContainer
    const container = trackDoc('.lyricsContainer');
    if (container.length > 0) {
      const raw = container.first().text().trim();
      if (raw.length > 30) {
        const cleaned = cleanBugsLyrics(raw);
        if (cleaned) return cleaned;
      }
    }

    return null;
  } catch (e) {
    console.error('Bugs search error:', e);
    return null;
  }
}

function cleanBugsLyrics(text: string): string | null {
  // 가사 미등록 감지
  if (text.includes('준비 중') || text.includes('벅스패널') || text.includes('가사 신청')) {
    return null;
  }

  const cleaned = text
    .replace(/^가사\s*/m, '')
    .replace(/Bugs\s*님이.*$/m, '')
    .replace(/가사\s*오류\s*제보.*$/m, '')
    .replace(/^\s*\n/gm, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 정리 후 너무 짧으면 유효하지 않음
  if (cleaned.length < 10) return null;
  return cleaned;
}

// ─── Gemini AI Functions ─────────────────────────────────────────────

async function correctLyricsWithAI(rawTranscript: string, title: string): Promise<string | null> {
  if (!genAI) return null;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const prompt = `당신은 한국 교회 찬양 가사 전문가입니다. YouTube 자동자막에서 추출한 부정확한 텍스트를 받아 정확한 찬양 가사로 교정합니다.

규칙:
- 원래 찬양의 정확한 가사로 교정하세요
- 각 줄은 찬양의 한 프레이즈가 되도록 줄바꿈하세요
- [음악], [박수] 등의 태그는 제거하세요
- 반복되는 후렴구도 포함하세요
- 가사만 출력하고 다른 설명은 하지 마세요

찬양 제목: ${title || '(제목 없음)'}

YouTube 자동자막 텍스트:
${rawTranscript}

위 자막을 정확한 찬양 가사로 교정해주세요.`;

    const result = await model.generateContent(prompt);
    return result.response.text()?.trim() || null;
  } catch (e) {
    console.error('AI correction error:', e);
    return null;
  }
}

async function searchLyricsWithAI(title: string) {
  if (!genAI) {
    return Response.json({
      lyrics: '',
      source: 'none',
      message: 'AI 가사 검색이 불가합니다. 직접 입력해주세요.',
    });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const prompt = `당신은 한국 교회 찬양 가사 전문가입니다.

규칙:
- 정확한 찬양 가사를 작성하세요
- 각 줄은 한 프레이즈가 되도록 줄바꿈하세요
- 절(verse)과 후렴(chorus)을 모두 포함하세요
- 가사만 출력하고 다른 설명은 하지 마세요
- 모르는 찬양이면 "알 수 없는 찬양입니다"라고만 답하세요

다음 찬양의 정확한 가사를 알려주세요: "${title}"`;

    const result = await model.generateContent(prompt);
    const lyrics = result.response.text()?.trim() || '';

    if (lyrics && !lyrics.includes('알 수 없는 찬양')) {
      return Response.json({
        lyrics,
        source: 'ai_search',
        message: `Gemini AI가 "${title}" 가사를 찾았습니다. 정확도를 확인해주세요.`,
      });
    }

    return Response.json({
      lyrics: '',
      source: 'none',
      message: `"${title}" 가사를 찾을 수 없습니다. 직접 입력해주세요.`,
    });
  } catch (e) {
    console.error('AI search error:', e);
    return Response.json({
      lyrics: '',
      source: 'none',
      message: '가사를 찾을 수 없습니다. 직접 입력해주세요.',
    });
  }
}

// ─── Utility Functions ───────────────────────────────────────────────

interface TranscriptItem {
  text: string;
  duration: number;
  offset: number;
}

function formatTranscriptToLyrics(items: TranscriptItem[]): string {
  const lines: string[] = [];
  let currentLine = '';
  let lastOffset = 0;

  for (const item of items) {
    const text = item.text
      .replace(/\[.*?\]/g, '')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/<[^>]*>/g, '')
      .trim();

    if (!text) continue;

    const timeDiff = item.offset - lastOffset;
    if (timeDiff > 2000 && currentLine) {
      lines.push(currentLine.trim());
      currentLine = text;
    } else {
      currentLine = currentLine ? `${currentLine} ${text}` : text;
    }
    lastOffset = item.offset;
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  const dedupedLines = lines.filter((line, i) => i === 0 || line !== lines[i - 1]);
  return dedupedLines.join('\n');
}

// Check if text contains enough Korean characters (at least 30%)
function isKoreanText(text: string): boolean {
  const cleaned = text.replace(/\s+/g, '');
  if (cleaned.length === 0) return false;
  const koreanChars = cleaned.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g);
  const koreanRatio = (koreanChars?.length || 0) / cleaned.length;
  return koreanRatio > 0.3;
}
