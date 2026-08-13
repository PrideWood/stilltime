@echo off
setlocal
chcp 65001 >nul
title Stilltime

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-Stilltime.ps1"

if errorlevel 1 (
  echo.
  echo Stilltime could not start. Please read README-Windows.txt for help.
  echo Stilltime 启动失败，请查看 README-Windows.txt。
  pause
)

endlocal
