"use client";

import { useState, useEffect } from "react";
import { Download, Loader2, Video, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface VideoInfo {
  title: string;
  thumbnail: string;
  author: string;
  duration: string;
  qualities: Array<{
    quality: string;
    size: number;
    itag: number;
    container: string;
  }>;
}

interface RecentDownload {
  title: string;
  thumbnail: string;
  quality: string;
  size: string;
  timestamp: number;
}

export default function VideoDownloader() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [recentDownloads, setRecentDownloads] = useState<RecentDownload[]>([]);

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
      
      // Set 480p as default, or fallback to first quality
      if (data.qualities.length > 0) {
        const quality480p = data.qualities.find((q: any) => q.quality === "480p");
        if (quality480p) {
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

  const downloadVideo = async () => {
    if (!videoInfo || !selectedQuality) return;

    setDownloading(true);
    setProgress(0);

    const selectedFormat = videoInfo.qualities.find(
      (q) => q.quality === selectedQuality
    );

    try {
      toast.info("Starting download...");
      
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          url, 
          itag: selectedFormat?.itag,
          quality: selectedQuality 
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Download failed. Please try again.");
        return;
      }

      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      // Simulate progress since we're streaming and don't know exact size
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev; // Cap at 90% until done
          return prev + Math.random() * 5;
        });
      }, 200);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          receivedLength += value.length;
        }
      }

      clearInterval(progressInterval);
      setProgress(95);

      const blob = new Blob(chunks);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${videoInfo.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      // Add to recent downloads
      const newDownload: RecentDownload = {
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail,
        quality: selectedFormat?.quality || selectedQuality,
        size: formatBytes(receivedLength),
        timestamp: Date.now(),
      };

      const updated = [newDownload, ...recentDownloads.slice(0, 4)];
      setRecentDownloads(updated);
      localStorage.setItem("recentDownloads", JSON.stringify(updated));

      setProgress(100);
      toast.success("Video downloaded successfully!");
    } catch (error) {
      toast.error("Download error. Please try again.");
    } finally {
      setDownloading(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  return (
    <div className="space-y-8">
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
              <label className="text-sm font-medium">Select Quality</label>
              <Select value={selectedQuality} onValueChange={setSelectedQuality}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose quality" />
                </SelectTrigger>
                <SelectContent>
                  {videoInfo.qualities.map((quality) => (
                    <SelectItem key={quality.quality} value={quality.quality}>
                      {quality.quality} ({quality.container})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {downloading && progress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Downloading...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <Button
              onClick={downloadVideo}
              disabled={!selectedQuality || downloading}
              className="w-full h-12 text-base"
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
                  <img
                    src={download.thumbnail}
                    alt={download.title}
                    className="w-24 h-16 object-cover rounded"
                  />
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