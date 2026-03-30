'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Music, Download, PlayCircle, Loader2, FileText, Palette, Sparkles, Plus, Trash2, ChevronDown, ChevronUp, Save, X } from 'lucide-react';

interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

interface SongItem {
  id: string;
  url: string;
  videoInfo: VideoInfo | null;
  lyrics: string;
  lyricsSource: string;
  loadingVideo: boolean;
  loadingLyrics: boolean;
  collapsed: boolean;
}

const THEMES = [
  { id: 'basic', name: '기본', color: '#ffffff', accent: '#333333', textDark: true },
  { id: 'dark', name: '어두운', color: '#1a1a2e', accent: '#e94560' },
  { id: 'light', name: '밝은', color: '#f5f0eb', accent: '#c49a6c', textDark: true },
  { id: 'cross', name: '십자가', color: '#1b1b3a', accent: '#f0c38e' },
  { id: 'royal', name: '왕의왕', color: '#1a0a2e', accent: '#d4af37' },
  { id: 'holiness', name: '거룩', color: '#0d0d0d', accent: '#c9b037' },
  { id: 'nature', name: '자연', color: '#2d6a4f', accent: '#95d5b2' },
  { id: 'ocean', name: '바다', color: '#0c2d48', accent: '#6cb4ee' },
  { id: 'dawn', name: '새벽', color: '#2d1b4e', accent: '#ff9a76' },
  { id: 'sky', name: '하늘', color: '#4a90d9', accent: '#ffe066' },
  { id: 'autumn', name: '가을', color: '#5c3317', accent: '#e8a838' },
  { id: 'calm', name: '고요', color: '#1a2332', accent: '#7eb8c9' },
  { id: 'fire', name: '성령', color: '#2d0a0a', accent: '#ff4500' },
  { id: 'joy', name: '기쁨', color: '#fff8e7', accent: '#ff6b35', textDark: true },
  { id: 'grace', name: '은혜', color: '#1e1233', accent: '#c4a7e7' },
  { id: 'christmas', name: '성탄', color: '#1a3c2a', accent: '#e8383b' },
  { id: 'easter', name: '부활', color: '#f9f4ef', accent: '#d4a76a', textDark: true },
  // 키즈
  { id: 'kids-rainbow', name: '🌈 무지개', color: '#fff0f5', accent: '#ff69b4', textDark: true },
  { id: 'kids-space', name: '🚀 우주', color: '#0b0b3b', accent: '#00d4ff' },
  { id: 'kids-animal', name: '🐻 동물', color: '#fff8dc', accent: '#ff8c00', textDark: true },
  { id: 'kids-candy', name: '🍭 캔디', color: '#ffe4f0', accent: '#ff1493', textDark: true },
  { id: 'kids-ocean', name: '🐠 바닷속', color: '#006994', accent: '#00e5ff' },
  { id: 'kids-forest', name: '🌲 숲속', color: '#228b22', accent: '#ffd700' },
];

const FONTS = [
  { id: 'malgun', name: '맑은 고딕', fontFace: 'Malgun Gothic' },
  { id: 'nanum-gothic', name: '나눔고딕', fontFace: 'NanumGothic' },
  { id: 'nanum-myeongjo', name: '나눔명조', fontFace: 'NanumMyeongjo' },
  { id: 'gulim', name: '굴림', fontFace: 'Gulim' },
  { id: 'batang', name: '바탕', fontFace: 'Batang' },
  { id: 'dotum', name: '돋움', fontFace: 'Dotum' },
  { id: 'gungsuh', name: '궁서', fontFace: 'Gungsuh' },
  { id: 'arial', name: 'Arial', fontFace: 'Arial' },
];

function createSong(): SongItem {
  return { id: crypto.randomUUID(), url: '', videoInfo: null, lyrics: '', lyricsSource: '', loadingVideo: false, loadingLyrics: false, collapsed: false };
}

// localStorage helpers for saved lyrics
function loadSavedLyrics(): Array<{ title: string; lyrics: string }> {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('worship-slides-lyrics') || '[]');
  } catch { return []; }
}

function saveLyricsToStorage(title: string, lyrics: string) {
  const db = loadSavedLyrics();
  const existing = db.findIndex(s => s.title === title);
  if (existing >= 0) {
    db[existing].lyrics = lyrics;
  } else {
    db.push({ title, lyrics });
  }
  localStorage.setItem('worship-slides-lyrics', JSON.stringify(db));
}

