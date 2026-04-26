@echo off
setlocal

set REPO_URL=https://github.com/core7608/taby_final.git
set VERSION=1.0.1

echo.
echo  Taby Browser - GitHub Push
echo  ===========================

IF NOT EXIST ".git" (
  git init
  echo [OK] git init
)

git remote remove origin 2>nul
git remote add origin %REPO_URL%
echo [OK] Remote set

git add -A
git commit -m "fix: workflow release_id + author email + CSS syntax"
echo [OK] Committed

git branch -M main
git push -u origin main --force
echo [OK] Pushed to main

git tag -f "v%VERSION%" -m "Taby v%VERSION%"
git push origin "v%VERSION%" --force
echo [OK] Tag pushed

echo.
echo  ================================================
echo   Done! Check Actions:
echo   https://github.com/core7608/taby_final/actions
echo.
echo   Releases:
echo   https://github.com/core7608/taby_final/releases
echo  ================================================
pause
