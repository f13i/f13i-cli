# f13i Agent Fleet Cadence

A two-tier scheduling system that separates **cheap data work** (Tier 1) from **expensive LLM reasoning** (Tier 2).

## Philosophy

- **Tier 1 (Data)**: Syncs Granola, Gmail, Calendar, Linear → Obsidian. No Claude calls. Runs frequently. ~free.
- **Tier 2 (Reasoning)**: Action items, deal status, pricing intelligence. Calls Claude. Runs only when Tier 1 detects new data. ~$0.01 per trigger.

**Change detection** prevents wasting tokens on stale data. If nothing changed since the last Tier 2 run, Tier 2 skips entirely.

---

## Scripts

### `tier1-sync.sh` — Data only, no LLM

**Runs:**
- `agents/outbound-sync.js` — Granola 48h, Gmail, Calendar → daily brief
- `~/scripts/f13i/daily-sync.py` — Calendar, Gmail, Granola, Linear (consolidation)

**Output:** Logs to `logs/tier1-YYYY-MM-DD.log`  
**Exit code:** 0 if data changed, 1 if no changes  
**Cost:** ~free (API calls only)  
**Time:** ~10s

### `tier2-reasoning.sh` — LLM reasoning only

**Runs:** (only if Tier 1 detected changes, or forced)
- `agents/action-items-sync.js` — Extract actions from Granola → ACTION-ITEMS.md
- `agents/deal-status-sync.js` — Pull signals, rank deals (if 5+ active deals)
- `agents/pricing-intel.js` — Monitor companies for pricing changes

**Output:** Logs to `logs/tier2-YYYY-MM-DD.log`  
**Cost:** ~$0.005–$0.02 per run (3 Sonnet calls)  
**Time:** ~30s–1m

### `morning.sh` — 7am M-F (with change gating)

**Runs:**
1. Tier 1 (data sync)
2. Detects changes
3. **If changes:** Tier 2 (LLM reasoning)
4. **If no changes:** Skips Tier 2, logs "no trigger"

**Output:** Logs to `logs/cron.log`  
**Cost:** ~free + ~$0.01 (if data changed)  
**Readiness:** Logs "Ready for 'Zelia good morning'"

### `evening.sh` — 6pm M-F (Tier 1 only)

**Runs:** Tier 1 data refresh (no LLM)

**Purpose:** Keep daily brief fresh for tomorrow's morning snapshot.  
**Cost:** ~free  
**Output:** Logs to `logs/cron.log`

### `weekly.sh` — 8am Sunday (full stack)

**Runs:**
1. Tier 1 (full data refresh)
2. Tier 2 (full LLM reasoning, no change gating)

**Purpose:** Weekly comprehensive sync + week-in-review prep.  
**Cost:** ~$0.05 (full stack, every change is processed)  
**Output:** Logs to `logs/cron.log`

---

## Change Detection

Tier 2 only runs if **at least one** of these changed since the last Tier 2 run:
- `90-scratch/daily/` — Daily brief files
- `00-f13i/ACTION-ITEMS.md` — Action items
- `30-deals/` — Deal index updates
- `10-brain/companies-to-monitor.md` — Pricing targets

State is stored in `90-scratch/.last-sync-state.json` as SHA256 hashes.

**How to force Tier 2 to run:**
```bash
rm ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/f13i-brain/90-scratch/.last-sync-state.json
bash scripts/morning.sh
```

---

## Crontab

Add to your crontab (`crontab -e`):

```bash
# f13i agent fleet — Tier 1 + 2 cadence
0 7 * * 1-5 cd ~/Projects/f13i-cli && bash scripts/morning.sh >> logs/cron.log 2>&1
0 18 * * 1-5 cd ~/Projects/f13i-cli && bash scripts/evening.sh >> logs/cron.log 2>&1
0 8 * * 0 cd ~/Projects/f13i-cli && bash scripts/weekly.sh >> logs/cron.log 2>&1

# Disable the old Python daily-sync (migrate to Node tier1 instead)
# 0 2 * * * cd /Users/farhanmanjiyani/scripts/f13i && source .env && /opt/homebrew/bin/python3 daily-sync.py >> daily-sync.log 2>&1
```

---

## Logs

