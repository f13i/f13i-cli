const obsidian = require('../utils/obsidian-reader');
const { callMCPs } = require('../utils/mcp-orchestrator');
const logger = require('../utils/logger');

// Vault folders worth scanning for prior context on a person/company.
const CONTEXT_DIRS = ['40-meetings', '30-deals', '60-clients'];
const MAX_CONTEXT_HITS = 8;

/**
 * Parse a free-text query like "Nick from Acme" into structured parts.
 * Supports: "Person from Company", "Person @ Company", "Person at Company",
 * or a bare company name.
 *
 * @param {string} query
 * @returns {{person: string|null, company: string, domain: string|null}}
 */
function parseQuery(query) {
  const text = (query || '').trim();
  let person = null;
  let company = text;

  const m = /^(.+?)\s+(?:from|@|at)\s+(.+)$/i.exec(text);
  if (m) {
    person = m[1].trim();
    company = m[2].trim();
  }

  // Best-effort domain: if the company token looks like a URL/domain use it,
  // otherwise guess "<company>.com" (a starting point, not authoritative).
  let domain = null;
  if (company.includes('.') || company.includes('/')) {
    try {
      domain = new URL(company).hostname.replace('www.', '');
    } catch {
      domain = null;
    }
    company = company.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  } else if (company) {
    domain = `${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
  }

  return { person, company, domain };
}

/**
 * Scan vault context folders for notes mentioning the company or person.
 * Lightweight substring match on note contents; bounded result count.
 *
 * @param {string} company
 * @param {string|null} person
 * @returns {Promise<Array<{path: string, snippet: string}>>}
 */
async function gatherVaultContext(company, person) {
  const needles = [company, person].filter(Boolean).map((s) => s.toLowerCase());
  const hits = [];

  for (const dir of CONTEXT_DIRS) {
    let notes;
    try {
      notes = await obsidian.listNotes(dir);
    } catch {
      continue;
    }

    for (const notePath of notes) {
      if (hits.length >= MAX_CONTEXT_HITS) break;
      let content;
      try {
        content = await obsidian.readNote(notePath);
      } catch {
        continue;
      }
      const lower = content.toLowerCase();
      if (needles.some((n) => lower.includes(n))) {
        hits.push({ path: notePath, snippet: firstMatchingLine(content, needles) });
      }
    }
  }

  return hits;
}

function firstMatchingLine(content, needles) {
  for (const line of content.split('\n')) {
    const lower = line.toLowerCase();
    if (line.trim() && needles.some((n) => lower.includes(n))) {
      return line.trim().slice(0, 200);
    }
  }
  return '';
}

/**
 * Render the call-prep brief as markdown.
 */
function renderBrief({ person, company, domain }, { meetings, pricing, context }) {
  const today = new Date().toISOString().split('T')[0];
  const who = person ? `${person} (${company})` : company;
  const warm = meetings.length > 0;

  const lines = [
    `# Call Prep — ${who}`,
    '',
    `_Generated ${today}_`,
    '',
    `- **Contact:** ${person || '—'}`,
    `- **Company:** ${company}`,
    `- **Domain:** ${domain || 'unknown'}`,
    `- **Temperature:** ${warm ? '🔥 Warm' : '❄️ Cold'} (${meetings.length} prior meeting signal${meetings.length === 1 ? '' : 's'})`,
    '',
    '## Recent Touchpoints (Granola)',
    '',
  ];

  if (meetings.length === 0) {
    lines.push('_No recent meetings found._');
  } else {
    for (const mtg of meetings.slice(0, 5)) {
      const title = mtg.title || mtg.name || 'Untitled';
      const date = mtg.date || mtg.created_at || '';
      lines.push(`- ${title}${date ? ` — ${date}` : ''}`);
    }
  }

  lines.push('', '## Pricing Snapshot (PricingSaaS)', '');
  if (!pricing) {
    lines.push('_No pricing data available._');
  } else {
    lines.push('```json', JSON.stringify(pricing, null, 2), '```');
  }

  lines.push('', '## Related Notes', '');
  if (context.length === 0) {
    lines.push('_No related notes in the vault._');
  } else {
    for (const hit of context) {
      const link = hit.path.replace(/\.md$/, '');
      lines.push(`- [[${link}]]${hit.snippet ? ` — ${hit.snippet}` : ''}`);
    }
  }

  lines.push('', '## Talking Points', '');
  lines.push('- [ ] ');
  lines.push('- [ ] ');
  lines.push('');

  return lines.join('\n');
}

/**
 * `call-prep "<query>" [--out file.md]`
 * Builds a markdown call-prep brief and prints to stdout (or writes to a file).
 */
async function run(args, flags = {}) {
  const query = args.join(' ').trim();
  if (!query) {
    console.error('Usage: f13i call-prep "<Person> from <Company>" [--out file.md]');
    process.exit(1);
  }

  const parsed = parseQuery(query);
  logger.info('call-prep started', parsed);

  const [{ meetings, pricing }, context] = await Promise.all([
    callMCPs({
      contact: parsed.person,
      company: parsed.company,
      dryRun: process.env.DRY_RUN === 'true',
    }),
    gatherVaultContext(parsed.company, parsed.person),
  ]);

  logger.info('call-prep gathered', {
    meetings: meetings.length,
    hasPricing: !!pricing || Object.keys(pricing).length > 0,
    contextHits: context.length,
  });

  const brief = renderBrief(parsed, { meetings, pricing, context });

  const outFile = flags.out || flags.o;
  if (outFile && typeof outFile === 'string') {
    await obsidian.writeNote(outFile, brief);
    logger.info(`Brief written to vault note: ${outFile}`);
  } else {
    // Default: print to stdout (logger output goes to stderr/file, so this stays clean).
    process.stdout.write(brief + '\n');
  }
}

module.exports = { run, parseQuery, gatherVaultContext, renderBrief };
