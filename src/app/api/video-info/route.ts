import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

// Configure agent to bypass bot detection
const agent = ytdl.createAgent(undefined, {
  localAddress: undefined,
});

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

    // Get video info using ytdl-core with custom agent and headers
    const info = await ytdl.getInfo(url, {
      agent,
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0'
        }
      }
    });

    // Extract available formats
    const formats = info.formats || [];
    
    // Create quality map for video formats (with video codec)
    const qualityMap = new Map<string, any>();
    
    // Track best audio format for MP3 download
    let bestAudioFormat: any = null;
    
    formats.forEach((format: any) => {
      const height = format.height;
      const hasVideo = format.hasVideo;
      const hasAudio = format.hasAudio;
      
      // Track best audio-only format
      if (hasAudio && !hasVideo) {
        if (!bestAudioFormat || (format.audioBitrate || 0) > (bestAudioFormat.audioBitrate || 0)) {
          bestAudioFormat = format;
        }
      }
      
      // Only process video formats with reasonable height
      if (!height || !hasVideo || height < 144) return;
      
      const quality = `${height}p`;
      const existing = qualityMap.get(quality);
      
      // Get file size
      const filesize = parseInt(format.contentLength || '0');
      
      // Prefer formats with both video and audio
      if (!existing || (hasAudio && !existing.hasAudio) || filesize > existing.size) {
        qualityMap.set(quality, {
          quality,
          size: filesize,
          itag: format.itag,
          container: format.container || 'mp4',
          hasAudio,
          fps: format.fps || 30,
          vcodec: format.videoCodec || format.codecs,
          acodec: format.audioCodec || (hasAudio ? 'audio' : 'none')
        });
      }
    });

    // Convert to array and sort by quality (descending)
    const qualities = Array.from(qualityMap.values())
      .sort((a, b) => parseInt(b.quality) - parseInt(a.quality));

    console.log('Available video qualities:', qualities.length);
    console.log('Best audio format:', bestAudioFormat ? `${bestAudioFormat.audioBitrate}kbps` : 'none');

    const videoDetails = info.videoDetails;

    const videoInfo = {
      title: videoDetails.title || 'Unknown Title',
      thumbnail: videoDetails.thumbnails?.[videoDetails.thumbnails.length - 1]?.url || '',
      author: videoDetails.author?.name || videoDetails.ownerChannelName || 'Unknown',
      duration: String(videoDetails.lengthSeconds || 0),
      qualities: qualities,
      audioFormat: bestAudioFormat ? {
        itag: bestAudioFormat.itag,
        abr: bestAudioFormat.audioBitrate || 128,
        size: parseInt(bestAudioFormat.contentLength || '0'),
        container: bestAudioFormat.container || 'm4a'
      } : null
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