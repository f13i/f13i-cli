require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const granola = require('../utils/granola-api-client');
const logger = require('../utils/logger');

/**
 * vault-sync (headless drift detector)
 * ------------------------------------
 * The automated backbone of the "keep the vault honest" system.
 *
 * What it does (report-only — the FLAG half of the hybrid model):
 *   1. Reads every deal folder's index file + frontmatter (status/updated/last_contact/contacts).
 *   2. Pulls recent Granola meetings (default 4 days) via the public-API client.
 *   3. Matches meetings to deals by contact name / company / email domain / folder name.
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
const DEALS_DIR = path.join(VAULT, '30-deals');
const DAILY_DIR = path.join(VAULT, '90-scratch', 'daily');

const LOOKBACK_DAYS = parseInt(process.env.VAULT_SYNC_LOOKBACK || '4', 10);
const WARM_DAYS = 21;
const DARK_DAYS = 45;

// Locked status vocabulary — the contract is documented in 30-deals/00-README.md
// and rendered by 30-deals/Pipeline.base. Keep all three in sync.
// LIVE = "this deal should be moving", so staleness and closure drift matter.
const LIVE_STATUSES = new Set(['active', 'proposal-out', 'awaiting-reply', 'warm']);
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

const STOPWORDS = new Set(['farhan', 'manjiyani', 'the', 'and', 'pricing', 'sync', 'call', 'meeting', 'catch', 'up', 'x', 'chat', 'feedback', 'session', 'working', '1', 'strategy']);

function daysSince(dateStr) {
  if (!dateStr || dateStr === 'open') return Infinity;
  const d = new Date(dateStr);
  if (isNaN(d)) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function readFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  const fm = {};
  if (!m) return fm;
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kv) fm[kv[1].toLowerCase()] = kv[2].trim();
  }
  return fm;
}

// Build a set of lowercase match-keywords for a deal from its folder + frontmatter.
function dealKeywords(folder, fm) {
  const kw = new Set();
  const add = (s) => {
    if (!s) return;
    String(s).toLowerCase().split(/[^a-z0-9.]+/).forEach((tok) => {
      if (tok.length > 2 && !STOPWORDS.has(tok)) kw.add(tok);
    });
  };
  add(folder.replace(/-/g, ' '));
  add(fm.company);
  add(fm.contact);
  add(fm.contacts);
  add(fm.primary_contact);
  // email domains → their brand token (e.g. airplaisports.com → airplaisports)
  const domains = (JSON.stringify(fm).match(/@([a-z0-9.-]+)\.[a-z]{2,}/gi) || [])
    .map((d) => d.replace(/@/, '').split('.')[0].toLowerCase());
  domains.forEach((d) => { if (d.length > 2) kw.add(d); });
  return kw;
}

function meetingBlob(note) {
  const attendees = (note.attendees || []).map((a) => `${a.name || ''} ${a.email || ''}`).join(' ');
  return `${note.title || ''} ${attendees}`.toLowerCase();
}

function isExternalMeeting(note) {
  const folder = JSON.stringify(note.folder_membership || []).toLowerCase();
  if (folder.includes('grafana')) return false; // internal Grafana work
  const others = (note.attendees || []).filter((a) => {
    const e = (a.email || '').toLowerCase();
    return e && !e.includes('me@f13i.com') && !e.endsWith('@f13i.com');
  });
  return others.length > 0;
}

async function loadDeals() {
  const deals = [];
  for (const folder of fs.readdirSync(DEALS_DIR)) {
    const dir = path.join(DEALS_DIR, folder);
    if (!fs.statSync(dir).isDirectory()) continue;
    const idxFile = ['index.md', '00-INDEX.md'].map((f) => path.join(dir, f)).find(fs.existsSync);
    if (!idxFile) continue;
    const text = fs.readFileSync(idxFile, 'utf8');
    const fm = readFrontmatter(text);
    deals.push({
      folder,
      file: path.relative(VAULT, idxFile),
      fm,
      keywords: dealKeywords(folder, fm),
      status: fm.status || 'unknown',
      lastTouch: Math.min(daysSince(fm.last_contact), daysSince(fm.updated)),
    });
  }
  return deals;
}

async function loadRecentMeetings() {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();
  let cursor = null, all = [], pages = 0;
  do {
    const r = await granola.getNotes({ page_size: 30, created_after: since, cursor });
    (r.notes || []).forEach((n) => all.push(n));
    cursor = r.next_cursor || r.cursor || null;
    pages++;
  } while (cursor && pages < 6);
  // enrich with summaries
  const enriched = [];
  for (const n of all) {
    try {
      const full = await granola.getNote(n.id, false);
      const note = full.note || full;
      enriched.push({ ...note, summary: note.summary_markdown || note.summary_text || '' });
    } catch (e) { enriched.push({ ...n, summary: '' }); }
  }
  return enriched;
}

function matchMeetingToDeal(note, deals) {
  const blob = meetingBlob(note);
  let best = null, bestScore = 0;
  for (const d of deals) {
    let score = 0;
    for (const kw of d.keywords) if (blob.includes(kw)) score++;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return bestScore > 0 ? best : null;
}

async function run() {
  logger.info('vault-sync (drift detector) started', { lookbackDays: LOOKBACK_DAYS });
  const deals = await loadDeals();
  const meetings = await loadRecentMeetings();

  const flags = { closure: [], stale: [], newLead: [], offSchema: [] };
  const matchedFolders = new Set();

  // 1. Meeting-driven signals (closures + new leads)
  for (const note of meetings) {
    if (!isExternalMeeting(note)) continue;
    const deal = matchMeetingToDeal(note, deals);
    const date = (note.created_at || '').slice(0, 10);
    if (deal) {
      matchedFolders.add(deal.folder);
      if (isLive(deal.status) && CLOSURE_RE.test(note.summary)) {
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
  const today = new Date().toISOString().slice(0, 10);
  const L = [];
  L.push(`# Vault Drift Report — ${today}`);
  L.push('');
  L.push(`_Auto-generated by \`agents/vault-sync.js\`. Report-only — apply via \`/vault-sync\` in a Zelia session. Granola lookback: ${LOOKBACK_DAYS}d._`);
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
