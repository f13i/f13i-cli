// Shared deal + meeting helpers for the Node agents.
//
// Deals live one per folder in 30-deals/<slug>/00-INDEX.md with a locked
// frontmatter schema (30-deals/00-README.md). Meetings come from the Granola
// public API. Same matching approach as agents/vault-sync.js: tokenize the
// deal's folder, company and contacts, then look for those tokens in the
// meeting title and attendees.

const fs = require('fs');
const path = require('path');
const os = require('os');

const VAULT = (process.env.OBSIDIAN_VAULT_PATH || '').replace(/^~/, os.homedir());
const DEALS_DIR = path.join(VAULT, '30-deals');

// Locked status vocabulary. Keep in sync with 30-deals/00-README.md,
// 30-deals/Pipeline.base and agents/vault-sync.js.
const LIVE_STATUSES = new Set(['active', 'proposal-out', 'awaiting-reply', 'warm']);
const isLive = (s) => LIVE_STATUSES.has(String(s || '').trim().toLowerCase());

const STOPWORDS = new Set(['farhan', 'manjiyani', 'the', 'and', 'pricing', 'sync', 'call', 'meeting', 'catch', 'up', 'chat', 'feedback', 'session', 'working', 'strategy', 'com', 'gmail.com']);

/** Local calendar date (YYYY-MM-DD). The vault's daily notes are local-date named. */
function localDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (isNaN(d)) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

/** Flat key: value frontmatter, quotes stripped. Enough for the locked deal schema. */
function readFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  const fm = {};
  if (!m) return fm;
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kv) fm[kv[1].toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return fm;
}

const FREE_MAIL = new Set(['gmail', 'outlook', 'yahoo', 'icloud', 'hotmail', 'me', 'proton', 'protonmail']);

/**
 * Match keys for a deal:
 *  - brands: folder slug and company tokens, plus contact email domains
 *  - people: full contact names ("first last"), matched as a phrase
 * A lone first name is never enough; too many meetings share one.
 */
function dealKeys(folder, fm) {
  // Whole names only: the folder slug and the company name, as phrases.
  // Single tokens from descriptive names ("austin", "accounting") misfire.
  const brands = new Set();
  const addBrand = (s) => {
    const phrase = String(s || '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9.]+/g, ' ').trim();
    if (phrase.length > 2 && !STOPWORDS.has(phrase)) brands.add(phrase);
  };
  addBrand(folder.replace(/-/g, ' '));
  addBrand(fm.company);
  const domains = (String(fm.contacts || '').match(/@([a-z0-9-]+)\./gi) || [])
    .map((d) => d.slice(1, -1).toLowerCase())
    .filter((d) => d.length > 2 && !FREE_MAIL.has(d));
  domains.forEach((d) => brands.add(d));

  const people = String(fm.contacts || '').split(',')
    .map((c) => c.replace(/<[^>]*>|\([^)]*\)/g, ' ').trim().toLowerCase().replace(/\s+/g, ' '))
    .filter((n) => n.split(' ').length >= 2);
  return { brands, domains: new Set(domains), people };
}

/** Every deal folder with a 00-INDEX.md (or legacy index.md). */
function loadDeals() {
  const deals = [];
  if (!fs.existsSync(DEALS_DIR)) return deals;
  for (const folder of fs.readdirSync(DEALS_DIR)) {
    const dir = path.join(DEALS_DIR, folder);
    if (!fs.statSync(dir).isDirectory() || folder.startsWith('_')) continue;
    const idxFile = ['00-INDEX.md', 'index.md'].map((f) => path.join(dir, f)).find(fs.existsSync);
    if (!idxFile) continue;
    const fm = readFrontmatter(fs.readFileSync(idxFile, 'utf8'));
    const lastTouchDate = [fm.last_contact, fm.updated].filter((d) => !isNaN(new Date(d))).sort().pop() || null;
    deals.push({
      folder,
      link: `30-deals/${folder}/${path.basename(idxFile, '.md')}`,
      fm,
      company: fm.company || folder,
      status: (fm.status || 'unknown').toLowerCase(),
      nextAction: fm.next_action || '',
      lastTouchDate,
      keys: dealKeys(folder, fm),
    });
  }
  return deals;
}

/**
 * Granola notes created in the last `days` days. With `withSummaries`, each
 * note is fetched in full (attendees, summary_markdown). Never throws: returns
 * { notes, error } so callers can degrade.
 */
async function loadRecentMeetings(days, { withSummaries = true, maxPages = 6 } = {}) {
  let granola;
  try {
    granola = require('./granola-api-client');
  } catch (err) {
    return { notes: [], error: err.message };
  }
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    let cursor = null;
    let pages = 0;
    const list = [];
    do {
      const r = await granola.getNotes({ page_size: 30, created_after: since, cursor });
      (r.notes || []).forEach((n) => list.push(n));
      cursor = r.hasMore ? r.cursor : null;
      pages++;
    } while (cursor && pages < maxPages);

    if (!withSummaries) return { notes: list, error: null };

    const notes = [];
    for (const n of list) {
      try {
        const full = await granola.getNote(n.id, false);
        notes.push({ ...full, summary: full.summary_markdown || full.summary_text || '' });
      } catch {
        notes.push({ ...n, summary: '' });
      }
    }
    return { notes, error: null };
  } catch (err) {
    return { notes: [], error: err.message };
  }
}

/**
 * Score a meeting against each deal and return the best match, or null.
 * Counts: an attendee on the deal's email domain (strong), a full contact name
 * in the title or attendees (strong), a brand token as a whole word in the title.
 */
function matchMeetingToDeal(note, deals) {
  const title = ` ${String(note.title || '').toLowerCase().replace(/[^a-z0-9.]+/g, ' ')} `;
  const attendees = (note.attendees || []).map((a) => ({
    name: String(a.name || '').toLowerCase(),
    domain: String(a.email || '').toLowerCase().split('@')[1] || '',
  }));
  const people = `${title} ${attendees.map((a) => a.name).join(' | ')}`;

  let best = null;
  let bestScore = 0;
  for (const d of deals) {
    const { brands, domains, people: names } = d.keys;
    let score = 0;
    if (attendees.some((a) => domains.has(a.domain.split('.')[0]))) score += 3;
    if (names.some((n) => people.includes(n))) score += 3;
    for (const b of brands) if (title.includes(` ${b} `)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return bestScore > 0 ? best : null;
}

module.exports = {
  VAULT,
  LIVE_STATUSES,
  isLive,
  localDate,
  daysSince,
  readFrontmatter,
  loadDeals,
  loadRecentMeetings,
  matchMeetingToDeal,
};
