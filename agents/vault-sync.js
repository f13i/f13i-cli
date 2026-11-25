require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const {
  LIVE_STATUSES, localDate, daysSince, loadDeals, loadRecentMeetings, matchMeetingToDeal,
} = require('../utils/deals');

/**
 * vault-sync (headless drift detector)
 * ------------------------------------
 * The automated backbone of the "keep the vault honest" system.
 *
 * What it does (report-only — the FLAG half of the hybrid model):
 *   1. Reads every deal folder's index file + frontmatter (status/updated/last_contact/contacts).
 *   2. Pulls recent Granola meetings (default 4 days) via the public-API client.
 *   3. Matches meetings to deals (utils/deals.js): an attendee on the deal's email domain, a full
 *      contact name, or the whole company / folder name in the title. A lone first name never matches.
 *   4. Flags drift:
 *        - CLOSURE   : an "active" deal whose matched meeting summary contains wind-down / closed language.
 *        - STALE     : an "active" deal with no signal in >21d (warm) / >45d (dark).
 *        - NEW-LEAD  : an external meeting that matches no deal folder (possible new deal).
 *   5. Writes a drift report to 90-scratch/daily/YYYY-MM-DD-vault-drift.md and prints it.
 *
 * It never edits deal files. Judgment calls (closures, reclassification) are surfaced for
 * approval; the in-session /vault-sync command (20-agents/09-vault-sync.md) does the Gmail +
 * iMessage enrichment and the hybrid apply.
 *
 * Gmail/iMessage are intentionally NOT pulled here: those MCPs aren't reliably reachable from a
 * headless cron run, and Granola-based closure detection already catches the highest-value miss
 * (a wound-down engagement whose file still says "active"). The scheduled job stays cheap and
 * dependency-light; the session command fills in the rest.
 */

const VAULT = (process.env.OBSIDIAN_VAULT_PATH
  || `${process.env.HOME}/Library/Mobile Documents/iCloud~md~obsidian/Documents/f13i-brain`)
  .replace(/^~(?=$|\/)/, process.env.HOME);
const DAILY_DIR = path.join(VAULT, '90-scratch', 'daily');

const LOOKBACK_DAYS = parseInt(process.env.VAULT_SYNC_LOOKBACK || '4', 10);
const WARM_DAYS = 21;
const DARK_DAYS = 45;

// Locked status vocabulary — the contract is documented in 30-deals/00-README.md
// and rendered by 30-deals/Pipeline.base. Keep all three in sync.
// LIVE = "this deal should be moving", so staleness and closure drift matter.
// QUIET = intentionally not moving. Skipped for staleness, no noise.
const QUIET_STATUSES = new Set([
  'cold', 'parked', 'dead-revive', 'closed-won', 'closed-lost',
  'merged', 'networking', 'partner', 'competitor',
]);
const isLive = (s) => LIVE_STATUSES.has(String(s || '').trim().toLowerCase());
const isKnown = (s) => {
  const v = String(s || '').trim().toLowerCase();
  return LIVE_STATUSES.has(v) || QUIET_STATUSES.has(v);
};

// Language in a meeting summary that suggests a status change.
const CLOSURE_RE = /(wind[\s-]?down|winding down|close[\s-]?out|closeout|engagement (complete|ended|over)|off[\s-]?board|not moving forward|no longer|final payment|pausing|paused|decided to hold|going internal|keep(ing)? it internal)/i;


function isExternalMeeting(note) {
  const folder = JSON.stringify(note.folder_membership || []).toLowerCase();
  if (folder.includes('grafana')) return false; // internal Grafana work
  const others = (note.attendees || []).filter((a) => {
    const e = (a.email || '').toLowerCase();
    return e && !e.includes('me@f13i.com') && !e.endsWith('@f13i.com');
  });
  return others.length > 0;
}

