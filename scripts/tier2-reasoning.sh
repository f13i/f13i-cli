#!/bin/bash
# Tier 2: reasoning agents
# Runs: action-items-sync, deal-status-sync, pricing-intel
# Cost: no model calls unless PRICINGSAAS_MCP_TOKEN is set (then one Sonnet call per monitored company).
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

# action-items-sync: suggest new items (Granola, session note, deal next actions) in the daily brief. Never writes ACTION-ITEMS.md.
echo "[$(date)] Running action-items-sync..." | tee -a "$LOG_FILE"
DRY_RUN=$DRY_RUN node agents/action-items-sync.js >> "$LOG_FILE" 2>&1 || echo "[$(date)] action-items-sync failed (non-fatal)" | tee -a "$LOG_FILE"

# deal-status-sync: live deals from 30-deals frontmatter + Granola → "Deal Pulse" in the daily brief.
# The agent skips itself when there are fewer than 5 live deals.
echo "[$(date)] Running deal-status-sync..." | tee -a "$LOG_FILE"
DRY_RUN=$DRY_RUN node agents/deal-status-sync.js >> "$LOG_FILE" 2>&1 || echo "[$(date)] deal-status-sync failed (non-fatal)" | tee -a "$LOG_FILE"

# pricing-intel: digest for 10-brain/06-companies-to-monitor.md → 90-scratch/daily/<date>-pricing-intel.md
echo "[$(date)] Running pricing-intel..." | tee -a "$LOG_FILE"
DRY_RUN=$DRY_RUN node agents/pricing-intel.js >> "$LOG_FILE" 2>&1 || echo "[$(date)] pricing-intel failed (non-fatal)" | tee -a "$LOG_FILE"

echo "[$(date)] ====== Tier 2 Reasoning End ======" | tee -a "$LOG_FILE"
exit 0
