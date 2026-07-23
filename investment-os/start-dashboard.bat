@echo off
REM ===================================================================
REM  Investment OS - one-click launcher for Windows
REM  Put this file in the SAME folder as live-server.js and
REM  standalone-dashboard.html, then just double-click it.
REM ===================================================================
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is NOT installed on this computer.
  echo   1^) Download it from https://nodejs.org  ^(choose the LTS version^)
  echo   2^) Install it ^(just click Next / Finish^)
  echo   3^) Double-click this file again.
  echo.
  pause
  exit /b
)

set "SERVER="
if exist "live-server.js" set "SERVER=live-server.js"
if exist "liveserver.js"  set "SERVER=liveserver.js"

if "%SERVER%"=="" (
  echo.
  echo   Could not find live-server.js in this folder:
  echo   %cd%
  echo   Make sure live-server.js is here, then try again.
  echo.
  pause
  exit /b
)

if not exist "standalone-dashboard.html" (
  echo.
  echo   WARNING: standalone-dashboard.html was not found in this folder.
  echo   Keep it next to %SERVER% or the page will not load.
  echo.
)

echo.
echo   Starting Investment OS dashboard...
echo   When it says "running", open this in your browser:
echo.
echo        http://localhost:4300
echo.
echo   Keep this window OPEN while you use the dashboard.
echo   Close it (or press Ctrl+C) to stop the server.
echo.
node "%SERVER%"
pause
