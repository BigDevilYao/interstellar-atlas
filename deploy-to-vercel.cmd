@echo off
REM One-click deploy of the INTERSTELLAR atlas to Vercel (production).
REM Requires Node.js 20+ (https://nodejs.org). The first run asks you to log in to Vercel
REM in your browser and to confirm the project name; later runs update the same URL.
cd /d "%~dp0"
call npx --yes vercel@latest deploy --prod
pause
