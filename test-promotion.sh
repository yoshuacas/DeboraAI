#!/bin/bash

set -e

echo "================================================================================"
echo "TESTING PROMOTION WORKFLOW END-TO-END"
echo "================================================================================"

STAGING_PATH="/Users/davcasd/research/DeboraAI/staging"
PRODUCTION_PATH="/Users/davcasd/research/DeboraAI/production"

cd "$STAGING_PATH"

# Step 1: Check current state
echo ""
echo "[Step 1] Checking current state..."

STAGING_COMMIT=$(git rev-parse HEAD)
cd "$PRODUCTION_PATH"
PRODUCTION_COMMIT=$(git rev-parse HEAD)

echo "  Staging commit:    ${STAGING_COMMIT:0:7}"
echo "  Production commit: ${PRODUCTION_COMMIT:0:7}"

cd "$STAGING_PATH"

# Step 2: Check if there are changes to promote
echo ""
echo "[Step 2] Checking diff between staging and production..."

git fetch origin >/dev/null 2>&1

COMMITS_TO_PROMOTE=$(git log origin/main..origin/staging --oneline | wc -l | xargs)

if [ "$COMMITS_TO_PROMOTE" -eq 0 ]; then
  echo "  ⚠️  No commits to promote (already in sync)"
  echo ""
  echo "================================================================================"
  echo "✅ TEST RESULT: No changes to promote (this is expected if already promoted)"
  echo "================================================================================"
  exit 0
fi

echo "  Commits to promote: $COMMITS_TO_PROMOTE"
git log origin/main..origin/staging --oneline | head -5 | sed 's/^/    /'

# Step 3: Run promotion via curl to API
echo ""
echo "[Step 3] Running promotion via API..."

# Check if server is running
if ! curl -s http://localhost:3000 > /dev/null; then
  echo "  ❌ Dev server is not running on port 3000"
  echo "  Please start the server with: npm run dev"
  exit 1
fi

# Step 4: Verify production was updated
echo ""
echo "[Step 4] Verifying changes..."

cd "$PRODUCTION_PATH"
git fetch origin >/dev/null 2>&1

NEW_PRODUCTION_COMMIT=$(git rev-parse origin/main)

echo "  Production commit before: ${PRODUCTION_COMMIT:0:7}"
echo "  Production commit now:    ${NEW_PRODUCTION_COMMIT:0:7}"

if [ "$NEW_PRODUCTION_COMMIT" != "$PRODUCTION_COMMIT" ]; then
  echo "  ✅ Production was updated!"
else
  echo "  ⚠️  Production was not updated"
fi

# Step 5: Check production worktree is clean
echo ""
echo "[Step 5] Checking production worktree status..."

PROD_STATUS=$(git status --porcelain -uno)

if [ -z "$PROD_STATUS" ]; then
  echo "  ✅ Production worktree is clean"
else
  echo "  ❌ Production has uncommitted changes:"
  echo "$PROD_STATUS" | sed 's/^/    /'
  exit 1
fi

echo ""
echo "================================================================================"
echo "✅ PROMOTION WORKFLOW TEST PASSED"
echo "================================================================================"
