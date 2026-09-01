@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
set "SILENT=0"
if /I "%~1"=="/s" set "SILENT=1"
if /I "%~1"=="--silent" set "SILENT=1"
if /I "%SILENT%"=="1" set "SILENT=1"

where node >nul 2>&1
if not errorlevel 1 goto :verify_node

echo Node.js >=22.13.0 was not found. Trying the user-scoped canonical package-manager route.
where winget >nul 2>&1
if errorlevel 1 (
  echo Dependency failure: Node.js >=22.13.0 is missing, winget is unavailable, and no portable bootstrap route is configured.
  exit /b 1
)
winget install --id OpenJS.NodeJS.LTS --exact --scope user --accept-source-agreements --accept-package-agreements
if errorlevel 1 (
  echo Dependency failure: winget could not install Node.js LTS from the canonical package source.
  exit /b 1
)
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%ProgramFiles%\nodejs;%PATH%"

:verify_node
for /f "delims=" %%v in ('node --version') do set "node_version=%%v"
node -e "const [major,minor]=process.versions.node.split('.').map(Number); if (major < 22 || (major === 22 && minor < 13)) process.exit(1)"
if errorlevel 1 (
  echo Dependency failure: Node.js %node_version% does not satisfy >=22.13.0. Refresh PATH or install the declared version.
  exit /b 1
)
echo Node.js %node_version% is available.
exit /b 0
