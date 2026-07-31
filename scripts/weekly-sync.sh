#!/bin/bash
# Zelia weekly sync — run via cron on Sundays at 8am
# Add to crontab: 0 8 * * 0 /Users/farhanmanjiyani/Projects/f13i-cli/scripts/weekly-sync.sh

set -e
cd ~/Projects/f13i-cli

echo "[$(date)] Weekly sync started" >> logs/cron.log

# Run full pricing intelligence pass (optional, weekly review)
if [ -f agents/pricing-intel.js ]; then
  echo "[$(date)] Running pricing-intel..." >> logs/cron.log
  DRY_RUN=false node agents/pricing-intel.js >> logs/cron.log 2>&1 || true
fi

echo "[$(date)] Weekly sync complete" >> logs/cron.log
echo "Weekly sync done. Review results in 30-deals/ and 90-scratch/daily/"
