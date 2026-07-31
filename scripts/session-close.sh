#!/bin/bash
# Zelia session close — run manually at end of work session
# Usage: bash scripts/session-close.sh

set -e
cd ~/Projects/f13i-cli

echo "Running session close via Claude Code..."
echo "This will write session notes and update ACTION-ITEMS.md."
echo ""
echo "Run this command in Claude Code (from ~/Projects/f13i-cli):"
echo "claude --print \"wrap up — run mode 4 session close\""
