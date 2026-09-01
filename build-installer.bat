@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
call "%ROOT%build.bat" /s
if errorlevel 1 exit /b 1
echo Installer packaging blocked: this repository publishes a static Pages site and has no installable application payload.
echo Squirrel.Windows packaging is not implemented for this project, so no installer is claimed or produced.
exit /b 2
