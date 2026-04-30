# WorshipSlides

**YouTube 찬양 영상에서 가사를 자동 추출하고, 예배용 PPT를 즉시 생성하는 웹 서비스**

> 주일 아침, 찬양 PPT 만드느라 고생하셨죠?
> 이제 URL 하나면 끝입니다.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/su-wone/worship-slides)

**Live Demo**: [worship-slides.vercel.app](https://worship-slides.vercel.app)

---

## 이런 분들을 위해 만들었습니다

- 매주 찬양 PPT를 만들어야 하는 **교회 미디어 봉사자**
- 예배 직전에 급하게 찬양이 바뀌는 상황을 겪는 **예배 인도자**
- 여러 곡의 PPT를 한 번에 준비해야 하는 **찬양팀 리더**
- 주일학교/여름성경학교 찬양 PPT가 필요한 **교사**

## 핵심 기능

### 1. 가사 자동 추출
YouTube URL만 입력하면 가사를 자동으로 찾아옵니다.

- **내장 DB** - 자주 부르는 찬양 가사 수록
- **웹 검색** - Bugs 음원 사이트에서 가사 검색
- **YouTube 자막** - 영상 자막에서 가사 추출
- **AI 교정** - Gemini AI가 자막을 정확한 가사로 교정

4단계 폴백으로 대부분의 찬양 가사를 자동으로 찾아줍니다.

### 2. 다양한 테마 & 커스터마이징

| 구분 | 옵션 |
|------|------|
| 테마 | 23종 (기본, 어두운, 밝은, 십자가, 왕의왕, 거룩, 자연, 바다, 새벽 등) |
| 키즈 테마 | 6종 (무지개, 우주, 동물, 캔디, 바닷속, 숲속) |
| 장식 | 9종 (별, 하트, 음표, 구름, 동물, 꽃, 무지개, 십자가) |
| 글꼴 | 8종 (맑은 고딕, 나눔고딕, 나눔명조, 굴림, 바탕 등) |
| 줄 수 | 슬라이드당 2~6줄 조절 가능 |

### 3. 다곡 지원
여러 곡을 한 번에 추가하고, 하나의 PPT 파일로 생성합니다.
곡마다 타이틀 슬라이드가 자동 삽입되고, 마지막에 "아멘" 슬라이드로 마무리됩니다.

### 4. 한국어 가사 최적화
- 한국어 문장 구조에 맞는 자동 줄바꿈
- 종결어미 기반 프레이즈 분리
- 구간 표시(후렴, 1절 등) 자동 제거

---

## 시작하기

### 요구사항
- Node.js 18+
- npm

### 설치 & 실행

```bash
# 저장소 클론
git clone https://github.com/su-wone/worship-slides.git
cd worship-slides

# 의존성 설치
npm install

# 환경변수 설정 (선택)
cp .env.example .env.local
# .env.local에 Gemini API 키 입력 (AI 가사 추출 기능 활성화)

# 개발 서버 실행
npm run dev
```

http://localhost:3000 에서 확인하세요.

### 환경변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `GEMINI_API_KEY` | 선택 | Google AI Studio에서 발급. AI 가사 추출/교정 기능 활성화. 없어도 기본 기능은 동작합니다. |

API 키 발급: https://aistudio.google.com/apikey

---

## 사용 방법

1. **YouTube URL 입력** - 찬양 영상 URL을 붙여넣고 "가져오기" 클릭
2. **가사 확인** - 자동 추출된 가사를 확인하고 필요시 수정
3. **설정 선택** - 테마, 장식, 글꼴, 줄 수를 선택
4. **PPT 다운로드** - "PPT 생성 및 다운로드" 클릭

여러 곡이 필요하면 "곡 추가" 버튼으로 추가하세요.

---

## 기술 스택

- **프레임워크**: Next.js 16 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS 4
- **PPT 생성**: PptxGenJS
- **AI**: Google Gemini API
- **자막 추출**: youtube-transcript
- **웹 스크래핑**: Cheerio
- **배포**: Vercel

---

## 배포

### Vercel (권장)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/su-wone/worship-slides)

1. 위 버튼 클릭 또는 `vercel` CLI 사용
2. 환경변수에 `GEMINI_API_KEY` 추가 (Settings → Environment Variables)
3. main 브랜치 push 시 자동 배포

---

## 라이선스

MIT

## 면책 사항

이 프로젝트는 교회 미디어 봉사자의 PPT 제작 부담을 줄이기 위해 만들어진 
**비영리/개인 사용 목적**의 도구입니다. 

- 추출된 가사는 예배 등 비상업적 용도로만 사용해주세요
- 상업적 용도로 사용 시 한국음악저작권협회(KOMCA) 등 적절한 라이선스가 필요합니다
- 본 프로젝트는 사용자의 적법한 사용을 전제로 제공됩니다
