#!/bin/bash

# YouTube Downloader - Automated Installation Script (Linux/macOS)
# This script installs all required dependencies

set -e

echo "================================"
echo "YouTube Downloader - Setup"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Check Node.js or Bun
echo "📦 Step 1: Checking Node.js/Bun..."
if command_exists bun; then
    echo -e "${GREEN}✓ Bun found: $(bun --version)${NC}"
    PKG_MANAGER="bun"
elif command_exists node; then
    echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"
    PKG_MANAGER="npm"
else
    echo -e "${RED}✗ Node.js or Bun not found!${NC}"
    echo "Please install Node.js from: https://nodejs.org/"
    echo "Or install Bun from: https://bun.sh/"
    exit 1
fi

# Step 2: Check Python (for yt-dlp)
echo ""
echo "🐍 Step 2: Checking Python..."
if command_exists python3; then
    echo -e "${GREEN}✓ Python3 found: $(python3 --version)${NC}"
    PYTHON_CMD="python3"
elif command_exists python; then
    echo -e "${GREEN}✓ Python found: $(python --version)${NC}"
    PYTHON_CMD="python"
else
    echo -e "${YELLOW}⚠ Python not found. Will try to install yt-dlp via package manager.${NC}"
    PYTHON_CMD=""
fi

# Step 3: Install yt-dlp
echo ""
echo "📹 Step 3: Installing yt-dlp..."
if command_exists yt-dlp; then
    echo -e "${GREEN}✓ yt-dlp already installed: $(yt-dlp --version)${NC}"
    echo -e "${YELLOW}→ Updating yt-dlp...${NC}"
    yt-dlp -U || echo "Update may require sudo"
else
    if [ -n "$PYTHON_CMD" ]; then
        echo "Installing yt-dlp via pip..."
        $PYTHON_CMD -m pip install --upgrade yt-dlp
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Installing yt-dlp via Homebrew..."
        brew install yt-dlp
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "Installing yt-dlp via package manager..."
        if command_exists apt; then
            sudo apt update && sudo apt install -y yt-dlp
        elif command_exists yum; then
            sudo yum install -y yt-dlp
        else
            echo -e "${RED}✗ Unable to install yt-dlp automatically${NC}"
            echo "Please install manually: pip install yt-dlp"
            exit 1
        fi
    fi
fi

# Step 4: Install ffmpeg
echo ""
echo "🎬 Step 4: Installing ffmpeg..."
if command_exists ffmpeg; then
    echo -e "${GREEN}✓ ffmpeg already installed: $(ffmpeg -version | head -n1)${NC}"
else
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Installing ffmpeg via Homebrew..."
        brew install ffmpeg
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "Installing ffmpeg via package manager..."
        if command_exists apt; then
            sudo apt update && sudo apt install -y ffmpeg
        elif command_exists yum; then
            sudo yum install -y ffmpeg
        else
            echo -e "${RED}✗ Unable to install ffmpeg automatically${NC}"
            echo "Please install manually from: https://ffmpeg.org/"
            exit 1
        fi
    fi
fi

# Step 5: Install Node.js dependencies
echo ""
echo "📦 Step 5: Installing Node.js dependencies..."
if [ "$PKG_MANAGER" = "bun" ]; then
    bun install
else
    npm install
fi

# Verification
echo ""
echo "================================"
echo "✅ Installation Complete!"
echo "================================"
echo ""
echo "Verifying installation:"
echo -e "  ${GREEN}✓${NC} yt-dlp: $(yt-dlp --version)"
echo -e "  ${GREEN}✓${NC} ffmpeg: $(ffmpeg -version | head -n1 | cut -d' ' -f3)"
echo -e "  ${GREEN}✓${NC} Node packages: installed"
echo ""
echo "🚀 To start the development server, run:"
echo -e "  ${YELLOW}$PKG_MANAGER run dev${NC}"
echo ""
echo "Then open: http://localhost:3000"
echo ""
