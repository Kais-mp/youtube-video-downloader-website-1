import { Youtube, Sparkles, Zap, Shield } from "lucide-react";
import VideoDownloader from "@/components/VideoDownloader";
import ThemeToggle from "@/components/ThemeToggle";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free YouTube Video Downloader - Download HD Videos & MP3 Audio",
  description: "Download YouTube videos in HD quality (720p, 1080p, 4K) or convert to MP3 audio. Fast, free, and easy YouTube downloader with no registration required.",
  keywords: "youtube downloader, download youtube videos, youtube to mp3, video downloader, youtube mp4, free youtube downloader, online video downloader",
  openGraph: {
    title: "Free YouTube Video Downloader - Download HD Videos & MP3",
    description: "Download YouTube videos in high quality or convert to MP3. Fast, free, and secure.",
    type: "website",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free YouTube Video Downloader",
    description: "Download YouTube videos in HD or convert to MP3",
  },
  alternates: {
    canonical: "https://yourdomain.com",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "YouTube Video Downloader",
            "applicationCategory": "MultimediaApplication",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "operatingSystem": "Any",
            "description": "Free online YouTube video downloader. Download videos in HD quality or convert to MP3 audio.",
            "featureList": [
              "Download YouTube videos",
              "Multiple quality options (720p, 1080p, 4K)",
              "Convert to MP3 audio",
              "Fast downloads",
              "No registration required"
            ]
          })
        }}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
        <ThemeToggle />

        {/* Hero Section */}
        <header className="relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=1600&h=400&fit=crop')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }} 
          />

          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
          
          <div className="relative container mx-auto px-4 py-16 sm:py-24">
            <div className="text-center space-y-6">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-primary/10 border-2 border-primary/20">
                  <Youtube className="w-12 h-12 text-primary" />
                </div>
              </div>
              <h1 className="text-4xl sm:text-6xl font-bold bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                YouTube Video Downloader
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                Download your favorite YouTube videos in high quality. Fast, simple, and completely free.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
              {[
                { icon: Zap, title: "Lightning Fast", desc: "Quick downloads at maximum speed" },
                { icon: Shield, title: "Safe & Secure", desc: "No ads, no tracking, no worries" },
                { icon: Sparkles, title: "HD Quality", desc: "Choose from multiple quality options" }
              ].map((feature, index) => (
                <div
                  key={index}
                  className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
                >
                  <feature.icon className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Ad Space 1 - Top Banner */}
        <div className="container mx-auto px-4 py-4">
          <div className="h-24 bg-muted/30 border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center" id="ad-top-banner">
            <p className="text-muted-foreground text-sm">Advertisement Space - 728x90</p>
          </div>
        </div>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <VideoDownloader />
        </main>

        {/* Ad Space 2 - Mid Content */}
        <div className="container mx-auto px-4 py-4">
          <div className="h-64 bg-muted/30 border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center" id="ad-mid-content">
            <p className="text-muted-foreground text-sm">Advertisement Space - 300x250</p>
          </div>
        </div>

        {/* How to Use Section */}
        <section className="container mx-auto px-4 py-16 max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">How to Download YouTube Videos</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Paste URL", desc: "Copy and paste the YouTube video link" },
              { step: "2", title: "Fetch Info", desc: "Click to load video details and thumbnail" },
              { step: "3", title: "Choose Quality", desc: "Select your preferred video quality" },
              { step: "4", title: "Download", desc: "Click download and save to your device" }
            ].map((item, index) => (
              <div
                key={index}
                className="relative p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
              >
                <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2 mt-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SEO Content Section */}
        <section className="container mx-auto px-4 py-16 max-w-4xl">
          <article className="prose prose-gray dark:prose-invert max-w-none">
            <h2 className="text-2xl font-bold mb-6">Free YouTube Video Downloader - No Registration Required</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Our YouTube video downloader is a free online tool that allows you to download YouTube videos in various formats and qualities. 
                Whether you want to save videos in HD (720p, 1080p) or convert YouTube videos to MP3 audio, our downloader makes it simple and fast.
              </p>
              <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Why Use Our YouTube Downloader?</h3>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>High Quality Downloads:</strong> Download videos in multiple resolutions including 720p, 1080p, and even 4K quality</li>
                <li><strong>Fast Processing:</strong> Our servers process your downloads quickly for immediate access</li>
                <li><strong>No Registration:</strong> Start downloading immediately without creating an account</li>
                <li><strong>Safe & Secure:</strong> We respect your privacy and don't store your personal information</li>
                <li><strong>YouTube to MP3:</strong> Extract audio from videos and download as MP3 files</li>
                <li><strong>Free Forever:</strong> No hidden costs, subscriptions, or download limits</li>
              </ul>
              <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Supported Formats</h3>
              <p>
                Download YouTube videos in MP4 format with various quality options, or convert and download audio as MP3. 
                Choose the quality that best suits your needs - from standard definition for mobile viewing to high definition for desktop playback.
              </p>
              <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Important Notice</h3>
              <p className="text-sm">
                Please download videos for personal use only and respect copyright laws. This tool is intended for downloading 
                videos you have permission to download or videos that are available under Creative Commons licenses.
              </p>
            </div>
          </article>
        </section>

        {/* Ad Space 3 - Bottom Banner */}
        <div className="container mx-auto px-4 py-4">
          <div className="h-24 bg-muted/30 border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center" id="ad-bottom-banner">
            <p className="text-muted-foreground text-sm">Advertisement Space - 728x90</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border mt-16 py-8 bg-card/50">
          <div className="container mx-auto px-4 text-center">
            <p className="text-muted-foreground text-sm">
              © 2024 YouTube Downloader. Download videos for personal use only. Respect copyright laws.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}