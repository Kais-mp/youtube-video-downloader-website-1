import { NextRequest, NextResponse } from 'next/server';
import YTDlpWrap from 'yt-dlp-wrap';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

// Check if ffmpeg is available
async function checkFfmpeg(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
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
  let videoFilePath: string | null = null;
  let audioFilePath: string | null = null;
  
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
      
      if (itag) {
        formatSelector = `${itag}`;
      } else {
        formatSelector = 'bestaudio';
      }

      console.log('Starting audio download with format selector:', formatSelector);

      const ytDlpArgs = [
        url,
        '-f', formatSelector,
        '-o', '-',
        '--no-warnings',
        '--no-playlist',
        '--quiet',
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '0'
      ];

      const ytDlpStream = ytDlpWrap.execStream(ytDlpArgs);

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
      // Video download
      const hasFfmpeg = await checkFfmpeg();
      console.log('FFmpeg available:', hasFfmpeg);
      
      if (!hasFfmpeg) {
        // If no ffmpeg, download best single file format (video+audio already combined)
        console.log('FFmpeg not available, using single file format');
        
        filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
        contentType = 'video/mp4';

        formatSelector = 'best[ext=mp4]/best';

        console.log('Starting single-file video download with format selector:', formatSelector);

        const ytDlpArgs = [
          url,
          '-f', formatSelector,
          '-o', '-',
          '--no-warnings',
          '--no-playlist',
          '--quiet'
        ];

        const ytDlpStream = ytDlpWrap.execStream(ytDlpArgs);

        const webStream = new ReadableStream({
          start(controller) {
            ytDlpStream.on('data', (chunk: Buffer) => {
              controller.enqueue(new Uint8Array(chunk));
            });
            
            ytDlpStream.on('end', () => {
              console.log('Video download complete');
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
      }
      
      // FFmpeg is available - download and manually merge
      filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
      contentType = 'video/mp4';
      
      const tempDir = os.tmpdir();
      const timestamp = Date.now();
      const baseFileName = `yt_${timestamp}_${videoId}`;
      
      // Download video and audio separately with specific output template
      const videoTemplate = path.join(tempDir, `${baseFileName}_video.%(ext)s`);
      const audioTemplate = path.join(tempDir, `${baseFileName}_audio.%(ext)s`);
      
      console.log('Downloading video and audio separately...');
      
      // Download video
      if (quality) {
        const height = parseInt(quality.replace('p', ''));
        formatSelector = `bestvideo[height<=${height}][ext=mp4]/bestvideo[height<=${height}]`;
      } else {
        formatSelector = 'bestvideo[ext=mp4]/bestvideo';
      }
      
      console.log('Video format selector:', formatSelector);
      
      const videoArgs = [
        url,
        '-f', formatSelector,
        '-o', videoTemplate,
        '--no-warnings',
        '--no-playlist'
      ];
      
      await ytDlpWrap.execPromise(videoArgs);
      console.log('Video downloaded');
      
      // Find video file
      const videoExtensions = ['mp4', 'webm', 'mkv'];
      for (const ext of videoExtensions) {
        const testPath = path.join(tempDir, `${baseFileName}_video.${ext}`);
        if (fs.existsSync(testPath)) {
          videoFilePath = testPath;
          console.log('Found video file:', videoFilePath);
          break;
        }
      }
      
      if (!videoFilePath) {
        throw new Error('Video file not found after download');
      }
      
      // Download audio
      const audioArgs = [
        url,
        '-f', 'bestaudio[ext=m4a]/bestaudio',
        '-o', audioTemplate,
        '--no-warnings',
        '--no-playlist'
      ];
      
      await ytDlpWrap.execPromise(audioArgs);
      console.log('Audio downloaded');
      
      // Find audio file
      const audioExtensions = ['m4a', 'webm', 'opus'];
      for (const ext of audioExtensions) {
        const testPath = path.join(tempDir, `${baseFileName}_audio.${ext}`);
        if (fs.existsSync(testPath)) {
          audioFilePath = testPath;
          console.log('Found audio file:', audioFilePath);
          break;
        }
      }
      
      if (!audioFilePath) {
        throw new Error('Audio file not found after download');
      }
      
      // Merge using ffmpeg
      tempFilePath = path.join(tempDir, `${baseFileName}_merged.mp4`);
      console.log('Merging video and audio with ffmpeg...');
      
      const ffmpegCmd = `ffmpeg -i "${videoFilePath}" -i "${audioFilePath}" -c:v copy -c:a aac -strict experimental "${tempFilePath}" -y`;
      console.log('FFmpeg command:', ffmpegCmd);
      
      try {
        await execAsync(ffmpegCmd);
        console.log('Merge complete');
      } catch (ffmpegError: any) {
        console.error('FFmpeg merge error:', ffmpegError);
        throw new Error(`Failed to merge video and audio: ${ffmpegError.message}`);
      }
      
      // Verify merged file exists
      if (!fs.existsSync(tempFilePath)) {
        throw new Error('Merged file not found after ffmpeg processing');
      }
      
      console.log('Reading merged file...');
      const fileBuffer = fs.readFileSync(tempFilePath);
      console.log(`Merged file size: ${fileBuffer.length} bytes`);

      // Clean up all temp files
      if (videoFilePath && fs.existsSync(videoFilePath)) {
        fs.unlinkSync(videoFilePath);
      }
      if (audioFilePath && fs.existsSync(audioFilePath)) {
        fs.unlinkSync(audioFilePath);
      }
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      tempFilePath = null;
      videoFilePath = null;
      audioFilePath = null;

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
    
    // Clean up all temp files
    const filesToClean = [tempFilePath, videoFilePath, audioFilePath];
    for (const file of filesToClean) {
      if (file && fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
          console.log('Cleaned up:', file);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', file, cleanupError);
        }
      }
    }
    
    return NextResponse.json(
      { error: `Failed to download: ${error.message}` },
      { status: 500 }
    );
  }
}