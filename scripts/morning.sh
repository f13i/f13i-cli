#!/bin/bash
# Morning orchestration (7am M-F)
# Tier 1: data sync → detect changes → Tier 2: LLM reasoning (if changed)
# Cost: ~free + ~$0.01 (if data changed)
# Output: cron log with summary + readiness for "Zelia good morning"

set -e
cd ~/Projects/f13i-cli

LOG_FILE="logs/cron.log"
mkdir -p logs

echo "" >> "$LOG_FILE"
echo "[$(date)] ========================================" >> "$LOG_FILE"
echo "[$(date)] MORNING CADENCE (7am M-F)" >> "$LOG_FILE"
echo "[$(date)] ========================================" >> "$LOG_FILE"

# Tier 1: Data sync (fast, no LLM)
echo "[$(date)] → Running Tier 1 (data sync)..." >> "$LOG_FILE"
if bash scripts/tier1-sync.sh >> "$LOG_FILE" 2>&1; then
  CHANGES="yes"
  echo "[$(date)] Tier 1: ✓ NEW DATA DETECTED" >> "$LOG_FILE"
else
  CHANGES="no"
  echo "[$(date)] Tier 1: ○ No changes" >> "$LOG_FILE"
fi

# Tier 2: LLM reasoning (only if Tier 1 detected changes)
if [ "$CHANGES" = "yes" ]; then
  echo "[$(date)] → Running Tier 2 (LLM reasoning)..." >> "$LOG_FILE"
  bash scripts/tier2-reasoning.sh >> "$LOG_FILE" 2>&1 || echo "[$(date)] Tier 2: partial failure (non-fatal)" >> "$LOG_FILE"
  echo "[$(date)] Tier 2: ✓ Complete" >> "$LOG_FILE"
else
  echo "[$(date)] → Skipping Tier 2 (no new data)" >> "$LOG_FILE"
fi

echo "[$(date)] Ready for 'Zelia good morning'" >> "$LOG_FILE"
echo "[$(date)] ========================================" >> "$LOG_FILE"

exit 0
