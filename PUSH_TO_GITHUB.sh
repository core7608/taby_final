#!/bin/bash
# ═══════════════════════════════════════════════════
#   Taby Browser - Push to GitHub Script
#   شغّل هذا السكريبت على جهازك
# ═══════════════════════════════════════════════════

echo "🚀 Pushing Taby Browser to GitHub..."

cd "$(dirname "$0")"

# Check git
if ! command -v git &>/dev/null; then
  echo "❌ Git not installed"; exit 1
fi

# Init if needed
if [ ! -d .git ]; then
  git init
  git branch -M main
fi

# Config
git config user.name  "Taby Browser"
git config user.email "taby@browser.dev"

# Remote
git remote remove origin 2>/dev/null || true
git remote add origin git@github.com:core7608/taby_final.git

# Stage & commit
git add .
git commit -m "feat: Taby Browser v1.0.0 - Complete Release" --allow-empty

# Push
git push -u origin main --force

echo ""
echo "✅ Done! Now go to GitHub Actions and watch the build!"
echo "   https://github.com/core7608/taby_final/actions"
echo ""
echo "📋 Next: Add Secrets in GitHub:"
echo "   https://github.com/core7608/taby_final/settings/secrets/actions"
echo ""
echo "   TAURI_SIGNING_PRIVATE_KEY  →  (see SETUP_GITHUB.md)"
echo "   TAURI_SIGNING_PRIVATE_KEY_PASSWORD  →  (leave empty)"
echo ""
echo "🏷️  Then create a release tag to trigger the build:"
echo "   git tag v1.0.0 && git push origin v1.0.0"
