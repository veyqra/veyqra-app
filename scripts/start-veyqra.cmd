@echo off
setlocal enabledelayedexpansion

REM Get the repository root (two levels up from scripts folder)
cd /d "%~dp0.."

REM Start Veyqra with reload
npm.cmd run dev:windows
