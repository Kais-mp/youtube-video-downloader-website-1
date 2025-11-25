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
  let tempFilePath: string | null = null;
  
  try {
    const { url, itag, quality, downloadType = 'video' } = await request.json();

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    console.log(`Downloading ${downloadType} ${videoId} with quality ${quality || itag}...`);

    // Ensure binary is ready
    await ensureBinary();

    // Initialize yt-dlp with binary path
    const ytDlpWrap = new YTDlpWrap(binaryPath);
    
    // Get video info to get title
    const info: any = await ytDlpWrap.getVideoInfo([url, '--no-warnings']);
    const title = info.title || 'video';
    
    let formatSelector: string;
    let filename: string;
    let contentType: string;
    let outputFormat: string;

    if (downloadType === 'audio' || downloadType === 'mp3') {
      // Audio/MP3 download - can stream directly
      filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;
      contentType = 'audio/mpeg';
      outputFormat = 'mp3';
      
      // Select best audio format
      if (itag) {
        formatSelector = `${itag}`;
      } else {
        formatSelector = 'bestaudio';
      }

      console.log('Starting audio download with format selector:', formatSelector);

      const ytDlpArgs = [
        url,
        '-f', formatSelector,
        '-o', '-', // Output to stdout
        '--no-warnings',
        '--no-playlist',
        '--quiet',
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '0'
      ];

      const ytDlpStream = ytDlpWrap.execStream(ytDlpArgs);

      // Convert Node.js stream to Web Stream
      const webStream = new ReadableStream({
        start(controller) {
          ytDlpStream.on('data', (chunk: Buffer) => {
            controller.enqueue(new Uint8Array(chunk));
          });
          
          ytDlpStream.on('end', () => {
            console.log('Audio download complete');
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

      const headers = new Headers();
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
      headers.set('Content-Type', contentType);
      headers.set('Cache-Control', 'no-cache');

      return new NextResponse(webStream, { headers });

    } else {
      // Video download - MUST use temp file for proper video+audio merging
      filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
      contentType = 'video/mp4';
      outputFormat = 'mp4';
      
      // Create temp file path with sanitized filename
      const tempDir = os.tmpdir();
      const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
      const timestamp = Date.now();
      tempFilePath = path.join(tempDir, `yt_${timestamp}_${videoId}.mp4`);
      
      console.log('Temp file will be saved to:', tempFilePath);
      
      // FIXED: Always merge video+audio, prefer formats with built-in audio
      if (quality) {
        const height = parseInt(quality.replace('p', ''));
        // Try to get format with both video and audio first, then fall back to merging
        formatSelector = `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`;
      } else if (itag) {
        // If specific itag provided, check if it has audio, if not merge with best audio
        formatSelector = `${itag}+bestaudio/best`;
      } else {
        formatSelector = `bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best`;
      }

      console.log('Starting video download with format selector:', formatSelector);

      // Download to temp file (required for ffmpeg merging)
      const ytDlpArgs = [
        url,
        '-f', formatSelector,
        '-o', tempFilePath,
        '--no-warnings',
        '--no-playlist',
        '--merge-output-format', 'mp4',
        '--postprocessor-args', 'ffmpeg:-c:v copy -c:a aac',
        '--no-mtime',
        '--no-progress'
      ];

      try {
        // Execute download and wait for completion
        console.log('Executing yt-dlp...');
        await ytDlpWrap.execPromise(ytDlpArgs);
        console.log('yt-dlp execution completed');
      } catch (downloadError: any) {
        console.error('yt-dlp download error:', downloadError);
        throw new Error(`Download failed: ${downloadError.message || 'Unknown error'}`);
      }
      
      // Verify file exists
      if (!fs.existsSync(tempFilePath)) {
        // Check if file was created with different extension
        const possiblePaths = [
          tempFilePath,
          tempFilePath.replace('.mp4', '.mkv'),
          tempFilePath.replace('.mp4', '.webm'),
          `${tempFilePath}.part`
        ];
        
        let foundPath: string | null = null;
        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            foundPath = possiblePath;
            console.log('Found file at alternate path:', foundPath);
            break;
          }
        }
        
        if (!foundPath) {
          // List files in temp directory for debugging
          const tempFiles = fs.readdirSync(tempDir).filter(f => f.includes(videoId) || f.includes(timestamp.toString()));
          console.error('Expected file not found. Files in temp dir matching pattern:', tempFiles);
          throw new Error(`Downloaded file not found at expected location: ${tempFilePath}`);
        }
        
        tempFilePath = foundPath;
      }
      
      console.log('Video download and merge complete, reading file from:', tempFilePath);

      // Read the merged file
      const fileBuffer = fs.readFileSync(tempFilePath);
      
      console.log(`File size: ${fileBuffer.length} bytes`);

      // Clean up temp file
      fs.unlinkSync(tempFilePath);
      tempFilePath = null;

      // Return the merged video file
      const headers = new Headers();
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
      headers.set('Content-Type', contentType);
      headers.set('Content-Length', fileBuffer.length.toString());
      headers.set('Cache-Control', 'no-cache');

      return new NextResponse(fileBuffer, { headers });
    }
  } catch (error: any) {
    console.error('Error downloading:', error);
    
    // Clean up temp file if it exists
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
    
    return NextResponse.json(
      { error: `Failed to download: ${error.message}` },
      { status: 500 }
    );
  }
}