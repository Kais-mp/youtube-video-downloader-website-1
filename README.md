# YouTube Video Downloader

A modern, fast, and SEO-optimized YouTube video downloader built with Next.js 15. Download videos in multiple qualities (720p, 1080p, 4K) or extract audio as MP3.

## ✨ Features

- 🎬 Download YouTube videos in HD quality
- 🎵 Extract and download audio as MP3
- ⚡ Lightning-fast downloads with progress tracking
- 🌓 Light/Dark theme toggle
- 📱 Fully responsive design
- 🔍 SEO optimized with rich metadata
- 💰 AdSense ready with strategic ad placements
- 🎨 Modern UI with smooth animations

## 📋 Prerequisites

Before installing, make sure you have the following installed on your system:

### Required System Dependencies

1. **Node.js** (v18 or higher) or **Bun**
   ```bash
   # Check if installed
   node --version
   # or
   bun --version
   ```

2. **yt-dlp** (YouTube video downloader)
   ```bash
   # macOS (using Homebrew)
   brew install yt-dlp
   
   # Ubuntu/Debian
   sudo apt update
   sudo apt install yt-dlp
   
   # Windows (using Chocolatey)
   choco install yt-dlp
   
   # Or install via pip
   pip install yt-dlp
   
   # Verify installation
   yt-dlp --version
   ```

3. **ffmpeg** (Video/Audio processing)
   ```bash
   # macOS (using Homebrew)
   brew install ffmpeg
   
   # Ubuntu/Debian
   sudo apt update
   sudo apt install ffmpeg
   
   # Windows (using Chocolatey)
   choco install ffmpeg
   
   # Verify installation
   ffmpeg -version
   ```

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd youtube-downloader
```

### 2. Install Node.js dependencies
```bash
# Using npm
npm install

# Using yarn
yarn install

# Using bun (recommended for faster installation)
bun install
```

### 3. Run the development server
```bash
# Using npm
npm run dev

# Using yarn
yarn dev

# Using bun
bun dev
```

### 4. Open your browser
Navigate to [http://localhost:3000](http://localhost:3000)

## 📦 Dependencies

### Node.js Packages
All Node.js dependencies are listed in `package.json` and will be automatically installed with `npm install` or `bun install`.

Key dependencies:
- **next** - React framework
- **react** & **react-dom** - UI library
- **typescript** - Type safety
- **tailwindcss** - Styling
- **lucide-react** - Icons
- **framer-motion** - Animations

### System Dependencies
- **yt-dlp** - Core video downloading functionality
- **ffmpeg** - Video/audio merging and conversion

## 🔧 Configuration

### 1. Update your domain
Replace `https://yourdomain.com` with your actual domain in:
- `src/app/page.tsx` (metadata canonical URL)
- `src/app/sitemap.ts`
- `public/robots.txt`

### 2. Configure Google AdSense
Replace `ca-pub-XXXXXXXXXX` with your actual AdSense publisher ID in:
- `src/app/layout.tsx`

### 3. Add Google Search Console verification
Add your verification code in `src/app/layout.tsx` (search for "google-site-verification")

### 4. Create PWA icons
Add these files to the `/public` directory:
- `icon-192.png` (192x192)
- `icon-512.png` (512x512)
- `og-image.png` (1200x630 for social sharing)

## 🏗️ Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
youtube-downloader/
├── public/              # Static files (robots.txt, manifest.json, icons)
├── src/
│   ├── app/            # Next.js app directory
│   │   ├── api/        # API routes
│   │   │   ├── download/      # Video download endpoint
│   │   │   └── video-info/    # Video metadata endpoint
│   │   ├── page.tsx    # Homepage
│   │   ├── layout.tsx  # Root layout with AdSense
│   │   └── sitemap.ts  # Dynamic sitemap
│   ├── components/     # React components
│   │   ├── ui/         # Reusable UI components
│   │   ├── VideoDownloader.tsx
│   │   └── ThemeToggle.tsx
│   └── lib/            # Utility functions
└── package.json        # Node.js dependencies
```

## 🎨 Customization

### Theme Colors
Edit design tokens in `src/app/globals.css`:
```css
:root {
  --primary: oklch(0.205 0 0);
  --background: oklch(1 0 0);
  /* ... more tokens */
}
```

### Ad Placements
Ad slots are marked with IDs in `src/app/page.tsx`:
- `#ad-top-banner` - 728x90 banner
- `#ad-mid-content` - 300x250 rectangle
- `#ad-bottom-banner` - 728x90 banner

## 🐛 Troubleshooting

### "yt-dlp: command not found"
Install yt-dlp following the prerequisites section above.

### "ffmpeg: command not found"
Install ffmpeg following the prerequisites section above.

### Downloads failing
1. Ensure yt-dlp is up to date: `yt-dlp -U`
2. Check ffmpeg is installed: `ffmpeg -version`
3. Check server logs for detailed error messages

### Port 3000 already in use
```bash
# Kill the process using port 3000
npx kill-port 3000
# or
lsof -ti:3000 | xargs kill
```

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## ⚠️ Legal Notice

This tool is intended for downloading videos you have permission to download or videos available under Creative Commons licenses. Please respect copyright laws and YouTube's Terms of Service.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using Next.js 15, React, and TypeScript