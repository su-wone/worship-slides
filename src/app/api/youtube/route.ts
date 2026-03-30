import { NextRequest } from 'next/server';

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return Response.json({ error: 'URL이 필요합니다.' }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return Response.json({ error: '유효한 YouTube URL이 아닙니다.' }, { status: 400 });
    }

    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl);

    if (!res.ok) {
      return Response.json({ error: '영상 정보를 가져올 수 없습니다.' }, { status: 404 });
    }

    const data = await res.json();

    return Response.json({
      id: videoId,
      title: data.title,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      channelTitle: data.author_name,
    });
  } catch {
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