async function run() {
  logger.info('vault-sync (drift detector) started', { lookbackDays: LOOKBACK_DAYS });
  const deals = loadDeals().map((d) => ({
    ...d,
    file: `${d.link}.md`,
    lastTouch: daysSince(d.lastTouchDate),
  }));
  const { notes: meetings, error: granolaError } = await loadRecentMeetings(LOOKBACK_DAYS, { withSummaries: true });
  if (granolaError) logger.warn(`Granola unavailable, staleness only: ${granolaError}`);

  const flags = { closure: [], stale: [], newLead: [], offSchema: [] };
  const matchedFolders = new Set();

  // 1. Meeting-driven signals (closures + new leads)
  for (const note of meetings) {
    if (!isExternalMeeting(note)) continue;
    const deal = matchMeetingToDeal(note, deals);
    const date = (note.created_at || '').slice(0, 10);
    if (deal) {
      matchedFolders.add(deal.folder);
      if (isLive(deal.status) && CLOSURE_RE.test(note.summary || '')) {
        const hit = (note.summary.match(CLOSURE_RE) || [])[0];
        flags.closure.push({ deal, note, date, keyword: hit });
      }
    } else {
      flags.newLead.push({ note, date });
    }
  }

  // 2. Staleness on active deals with no recent signal
  for (const d of deals) {
    if (!isKnown(d.status)) flags.offSchema.push(d);
    if (!isLive(d.status)) continue;
    if (/peer-advisory|reciprocal/i.test(`${d.fm.type} ${d.fm.relationship}`)) continue; // ongoing relationships, not pipeline
    if (matchedFolders.has(d.folder)) continue; // had a signal this window
    if (d.lastTouch >= DARK_DAYS) flags.stale.push({ deal: d, level: 'DARK', days: d.lastTouch });
    else if (d.lastTouch >= WARM_DAYS) flags.stale.push({ deal: d, level: 'STALE', days: d.lastTouch });
  }

  // 3. Build report
  const today = localDate();
  const L = [];
  L.push(`# Vault Drift Report — ${today}`);
  L.push('');
  L.push(`_Auto-generated by \`agents/vault-sync.js\`. Report-only — apply via \`/vault-sync\` in a Zelia session. Granola lookback: ${LOOKBACK_DAYS}d._`);
  if (granolaError) L.push('', `_Granola unavailable this run (${granolaError}): no closure or new-lead signals, and staleness ignores meetings._`);
  L.push('');

  L.push(`## 🔴 Closure signals (${flags.closure.length}) — deal file says active, meeting says otherwise`);
  if (!flags.closure.length) L.push('- none');
  for (const f of flags.closure) {
    L.push(`- **${f.deal.folder}** (status: \`${f.deal.status}\`) — ${f.date} meeting "${f.note.title}" contains _"${f.keyword}"_. → Verify + likely close/reclassify. \`${f.deal.file}\``);
  }
  L.push('');

  L.push(`## 🟡 Stale / dark (${flags.stale.length}) — active deals with no signal`);
  if (!flags.stale.length) L.push('- none');
  for (const f of flags.stale.sort((a, b) => b.days - a.days)) {
    L.push(`- **${f.deal.folder}** — ${f.level}, ${f.days === Infinity ? 'no dated touch' : f.days + 'd'} since last contact (status: \`${f.deal.status}\`). \`${f.deal.file}\``);
  }
  L.push('');

  L.push(`## ⚠️ Off-schema status (${flags.offSchema.length}) — status outside the locked vocabulary`);
  if (!flags.offSchema.length) L.push('- none');
  for (const d of flags.offSchema) {
    L.push(`- **${d.folder}** — \`status: ${d.status}\` is not in the locked set. → Fix the file or extend the vocabulary in \`30-deals/00-README.md\` + \`agents/vault-sync.js\`. \`${d.file}\``);
  }
  L.push('');

  L.push(`## 🆕 Possible new leads (${flags.newLead.length}) — external meeting, no matching deal folder`);
  if (!flags.newLead.length) L.push('- none');
  for (const f of flags.newLead) {
    const who = (f.note.attendees || []).map((a) => a.name || a.email).filter((n) => n && !/farhan/i.test(n)).join(', ');
    L.push(`- ${f.date} "${f.note.title}"${who ? ` — ${who}` : ''}. → New deal folder? (or internal/personal — ignore)`);
  }
  L.push('');
  L.push('---');
  L.push(`_Deals scanned: ${deals.length} · meetings scanned: ${meetings.length} · ${new Date().toLocaleString()}_`);

  const report = L.join('\n');
  const outFile = path.join(DAILY_DIR, `${today}-vault-drift.md`);
  fs.mkdirSync(DAILY_DIR, { recursive: true });
  fs.writeFileSync(outFile, report + '\n');

  console.log(report);
  console.log(`\n→ Written to ${path.relative(VAULT, outFile)}`);
  logger.info('vault-sync completed', {
    closures: flags.closure.length, stale: flags.stale.length, newLeads: flags.newLead.length,
    offSchema: flags.offSchema.length,
  });
  return { flags, outFile };
}

module.exports = { run };

if (require.main === module) {
  run().catch((err) => {
    logger.error(`vault-sync fatal: ${err.message}`, { stack: err.stack });
    process.exit(1);
  });
}
