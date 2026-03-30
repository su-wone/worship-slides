import { NextRequest } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'custom-lyrics.json');

interface CustomLyrics {
  title: string;
  lyrics: string;
  savedAt: string;
}

async function loadDB(): Promise<CustomLyrics[]> {
  try {
    const data = await readFile(DATA_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveDB(db: CustomLyrics[]): Promise<void> {
  await writeFile(DATA_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

// GET: 검색
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') || '';
  const db = await loadDB();

  if (!query) {
    return Response.json({ songs: db });
  }

  const normalizedQuery = query.toLowerCase().trim();
  const results = db.filter(song =>
    song.title.toLowerCase().includes(normalizedQuery)
  );

  return Response.json({ songs: results });
}

// POST: 저장 (새로 추가 또는 기존 업데이트)
export async function POST(request: NextRequest) {
  try {
    const { title, lyrics } = await request.json();

    if (!title || !lyrics) {
      return Response.json({ error: '제목과 가사가 필요합니다.' }, { status: 400 });
    }

    const db = await loadDB();
    const existing = db.findIndex(s => s.title === title);

    if (existing >= 0) {
      db[existing].lyrics = lyrics;
      db[existing].savedAt = new Date().toISOString();
    } else {
      db.push({ title, lyrics, savedAt: new Date().toISOString() });
    }

    await saveDB(db);
    return Response.json({ message: `"${title}" 가사가 저장되었습니다.`, count: db.length });
  } catch {
    return Response.json({ error: '저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE: 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { title } = await request.json();
    const db = await loadDB();
    const filtered = db.filter(s => s.title !== title);
    await saveDB(filtered);
    return Response.json({ message: `"${title}" 가사가 삭제되었습니다.` });
  } catch {
    return Response.json({ error: '삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
