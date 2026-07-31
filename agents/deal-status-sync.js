require('dotenv').config();

const obsidian = require('../utils/obsidian-reader');
const { callMCPs } = require('../utils/mcp-orchestrator');
const logger = require('../utils/logger');

const DRY_RUN = process.env.DRY_RUN === 'true';

/**
 * deal-status-sync: Surface current status of every active deal from real signals.
 * Pull from Granola (30d), Gmail, Calendar, deal index.
 * Build status cards: Hot (≤7d), Warm (8-21d), Cold (22-45d), Dark (46+d).
 *
 * Runs at session start (after action-items-sync) if 5+ active deals,
 * or on-demand: "sync deals", "deal pulse", "where are my deals".
 */

function daysSince(dateStr) {
  if (!dateStr || dateStr === 'open') return Infinity;
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - date) / (1000 * 60 * 60 * 24));
}

function statusLabel(daysSinceLastTouch) {
  if (daysSinceLastTouch <= 7) return '🔥 HOT';
  if (daysSinceLastTouch <= 21) return '🟡 WARM';
  if (daysSinceLastTouch <= 45) return '🧊 COLD';
  return '⚫ DARK';
}

async function run() {
  logger.info('deal-status-sync started', { dryRun: DRY_RUN });

  try {
    // Load Active Pipeline from index
    const indexContent = await obsidian.readNote('00-index/index.md');
    const pipelineMatch = indexContent.match(/\| \*\*(.+?)\*\*.+?\| ([^\|]+?)\s*\|/g) || [];

    if (pipelineMatch.length === 0) {
      logger.info('No active deals found');
      return { deals: [], summary: 'No active pipeline.' };
    }

    const deals = [];

    // For each deal, pull signals
    for (const match of pipelineMatch) {
      const [, company, status] = match.match(/\*\*(.+?)\*\*/).concat(match.match(/\| ([^\|]+?)\s*\|/) || []);

      if (!company) continue;

      logger.debug(`Scanning signals for ${company}`);

      const signals = {
        granola: { date: null, source: 'none' },
        gmail: { date: null, source: 'none' },
        calendar: { date: null, source: 'none' },
        dealIndex: { date: null, updated: null, nextMove: null },
      };

      // 1a. Granola signal (30d)
      try {
        const granola = await callMCPs({ company, dryRun: DRY_RUN });
        const meetings = granola.meetings || [];
        if (meetings.length > 0) {
          const latest = meetings.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0];
          signals.granola.date = latest.date || new Date().toISOString().split('T')[0];
          signals.granola.source = latest.title || 'Meeting';
        }
      } catch (err) {
        logger.debug(`Granola signal for ${company}: ${err.message}`);
      }

      // 1b. Gmail signal (would integrate MCP, placeholder for now)
      // signals.gmail.date = '[Gmail signal pending]';

      // 1c. Calendar signal (would integrate MCP, placeholder for now)
      // signals.calendar.date = '[Calendar signal pending]';

      // 1d. Deal index
      try {
        const dealIndexPath = `30-deals/${company}/index.md`;
        const dealContent = await obsidian.readNote(dealIndexPath);
        const { data, body } = obsidian.parseFrontmatter(dealContent);

        signals.dealIndex.updated = data.updated || null;
        signals.dealIndex.date = new Date(signals.dealIndex.updated).toISOString().split('T')[0] || null;

        const nextMoveMatch = body.match(/Next move:?\s*(.+?)(?:\n|$)/);
        if (nextMoveMatch) {
          signals.dealIndex.nextMove = nextMoveMatch[1].trim();
        }
      } catch {
        logger.debug(`Deal index for ${company} not found`);
      }

      // Determine last touch (most recent signal)
      const dateDates = [
        signals.granola.date,
        signals.gmail.date,
        signals.calendar.date,
        signals.dealIndex.date,
      ].filter(Boolean);

      let lastTouch = null;
      let lastTouchSource = 'none';
      if (dateDates.length > 0) {
        const sorted = dateDates.sort();
        lastTouch = sorted[sorted.length - 1];
        if (lastTouch === signals.granola.date) lastTouchSource = signals.granola.source;
        else if (lastTouch === signals.gmail.date) lastTouchSource = 'Gmail';
        else if (lastTouch === signals.calendar.date) lastTouchSource = 'Calendar';
        else lastTouchSource = 'Deal index';
      }

      const daysSinceLastTouch = lastTouch ? daysSince(lastTouch) : Infinity;
      const label = statusLabel(daysSinceLastTouch);

      const gaps = [];
      if (!signals.granola.date || daysSince(signals.granola.date) > 30) {
        gaps.push('⚠️ no recorded meeting (30d)');
      }
      if (!signals.gmail.date || daysSince(signals.gmail.date) > 30) {
        gaps.push('⚠️ no email signal (30d)');
      }
      if (signals.dealIndex.updated && daysSince(signals.dealIndex.updated) > 14) {
        gaps.push(`⚠️ deal file stale — last updated ${signals.dealIndex.updated}`);
      }
      if (!signals.dealIndex.nextMove || signals.dealIndex.nextMove === '—') {
        gaps.push('⚠️ no next move defined');
      }

      deals.push({
        company,
        status: status.trim(),
        label,
        lastTouch: lastTouch || 'never',
        lastTouchSource,
        daysSince: daysSinceLastTouch,
        nextMove: signals.dealIndex.nextMove || '[no next move]',
        gaps,
        signals,
      });
    }

    // Group by label
    const hot = deals.filter((d) => d.label.includes('HOT'));
    const warm = deals.filter((d) => d.label.includes('WARM'));
    const cold = deals.filter((d) => d.label.includes('COLD'));
    const dark = deals.filter((d) => d.label.includes('DARK'));

    // Surface deal pulse
    const output = [];
    output.push(`DEAL PULSE — ${new Date().toLocaleDateString()} — ${deals.length} active deals`);
    output.push('');

    if (hot.length > 0) {
      output.push('🔥 HOT (last 7 days)');
      hot.forEach((d) => {
        output.push(`  ${d.company} — via ${d.lastTouchSource} on ${d.lastTouch}`);
        if (d.gaps.length > 0) output.push(`    ${d.gaps.join(', ')}`);
      });
      output.push('');
    }

    if (warm.length > 0) {
      output.push('🟡 WARM (8-21 days)');
      warm.forEach((d) => {
        output.push(`  ${d.company} — via ${d.lastTouchSource} on ${d.lastTouch}`);
        if (d.gaps.length > 0) output.push(`    ${d.gaps.join(', ')}`);
      });
      output.push('');
    }

    if (cold.length > 0) {
      output.push('🧊 COLD (22-45 days)');
      cold.forEach((d) => {
        output.push(`  ${d.company} — via ${d.lastTouchSource} on ${d.lastTouch}`);
        if (d.gaps.length > 0) output.push(`    ${d.gaps.join(', ')}`);
      });
      output.push('');
    }

    if (dark.length > 0) {
      output.push('⚫ DARK (46+ days) — NEEDS TRIAGE');
      dark.forEach((d) => {
        output.push(`  ${d.company} — last signal: ${d.lastTouch} (${d.daysSince} days ago)`);
        output.push(`    ${d.gaps.join(', ')}`);
      });
      output.push('');
    }

    // Suggest first move
    const topDeal = deals.sort((a, b) => a.daysSince - b.daysSince)[0];
    if (topDeal) {
      output.push(`👉 First move: Follow up with ${topDeal.company} (last touch: ${topDeal.daysSince}d ago)`);
    }

    const summary = output.join('\n');
    logger.info('deal-status-sync completed', {
      total: deals.length,
      hot: hot.length,
      warm: warm.length,
      cold: cold.length,
      dark: dark.length,
    });

    // Optionally write to daily brief (if not DRY_RUN)
    if (!DRY_RUN) {
      try {
        const today = new Date().toISOString().split('T')[0];
        let dailyContent = '';
        try {
          dailyContent = await obsidian.readNote(`90-scratch/daily/${today}.md`);
        } catch {
          dailyContent = `# ${today}\n`;
        }

        const dealPulseBlock = `\n## Deal Pulse\n${summary}\n`;
        const updated = dailyContent + dealPulseBlock;
        await obsidian.writeNote(`90-scratch/daily/${today}.md`, updated);
        logger.info(`Deal pulse appended to daily brief`);
      } catch (err) {
        logger.warn(`Could not append to daily brief: ${err.message}`);
      }
    }

    return { summary, deals, counts: { hot: hot.length, warm: warm.length, cold: cold.length, dark: dark.length } };
  } catch (err) {
    logger.error(`deal-status-sync failed: ${err.message}`, { stack: err.stack });
    throw err;
  }
}

module.exports = { run };

if (require.main === module) {
  run().catch((err) => {
    logger.error(`Fatal: ${err.message}`);
    process.exit(1);
  });
}
