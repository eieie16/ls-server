@echo off
echo ========================================
echo   Deploy to GitHub Pages
echo ========================================
echo.

set GIT=C:\Program Files\Git\bin\git.exe

if not exist "%GIT%" (
    echo [Error] Git not found at C:\Program Files\Git\bin\git.exe
    echo Please reinstall Git from: https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

echo [Step 1] Git found: %GIT%
echo.

echo [Step 2] Initialize repository...
cmd /c "cd /d C:\Users\anna1\Documents\Default Project && \"%GIT%\" init"
cmd /c "cd /d C:\Users\anna1\Documents\Default Project && \"%GIT%\" add ."
cmd /c "cd /d C:\Users\anna1\Documents\Default Project && \"%GIT%\" commit -m \"initial commit\""
cmd /c "cd /d C:\Users\anna1\Documents\Default Project && \"%GIT%\" branch -M main"
echo Done.
echo.

echo [Step 3] Create GitHub repository
echo.
echo 1. Open: https://github.com/new
echo 2. Repository name: ls-server
echo 3. Select: Public
echo 4. Do NOT check "Initialize this repository with a README"
echo 5. Click "Create repository"
echo.

set /p REPO_URL="Enter repo URL (e.g. https://github.com/username/ls-server.git): "
echo.

echo [Step 4] Adding remote and pushing...
cmd /c "cd /d C:\Users\anna1\Documents\Default Project && \"%GIT%\" remote add origin %REPO_URL%"
cmd /c "cd /d C:\Users\anna1\Documents\Default Project && \"%GIT%\" push -u origin main"
echo.

echo [Step 5] Enable GitHub Pages
echo.
echo 1. Go to your repo: Settings -> Pages
echo 2. Source: Deploy from a branch
echo 3. Branch: main, Folder: /(root)
echo 4. Click Save
echo.
echo [Done] Your site will be at:
echo https://yourusername.github.io/ls-server
echo.
pause
