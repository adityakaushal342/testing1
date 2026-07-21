@echo off
REM AI Trading Master - one-click backend runner (Windows)
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo.
  echo [!] Python nahi mila. Pehle install karo: https://www.python.org/downloads/
  echo     Install karte waqt "Add python.exe to PATH" zaroor tick karo.
  echo.
  pause
  exit /b 1
)

if not exist .venv (
  echo Creating virtual environment...
  python -m venv .venv
)
call .venv\Scripts\activate.bat

echo Installing dependencies (first time thoda time lega)...
python -m pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

echo Seeding demo accounts...
python seed.py

echo.
echo ============================================================
echo   Server chal raha hai! Browser me kholo:
echo     http://localhost:8000/auth.html   (Login / Register)
echo     http://localhost:8000/            (Landing page)
echo     http://localhost:8000/docs        (API docs)
echo   Rokne ke liye is window me Ctrl+C dabao.
echo ============================================================
echo.
uvicorn app.main:app --reload
pause
