"use client";

import { useEffect, useState } from "react";
import VideoDownloader from "@/components/VideoDownloader";
import ThemeToggle from "@/components/ThemeToggle";
import { Youtube, Sparkles, Zap, Shield } from "lucide-react";

export default function Home() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
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
            transform: `translateY(${scrollY * 0.5}px)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        
        <div className="relative container mx-auto px-4 py-16 sm:py-24">
          <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-primary/10 border-2 border-primary/20 animate-pulse">
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
              { icon: Sparkles, title: "HD Quality", desc: "Choose from multiple quality options" },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 100}ms` }}
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
        <div className="h-24 bg-muted/30 border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Advertisement Space - 728x90</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <VideoDownloader />
      </main>

      {/* Ad Space 2 - Mid Content */}
      <div className="container mx-auto px-4 py-4">
        <div className="h-64 bg-muted/30 border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Advertisement Space - 300x250</p>
        </div>
      </div>

      {/* How to Use Section */}
      <section className="container mx-auto px-4 py-16 max-w-4xl">
        <h2 className="text-3xl font-bold text-center mb-12">How to Download</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: "1", title: "Paste URL", desc: "Copy and paste the YouTube video link" },
            { step: "2", title: "Fetch Info", desc: "Click to load video details and thumbnail" },
            { step: "3", title: "Choose Quality", desc: "Select your preferred video quality" },
            { step: "4", title: "Download", desc: "Click download and save to your device" },
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

      {/* Ad Space 3 - Bottom Banner */}
      <div className="container mx-auto px-4 py-4">
        <div className="h-24 bg-muted/30 border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center">
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
  );
}