export default function Home() {
  const [songs, setSongs] = useState<SongItem[]>([createSong()]);
  const [theme, setTheme] = useState('basic');
  const [deco, setDeco] = useState('none');
  const [font, setFont] = useState('malgun');
  const [linesPerSlide, setLinesPerSlide] = useState(4);
  const [loadingPpt, setLoadingPpt] = useState(false);
  const [error, setError] = useState('');

  const updateSong = useCallback((id: string, updates: Partial<SongItem>) => {
    setSongs(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const addSong = () => setSongs(prev => [...prev, createSong()]);

  const removeSong = (id: string) => {
    if (songs.length <= 1) return;
    setSongs(prev => prev.filter(s => s.id !== id));
  };

  const fetchVideoInfo = async (song: SongItem) => {
    if (!song.url.trim()) return;
    updateSong(song.id, { loadingVideo: true });
    try {
      const res = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: song.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      updateSong(song.id, { videoInfo: data, loadingVideo: false });
      await fetchLyrics(song.id, data.id, data.title);
    } catch (e) {
      setError(e instanceof Error ? e.message : '영상 정보를 가져올 수 없습니다.');
      updateSong(song.id, { loadingVideo: false });
    }
  };

  const fetchLyrics = async (songId: string, videoId: string, videoTitle?: string) => {
    updateSong(songId, { loadingLyrics: true });
    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, title: videoTitle }),
      });
      const data = await res.json();
      updateSong(songId, {
        lyrics: data.lyrics || '',
        lyricsSource: data.message || '',
        loadingLyrics: false,
      });
    } catch {
      updateSong(songId, { lyricsSource: '가사 추출 중 오류가 발생했습니다.', loadingLyrics: false });
    }
  };

  const searchByTitle = async (song: SongItem) => {
    if (!song.videoInfo) return;
    updateSong(song.id, { loadingLyrics: true });
    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: song.videoInfo.title, mode: 'search' }),
      });
      const data = await res.json();
      updateSong(song.id, {
        lyrics: data.lyrics || '',
        lyricsSource: data.message || '',
        loadingLyrics: false,
      });
    } catch {
      updateSong(song.id, { lyricsSource: '가사 검색 중 오류가 발생했습니다.', loadingLyrics: false });
    }
  };

  const generatePpt = async () => {
    const validSongs = songs.filter(s => s.lyrics.trim());
    if (validSongs.length === 0) {
      setError('최소 한 곡의 가사를 입력해주세요.');
      return;
    }
    setLoadingPpt(true);
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songs: validSongs.map(s => ({ title: s.videoInfo?.title || '찬양', lyrics: s.lyrics })),
          theme,
          deco,
          font: FONTS.find(f => f.id === font)?.fontFace || 'Malgun Gothic',
          linesPerSlide,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        let errorMsg = 'PPT 생성 중 오류가 발생했습니다.';
        try { errorMsg = JSON.parse(text).error || errorMsg; } catch { /* use default */ }
        throw new Error(errorMsg);
      }
      const arrayBuffer = await res.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = (validSongs.length === 1
        ? `${validSongs[0].videoInfo?.title || 'worship'}.pptx`
        : `예배찬양_${validSongs.length}곡.pptx`
      ).replace(/[/\\?%*:|"<>]/g, '_');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PPT 생성 중 오류가 발생했습니다.');
    } finally {
      setLoadingPpt(false);
    }
  };

  const songsWithLyrics = songs.filter(s => s.lyrics.trim()).length;

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a]">
      {/* Header */}
      <header className="border-b-3 border-[#1a1a1a] bg-[#a8d8ea]">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-4">
          <div className="p-2.5 bg-[#ffde59] border-3 border-[#1a1a1a] neo-shadow-sm">
            <Music className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase">WorshipSlides</h1>
            <p className="text-sm font-bold text-[#1a1a1a]/70">찬양 프레젠테이션 자동 생성</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Error */}
        {error && (
          <div role="alert" className="bg-[#ff6b6b] border-3 border-[#1a1a1a] neo-shadow px-4 py-3 text-[#1a1a1a] text-sm font-bold flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} aria-label="에러 닫기" className="p-1 hover:bg-[#1a1a1a]/10">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Songs List */}
        <div className="space-y-5">
          {songs.map((song, index) => (
            <section key={song.id} aria-label={song.videoInfo?.title || `곡 ${index + 1}`} className="bg-white border-3 border-[#1a1a1a] neo-shadow overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-[#c3f0ca] border-b-3 border-[#1a1a1a]">
                <button
                  type="button"
                  aria-expanded={!song.collapsed}
                  aria-controls={`song-panel-${song.id}`}
                  className="flex-1 flex items-center gap-3 text-left py-1"
                  onClick={() => updateSong(song.id, { collapsed: !song.collapsed })}
                >
                  <span className="w-9 h-9 bg-[#ffde59] border-2 border-[#1a1a1a] flex items-center justify-center text-sm font-black shrink-0">
                    {index + 1}
                  </span>
                  <span className="font-bold truncate">
                    {song.videoInfo?.title || `곡 ${index + 1}`}
                  </span>
                  {song.lyrics && (
                    <span className="text-xs bg-[#a8d8ea] border-2 border-[#1a1a1a] px-2 py-0.5 font-bold shrink-0">OK</span>
                  )}
                  {song.collapsed ? <ChevronDown className="w-5 h-5 shrink-0 ml-auto" /> : <ChevronUp className="w-5 h-5 shrink-0 ml-auto" />}
                </button>
                <div className="flex items-center gap-2 ml-2">
                  {songs.length > 1 && (
                    <button
                      type="button"
                      aria-label={`${song.videoInfo?.title || `곡 ${index + 1}`} 삭제`}
                      onClick={() => removeSong(song.id)}
                      className="p-2 bg-[#ff6b6b] border-2 border-[#1a1a1a] neo-btn text-[#1a1a1a] hover:bg-[#ff4444]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {!song.collapsed && (
                <div id={`song-panel-${song.id}`} className="px-5 pb-5 space-y-4 pt-4">
                  {/* URL Input */}
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={song.url}
                      onChange={(e) => updateSong(song.id, { url: e.target.value })}
                      placeholder="YouTube URL을 입력하세요..."
                      className="flex-1 bg-white border-3 border-[#1a1a1a] px-4 py-3 text-[#1a1a1a] placeholder-[#999] focus:outline-none focus:ring-0 text-sm font-medium neo-shadow-sm"
                      onKeyDown={(e) => e.key === 'Enter' && fetchVideoInfo(song)}
                    />
                    <button
                      onClick={() => fetchVideoInfo(song)}
                      disabled={song.loadingVideo || !song.url.trim()}
                      className="bg-[#a8d8ea] border-3 border-[#1a1a1a] neo-btn disabled:opacity-50 disabled:cursor-not-allowed px-5 py-3 font-bold flex items-center gap-2 whitespace-nowrap text-sm"
                    >
                      {song.loadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                      가져오기
                    </button>
                  </div>

                  {/* Video Info */}
                  {song.videoInfo && (
                    <div className="flex gap-4 bg-[#fff3cd] border-3 border-[#1a1a1a] p-3 items-center neo-shadow-sm">
                      <Image src={song.videoInfo.thumbnail} alt={`${song.videoInfo.title} 썸네일`} width={128} height={80} className="w-32 h-20 object-cover border-2 border-[#1a1a1a]" />
                      <div>
                        <h3 className="font-bold text-sm">{song.videoInfo.title}</h3>
                        <p className="text-xs font-medium text-[#1a1a1a]/60 mt-1">{song.videoInfo.channelTitle}</p>
                      </div>
                    </div>
                  )}

                  {/* Lyrics */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        가사
                      </span>
                      {song.videoInfo && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => fetchLyrics(song.id, song.videoInfo!.id, song.videoInfo!.title)}
                            disabled={song.loadingLyrics}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d4a5ff] border-2 border-[#1a1a1a] neo-btn disabled:opacity-50 text-xs font-bold"
                          >
                            {song.loadingLyrics ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            AI 추출
                          </button>
                          <button
                            onClick={() => searchByTitle(song)}
                            disabled={song.loadingLyrics}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#a8d8ea] border-2 border-[#1a1a1a] neo-btn disabled:opacity-50 text-xs font-bold"
                          >
                            {song.loadingLyrics ? <Loader2 className="w-3 h-3 animate-spin" /> : <Music className="w-3 h-3" />}
                            제목 검색
                          </button>
                        </div>
                      )}
                    </div>
                    {song.lyricsSource && (
                      <p className="text-xs font-bold bg-[#e8d5f5] border-2 border-[#1a1a1a] px-3 py-1.5">{song.lyricsSource}</p>
                    )}
                    <textarea
                      value={song.lyrics}
                      onChange={(e) => updateSong(song.id, { lyrics: e.target.value })}
                      placeholder="가사를 입력하세요..."
                      rows={6}
                      className="w-full bg-white border-3 border-[#1a1a1a] px-4 py-3 text-[#1a1a1a] placeholder-[#999] focus:outline-none focus:ring-0 resize-none text-sm font-medium neo-shadow-sm"
                    />
                    {song.lyrics.trim() && (
                      <button
                        onClick={() => {
                          const songTitle = song.videoInfo?.title || `곡 ${index + 1}`;
                          saveLyricsToStorage(songTitle, song.lyrics);
                          updateSong(song.id, { lyricsSource: `"${songTitle}" 가사가 브라우저에 저장되었습니다.` });
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c3f0ca] border-2 border-[#1a1a1a] neo-btn text-xs font-bold"
                      >
                        <Save className="w-3 h-3" />
                        가사 저장 (브라우저)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Add Song */}
        <button
          onClick={addSong}
          className="w-full border-3 border-dashed border-[#1a1a1a] bg-white hover:bg-[#ffde59] py-4 flex items-center justify-center gap-2 font-bold transition-colors"
        >
          <Plus className="w-5 h-5" />
          곡 추가
        </button>

        {/* Settings */}
        <section className="bg-white border-3 border-[#1a1a1a] neo-shadow p-6 space-y-6">
          <h2 className="text-lg font-black flex items-center gap-2 uppercase">
            <Palette className="w-5 h-5" />
            PPT 설정
          </h2>

          {/* Theme */}
          <div className="space-y-3">
            <span className="text-sm font-bold">테마</span>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`relative border-2 border-[#1a1a1a] p-2.5 text-center transition-all ${
                    theme === t.id ? 'neo-shadow-sm scale-105 ring-2 ring-[#ffde59]' : 'hover:neo-shadow-sm opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: t.color }}
                >
                  <div className="w-6 h-1.5 mx-auto mb-1.5" style={{ backgroundColor: t.accent }} />
                  <span className={`text-xs font-bold ${t.textDark ? 'text-[#1a1a1a]' : 'text-white'}`}>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Decoration */}
          <div className="space-y-3">
            <span className="text-sm font-bold">장식 스타일</span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { id: 'none', name: '없음', emoji: '—' },
                { id: 'stars', name: '별', emoji: '⭐' },
                { id: 'hearts', name: '하트', emoji: '❤️' },
                { id: 'notes', name: '음표', emoji: '🎵' },
                { id: 'clouds', name: '구름', emoji: '☁️' },
                { id: 'animals', name: '동물', emoji: '🐑' },
                { id: 'flowers', name: '꽃', emoji: '🌸' },
                { id: 'rainbow', name: '무지개', emoji: '🌈' },
                { id: 'cross', name: '십자가', emoji: '✝️' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDeco(d.id)}
                  className={`border-2 border-[#1a1a1a] px-3 py-2 text-center transition-all ${
                    deco === d.id ? 'bg-[#ffde59] neo-shadow-sm' : 'bg-white hover:bg-[#f5f0e8]'
                  }`}
                >
                  <span className="text-lg">{d.emoji}</span>
                  <p className="text-xs font-bold mt-1">{d.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Lines per slide */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">슬라이드당 줄 수</span>
            <div className="flex gap-2" role="group" aria-label="슬라이드당 줄 수 선택">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => setLinesPerSlide(n)}
                  className={`w-10 h-10 border-2 border-[#1a1a1a] font-black transition-all ${
                    linesPerSlide === n ? 'bg-[#ffde59] neo-shadow-sm' : 'bg-white hover:bg-[#f5f0e8]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Font */}
          <div className="space-y-3">
            <span className="text-sm font-bold">글꼴</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FONTS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFont(f.id)}
                  className={`border-2 border-[#1a1a1a] px-4 py-3 text-center transition-all ${
                    font === f.id ? 'bg-[#a8d8ea] neo-shadow-sm' : 'bg-white hover:bg-[#f5f0e8]'
                  }`}
                >
                  <span className="text-sm font-bold" style={{ fontFamily: f.fontFace }}>{f.name}</span>
                  <p className="text-xs text-[#1a1a1a]/50 mt-1 font-medium" style={{ fontFamily: f.fontFace }}>하나님의 은혜</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Generate Button */}
        <button
          onClick={generatePpt}
          disabled={loadingPpt || songsWithLyrics === 0}
          className="w-full bg-[#ffde59] border-3 border-[#1a1a1a] neo-shadow-lg disabled:opacity-50 disabled:cursor-not-allowed py-5 font-black text-lg uppercase flex items-center justify-center gap-3"
        >
          {loadingPpt ? (
            <><Loader2 className="w-5 h-5 animate-spin" />PPT 생성 중...</>
          ) : (
            <><Download className="w-5 h-5" />PPT 생성 및 다운로드 ({songsWithLyrics}곡)</>
          )}
        </button>

        <footer className="text-center text-xs font-bold text-[#1a1a1a]/40 pt-8 pb-4">
          WorshipSlides — 찬양을 위한 프레젠테이션 생성기
        </footer>
      </main>
    </div>
  );
}
