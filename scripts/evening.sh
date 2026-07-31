#!/bin/bash
# Evening cadence (6pm M-F)
# Tier 1 only: refresh deal state from signals (Granola, Gmail, Calendar)
# No LLM — just data capture for tomorrow's decision context
# Cost: ~free
# Purpose: Keep daily brief fresh without running expensive Claude jobs

set -e
cd ~/Projects/f13i-cli

LOG_FILE="logs/cron.log"
mkdir -p logs

echo "" >> "$LOG_FILE"
echo "[$(date)] ========================================" >> "$LOG_FILE"
echo "[$(date)] EVENING CADENCE (6pm M-F)" >> "$LOG_FILE"
echo "[$(date)] ========================================" >> "$LOG_FILE"

# Tier 1 only: data refresh
echo "[$(date)] → Running Tier 1 (data refresh)..." >> "$LOG_FILE"
if bash scripts/tier1-sync.sh >> "$LOG_FILE" 2>&1; then
  echo "[$(date)] Tier 1: ✓ Data refreshed" >> "$LOG_FILE"
else
  echo "[$(date)] Tier 1: ○ No changes" >> "$LOG_FILE"
fi

echo "[$(date)] ✓ Deal state updated for tomorrow" >> "$LOG_FILE"
echo "[$(date)] ========================================" >> "$LOG_FILE"

exit 0
