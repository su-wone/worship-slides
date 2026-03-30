/**
 * 한국어 찬양 가사 줄바꿈 최적화
 * - 자연스러운 프레이즈 단위로 줄을 끊음
 * - 한국어 문장 종결어미 기반 분리
 */

// PPT에 표시하면 안 되는 구간 표시 텍스트 제거
function removeSectionLabels(text: string): string {
  return text
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      // 구간 표시만 있는 줄 제거 (후렴, 1절, Chorus 등)
      if (/^(후렴|chorus|verse|bridge|intro|outro|간주|전주|1절|2절|3절|4절|5절|6절|ref|hook)\s*:?\s*$/i.test(trimmed)) {
        return '';
      }
      // 줄 앞의 구간 표시 제거 (예: "후렴: 주님의 사랑이" → "주님의 사랑이")
      return trimmed.replace(
        /^(후렴|chorus|verse|bridge|intro|outro|간주|전주|1절|2절|3절|4절|5절|6절|ref|hook)\s*:\s*/i,
        ''
      );
    })
    .join('\n');
}

/**
 * 가사 텍스트를 자연스러운 프레이즈 단위로 정리
 */
export function formatLyrics(rawLyrics: string): string {
  // 구간 표시 텍스트 제거
  const cleaned = removeSectionLabels(rawLyrics);

  // 이미 줄바꿈이 잘 되어 있으면 그대로 반환
  const lines = cleaned.split('\n').filter(l => l.trim());

  // 모든 줄을 처리: 15자 초과 줄은 자연스러운 위치에서 분리
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // PPT 슬라이드에 적합한 길이 (22자 이하)면 그대로
    if (trimmed.length <= 22) {
      result.push(trimmed);
      continue;
    }

    // 긴 줄을 자연스러운 프레이즈로 분리
    const phrases = splitKoreanPhrase(trimmed);
    result.push(...phrases);
  }

  return result.join('\n');
}

// 다음 단어와 붙어야 하는 짧은 관형사/접속사
const KEEP_WITH_NEXT = new Set(['그', '이', '저', '내', '네', '그의', '주', '참', '더', '한', '두', '세', '큰', '다', '온']);

// 이 패턴으로 끝나는 단어 뒤에서 줄바꿈 선호 (명사/동사어미/종결어미)
const PREFER_BREAK_AFTER = /(?:이름|사랑|예수님|주님|은혜|평화|감사|영광|십자가|믿음|소망|생명|세상|마음|축복|알아요|해요|해주세요|합니다|됩니다|있네|하네|하시네|구해요|깊어요|받아요|싶어요|할게요|주시죠|하시고|부르시네|살아가라|살아가게|삼아주시네|오시고|하신|주신|드려요|기다렸어요|예배합니다)$/;

/**
 * 긴 한국어 텍스트를 자연스러운 프레이즈로 분리 (목표: 줄당 4~8자)
 */
function splitKoreanPhrase(text: string): string[] {
  const words = text.split(/\s+/);
  const result: string[] = [];
  let current = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length <= 22) {
      current = candidate;

      // 프레이즈 끝 패턴이면 여기서 줄바꿈 (최소 4자 이상일 때)
      if (current.length >= 4 && PREFER_BREAK_AFTER.test(word)) {
        result.push(current);
        current = '';
      }
      continue;
    }

    // 글자수 초과 → 현재까지 모인 것을 줄로 확정
    if (current) {
      const currentWords = current.split(/\s+/);
      const lastWord = currentWords[currentWords.length - 1];

      if (currentWords.length > 1 && KEEP_WITH_NEXT.has(lastWord)) {
        result.push(currentWords.slice(0, -1).join(' '));
        current = lastWord + ' ' + word;
      } else {
        result.push(current);
        current = word;
      }
    } else {
      result.push(word);
      current = '';
    }
  }

  if (current) {
    if (current.length <= 2 && result.length > 0) {
      result[result.length - 1] += ' ' + current;
    } else {
      result.push(current);
    }
  }

  return result;
}

/**
 * 슬라이드용 가사 그룹 생성
 * 자연스러운 구절 단위로 그룹핑
 */
export function groupLyricsForSlides(lyrics: string, linesPerSlide: number): string[][] {
  const lines = lyrics.split('\n').filter(l => l.trim());
  const groups: string[][] = [];

  let currentGroup: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    currentGroup.push(line);

    // 그룹이 가득 찼을 때
    if (currentGroup.length >= linesPerSlide) {
      groups.push([...currentGroup]);
      currentGroup = [];
      continue;
    }

    // 빈 줄(원래 텍스트에서)은 절 구분으로 처리 → 슬라이드 분리
    // (이미 빈 줄은 필터링했으므로, 원본에서 연속 빈 줄을 감지)
  }

  // 남은 줄 처리
  if (currentGroup.length > 0) {
    // 이전 그룹이 있고 남은 줄이 1개뿐이면 이전 그룹에 합치기
    if (groups.length > 0 && currentGroup.length === 1) {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup.length < linesPerSlide + 1) {
        lastGroup.push(...currentGroup);
      } else {
        groups.push(currentGroup);
      }
    } else {
      groups.push(currentGroup);
    }
  }

  return groups;
}
