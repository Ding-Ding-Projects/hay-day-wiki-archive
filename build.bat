@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
if not defined SILENT set "SILENT=0"
if /I "%~1"=="/s" set "SILENT=1"
if /I "%~1"=="--silent" set "SILENT=1"

call "%ROOT%download-dependencies.bat" %~1
if errorlevel 1 exit /b 1
pushd "%ROOT%"
if not exist "node_modules\vinext\package.json" goto install_dependencies
if not exist "node_modules\react\package.json" goto install_dependencies
echo Existing npm dependency tree found and reused after the fetcher verified Node.js.
goto build_site

:install_dependencies
call npm ci --no-audit --no-fund
if errorlevel 1 (popd & exit /b 1)

:build_site
call npm run build
if errorlevel 1 (popd & exit /b 1)
node scripts\build-pages.mjs
if errorlevel 1 (popd & exit /b 1)
node scripts\check-pages-output.mjs
if errorlevel 1 (popd & exit /b 1)
call npm run desktop:dir
if errorlevel 1 (popd & exit /b 1)
if not exist "dist\installer\win-unpacked\Hay Day Wiki Archive.exe" (
  echo Desktop build failure: the packaged application executable is missing.
  popd & exit /b 1
)
if not exist "dist\installer\win-unpacked\resources\app.asar" (
  echo Desktop build failure: the packaged application payload is missing.
  popd & exit /b 1
)
echo Static Pages and unpacked desktop builds completed with code signing disabled.
if "%SILENT%"=="1" (popd & exit /b 0)
set /p "RUN_SITE=Run the packaged desktop application now? [y/N] "
if /I "%RUN_SITE%"=="y" start "Hay Day Wiki Archive" "dist\installer\win-unpacked\Hay Day Wiki Archive.exe"
popd
exit /b 0
