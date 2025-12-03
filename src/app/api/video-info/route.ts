import { NextRequest, NextResponse } from 'next/server';

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    console.log('Fetching video info for:', videoId);

    // Use RapidAPI YouTube API to bypass bot detection
    const apiKey = process.env.RAPIDAPI_KEY;
    
    if (!apiKey) {
      console.error('RAPIDAPI_KEY not configured');
      return NextResponse.json(
        { error: 'API configuration missing. Please set RAPIDAPI_KEY environment variable.' },
        { status: 500 }
      );
    }

    const response = await fetch(`https://yt-api.p.rapidapi.com/dl?id=${videoId}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'yt-api.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      console.error('RapidAPI error:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Failed to fetch video info: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Transform API response to match our existing format
    const qualities = [];
    
    // Parse video formats from API response
    if (data.formats) {
      const formatMap = new Map<string, any>();
      
      data.formats.forEach((format: any) => {
        const height = format.height || format.qualityLabel?.match(/(\d+)p/)?.[1];
        if (!height || height < 144) return;
        
        const quality = `${height}p`;
        const existing = formatMap.get(quality);
        const filesize = format.filesize || format.contentLength || 0;
        
        if (!existing || filesize > existing.size) {
          formatMap.set(quality, {
            quality,
            size: filesize,
            itag: format.itag || format.formatId,
            container: format.ext || 'mp4',
            hasAudio: format.hasAudio !== false,
            fps: format.fps || 30,
            vcodec: format.vcodec || 'video',
            acodec: format.acodec || 'audio'
          });
        }
      });
      
      qualities.push(...Array.from(formatMap.values())
        .sort((a, b) => parseInt(b.quality) - parseInt(a.quality)));
    }

    // If no formats parsed, create default qualities
    if (qualities.length === 0) {
      qualities.push(
        { quality: '1080p', size: 0, itag: '137', container: 'mp4', hasAudio: true, fps: 30, vcodec: 'video', acodec: 'audio' },
        { quality: '720p', size: 0, itag: '136', container: 'mp4', hasAudio: true, fps: 30, vcodec: 'video', acodec: 'audio' },
        { quality: '480p', size: 0, itag: '135', container: 'mp4', hasAudio: true, fps: 30, vcodec: 'video', acodec: 'audio' },
        { quality: '360p', size: 0, itag: '134', container: 'mp4', hasAudio: true, fps: 30, vcodec: 'video', acodec: 'audio' }
      );
    }

    const videoInfo = {
      title: data.title || 'Unknown Title',
      thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || '',
      author: data.author || data.uploader || 'Unknown',
      duration: String(data.duration || data.lengthSeconds || 0),
      qualities: qualities,
      audioFormat: {
        itag: 'audio',
        abr: 128,
        size: 0,
        container: 'mp3'
      }
    };

    return NextResponse.json(videoInfo);
  } catch (error: any) {
    console.error('Error fetching video info:', error);
    return NextResponse.json(
      { error: `Failed to fetch video information: ${error.message}` },
      { status: 500 }
    );
  }
}