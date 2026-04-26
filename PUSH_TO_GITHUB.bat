@echo off
chcp 65001 > nul
echo Pushing Taby Browser to GitHub...
cd /d "%~dp0"
git init
git branch -M main
git config user.name "Taby Browser"
git config user.email "taby@browser.dev"
git remote remove origin 2>nul
git remote add origin git@github.com:core7608/taby_final.git
git add .
git commit -m "feat: Taby Browser v1.0.0 - Complete Release"
git push -u origin main --force
echo.
echo Done! Visit: https://github.com/core7608/taby_final/actions
echo Add Secrets: https://github.com/core7608/taby_final/settings/secrets/actions
pause
