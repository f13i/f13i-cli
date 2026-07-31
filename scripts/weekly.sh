#!/bin/bash
# Weekly sync (Sunday 8am)
# Full stack: Tier 1 data + Tier 2 LLM reasoning
# Also runs: brain lint, pricing deep-dive, week-in-review
# Cost: ~$0.05 (full reasoning + extras)
# Purpose: Comprehensive week recap + vault grooming

set -e
cd ~/Projects/f13i-cli

LOG_FILE="logs/cron.log"
mkdir -p logs

echo "" >> "$LOG_FILE"
echo "[$(date)] ========================================" >> "$LOG_FILE"
echo "[$(date)] WEEKLY CADENCE (8am Sunday)" >> "$LOG_FILE"
echo "[$(date)] ========================================" >> "$LOG_FILE"

# Tier 1: Full data sync
echo "[$(date)] → Running Tier 1 (full data refresh)..." >> "$LOG_FILE"
bash scripts/tier1-sync.sh >> "$LOG_FILE" 2>&1 || echo "[$(date)] Tier 1: partial failure (non-fatal)" >> "$LOG_FILE"
echo "[$(date)] Tier 1: ✓ Complete" >> "$LOG_FILE"

# Tier 2: Full reasoning
echo "[$(date)] → Running Tier 2 (full reasoning)..." >> "$LOG_FILE"
bash scripts/tier2-reasoning.sh >> "$LOG_FILE" 2>&1 || echo "[$(date)] Tier 2: partial failure (non-fatal)" >> "$LOG_FILE"
echo "[$(date)] Tier 2: ✓ Complete" >> "$LOG_FILE"

# (Future: add brain lint, week-in-review here)
echo "[$(date)] → Week recap ready (manual: 'Zelia session close')" >> "$LOG_FILE"

echo "[$(date)] ✓ Weekly sync complete" >> "$LOG_FILE"
echo "[$(date)] ========================================" >> "$LOG_FILE"

exit 0
