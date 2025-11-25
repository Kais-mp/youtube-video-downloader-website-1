@echo off
REM YouTube Downloader - Automated Installation Script (Windows)
REM This script installs all required dependencies

echo ================================
echo YouTube Downloader - Setup
echo ================================
echo.

REM Step 1: Check Node.js or Bun
echo [Step 1] Checking Node.js/Bun...
where bun >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo [OK] Bun found
    set PKG_MANAGER=bun
    goto step2
)

where node >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo [OK] Node.js found
    set PKG_MANAGER=npm
    goto step2
)

echo [ERROR] Node.js or Bun not found!
echo Please install Node.js from: https://nodejs.org/
echo Or install Bun from: https://bun.sh/
pause
exit /b 1

:step2
REM Step 2: Check Python
echo.
echo [Step 2] Checking Python...
where python >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo [OK] Python found
    set PYTHON_CMD=python
) else (
    echo [WARNING] Python not found - will try Chocolatey
    set PYTHON_CMD=
)

REM Step 3: Install yt-dlp
echo.
echo [Step 3] Installing yt-dlp...
where yt-dlp >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo [OK] yt-dlp already installed
    echo Updating yt-dlp...
    yt-dlp -U
) else (
    if defined PYTHON_CMD (
        echo Installing yt-dlp via pip...
        %PYTHON_CMD% -m pip install --upgrade yt-dlp
    ) else (
        where choco >nul 2>&1
        if %ERRORLEVEL% == 0 (
            echo Installing yt-dlp via Chocolatey...
            choco install yt-dlp -y
        ) else (
            echo [ERROR] Cannot install yt-dlp automatically
            echo Please install Python or Chocolatey first
            echo Python: https://www.python.org/downloads/
            echo Chocolatey: https://chocolatey.org/install
            pause
            exit /b 1
        )
    )
)

REM Step 4: Install ffmpeg
echo.
echo [Step 4] Installing ffmpeg...
where ffmpeg >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo [OK] ffmpeg already installed
) else (
    where choco >nul 2>&1
    if %ERRORLEVEL% == 0 (
        echo Installing ffmpeg via Chocolatey...
        choco install ffmpeg -y
    ) else (
        echo [ERROR] Cannot install ffmpeg automatically
        echo Please install Chocolatey or download ffmpeg manually
        echo Chocolatey: https://chocolatey.org/install
        echo ffmpeg: https://ffmpeg.org/download.html
        pause
        exit /b 1
    )
)

REM Step 5: Install Node.js dependencies
echo.
echo [Step 5] Installing Node.js dependencies...
if "%PKG_MANAGER%"=="bun" (
    bun install
) else (
    npm install
)

REM Verification
echo.
echo ================================
echo Installation Complete!
echo ================================
echo.
echo To start the development server, run:
echo   %PKG_MANAGER% run dev
echo.
echo Then open: http://localhost:3000
echo.
pause
