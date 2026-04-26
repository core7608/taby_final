@echo off
REM ═══════════════════════════════════════════════════════
REM  Taby Browser — رفع للـ GitHub (Windows)
REM ═══════════════════════════════════════════════════════

set REPO_URL=https://github.com/core7608/taby_final.git
set VERSION=1.0.0

echo.
echo  Taby Browser — GitHub Setup
echo  ==============================

IF NOT EXIST ".git" (
  git init
  echo [OK] git init
)

git remote remove origin 2>nul
git remote add origin %REPO_URL%
echo [OK] Remote set

git add -A
git commit -m "Initial release: Taby Browser v%VERSION% (Electron)"
echo [OK] Committed

git branch -M main
git push -u origin main --force
echo [OK] Pushed to main

git tag -a "v%VERSION%" -m "Taby Browser v%VERSION%"
git push origin "v%VERSION%" --force
echo [OK] Tag pushed

echo.
echo  ================================================
echo   Done! GitHub Actions is building now:
echo   https://github.com/core7608/taby_final/actions
echo.
echo   Releases will appear at:
echo   https://github.com/core7608/taby_final/releases
echo  ================================================
pause
