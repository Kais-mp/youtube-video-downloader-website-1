import { NextRequest, NextResponse } from 'next/server';
import YTDlpWrap from 'yt-dlp-wrap';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Store binary in tmp directory for serverless compatibility
const binaryPath = path.join(os.tmpdir(), 'yt-dlp');

// Ensure binary is downloaded (only once)
let binaryReady = false;
let downloadPromise: Promise<void> | null = null;

async function ensureBinary() {
  if (binaryReady) return;
  
  if (!downloadPromise) {
    downloadPromise = (async () => {
      try {
        if (!fs.existsSync(binaryPath)) {
          console.log('Downloading yt-dlp binary...');
          await YTDlpWrap.downloadFromGithub(binaryPath);
          fs.chmodSync(binaryPath, 0o755);
          console.log('yt-dlp binary downloaded successfully');
        }
        binaryReady = true;
      } catch (error) {
        console.error('Failed to download yt-dlp:', error);
        throw error;
      }
    })();
  }
  
  await downloadPromise;
}

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

    // Ensure binary is ready
    await ensureBinary();

    // Initialize yt-dlp with binary path
    const ytDlpWrap = new YTDlpWrap(binaryPath);

    console.log('Fetching video info...');

    // Get video info using yt-dlp with simpler format selection
    const info: any = await ytDlpWrap.getVideoInfo([
      url,
      '--no-warnings',
      '--no-playlist',
    ]);

    // Extract available formats
    const formats = info.formats || [];
    
    // Create quality map - prefer formats with both video and audio
    const qualityMap = new Map<string, any>();
    
    formats.forEach((format: any) => {
      const height = format.height;
      if (!height || !format.vcodec || format.vcodec === 'none') return;
      
      const quality = `${height}p`;
      const hasAudio = format.acodec && format.acodec !== 'none';
      const existing = qualityMap.get(quality);
      
      // Prefer formats with both video and audio
      if (!existing || (hasAudio && !existing.hasAudio)) {
        qualityMap.set(quality, {
          quality,
          size: format.filesize || format.filesize_approx || 0,
          itag: format.format_id,
          container: format.ext || 'mp4',
          hasAudio
        });
      }
    });

    // Convert to array and sort by quality (descending)
    const qualities = Array.from(qualityMap.values())
      .sort((a, b) => parseInt(b.quality) - parseInt(a.quality));

    console.log('Available qualities:', qualities.map(q => `${q.quality} (audio: ${q.hasAudio})`));

    const videoInfo = {
      title: info.title || 'Unknown Title',
      thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || '',
      author: info.uploader || info.channel || 'Unknown',
      duration: String(info.duration || 0),
      qualities: qualities,
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