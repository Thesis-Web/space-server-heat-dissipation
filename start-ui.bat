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
if not exist "%SCRIPT_DIR%node_modules\" (
  echo   node_modules\ not found -- running npm install first...
  cd /d "%SCRIPT_DIR%"
  npm install
)
if not exist "%SCRIPT_DIR%dist\runtime\runner\run-packet.js" (
  echo   dist\ not found -- running npm run build first...
  cd /d "%SCRIPT_DIR%"
  npm run build
)
start "" "http://localhost:8080"
cd /d "%SCRIPT_DIR%"
node server.js
goto :eof
:use_wsl
start "" "http://localhost:8080"
wsl bash -c "cd '%SCRIPT_DIR%' && node server.js"
goto :eof
