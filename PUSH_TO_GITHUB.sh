#!/bin/bash
set -e

REPO_URL="https://github.com/core7608/taby_final.git"
VERSION="1.0.1"

echo "🚀 Taby Browser — GitHub Push"
echo "=============================="

# 1. Init git لو مش موجود
if [ ! -d ".git" ]; then
  git init
  echo "✅ git init"
fi

# 2. Set remote
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"
echo "✅ Remote: $REPO_URL"

# 3. Commit
git add -A
git commit -m "fix: workflow release_id + author email + CSS syntax" 2>/dev/null || \
git commit --allow-empty -m "fix: workflow release_id + author email + CSS syntax"
echo "✅ Committed"

# 4. Push main
git branch -M main
git push -u origin main --force
echo "✅ Pushed to main"

# 5. Tag → يطلق الـ Action
git tag -f "v${VERSION}" -m "Taby v${VERSION}"
git push origin "v${VERSION}" --force
echo "✅ Tag v${VERSION} pushed"

echo ""
echo "================================================"
echo "  ✅ Done! Actions running:"
echo "  https://github.com/core7608/taby_final/actions"
echo ""
echo "  Releases:"
echo "  https://github.com/core7608/taby_final/releases"
echo "================================================"
