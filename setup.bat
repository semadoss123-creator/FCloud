@echo off
chcp 65001 >nul
cls
echo.
echo ================================================
echo          File Manager Setup
echo ================================================
echo.

echo [1/4] Checking for existing processes on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    echo Killing process PID %%a...
    taskkill /PID %%a /F >nul 2>&1
)

echo [2/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error installing dependencies!
    echo Please make sure Node.js is installed.
    echo Download Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo [3/4] Creating necessary folders...
if not exist "uploads" mkdir "uploads"
if not exist "public" mkdir "public"

echo [4/4] Copying frontend files to public folder...
copy "index.html" "public\index.html" >nul 2>&1
copy "style.css" "public\style.css" >nul 2>&1
copy "script.js" "public\script.js" >nul 2>&1
copy "README.md" "public\README.md" >nul 2>&1

echo [5/5] Removing original frontend files...
if exist "public\index.html" del "index.html"
if exist "public\style.css" del "style.css"
if exist "public\script.js" del "script.js"
if exist "public\README.md" del "README.md"

echo.
echo ================================================
echo          Setup completed successfully!
echo ================================================
echo.
echo Next steps:
echo 1. Run start.bat to launch the server
echo 2. Open browser and go to: http://localhost:3000
echo 3. For network access, use IP shown in console
echo.
echo Note: Frontend files have been moved to 'public' folder
echo.
pause