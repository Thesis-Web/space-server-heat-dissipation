@echo off
REM start-ui.bat — Orbital Thermal Trade System UI Launcher for Windows
REM Double-click this file. Requires Node.js installed.
set PORT=8080
set SCRIPT_DIR=%~dp0
echo.
echo   Orbital Thermal Trade System -- UI Launcher
echo   -------------------------------------------
echo   URL  : http://localhost:8080
echo   Stop : Close this window or press Ctrl+C
echo.
where node >nul 2>&1
if %errorlevel%==0 goto use_node
where wsl >nul 2>&1
if %errorlevel%==0 goto use_wsl
echo ERROR: node not found. Install from nodejs.org and re-run.
pause
goto :eof
:use_node
cd /d "%SCRIPT_DIR%"
echo   Running npm install...
npm install
if %errorlevel% neq 0 (
  echo ERROR: npm install failed. Check Node.js install.
  pause
  goto :eof
)
echo   Running npm run build...
npm run build
if %errorlevel% neq 0 (
  echo ERROR: npm run build failed. See output above.
  pause
  goto :eof
)
start "" "http://localhost:8080"
node server.js
goto :eof
:use_wsl
start "" "http://localhost:8080"
wsl bash -c "cd '%SCRIPT_DIR%' && node server.js"
goto :eof
