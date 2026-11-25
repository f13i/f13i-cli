require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const {
  VAULT, isLive, localDate, loadDeals, loadRecentMeetings, matchMeetingToDeal,
} = require('../utils/deals');
const { upsertSection } = require('../utils/daily-brief');

const DRY_RUN = process.env.DRY_RUN === 'true';
const GRANOLA_LOOKBACK_DAYS = 2;
const SECTION = 'Suggested action items';
const ACTION_ITEMS = path.join(VAULT, '00-f13i', 'ACTION-ITEMS.md');

/**
 * action-items-sync: suggest, never write ACTION-ITEMS.md.
 *
 * ACTION-ITEMS.md is curated by hand, so this agent only proposes. It collects
 * candidate tasks from:
 *   1. Granola (48h): "Next Steps" bullets marked (Farhan), only from meetings
 *      that match a deal folder, so personal meetings never leak in.
 *   2. The latest session note: unchecked items under "## Open items".
 *   3. Live deals: the `next_action` frontmatter field, for deals that have no
 *      open item in ACTION-ITEMS.md yet.
 * Anything already on ACTION-ITEMS.md is dropped. The rest goes to a
 * "## Suggested action items" section in today's daily brief, in the locked
 * entry format, ready to paste. Replaced on each run. No model calls.
 */

const norm = (s) => String(s).toLowerCase().replace(/\[\[[^\]]*\]\]|\([^)]*\)|[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Rough "already tracked" check: most of the candidate's words appear in one open item. */
function alreadyTracked(task, openItems) {
  const words = norm(task).split(' ').filter((w) => w.length > 3);
  if (!words.length) return true;
  return openItems.some((item) => {
    const hits = words.filter((w) => item.includes(w)).length;
    return hits / words.length >= 0.6;
  });
}

function entry(task, source) {
  return `- [ ] ${task.replace(/\s*\|\s*/g, ' / ')} | Farhan | open | ${source}`;
}

/** "Next Steps" bullets assigned to Farhan in a Granola summary. */
function farhanNextSteps(summary) {
  const m = summary.match(/^#+\s*Next Steps[^\n]*\n([\s\S]*?)(?=\n#+\s|\n---|(?![\s\S]))/im);
  if (!m) return [];
  const out = [];
  for (const line of m[1].split('\n')) {
    const b = line.match(/^\s*[-*]\s+\*\*(.+?)\*\*\s*\((?:[^)]*\b)?Farhan\b[^)]*\)/i);
    if (b) out.push(b[1].trim());
  }
  return out;
}

function latestSessionOpenItems() {
  const dir = path.join(VAULT, '90-scratch', 'sessions');
  if (!fs.existsSync(dir)) return { name: null, items: [] };
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'))
    .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (!files.length) return { name: null, items: [] };
  const name = files[0].f.replace(/\.md$/, '');
  const text = fs.readFileSync(path.join(dir, files[0].f), 'utf8');
  const sec = text.match(/^##\s*Open items[^\n]*\n([\s\S]*?)(?=\n##\s|(?![\s\S]))/im);
  const items = sec ? (sec[1].match(/^\s*- \[ \] (.+)$/gm) || []).map((l) => l.replace(/^\s*- \[ \] /, '').trim()) : [];
  return { name, items };
}

async function run() {
  logger.info('action-items-sync started', { dryRun: DRY_RUN });

  const actionItems = fs.existsSync(ACTION_ITEMS) ? fs.readFileSync(ACTION_ITEMS, 'utf8') : '';
  // Only the live part of the file; the Archive section is history.
  const live = actionItems.split(/^## Archive/m)[0];
  const openLines = (live.match(/^\s*- \[ \] .+$/gm) || []);
  const openItems = openLines.map(norm);

  const deals = loadDeals();
  const candidates = [];
  const seen = new Set();
  const add = (task, source, origin) => {
    const key = norm(task);
    if (!key || seen.has(key)) return;
    seen.add(key);
    if (alreadyTracked(task, openItems)) return;
    candidates.push({ task, source, origin });
  };

  // 1. Granola
  const { notes, error } = await loadRecentMeetings(GRANOLA_LOOKBACK_DAYS, { withSummaries: true });
  if (error) logger.warn(`Granola unavailable, skipping meetings: ${error}`);
  for (const note of notes) {
    const deal = matchMeetingToDeal(note, deals);
    if (!deal) continue; // not f13i deal work
    const src = `[[${deal.link}]] · Granola ${(note.created_at || '').slice(0, 10)}`;
    farhanNextSteps(note.summary || '').forEach((t) => add(`[${deal.company}] ${t}`, src, 'granola'));
  }

  // 2. Latest session note
  const session = latestSessionOpenItems();
  session.items.forEach((t) => add(t, `[[90-scratch/sessions/${session.name}]]`, 'session'));

  // 3. Live deals with a next action and nothing open on ACTION-ITEMS.md
  // "Await reply" and "Nothing owed" describe a wait, not a task.
  const isTask = (a) => a && !/^(await|wait|nothing owed|none\b|no action)/i.test(a.trim());
  for (const d of deals.filter((x) => isLive(x.status) && isTask(x.nextAction))) {
    const tracked = openLines.some((l) => l.includes(`30-deals/${d.folder}/`) || l.includes(`30-deals/${d.folder}]`));
    if (tracked) continue;
    add(`[${d.company}] ${d.nextAction}`, `[[${d.link}]]`, 'deal');
  }

  const byOrigin = (o) => candidates.filter((c) => c.origin === o).length;
  const counts = { granola: byOrigin('granola'), session: byOrigin('session'), deal: byOrigin('deal') };

  const body = candidates.length
    ? [
      `Not on [[00-f13i/ACTION-ITEMS]] yet. Copy what's real into the right section; ignore the rest.`,
      error ? `_Granola unavailable this run: ${error}_` : '',
      '',
      ...candidates.map((c) => entry(c.task, c.source)),
    ].filter((l, i) => l !== '' || i > 1).join('\n')
    : `Nothing new. Everything found is already on [[00-f13i/ACTION-ITEMS]].${error ? ` (Granola unavailable: ${error})` : ''}`;

  if (DRY_RUN) {
    console.log(body);
    logger.info('[DRY_RUN] Suggestions not written', counts);
  } else {
    const file = upsertSection(SECTION, body);
    logger.info(`Suggestions written to ${file}`, counts);
  }

  logger.info('action-items-sync completed', {
    suggested: candidates.length,
    ...counts,
    openOnList: openLines.length,
    granola: !error,
  });
  return { candidates, counts };
}

module.exports = { run, farhanNextSteps };

if (require.main === module) {
  run().catch((err) => {
    logger.error(`Fatal: ${err.message}`, { stack: err.stack });
    process.exit(1);
  });
}
