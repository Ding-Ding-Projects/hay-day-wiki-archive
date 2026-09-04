@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
if not defined SILENT set "SILENT=0"
if /I "%~1"=="/s" set "SILENT=1"
if /I "%~1"=="--silent" set "SILENT=1"
call "%ROOT%build.bat" /s
if errorlevel 1 exit /b 1
pushd "%ROOT%"
call npm run desktop:package
if errorlevel 1 (popd & exit /b 1)
call npm run desktop:verify
if errorlevel 1 (popd & exit /b 1)
echo Squirrel.Windows installer completed with code signing disabled. The operating system may show an unknown-publisher warning.
if "%SILENT%"=="1" (popd & exit /b 0)
set /p "RUN_INSTALLER=Open the Squirrel.Windows output folder now? [y/N] "
if /I "%RUN_INSTALLER%"=="y" start "Hay Day Wiki Archive installer output" explorer.exe "%ROOT%dist\installer"
popd
exit /b 0
