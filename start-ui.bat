@echo off
REM start-ui.bat — Orbital Thermal Trade System UI Launcher for Windows
REM Double-click this file. Requires Python 3 installed, or WSL with python3.
set PORT=8080
set SCRIPT_DIR=%~dp0
echo.
echo   Orbital Thermal Trade System -- UI Launcher
echo   -------------------------------------------
echo   URL  : http://localhost:8080
echo   Stop : Close this window or press Ctrl+C
echo.
where wsl >nul 2>&1
if %errorlevel%==0 goto use_wsl
where python3 >nul 2>&1
if %errorlevel%==0 goto use_python3
where python >nul 2>&1
if %errorlevel%==0 goto use_python
echo ERROR: python3 not found. Install from python.org and re-run.
pause
goto :eof
:use_wsl
start "" "http://localhost:8080"
wsl bash -c "cd '%SCRIPT_DIR%' && python3 -m http.server 8080 --directory ui/app"
goto :eof
:use_python3
start "" "http://localhost:8080"
python3 -m http.server 8080 --directory "%SCRIPT_DIR%ui\app"
goto :eof
:use_python
start "" "http://localhost:8080"
python -m http.server 8080 --directory "%SCRIPT_DIR%ui\app"
goto :eof
