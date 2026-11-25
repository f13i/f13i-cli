require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { callMCPs } = require('../utils/mcp-orchestrator');
const { VAULT, localDate, loadRecentMeetings } = require('../utils/deals');

// --- Config / paths -------------------------------------------------------

// The list moved to 06- when 10-brain was numbered; the old name is a fallback.
const COMPANIES_NOTES = ['10-brain/06-companies-to-monitor.md', '10-brain/companies-to-monitor.md'];
const GRANOLA_LOOKBACK_DAYS = 30;
const DRY_RUN = process.env.DRY_RUN === 'true';
// PricingSaaS is an authenticated MCP server. Without a token every call 400s,
// so the pricing step is skipped (and said so in the digest) until one is set.
const PRICING_ENABLED = !!(process.env.PRICINGSAAS_MCP_URL && process.env.PRICINGSAAS_MCP_TOKEN);

/**
 * pricing-intel: a daily digest for the companies in 06-companies-to-monitor.md.
 *
 * For each company:
 *   - warm signals: Granola meetings in the last 30 days that mention it
 *     (title, attendees' email domains, or summary)
 *   - current pricing: PricingSaaS via the MCP connector, only when
 *     PRICINGSAAS_MCP_TOKEN is set
 *
 * Writes one note: 90-scratch/daily/<date>-pricing-intel.md. It never writes
 * into 30-deals/: a monitored company is not a deal.
 * Verified competitor price changes come from louis, not from this agent.
 */

// --- Parsing --------------------------------------------------------------

function parseCompanyDomain(url) {
  try {
    return new URL(url.includes('://') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * One markdown list item per company: `- Name | domain` (domain optional).
 * Lines inside frontmatter or code are ignored; so is the format example.
 */
function parseCompanies(content) {
  const body = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
  const companies = [];
  for (const rawLine of body.split('\n')) {
    const item = /^\s*[-*]\s+(.*)$/.exec(rawLine);
    if (!item) continue;
    const [namePart, domainPart] = item[1].split('|').map((s) => s.trim());
    const name = namePart.replace(/^\[\[|\]\]$/g, '').replace(/`/g, '').trim();
    if (!name || /^name$/i.test(name)) continue;
    let domain = null;
    if (domainPart) domain = parseCompanyDomain(domainPart);
    else if (name.includes('.')) domain = parseCompanyDomain(name);
    companies.push({ name, domain });
  }
  return companies;
}

function readCompaniesNote() {
  for (const rel of COMPANIES_NOTES) {
    const file = path.join(VAULT, rel);
    if (fs.existsSync(file)) return { rel, content: fs.readFileSync(file, 'utf8') };
  }
  return null;
}

// --- Signals --------------------------------------------------------------

function mentions(note, company) {
  const name = company.name.toLowerCase();
  const brand = company.domain ? company.domain.split('.')[0].toLowerCase() : null;
  const emails = (note.attendees || []).map((a) => (a.email || '').toLowerCase());
  const text = `${note.title || ''} ${note.summary || ''}`.toLowerCase();
  const nameRe = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
  return nameRe.test(text)
    || (company.domain && emails.some((e) => e.endsWith(`@${company.domain}`)))
    || (brand && brand.length > 3 && new RegExp(`\\b${brand}\\b`).test(text));
}

async function pricingFor(company) {
  if (!PRICING_ENABLED) return null;
  const { pricing } = await callMCPs({
    company: company.domain || company.name,
    sources: ['pricingsaas'],
    dryRun: DRY_RUN,
  });
  return pricing && Object.keys(pricing).length ? pricing : null;
}

// --- Rendering ------------------------------------------------------------

function renderDigest(results, { listNote, granolaError }) {
  const today = localDate();
  const warm = results.filter((r) => r.meetings.length);
  const L = [
    '---',
    'type: digest',
    `generated: ${today}`,
    `companies: ${results.length}`,
    `warm: ${warm.length}`,
    '---',
    '',
    `# Pricing intel: ${today}`,
    '',
    `${results.length} companies from [[${listNote.replace(/\.md$/, '')}]]. ${warm.length} with a meeting in the last ${GRANOLA_LOOKBACK_DAYS} days.`,
  ];
  if (granolaError) L.push('', `_Granola unavailable this run: ${granolaError}_`);
  if (!PRICING_ENABLED) {
    L.push('', '_Pricing not checked: PricingSaaS needs re-authorizing (set PRICINGSAAS_MCP_TOKEN). For verified competitor price changes, ask louis._');
  }

  for (const r of results) {
    L.push('', `## ${r.name}${r.domain ? ` (${r.domain})` : ''}`);
    if (r.meetings.length) {
      L.push('', '**Meetings that mention it:**');
      r.meetings.forEach((m) => L.push(`- ${(m.created_at || '').slice(0, 10)} · ${m.title || 'meeting'}${m.web_url ? ` · [notes](${m.web_url})` : ''}`));
    } else {
      L.push('', 'No meetings mention it in the last 30 days.');
    }
    if (r.pricing) {
      L.push('', '**Pricing (PricingSaaS):**', '', '```json', JSON.stringify(r.pricing, null, 2), '```');
    }
  }
  L.push('');
  return L.join('\n');
}

// --- Orchestration --------------------------------------------------------

async function run() {
  logger.info('pricing-intel started', { dryRun: DRY_RUN, pricing: PRICING_ENABLED });

  const note = readCompaniesNote();
  if (!note) {
    logger.error(`Companies list not found (looked for ${COMPANIES_NOTES.join(', ')})`);
    return null;
  }
  const companies = parseCompanies(note.content);
  if (!companies.length) {
    logger.warn(`No companies listed in ${note.rel}`);
    return { results: [] };
  }
  logger.info(`Loaded ${companies.length} companies from ${note.rel}`);

  const { notes, error: granolaError } = await loadRecentMeetings(GRANOLA_LOOKBACK_DAYS, { withSummaries: true });
  if (granolaError) logger.warn(`Granola unavailable: ${granolaError}`);

  const results = [];
  for (const company of companies) {
    const meetings = notes.filter((n) => mentions(n, company));
    const pricing = await pricingFor(company);
    results.push({ ...company, meetings, pricing });
  }

  const digest = renderDigest(results, { listNote: note.rel, granolaError });
  const rel = `90-scratch/daily/${localDate()}-pricing-intel.md`;
  if (DRY_RUN) {
    console.log(digest);
    logger.info(`[DRY_RUN] Skipping write: ${rel}`);
  } else {
    const file = path.join(VAULT, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, digest);
    logger.info(`Digest written to ${rel}`);
  }

  const warm = results.filter((r) => r.meetings.length).length;
  logger.info('pricing-intel completed', { companies: results.length, warm, pricing: PRICING_ENABLED, granola: !granolaError });
  return { results, warm };
}

module.exports = { run, parseCompanies, renderDigest };

if (require.main === module) {
  run().catch((err) => {
    logger.error(`Fatal: ${err.message}`, { stack: err.stack });
    process.exit(1);
  });
}
