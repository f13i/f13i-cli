require('dotenv').config({ quiet: true });

const logger = require('../utils/logger');
const {
  isLive, localDate, daysSince, loadDeals, loadRecentMeetings, matchMeetingToDeal,
} = require('../utils/deals');
const { upsertSection } = require('../utils/daily-brief');

const DRY_RUN = process.env.DRY_RUN === 'true';
const MIN_LIVE_DEALS = 5;
const LOOKBACK_DAYS = 45;

/**
 * deal-status-sync: the deal pulse.
 *
 * Reads every live deal from 30-deals/<slug>/00-INDEX.md frontmatter
 * (status in the locked "live" set), finds each deal's newest recorded meeting
 * in Granola, and groups deals by days since last touch:
 * 🔥 ≤7d · 🟡 ≤21d · 🧊 ≤45d · ⚫ 46d+ (same thresholds as Pipeline.base).
 *
 * Writes one "## Deal Pulse" section to today's daily brief, replaced on each
 * run. No model calls.
 */

function heat(days) {
  if (days <= 7) return 'hot';
  if (days <= 21) return 'warm';
  if (days <= 45) return 'cold';
  return 'dark';
}

function newest(...dates) {
  return dates.filter((d) => d && !isNaN(new Date(d))).sort().pop() || null;
}

async function run() {
  logger.info('deal-status-sync started', { dryRun: DRY_RUN });

  const live = loadDeals().filter((d) => isLive(d.status));
  if (live.length < MIN_LIVE_DEALS) {
    logger.info(`Skipping: ${live.length} live deals, need ${MIN_LIVE_DEALS}+`);
    return { skipped: true, live: live.length };
  }

  const { notes, error } = await loadRecentMeetings(LOOKBACK_DAYS, { withSummaries: true });
  if (error) logger.warn(`Granola unavailable, using deal files only: ${error}`);

  // Newest meeting per deal
  const lastMeeting = new Map();
  for (const note of notes) {
    const deal = matchMeetingToDeal(note, live);
    if (!deal) continue;
    const date = (note.created_at || '').slice(0, 10);
    const prev = lastMeeting.get(deal.folder);
    if (!prev || date > prev.date) lastMeeting.set(deal.folder, { date, title: note.title || 'meeting' });
  }

  const rows = live.map((d) => {
    const meeting = lastMeeting.get(d.folder);
    const lastTouch = newest(d.lastTouchDate, meeting && meeting.date);
    const days = daysSince(lastTouch);
    const via = meeting && lastTouch === meeting.date ? `Granola: ${meeting.title}` : 'deal file';
    const gaps = [];
    if (!d.nextAction) gaps.push('no next action');
    if (daysSince(d.fm.updated) > 14) gaps.push(`deal file last updated ${d.fm.updated || 'never'}`);
    return { ...d, lastTouch, days, via, heat: heat(days), gaps };
  }).sort((a, b) => a.days - b.days);

  const groups = {
    hot: ['🔥 HOT (≤7 days)'],
    warm: ['🟡 WARM (8-21 days)'],
    cold: ['🧊 COLD (22-45 days)'],
    dark: ['⚫ DARK (46+ days): needs a decision'],
  };
  const L = [`${rows.length} live deals · ${localDate()}${error ? ' · Granola unavailable, deal files only' : ''}`, ''];
  for (const [key, [title]] of Object.entries(groups)) {
    const inGroup = rows.filter((r) => r.heat === key);
    if (!inGroup.length) continue;
    L.push(`**${title}**`);
    for (const r of inGroup) {
      const when = r.lastTouch ? `${r.lastTouch} (${r.days}d, ${r.via})` : 'no date on file';
      L.push(`- [[${r.link}|${r.company}]] · \`${r.status}\` · last touch ${when}`);
      if (r.nextAction) L.push(`  - next: ${r.nextAction}`);
      if (r.gaps.length) L.push(`  - ⚠️ ${r.gaps.join(' · ')}`);
    }
    L.push('');
  }

  const counts = Object.fromEntries(Object.keys(groups).map((k) => [k, rows.filter((r) => r.heat === k).length]));
  const body = L.join('\n');

  if (DRY_RUN) {
    console.log(body);
    logger.info('[DRY_RUN] Deal pulse not written', counts);
  } else {
    const file = upsertSection('Deal Pulse', body);
    logger.info(`Deal pulse written to ${file}`, counts);
  }

  logger.info('deal-status-sync completed', { live: rows.length, ...counts, granola: !error });
  return { rows, counts };
}

module.exports = { run };

if (require.main === module) {
  run().catch((err) => {
    logger.error(`Fatal: ${err.message}`, { stack: err.stack });
    process.exit(1);
  });
}
