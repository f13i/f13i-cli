const Anthropic = require('@anthropic-ai/sdk');
const logger = require('./logger');

// Current MCP-connector beta header (mcp-client-2025-04-04 is deprecated).
const MCP_BETA = 'mcp-client-2025-11-20';
// Orchestration runs on Sonnet per the project's model strategy.
const MODEL = 'claude-sonnet-4-6';

// Stable instructions — kept byte-identical across calls so the prefix caches.
const SYSTEM_PROMPT = `You are a call-prep and pricing-intelligence assistant for f13i.
For the person or company you are given, gather:
1. Recent meetings from the Granola MCP server (use its meeting list/search tools, matching on the name).
2. Pricing intelligence from the PricingSaaS MCP server (company details / current pricing).

Return ONLY a JSON object — no preamble, no markdown fences — in exactly this shape:
{"meetings": [...], "pricing": {...}, "timestamp": "<ISO 8601 timestamp>"}

If a source returns nothing, use an empty array or object. Be concise.`;

/**
 * Build the mcp_servers definitions and their matching mcp_toolset entries.
 * Under mcp-client-2025-11-20 every server MUST be referenced by exactly one
 * mcp_toolset in `tools`, or the request 400s.
 *
 * @returns {{servers: Array, tools: Array}}
 */
function buildMcp(sources) {
  const servers = [];

  const candidates = [
    { name: 'granola', url: process.env.GRANOLA_MCP_URL, token: process.env.GRANOLA_MCP_TOKEN },
    { name: 'pricingsaas', url: process.env.PRICINGSAAS_MCP_URL, token: process.env.PRICINGSAAS_MCP_TOKEN },
  ];

  for (const c of candidates) {
    if (!c.url) continue;
    if (sources && !sources.includes(c.name)) continue;
    const server = { type: 'url', url: c.url, name: c.name };
    // OAuth bearer token, only if configured. Without it, authenticated
    // servers will reject the connection (surfaced as a session.error / tool error).
    if (c.token) server.authorization_token = c.token;
    servers.push(server);
  }

  const tools = servers.map((s) => ({ type: 'mcp_toolset', mcp_server_name: s.name }));
  return { servers, tools };
}

function emptyResult() {
  return { meetings: [], pricing: {}, timestamp: new Date().toISOString() };
}

let _client;
function getClient() {
  if (!_client) _client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  return _client;
}

/**
 * Tolerant JSON extraction: strips optional code fences, falls back to the
 * first {...} block. Returns null if nothing parses.
 */
function parseJson(text) {
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* fall through */
      }
    }
  }
  return null;
}

/**
 * Orchestrate Granola + PricingSaaS MCP tool calls via the Anthropic Messages
 * API MCP connector. Lets Claude decide which tools to call.
 *
 * @param {Object} context
 * @param {string} [context.contact] - Person name (preferred identifier).
 * @param {string} [context.company] - Company name.
 * @param {boolean} [context.dryRun] - Skip the live API call.
 * @param {string[]} [context.sources] - Limit to these servers ('granola', 'pricingsaas').
 * @returns {Promise<{meetings: Array, pricing: Object, timestamp: string}>}
 *          Returns empty shape on any failure (never throws).
 */
async function callMCPs(context) {
  const { contact, company, dryRun, sources } = context;
  const identifier = contact || company;

  if (dryRun) {
    logger.info('DRY_RUN: skipping Anthropic MCP call', { identifier });
    return { ...emptyResult(), dryRun: true };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    logger.error('ANTHROPIC_API_KEY not set in .env');
    return emptyResult();
  }

  const { servers, tools } = buildMcp(sources);
  if (servers.length === 0) {
    logger.warn('No MCP servers configured (set GRANOLA_MCP_URL / PRICINGSAAS_MCP_URL)');
    return emptyResult();
  }

  logger.debug('Calling Anthropic MCP connector', {
    identifier,
    servers: servers.map((s) => s.name),
  });

  try {
    const client = getClient();
    const messages = [
      { role: 'user', content: `Person/company: "${identifier}". Company: "${company || identifier}".` },
    ];

    // The MCP connector runs a server-side tool loop. If it hits the per-turn
    // limit it returns stop_reason "pause_turn"; re-send to resume.
    const MAX_CONTINUATIONS = 5;
    let response;
    for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
      response = await client.beta.messages.create({
        betas: [MCP_BETA],
        model: MODEL,
        max_tokens: 8192,
        thinking: { type: 'adaptive' },
        system: [
          // cache_control on the last system block caches tools + system
          // together — a win across the many companies pricing-intel loops over.
          { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        ],
        mcp_servers: servers,
        tools,
        messages,
      });

      if (response.stop_reason !== 'pause_turn') break;
      messages.push({ role: 'assistant', content: response.content });
    }

    logger.debug('MCP usage', {
      input: response.usage?.input_tokens,
      cacheRead: response.usage?.cache_read_input_tokens,
      cacheWrite: response.usage?.cache_creation_input_tokens,
      output: response.usage?.output_tokens,
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    if (!text) {
      logger.warn('No text content in Claude response', { identifier });
      return emptyResult();
    }

    const parsed = parseJson(text);
    if (!parsed) {
      logger.warn('Could not parse JSON from Claude response', { snippet: text.slice(0, 300) });
      return { ...emptyResult(), rawResponse: text };
    }

    return {
      meetings: Array.isArray(parsed.meetings) ? parsed.meetings : [],
      pricing: parsed.pricing && typeof parsed.pricing === 'object' ? parsed.pricing : {},
      timestamp: parsed.timestamp || new Date().toISOString(),
    };
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      logger.error(`Anthropic API error ${err.status}: ${err.message}`, { identifier });
    } else {
      logger.error(`MCP orchestration failed: ${err.message}`, { identifier });
    }
    return emptyResult();
  }
}

module.exports = { callMCPs };
