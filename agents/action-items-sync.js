require('dotenv').config();

const obsidian = require('../utils/obsidian-reader');
const { callMCPs } = require('../utils/mcp-orchestrator');
const logger = require('../utils/logger');

const DRY_RUN = process.env.DRY_RUN === 'true';

/**
 * action-items-sync: Keep ACTION-ITEMS.md current by pulling from vault sources.
 * Runs at session start after outbound-sync, before Mode 1 morning snapshot.
 *
 * Scans:
 * 1a. Granola (48h) — extract Farhan's action items
 * 1b. Daily brief (latest) — capture flagged items
 * 1c. Session note (latest) — carry-forward open items
 * 1d. Deal folders — check next-move field for updates
 *
 * Updates ACTION-ITEMS.md in locked entry format.
 * Logs changes and suggested first move.
 */

const LOCKED_ENTRY_FORMAT = /^- \[([ x])\] (.+?) \| (.+?) \| (.+?) \| (.+)$/;

/**
 * Parse a locked-format entry.
 */
function parseEntry(line) {
  const m = LOCKED_ENTRY_FORMAT.exec(line);
  if (!m) return null;
  return {
    done: m[1] === 'x',
    task: m[2],
    owner: m[3],
    dueDate: m[4],
    source: m[5],
    line, // Original line for comparison
  };
}

/**
 * Format a locked-entry for ACTION-ITEMS.md.
 */
function formatEntry(task, owner = 'Farhan', dueDate = 'open', source = '[vault]') {
  return `- [ ] ${task} | ${owner} | ${dueDate} | ${source}`;
}

/**
 * Dedup by source link — if exact source exists, update it; else add new.
 */
function dedup(existingItems, newItem) {
  const existing = existingItems.find((e) => e.source === newItem.source);
  if (existing) {
    // Update existing entry (task wording may have changed)
    existing.task = newItem.task;
    existing.dueDate = newItem.dueDate;
    return false; // Not a new item
  }
  return true; // Is new
}

