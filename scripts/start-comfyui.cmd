@echo off
setlocal

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-comfyui.ps1" %*
exit /b %ERRORLEVEL%
