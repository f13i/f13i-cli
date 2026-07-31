require('dotenv').config();

const obsidian = require('../utils/obsidian-reader');
const { callMCPs } = require('../utils/mcp-orchestrator');
const logger = require('../utils/logger');

// --- Config / paths -------------------------------------------------------

const COMPANIES_NOTE = '10-brain/companies-to-monitor.md';
const DEALS_DIR = '30-deals';
const TODAY = new Date().toISOString().split('T')[0];
const DIGEST_NOTE = `90-scratch/daily/${TODAY}-pricing-intel.md`;

const DRY_RUN = process.env.DRY_RUN === 'true';

// --- Parsing --------------------------------------------------------------

/**
 * Parse a URL or domain string into a normalized domain.
 */
function parseCompanyDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return null;
  }
}

/**
 * Parse the companies-to-monitor note into a list of { name, domain }.
 *
 * Expected format — one markdown list item per company, name and domain
 * separated by a pipe (domain optional):
 *
 *   - Acme Corp | acme.com
 *   - Notion | https://www.notion.so
 *   - Figma
 *
 * @param {string} content - Raw note contents.
 * @returns {Array<{name: string, domain: string|null}>}
 */
function parseCompanies(content) {
  const { body } = obsidian.parseFrontmatter(content);
  const companies = [];

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    // Only consider markdown list items.
    const item = /^[-*]\s+(.*)$/.exec(line);
    if (!item) continue;

    const [namePart, domainPart] = item[1].split('|').map((s) => s.trim());
    // Strip [[wikilink]] brackets if present.
    const name = namePart.replace(/^\[\[|\]\]$/g, '').trim();
    if (!name) continue;

    let domain = null;
    if (domainPart) {
      domain = parseCompanyDomain(domainPart) || domainPart.toLowerCase();
    } else if (name.includes('.')) {
      // Name itself looks like a domain.
      domain = parseCompanyDomain(name);
    }

    companies.push({ name, domain });
  }

  return companies;
}

// --- Per-company intelligence --------------------------------------------

/**
 * Gather intelligence for a single company: Granola warm signals + pricing.
 * Calls the MCP orchestrator to fetch both in a single orchestrated flow.
 *
 * @param {{name: string, domain: string|null}} company
 * @returns {Promise<Object>} Result record for this company.
 */
async function gatherForCompany(company) {
  logger.info(`Gathering intelligence for ${company.name}`, { domain: company.domain });

  const { meetings, pricing } = await callMCPs({
    company: company.name,
    dryRun: DRY_RUN,
  });

  const warm = Array.isArray(meetings) && meetings.length > 0;

  logger.info(`${company.name}: ${warm ? 'WARM' : 'cold'}`, {
    meetingCount: meetings.length,
    hasPricing: !!pricing || (typeof pricing === 'object' && Object.keys(pricing).length > 0),
  });

  return {
    name: company.name,
    domain: company.domain,
    warm,
    meetings,
    pricing,
  };
}

// --- Markdown rendering ---------------------------------------------------

function renderAnalysis(result) {
  const today = new Date().toISOString().split('T')[0];
  const lines = [
    '---',
    `company: ${result.name}`,
    `domain: ${result.domain || 'unknown'}`,
    `status: ${result.warm ? 'warm' : 'cold'}`,
    `updated: ${today}`,
    '---',
    '',
    `# ${result.name} — Pricing Intelligence`,
    '',
    `**Status:** ${result.warm ? '🔥 Warm' : '❄️ Cold'}`,
    `**Domain:** ${result.domain || 'unknown'}`,
    '',
    '## Warm Signals (Granola)',
    '',
  ];

  if (result.meetings.length === 0) {
    lines.push('_No recent meetings found._');
  } else {
    for (const m of result.meetings) {
      const title = m.title || m.name || 'Untitled meeting';
      const date = m.date || m.created_at || '';
      lines.push(`- ${title}${date ? ` (${date})` : ''}`);
    }
  }

  lines.push('', '## Pricing Data (PricingSaaS)', '');
  if (!result.pricing) {
    lines.push('_No pricing data available._');
  } else {
    lines.push('```json', JSON.stringify(result.pricing, null, 2), '```');
  }

  lines.push('');
  return lines.join('\n');
}

function renderDigest(results) {
  const today = new Date().toISOString().split('T')[0];
  const warm = results.filter((r) => r.warm);
  const cold = results.filter((r) => !r.warm);

  const lines = [
    '---',
    `generated: ${today}`,
    `total: ${results.length}`,
    `warm: ${warm.length}`,
    `cold: ${cold.length}`,
    '---',
    '',
    `# Daily Intelligence Digest — ${today}`,
    '',
    `Monitored **${results.length}** companies: **${warm.length} warm**, **${cold.length} cold**.`,
    '',
    `## 🔥 Warm (${warm.length})`,
    '',
  ];

  if (warm.length === 0) {
    lines.push('_None today._');
  } else {
    for (const r of warm) {
      lines.push(
        `- [[${DEALS_DIR}/${r.name}/analysis|${r.name}]] — ${r.meetings.length} signal(s)`
      );
    }
  }

  lines.push('', `## ❄️ Cold (${cold.length})`, '');
  if (cold.length === 0) {
    lines.push('_None._');
  } else {
    for (const r of cold) {
      lines.push(`- ${r.name}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

// --- Writes ---------------------------------------------------------------

async function writeNote(relativePath, content) {
  if (DRY_RUN) {
    logger.info(`[DRY_RUN] Skipping write: ${relativePath}`, { bytes: content.length });
    return;
  }
  await obsidian.writeNote(relativePath, content);
}

// --- Orchestration --------------------------------------------------------

/**
 * Run the full pricing-intelligence pass.
 * @returns {Promise<{results: Array, warm: number, cold: number}|null>}
 */
async function run() {
  logger.info('Pricing intelligence agent started', { dryRun: DRY_RUN });

  // 1. Load companies.
  let content;
  try {
    content = await obsidian.readNote(COMPANIES_NOTE);
  } catch (err) {
    logger.error(`Could not read ${COMPANIES_NOTE}: ${err.message}`);
    return null;
  }

  const companies = parseCompanies(content);
  if (companies.length === 0) {
    logger.warn(`No companies found in ${COMPANIES_NOTE}`);
    return { results: [], warm: 0, cold: 0 };
  }
  logger.info(`Loaded ${companies.length} companies to monitor`);

  // 2. Gather intelligence for all companies in parallel.
  const results = await Promise.all(companies.map(gatherForCompany));

  // 3. Write per-company analysis notes.
  for (const result of results) {
    const notePath = `${DEALS_DIR}/${result.name}/analysis.md`;
    await writeNote(notePath, renderAnalysis(result));
  }

  // 4. Write the daily digest.
  await writeNote(DIGEST_NOTE, renderDigest(results));

  const warm = results.filter((r) => r.warm).length;
  const cold = results.length - warm;
  logger.info('Pricing intelligence agent finished', {
    total: results.length,
    warm,
    cold,
  });

  return { results, warm, cold };
}

module.exports = {
  run,
  parseCompanies,
  gatherForCompany,
  renderAnalysis,
  renderDigest,
};

// Allow direct execution: `node agents/pricing-intel.js`
if (require.main === module) {
  run().catch((err) => {
    logger.error(`Fatal: ${err.message}`, { stack: err.stack });
    process.exit(1);
  });
}
