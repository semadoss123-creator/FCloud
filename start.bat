@echo off
color 0B
echo.
echo.

echo 
call npm list express >nul 2>&1
if errorlevel 1 (
    echo 
    call npm install
)

echo 
echo.
node server.js