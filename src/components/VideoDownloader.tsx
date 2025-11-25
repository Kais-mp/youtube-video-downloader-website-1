"use client";

import { useState, useEffect } from "react";
import { Download, Loader2, Video, FileDown, Music, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VideoInfo {
  title: string;
  thumbnail: string;
  author: string;
  duration: string;
  qualities: Array<{
    quality: string;
    size: number;
    itag: string;
    container: string;
    hasAudio: boolean;
  }>;
  audioFormat?: {
    itag: string;
    abr: number;
    size: number;
    container: string;
  } | null;
}

interface RecentDownload {
  title: string;
  thumbnail: string;
  quality: string;
  size: string;
  timestamp: number;
  type: 'video' | 'audio';
}

export default function VideoDownloader() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [downloadingAudio, setDownloadingAudio] = useState(false);
  const [progress, setProgress] = useState(0);
  const [recentDownloads, setRecentDownloads] = useState<RecentDownload[]>([]);
  const [isInIframe, setIsInIframe] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Check iframe on mount
  useEffect(() => {
    setIsInIframe(window.self !== window.top);
  }, []);

  // Load recent downloads on mount
  useEffect(() => {
    const saved = localStorage.getItem("recentDownloads");
    if (saved) {
      setRecentDownloads(JSON.parse(saved));
    }
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDuration = (seconds: string) => {
    const sec = parseInt(seconds);
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const fetchVideoInfo = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setVideoInfo(null);
    setSelectedQuality("");

    try {
      const response = await fetch("/api/video-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to fetch video info");
        return;
      }

      setVideoInfo(data);
      
      // Set default quality (prefer 720p, then 480p, then first available)
      if (data.qualities.length > 0) {
        const quality720p = data.qualities.find((q: any) => q.quality === "720p");
        const quality480p = data.qualities.find((q: any) => q.quality === "480p");
        
        if (quality720p) {
          setSelectedQuality(quality720p.quality);
        } else if (quality480p) {
          setSelectedQuality(quality480p.quality);
        } else {
          setSelectedQuality(data.qualities[0].quality);
        }
      }
      
      toast.success("Video information loaded successfully!");
    } catch (error) {
      toast.error("Error fetching video information");
    } finally {
      setLoading(false);
    }
  };

  const downloadMedia = async (type: 'video' | 'audio') => {
    if (!videoInfo) return;
    
    if (type === 'video' && !selectedQuality) {
      toast.error("Please select a quality");
      return;
    }

    // Handle iframe restriction
    if (isInIframe) {
      toast.error(
        "Downloads are blocked in preview mode",
        { 
          duration: 5000,
          description: "Click 'Open in New Tab' button below to download"
        }
      );
      return;
    }

    const isAudio = type === 'audio';
    if (isAudio) {
      setDownloadingAudio(true);
    } else {
      setDownloading(true);
    }
    setProgress(0);
    setDownloadUrl(null);

    const selectedFormat = isAudio 
      ? videoInfo.audioFormat
      : videoInfo.qualities.find((q) => q.quality === selectedQuality);

    const filename = isAudio
      ? `${videoInfo.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.mp3`
      : `${videoInfo.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.mp4`;

    try {
      toast.info(`Starting ${isAudio ? 'audio' : 'video'} download...`);
      
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          url, 
          itag: selectedFormat?.itag,
          quality: isAudio ? undefined : selectedQuality,
          downloadType: isAudio ? 'audio' : 'video'
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Download failed. Please try again.");
        return;
      }

      // Use simpler approach - just get the blob directly
      setProgress(50);
      
      const blob = await response.blob();
      
      setProgress(90);

      // Create download link
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = blobUrl;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      
      setProgress(100);

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);

      toast.success(
        `${isAudio ? 'Audio' : 'Video'} downloaded successfully!`,
        { 
          duration: 3000,
          description: "Check your Downloads folder"
        }
      );

      // Add to recent downloads
      const newDownload: RecentDownload = {
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail,
        quality: isAudio ? `${videoInfo.audioFormat?.abr || 128}kbps MP3` : (selectedFormat?.quality || selectedQuality),
        size: formatBytes(blob.size),
        timestamp: Date.now(),
        type: isAudio ? 'audio' : 'video'
      };

      const updated = [newDownload, ...recentDownloads.slice(0, 4)];
      setRecentDownloads(updated);
      localStorage.setItem("recentDownloads", JSON.stringify(updated));

    } catch (error: any) {
      console.error("Download error:", error);
      toast.error(`Download failed: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      if (isAudio) {
        setDownloadingAudio(false);
      } else {
        setDownloading(false);
      }
      setTimeout(() => setProgress(0), 2000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Iframe Warning */}
      {isInIframe && (
        <Alert className="border-2 border-orange-500/50 bg-orange-500/10">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">
              You're viewing this in preview mode. Downloads work best in a full browser tab.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(window.location.href, '_blank')}
              className="ml-4 whitespace-nowrap border-orange-500/50 hover:bg-orange-500/20"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Processing/Downloading Message */}
      {(downloading || downloadingAudio) && (
        <Alert className="border-2 border-primary/50 bg-primary/10 animate-pulse">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold text-base">
                Please wait, your video is being processed and downloaded
              </p>
              <p className="text-sm text-muted-foreground">
                This may take a few moments depending on the video size and quality...
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* URL Input Section */}
      <Card className="p-6 bg-gradient-to-br from-card via-card to-accent/5 border-2 hover:border-primary/20 transition-all duration-300">
        <div className="flex items-center gap-2 mb-4">
          <Video className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">Enter YouTube URL</h2>
        </div>
        <div className="flex gap-3">
          <Input
            type="text"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchVideoInfo()}
            className="text-base"
            disabled={loading}
          />
          <Button
            onClick={fetchVideoInfo}
            disabled={loading || !url.trim()}
            className="px-6"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Fetch Info"
            )}
          </Button>
        </div>
      </Card>

      {/* Video Info Card */}
      {videoInfo && (
        <Card className="border-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative h-64 bg-gradient-to-br from-muted to-accent/10 overflow-hidden">
            <img
              src={videoInfo.thumbnail}
              alt={videoInfo.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h3 className="text-xl font-bold mb-1 line-clamp-2">
                {videoInfo.title}
              </h3>
              <p className="text-sm opacity-90">
                {videoInfo.author} • {formatDuration(videoInfo.duration)}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Video Quality</label>
              <Select value={selectedQuality} onValueChange={setSelectedQuality}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose quality" />
                </SelectTrigger>
                <SelectContent>
                  {videoInfo.qualities.map((quality) => (
                    <SelectItem key={quality.itag} value={quality.quality}>
                      {quality.quality} - {quality.container} 
                      {quality.size > 0 && ` (${formatBytes(quality.size)})`}
                      {quality.hasAudio && " 🔊"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(downloading || downloadingAudio) && progress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Downloading...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Manual Download Link (if automatic download fails) */}
            {downloadUrl && (
              <Alert className="border-blue-500/50 bg-blue-500/10">
                <Download className="h-5 w-5 text-blue-500" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-sm">
                    Automatic download not working?
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="ml-4 whitespace-nowrap border-blue-500/50 hover:bg-blue-500/20"
                  >
                    <a href={downloadUrl} download>
                      <Download className="w-4 h-4 mr-2" />
                      Click to Download
                    </a>
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={() => downloadMedia('video')}
                disabled={!selectedQuality || downloading || downloadingAudio}
                className="h-12 text-base"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Download Video
                  </>
                )}
              </Button>

              {videoInfo.audioFormat && (
                <Button
                  onClick={() => downloadMedia('audio')}
                  disabled={downloading || downloadingAudio}
                  variant="secondary"
                  className="h-12 text-base"
                >
                  {downloadingAudio ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Music className="w-5 h-5 mr-2" />
                      Download MP3
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Recent Downloads */}
      {recentDownloads.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Recent Downloads</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentDownloads.map((download, index) => (
              <Card
                key={index}
                className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex gap-3 p-3">
                  <div className="relative">
                    <img
                      src={download.thumbnail}
                      alt={download.title}
                      className="w-24 h-16 object-cover rounded"
                    />
                    {download.type === 'audio' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                        <Music className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2 mb-1">
                      {download.title}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {download.quality} • {download.size}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}