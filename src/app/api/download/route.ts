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
    const { url, itag, quality } = await request.json();

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    console.log(`Downloading video ${videoId} with quality ${quality || itag}...`);

    // Ensure binary is ready
    await ensureBinary();

    // Initialize yt-dlp with binary path
    const ytDlpWrap = new YTDlpWrap(binaryPath);
    
    // Get video info to get title and verify format
    const info: any = await ytDlpWrap.getVideoInfo([url, '--no-warnings']);
    const title = info.title || 'video';
    const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;

    // Build format selector based on quality or itag
    let formatSelector: string;
    
    if (quality) {
      // Use quality-based selector (more reliable)
      const height = parseInt(quality.replace('p', ''));
      // Select best format with requested height that has both video and audio
      formatSelector = `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`;
    } else {
      // Try to use specific format ID, with fallback
      formatSelector = `${itag}/best`;
    }

    console.log('Starting download with format selector:', formatSelector);

    // Create a readable stream from yt-dlp
    const ytDlpStream = ytDlpWrap.execStream([
      url,
      '-f', formatSelector,
      '-o', '-', // Output to stdout
      '--no-warnings',
      '--no-playlist',
      '--quiet',
      '--merge-output-format', 'mp4', // Ensure mp4 output
    ]);

    // Convert Node.js stream to Web Stream
    const webStream = new ReadableStream({
      start(controller) {
        ytDlpStream.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        
        ytDlpStream.on('end', () => {
          console.log('Download complete');
          controller.close();
        });
        
        ytDlpStream.on('error', (error: Error) => {
          console.error('Stream error:', error);
          controller.error(error);
        });
      },
      cancel() {
        ytDlpStream.destroy();
      }
    });

    // Set headers for download
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Content-Type', 'video/mp4');
    headers.set('Cache-Control', 'no-cache');

    return new NextResponse(webStream, { headers });
  } catch (error: any) {
    console.error('Error downloading video:', error);
    return NextResponse.json(
      { error: `Failed to download video: ${error.message}` },
      { status: 500 }
    );
  }
}