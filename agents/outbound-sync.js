require('dotenv').config();

const obsidian = require('../utils/obsidian-reader');
const granola = require('../utils/granola-api-client');
const logger = require('../utils/logger');
const { localDate } = require('../utils/deals');

const DRY_RUN = process.env.DRY_RUN === 'true';
const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH || `${process.env.HOME}/Library/Mobile Documents/iCloud~md~obsidian/Documents/f13i-brain`;

/**
 * outbound-sync: Pull recent signals from Granola (48h), Gmail (48h), Calendar (7d).
 * Write auto-captured activity to daily brief.
 * Runs at session start before Mode 1 morning snapshot.
 */

async function run() {
  logger.info('outbound-sync started', { dryRun: DRY_RUN });

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayBefore = new Date(yesterday);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const todayStr = localDate(today); // daily notes are named by local date; UTC rolls over at 6pm CST
  const yesterdayStr = localDate(yesterday);

  const sections = [];
  sections.push(`## Outbound Sync — ${today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
  sections.push('');

  try {
    // Granola: last 48 hours
    logger.debug('Fetching Granola notes (48h)');
    const result = await granola.getNotes({
      page_size: 50,
    });

    const notes = result.notes || [];
    sections.push(`**Granola:** ${notes.length} note(s) in recent history`);
    if (notes.length > 0) {
      notes.forEach((n) => {
        const title = n.title || 'Untitled';
        const date = n.created_at ? new Date(n.created_at).toLocaleDateString() : '';
        sections.push(`  - ${title}${date ? ` — ${date}` : ''}`);
      });
    }
    sections.push('');
  } catch (err) {
    logger.warn(`Granola sync failed: ${err.message}`);
    sections.push('**Granola:** [error fetching notes]');
    sections.push('');
  }

  // Gmail: would need MCP call, but for now placeholder
  // In production, integrate Gmail MCP via callMCPs or direct Superhuman API
  sections.push('**Gmail:** [integration pending]');
  sections.push('');

  // Calendar: would need MCP call
  // In production, integrate Google Calendar via callMCPs or direct API
  sections.push('**Calendar:** [integration pending]');
  sections.push('');

  const content = sections.join('\n');

  if (!DRY_RUN) {
    try {
      const dailyPath = `90-scratch/daily/${todayStr}.md`;
      let existingContent = '';

      try {
        existingContent = await obsidian.readNote(dailyPath);
      } catch {
        // File doesn't exist yet, create with header
        existingContent = `# ${todayStr}\n`;
      }

      const updatedContent = existingContent.endsWith('\n')
        ? existingContent + '\n' + content + '\n'
        : existingContent + '\n\n' + content + '\n';

      await obsidian.writeNote(dailyPath, updatedContent);
      logger.info(`Daily brief updated: ${dailyPath}`);
    } catch (err) {
      logger.error(`Failed to write daily brief: ${err.message}`);
    }
  } else {
    logger.info('[DRY_RUN] Would append to daily brief:', { content });
  }

  logger.info('outbound-sync completed');
  return { sections, content };
}

module.exports = { run };

if (require.main === module) {
  run().catch((err) => {
    logger.error(`Fatal: ${err.message}`, { stack: err.stack });
    process.exit(1);
  });
}