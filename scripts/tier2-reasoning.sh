#!/bin/bash
# Tier 2: LLM reasoning (Claude-based agents)
# Runs: action-items-sync, deal-status-sync, pricing-intel
# Cost: ~0.005-0.02 per run (3 Sonnet calls, ~2-5k tokens total)
# Only runs if Tier 1 detected new data.

set -e
cd ~/Projects/f13i-cli

# Homebrew node is NOT on cron's default PATH — add it so `node` resolves. (librarian 2026-07-31)
export PATH="/opt/homebrew/bin:/usr/bin:/bin:$PATH"

LOG_FILE="logs/tier2-$(date +%Y-%m-%d).log"
mkdir -p logs

# Default: dry run off
DRY_RUN=${DRY_RUN:-false}

echo "[$(date)] ====== Tier 2 Reasoning Start ======" | tee -a "$LOG_FILE"
echo "[$(date)] DRY_RUN=$DRY_RUN" | tee -a "$LOG_FILE"

# ===== Run Claude-based agents =====

# action-items-sync: Extract actions from Granola, daily, session → ACTION-ITEMS.md
echo "[$(date)] Running action-items-sync..." | tee -a "$LOG_FILE"
DRY_RUN=$DRY_RUN node agents/action-items-sync.js >> "$LOG_FILE" 2>&1 || echo "[$(date)] action-items-sync failed (non-fatal)" | tee -a "$LOG_FILE"

# deal-status-sync: Pull signals from Granola/Gmail/Calendar, rank deals → daily brief
echo "[$(date)] Running deal-status-sync..." | tee -a "$LOG_FILE"
ACTIVE_DEALS=$(grep -c "| 🔥\|| 🟡\|| 🧊" ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/f13i-brain/00-index/01-index.md 2>/dev/null || echo "0")
if [ "$ACTIVE_DEALS" -ge 5 ]; then
  DRY_RUN=$DRY_RUN node agents/deal-status-sync.js >> "$LOG_FILE" 2>&1 || echo "[$(date)] deal-status-sync failed (non-fatal)" | tee -a "$LOG_FILE"
else
  echo "[$(date)] Skipping deal-status-sync (only $ACTIVE_DEALS active deals, need 5+)" | tee -a "$LOG_FILE"
fi

# pricing-intel: Monitor companies for pricing changes
echo "[$(date)] Running pricing-intel..." | tee -a "$LOG_FILE"
DRY_RUN=$DRY_RUN node agents/pricing-intel.js >> "$LOG_FILE" 2>&1 || echo "[$(date)] pricing-intel failed (non-fatal)" | tee -a "$LOG_FILE"

echo "[$(date)] ====== Tier 2 Reasoning End ======" | tee -a "$LOG_FILE"
exit 0
