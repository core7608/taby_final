#!/bin/bash
# ═══════════════════════════════════════════════════════
#  Taby Browser — رفع للـ GitHub + إطلاق أول Release
# ═══════════════════════════════════════════════════════

set -e

REPO_URL="https://github.com/core7608/taby_final.git"
VERSION="1.0.0"

echo ""
echo "🚀 Taby Browser — GitHub Setup"
echo "══════════════════════════════"
echo ""

# 1. Init git
if [ ! -d ".git" ]; then
  git init
  echo "✅ git init done"
fi

# 2. Config (اختياري — غيّر لو محتاج)
# git config user.email "your@email.com"
# git config user.name "Your Name"

# 3. Add remote
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"
echo "✅ Remote set to: $REPO_URL"

# 4. Stage + commit
git add -A
git commit -m "🚀 Initial release: Taby Browser v${VERSION} (Electron)" 2>/dev/null || \
git commit --allow-empty -m "🚀 Initial release: Taby Browser v${VERSION} (Electron)"
echo "✅ Committed"

# 5. Push main branch
git branch -M main
git push -u origin main --force
echo "✅ Pushed to main"

# 6. Tag → يطلق الـ GitHub Action تلقائياً
git tag -a "v${VERSION}" -m "Taby Browser v${VERSION}" 2>/dev/null || \
git tag -f "v${VERSION}" -m "Taby Browser v${VERSION}"

git push origin "v${VERSION}" --force
echo "✅ Tag v${VERSION} pushed"

echo ""
echo "══════════════════════════════════════════════════════"
echo "  ✅ كل حاجة اتعملت!"
echo ""
echo "  GitHub Actions هيبدأ يبني تلقائياً:"
echo "  https://github.com/core7608/taby_final/actions"
echo ""
echo "  الـ Release هيظهر هنا لما يخلص:"
echo "  https://github.com/core7608/taby_final/releases"
echo "══════════════════════════════════════════════════════"
