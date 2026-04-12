@echo off
title Pumpstreckenrechner
color 0A
echo.
echo =====================================================
echo   Pumpstreckenrechner wird gestartet...
echo =====================================================
echo.

REM Oeffne Browser parallel
timeout /t 2 /nobreak >nul
start http://localhost:3000

REM Starte Server
npm run dev