- **`logs/cron.log`** — Main log (appended by all scripts)
- **`logs/tier1-YYYY-MM-DD.log`** — Tier 1 detailed log
- **`logs/tier2-YYYY-MM-DD.log`** — Tier 2 detailed log
- **`logs/YYYY-MM-DD.log`** — Agent application logs (from logger.js)

---

## Estimated Token Spend

### Per-week baseline (no deep-dives, routine operation)

| Script | Frequency | Cost per run | Weekly |
|--------|-----------|-------------|--------|
| morning (Tier 1) | 5x/week | ~free | ~free |
| morning (Tier 2, if change) | 3–4x/week | ~$0.01 | ~$0.04 |
| evening (Tier 1) | 5x/week | ~free | ~free |
| weekly | 1x/week | ~$0.05 | ~$0.05 |
| **Total** | — | — | **~$0.10/week** |

### Naive "run everything hourly" (before optimization)

- 168 hours/week
- ~5 agents × 3k tokens/agent = ~15k tokens per run
- 168 × ~$0.25 = **~$42/week** ❌

### This system

- **~$0.10/week** ✓
- **420x cheaper** than naive scheduling

---

## Disabling / Controlling Tiers

### Disable Tier 2 entirely (data-only mode)

```bash
# In crontab or before running:
DISABLE_TIER2=1 bash scripts/morning.sh
```

(Or just run `bash scripts/tier1-sync.sh` manually instead of `scripts/morning.sh`)

### Disable a specific agent

Set `DRY_RUN=true` before running:

```bash
# Preview what would happen without side effects:
DRY_RUN=true bash scripts/morning.sh
```

### Disable one schedule without others

Remove or comment out a single crontab line. Example: disable evening, keep morning + weekly:

```bash
0 7 * * 1-5 cd ~/Projects/f13i-cli && bash scripts/morning.sh >> logs/cron.log 2>&1
# 0 18 * * 1-5 cd ~/Projects/f13i-cli && bash scripts/evening.sh >> logs/cron.log 2>&1  # Disabled
0 8 * * 0 cd ~/Projects/f13i-cli && bash scripts/weekly.sh >> logs/cron.log 2>&1
```

---

## Consolidation Status

### ✓ Complete: Tier 1 tier agents
- `outbound-sync.js` — data sync (Granola, Gmail placeholder, Calendar placeholder)
- Python `daily-sync.py` — consolidates Calendar, Gmail, Granola, Linear

### ✓ Working: Tier 2 (LLM) agents
- `action-items-sync.js` — Claude-based action extraction
- `deal-status-sync.js` — Claude-based deal ranking
- `pricing-intel.js` — Claude-based company monitoring

### ⚠️ To migrate: Gmail + Calendar in Node agents
- Currently in Python script; move to `outbound-sync.js` when MCP integration ready
- Planned: Use Superhuman Mail MCP or Google Calendar MCP

---

## Troubleshooting

### Tier 2 not running when data changed

Check if `.last-sync-state.json` is locked:
```bash
cat ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/f13i-brain/90-scratch/.last-sync-state.json
```

If missing or corrupted, delete and re-run:
```bash
rm ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/f13i-brain/90-scratch/.last-sync-state.json
bash scripts/morning.sh
```

### Cron jobs not running

Check crontab:
```bash
crontab -l
```

Verify cron is enabled:
```bash
sudo log stream --predicate 'process == "cron"' --level debug
```

### Logs not appearing

Verify log directory exists:
```bash
mkdir -p ~/Projects/f13i-cli/logs
```

Check permissions:
```bash
ls -la ~/Projects/f13i-cli/logs/
```

---

## Roadmap

- [ ] **Tier 1.5 (event-driven):** Trigger Tier 2 on Granola webhook instead of polling
- [ ] **Gmail/Calendar MCP:** Move Python integrations to Node agents
- [ ] **Brain lint:** Weekly vault health check (broken links, orphans, etc.)
- [ ] **Pricing deep-dive:** Tier 3 agent that only runs on detected pricing changes
- [ ] **Parallel Tier 2:** Run agents concurrently instead of sequentially

---

**Last updated:** 2026-05-31  
**For:** Farhan Manjiyani  
**Vault:** `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/f13i-brain`