async function run() {
  logger.info('action-items-sync started', { dryRun: DRY_RUN });

  try {
    // Load current ACTION-ITEMS.md
    let itemsContent = '';
    try {
      itemsContent = await obsidian.readNote('00-f13i/ACTION-ITEMS.md');
    } catch {
      logger.warn('ACTION-ITEMS.md not found, starting fresh');
      itemsContent = '# Action Items\n\n## Pipeline\n\n## Clients\n\n## Content\n\n## Internal\n\n';
    }

    const newItems = [];

    // 1a. Granola (48h)
    logger.debug('Scanning Granola (48h)');
    try {
      const granola = await callMCPs({ company: 'f13i', dryRun: DRY_RUN });
      const meetings = granola.meetings || [];
      meetings.forEach((m) => {
        if (m.actionItems && Array.isArray(m.actionItems)) {
          m.actionItems.forEach((item) => {
            newItems.push({
              task: item.description || item.text || 'Action from ' + (m.title || 'meeting'),
              owner: 'Farhan',
              dueDate: 'open',
              source: `[Granola: ${m.title}](https://granola.ai)`, // Placeholder URL
            });
          });
        }
      });
    } catch (err) {
      logger.warn(`Granola scan failed: ${err.message}`);
    }

    // 1b. Daily brief (latest)
    logger.debug('Scanning daily brief');
    try {
      const today = new Date().toISOString().split('T')[0];
      const daily = await obsidian.readNote(`90-scratch/daily/${today}.md`);
      // Extract items flagged with TODO or [ ] in the brief
      const todoMatches = daily.match(/- \[ \] (.+)/g) || [];
      todoMatches.forEach((match) => {
        const task = match.replace(/^- \[ \] /, '').trim();
        newItems.push({
          task,
          owner: 'Farhan',
          dueDate: 'open',
          source: `[daily: ${today}](../90-scratch/daily/${today}.md)`,
        });
      });
    } catch (err) {
      logger.debug(`Daily brief scan: ${err.message}`);
    }

    // 1c. Latest session note (carry-forward)
    logger.debug('Scanning session note for open items');
    try {
      const sessionDir = `${process.env.OBSIDIAN_VAULT_PATH}/90-scratch/sessions`;
      const { execSync } = require('child_process');
      const latestSession = execSync(`ls -t "${sessionDir}"/*.md 2>/dev/null | head -1`, {
        encoding: 'utf-8',
      }).trim();

      if (latestSession) {
        const sessionName = latestSession.split('/').pop().replace('.md', '');
        const sessionContent = await obsidian.readNote(`90-scratch/sessions/${sessionName}.md`);
        const openItemsMatch = sessionContent.match(/## Open items.*?\n([\s\S]*?)(?=##|$)/);
        if (openItemsMatch) {
          const itemsText = openItemsMatch[1];
          const itemMatches = itemsText.match(/- \[[ x]\] (.+)/g) || [];
          itemMatches.forEach((match) => {
            const task = match.replace(/^- \[[ x]\] /, '').trim();
            newItems.push({
              task,
              owner: 'Farhan',
              dueDate: 'open',
              source: `[session: ${sessionName}](../90-scratch/sessions/${sessionName}.md)`,
            });
          });
        }
      }
    } catch (err) {
      logger.debug(`Session note scan: ${err.message}`);
    }

    // 1d. Deal folders (Active Pipeline only)
    logger.debug('Scanning deal folders');
    try {
      const index = await obsidian.readNote('00-index/index.md');
      // Parse Active Pipeline table to get deal names
      const pipelineMatch = index.match(/\| \*\*(.+?)\*\*.+?\|/g) || [];
      pipelineMatch.forEach((match) => {
        const company = match.replace(/\| \*\*|\*\*.*?\|/g, '').trim();
        try {
          const dealIndex = obsidian.readNote(`30-deals/${company}/index.md`);
          // Extract "Next move:" field
          const nextMoveMatch = dealIndex.match(/Next move:?\s*(.+?)(?:\n|$)/);
          if (nextMoveMatch) {
            const nextMove = nextMoveMatch[1].trim();
            if (nextMove && nextMove !== '—') {
              newItems.push({
                task: `[${company}] ${nextMove}`,
                owner: 'Farhan',
                dueDate: 'open',
                source: `[deal: ${company}](../30-deals/${company}/index.md)`,
              });
            }
          }
        } catch {
          // Deal folder doesn't exist or no index.md
        }
      });
    } catch (err) {
      logger.debug(`Deal scan: ${err.message}`);
    }

    // Dedup new items against existing
    const existingLines = itemsContent.split('\n').map((line) => parseEntry(line)).filter(Boolean);
    const dedupedItems = newItems.filter((item) => dedup(existingLines, item));
    const addedCount = dedupedItems.length;

    // Merge and write back (simplified: just append to Internal section)
    if (!DRY_RUN && addedCount > 0) {
      let updated = itemsContent;
      if (!updated.includes('## Internal')) {
        updated += '\n## Internal\n';
      }
      dedupedItems.forEach((item) => {
        const entry = formatEntry(item.task, item.owner, item.dueDate, item.source);
        updated += entry + '\n';
      });

      await obsidian.writeNote('00-f13i/ACTION-ITEMS.md', updated);
      logger.info(`ACTION-ITEMS.md updated: +${addedCount} new items`);
    } else if (DRY_RUN) {
      logger.info(`[DRY_RUN] Would add ${addedCount} items to ACTION-ITEMS.md`);
    }

    // Surface summary
    const overdue = existingLines.filter((e) => {
      const due = new Date(e.dueDate);
      return due < new Date() && !e.done;
    }).length;

    logger.info('action-items-sync completed', {
      newItems: addedCount,
      totalOpen: existingLines.filter((e) => !e.done).length,
      overdue,
    });

    return {
      newItems: addedCount,
      totalOpen: existingLines.filter((e) => !e.done).length,
      overdue,
    };
  } catch (err) {
    logger.error(`action-items-sync failed: ${err.message}`, { stack: err.stack });
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
