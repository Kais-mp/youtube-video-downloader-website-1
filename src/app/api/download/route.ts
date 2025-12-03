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

// Sanitize filename for safe downloads
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9\s\-_]/gi, '_')
    .replace(/\s+/g, '_')
    .toLowerCase()
    .substring(0, 200); // Limit filename length
}

export async function POST(request: NextRequest) {
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

    // Get video info with custom agent and headers
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
    
    const title = info.videoDetails.title || 'video';
    const sanitizedTitle = sanitizeFilename(title);
    
    let filename: string;
    let contentType: string;
    let format: any;

    if (downloadType === 'audio' || downloadType === 'mp3') {
      // Audio/MP3 download
      filename = `${sanitizedTitle}.mp3`;
      contentType = 'audio/mpeg';
      
      // Find best audio format
      if (itag) {
        format = ytdl.chooseFormat(info.formats, { quality: itag });
      } else {
        format = ytdl.chooseFormat(info.formats, { 
          quality: 'highestaudio',
          filter: 'audioonly'
        });
      }

      console.log('Starting audio download with itag:', format.itag);

    } else {
      // Video download
      filename = `${sanitizedTitle}.mp4`;
      contentType = 'video/mp4';
      
      if (itag) {
        // Use specific itag
        format = ytdl.chooseFormat(info.formats, { quality: itag });
      } else if (quality) {
        // Choose format by quality (prefer formats with audio)
        const height = parseInt(quality.replace('p', ''));
        const availableFormats = info.formats.filter(f => 
          f.hasVideo && f.height === height
        );
        
        // Prefer formats with both video and audio
        format = availableFormats.find(f => f.hasAudio && f.hasVideo) || 
                 availableFormats.find(f => f.hasVideo) ||
                 ytdl.chooseFormat(info.formats, { quality: 'highest' });
      } else {
        // Default to highest quality with audio
        format = ytdl.chooseFormat(info.formats, { 
          quality: 'highestvideo',
          filter: format => format.hasVideo && format.hasAudio
        });
      }

      console.log('Starting video download with itag:', format.itag, 'hasAudio:', format.hasAudio);
    }

    // Create download stream with agent
    const videoStream = ytdl.downloadFromInfo(info, { 
      format,
      agent,
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    });

    // Convert Node.js stream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        videoStream.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        
        videoStream.on('end', () => {
          console.log('Download complete');
          controller.close();
        });
        
        videoStream.on('error', (error: Error) => {
          console.error('Stream error:', error);
          controller.error(error);
        });
      },
      cancel() {
        videoStream.destroy();
      }
    });

    // Optimized headers for immediate download
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    headers.set('X-Content-Type-Options', 'nosniff');
    
    if (format.contentLength) {
      headers.set('Content-Length', format.contentLength);
    }

    return new NextResponse(webStream, { headers });

  } catch (error: any) {
    console.error('Error downloading:', error);
    return NextResponse.json(
      { error: `Failed to download: ${error.message}` },
      { status: 500 }
    );
  }
}