#!/bin/bash
# Tier 1: Data sync only (no Claude, no LLM reasoning)
# Pulls: Granola, Gmail, Calendar, Linear → Obsidian daily brief
# Cost: ~free (API calls only, no LLM)
# Logs: scripts/logs/tier1.log + 90-scratch/.last-sync-state.json

set -e
cd ~/Projects/f13i-cli

# Homebrew node is NOT on cron's default PATH (/usr/bin:/bin). Without this line the
# first `node` call below fails "command not found" and `set -e` silently kills the
# whole sync — no brief written, cron just logs "no changes". (librarian 2026-07-31)
export PATH="/opt/homebrew/bin:/usr/bin:/bin:$PATH"

LOG_FILE="logs/tier1-$(date +%Y-%m-%d).log"
mkdir -p logs

# Default: dry run off (can set DRY_RUN=true to preview)
DRY_RUN=${DRY_RUN:-false}

echo "[$(date)] ====== Tier 1 Data Sync Start ======" | tee -a "$LOG_FILE"

# Before sync: capture previous state
echo "[$(date)] Checking for changes..." | tee -a "$LOG_FILE"
node utils/change-detector.js > /tmp/detector-pre.json 2>/dev/null

# ===== Run data-only agents =====

# outbound-sync: Granola 48h, Gmail, Calendar → daily brief
echo "[$(date)] Running outbound-sync..." | tee -a "$LOG_FILE"
DRY_RUN=$DRY_RUN node agents/outbound-sync.js >> "$LOG_FILE" 2>&1 || echo "[$(date)] outbound-sync failed (non-fatal)" | tee -a "$LOG_FILE"

# Consolidation: Run Python daily-sync if available
# (This will eventually be migrated to Node, but for now we coexist)
if [ -f ~/scripts/f13i/daily-sync.py ]; then
  echo "[$(date)] Running Python daily-sync..." | tee -a "$LOG_FILE"
  if [ -d ~/scripts/f13i ]; then
    cd ~/scripts/f13i
    source .env 2>/dev/null || true
    /opt/homebrew/bin/python3 daily-sync.py >> "$LOG_FILE" 2>&1 || echo "[$(date)] Python daily-sync failed (non-fatal)" | tee -a "$LOG_FILE"
    cd ~/Projects/f13i-cli
  fi
fi

# ===== Check for changes =====

echo "[$(date)] Detecting state changes..." | tee -a "$LOG_FILE"
node utils/change-detector.js > /tmp/detector-post.json 2>/dev/null

CHANGES=$(node -e "const c = require('/tmp/detector-post.json'); process.exit(c.hasChanged ? 0 : 1)")
CHANGE_RESULT=$?

if [ $CHANGE_RESULT -eq 0 ]; then
  echo "[$(date)] ✓ NEW DATA DETECTED (tier2 should run)" | tee -a "$LOG_FILE"
  # Save state for next comparison
  node -e "const d = require('./utils/change-detector'); const c = d.getCurrentState(); d.saveState(c);" >> "$LOG_FILE" 2>&1
  EXIT_CODE=0  # Signal: new data
else
  echo "[$(date)] ○ NO CHANGES DETECTED (tier2 will skip)" | tee -a "$LOG_FILE"
  EXIT_CODE=1  # Signal: no new data
fi

echo "[$(date)] ====== Tier 1 Data Sync End (exit code: $EXIT_CODE) ======" | tee -a "$LOG_FILE"

exit $EXIT_CODE
