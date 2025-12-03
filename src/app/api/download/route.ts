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

export async function POST(request: NextRequest) {
  try {
    const { url, quality, format } = await request.json();

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    console.log('Downloading video:', videoId, 'Quality:', quality, 'Format:', format);

    // Use RapidAPI YouTube API to get download links
    const apiKey = process.env.RAPIDAPI_KEY;
    
    if (!apiKey) {
      console.error('RAPIDAPI_KEY not configured');
      return NextResponse.json(
        { error: 'API configuration missing. Please set RAPIDAPI_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Fetch video info with download links
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
        { error: `Failed to fetch download links: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Find the requested quality/format or use best available
    let downloadUrl = '';
    let filename = `${data.title || 'video'}.mp4`;

    if (format === 'mp3' && data.audio) {
      // Audio download
      downloadUrl = data.audio.url || data.audio.downloadUrl;
      filename = `${data.title || 'audio'}.mp3`;
    } else if (data.formats) {
      // Video download - find matching quality
      const requestedHeight = parseInt(quality);
      const matchingFormat = data.formats.find((f: any) => {
        const height = f.height || parseInt(f.qualityLabel?.match(/(\d+)p/)?.[1] || '0');
        return height === requestedHeight;
      });

      if (matchingFormat) {
        downloadUrl = matchingFormat.url || matchingFormat.downloadUrl;
      } else {
        // Fallback to best quality
        const sortedFormats = data.formats
          .filter((f: any) => f.hasVideo !== false)
          .sort((a: any, b: any) => {
            const aHeight = a.height || parseInt(a.qualityLabel?.match(/(\d+)p/)?.[1] || '0');
            const bHeight = b.height || parseInt(b.qualityLabel?.match(/(\d+)p/)?.[1] || '0');
            return bHeight - aHeight;
          });
        
        if (sortedFormats[0]) {
          downloadUrl = sortedFormats[0].url || sortedFormats[0].downloadUrl;
        }
      }
      
      filename = `${data.title || 'video'}_${quality}.mp4`;
    } else if (data.url || data.downloadUrl) {
      // Direct download URL
      downloadUrl = data.url || data.downloadUrl;
    }

    if (!downloadUrl) {
      return NextResponse.json(
        { error: 'No download URL available for this video' },
        { status: 404 }
      );
    }

    // Stream the video from the download URL to the client
    const videoResponse = await fetch(downloadUrl);
    
    if (!videoResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to download video from source' },
        { status: videoResponse.status }
      );
    }

    // Stream the response back to client
    const headers = new Headers();
    headers.set('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Copy content-length if available
    const contentLength = videoResponse.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(videoResponse.body, {
      status: 200,
      headers
    });

  } catch (error: any) {
    console.error('Error downloading video:', error);
    return NextResponse.json(
      { error: `Failed to download video: ${error.message}` },
      { status: 500 }
    );
  }
}