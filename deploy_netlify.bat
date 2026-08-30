@echo off
cd /d "%~dp0"
"C:\Program Files\nodejs\npx.cmd" netlify deploy --prod
pause
