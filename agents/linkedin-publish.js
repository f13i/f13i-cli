require('dotenv').config();

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const logger = require('../utils/logger');

/** .env stores the vault path with a literal "~" — the shell would expand it, Node will not. */
function expandHome(p) {
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
}

const VAULT_PATH = expandHome(
  process.env.OBSIDIAN_VAULT_PATH ||
    `${process.env.HOME}/Library/Mobile Documents/iCloud~md~obsidian/Documents/f13i-brain`
);

const POSTS_DIR = path.join(VAULT_PATH, '50-content/linkedin-daily');
const IMG_DIR = path.join(POSTS_DIR, 'img');

const TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const API_VERSION = process.env.LINKEDIN_API_VERSION || '202405';

/**
 * linkedin-publish: publish today's queued LinkedIn post (+ its image) to Farhan's profile.
 *
 * Reads 50-content/linkedin-daily/YYYY-MM-DD-[slug].md, converts the matching SVG to PNG,
 * posts both via LinkedIn's Posts API, then writes status/published_date/linkedin_url back
 * to the note. Catch-up by design: it publishes TODAY's post whenever it runs, and does
 * nothing if that post is already published — so a late run is harmless, not a double-post.
 *
 * Usage:
 *   node agents/linkedin-publish.js --queue          # show the queue, touch nothing
 *   node agents/linkedin-publish.js                  # dry run — always, unless --live
 *   node agents/linkedin-publish.js --live           # actually publish
 *   node agents/linkedin-publish.js --date 2026-09-10 [--live]
 */

// ---------------------------------------------------------------- frontmatter

function parseNote(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('no frontmatter block');
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { frontmatter: fm, body: m[2] };
}

/** Strip the trailing "--- **Insight:** ..." metadata footer; it is not part of the post. */
function extractCommentary(body) {
  const cut = body.search(/\n---\s*\n\s*\*\*Insight:\*\*/);
  return (cut === -1 ? body : body.slice(0, cut)).trim();
}

/**
 * LinkedIn's Posts API parses `commentary` as "Little Text Format": these characters are
 * reserved and must be backslash-escaped or the request is rejected / renders mangled.
 */
function escapeCommentary(text) {
  return text.replace(/[\\|{}@\[\]()<>#*_~]/g, (c) => '\\' + c);
}

function setFrontmatterField(raw, key, value) {
  const re = new RegExp(`^(${key}:).*$`, 'm');
  const line = `${key}: ${value}`;
  const head = raw.slice(0, raw.indexOf('\n---\n', 4));
  if (re.test(head)) return raw.replace(re, line);
  return raw.replace(/^---\n/, `---\n${line}\n`); // key absent — add it
}

// ---------------------------------------------------------------- vault reads

function noteForDate(dateStr) {
  if (!fs.existsSync(POSTS_DIR)) throw new Error(`posts dir not found: ${POSTS_DIR}`);
  const hit = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.startsWith(dateStr) && f.endsWith('.md'))
    .sort()[0];
  return hit ? path.join(POSTS_DIR, hit) : null;
}

function listQueue() {
  const rows = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => {
      const { frontmatter } = parseNote(fs.readFileSync(path.join(POSTS_DIR, f), 'utf8'));
      const svg = path.join(IMG_DIR, f.replace(/\.md$/, '.svg'));
      return {
        file: f,
        date: frontmatter.date || f.slice(0, 10),
        status: frontmatter.status || '?',
        image: fs.existsSync(svg),
      };
    });
  return rows;
}

// ---------------------------------------------------------------- image

/** macOS ships qlmanage; it renders SVG->PNG with nothing to install. */
function svgToPng(svgPath) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'li-img-'));
  execFileSync('qlmanage', ['-t', '-s', '1080', '-o', out, svgPath], { stdio: 'ignore' });
  const png = fs
    .readdirSync(out)
    .filter((f) => f.endsWith('.png'))
    .map((f) => path.join(out, f))[0];
  if (!png) throw new Error(`qlmanage produced no PNG for ${path.basename(svgPath)}`);
  return png;
}

// ---------------------------------------------------------------- LinkedIn API

function headers(extra = {}) {
  return {
    Authorization: `Bearer ${TOKEN}`,
    'LinkedIn-Version': API_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
    ...extra,
  };
}

async function apiCheck(res, label) {
  if (res.ok) return;
  const body = await res.text().catch(() => '');
  if (res.status === 401) {
    throw new Error(
      `${label}: 401 Unauthorized — LINKEDIN_ACCESS_TOKEN is expired or wrong scope. ` +
        `Member tokens last ~60 days; re-run the OAuth flow and update .env. Body: ${body.slice(0, 300)}`
    );
  }
  if (res.status === 403) {
    throw new Error(
      `${label}: 403 Forbidden — the token likely lacks w_member_social, or the app is not ` +
        `approved for "Share on LinkedIn". Body: ${body.slice(0, 300)}`
    );
  }
  throw new Error(`${label}: HTTP ${res.status} — ${body.slice(0, 400)}`);
}

async function getMemberUrn() {
  if (process.env.LINKEDIN_MEMBER_URN) return process.env.LINKEDIN_MEMBER_URN;
  const res = await fetch('https://api.linkedin.com/v2/userinfo', { headers: headers() });
  await apiCheck(res, 'userinfo');
  const { sub } = await res.json();
  if (!sub) throw new Error('userinfo returned no "sub" — set LINKEDIN_MEMBER_URN in .env manually');
  return `urn:li:person:${sub}`;
}

async function uploadImage(memberUrn, pngPath) {
  const init = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ initializeUploadRequest: { owner: memberUrn } }),
  });
  await apiCheck(init, 'image initializeUpload');
  const { value } = await init.json();

  const put = await fetch(value.uploadUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: fs.readFileSync(pngPath),
  });
  await apiCheck(put, 'image binary upload');
  return value.image; // urn:li:image:...
}

async function createPost(memberUrn, commentary, imageUrn) {
  const payload = {
    author: memberUrn,
    commentary: escapeCommentary(commentary),
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };
  if (imageUrn) payload.content = { media: { id: imageUrn } };

  const res = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  await apiCheck(res, 'create post');
  const urn = res.headers.get('x-restli-id');
  return { urn, url: urn ? `https://www.linkedin.com/feed/update/${urn}/` : null };
}

// ---------------------------------------------------------------- main

async function run() {
  const argv = process.argv.slice(2);
  // Publishing is public and irreversible, so --live is the ONLY way to go live.
  // Deliberately not honouring DRY_RUN=false from .env: an env var must never be able to
  // turn a bare `node agents/linkedin-publish.js` into a real post.
  const dryRun = !argv.includes('--live');
  const dateArg = (argv[argv.indexOf('--date') + 1] || '').match(/^\d{4}-\d{2}-\d{2}$/)
    ? argv[argv.indexOf('--date') + 1]
    : null;

  if (argv.includes('--queue')) {
    const rows = listQueue();
    const today = new Date().toISOString().slice(0, 10);
    console.log(`\nLinkedIn queue — ${rows.length} post(s), today is ${today}\n`);
    for (const r of rows.slice(-12)) {
      const mark = r.date === today ? '→' : ' ';
      console.log(
        `${mark} ${r.date}  ${r.status.padEnd(9)} ${r.image ? 'img' : 'NO IMG'}  ${r.file}`
      );
    }
    const queued = rows.filter((r) => r.status === 'queued');
    const past = queued.filter((r) => r.date < today);
    console.log(`\n${queued.length} queued, ${past.length} of them already past their date.\n`);
    return;
  }

  const date = dateArg || new Date().toISOString().slice(0, 10);
  logger.info('linkedin-publish started', { date, dryRun });

  const notePath = noteForDate(date);
  if (!notePath) {
    console.log(`No post written for ${date}. Nothing to publish — that is a clean exit.`);
    return;
  }

  const raw = fs.readFileSync(notePath, 'utf8');
  const { frontmatter } = parseNote(raw);

  if (frontmatter.status === 'posted' || frontmatter.status === 'published') {
    console.log(`${path.basename(notePath)} is already ${frontmatter.status}. Nothing to do.`);
    return;
  }
  if (frontmatter.status !== 'queued') {
    console.log(`${path.basename(notePath)} has status "${frontmatter.status}" — expected "queued". Skipping.`);
    return;
  }

  const commentary = extractCommentary(parseNote(raw).body);
  if (!commentary) throw new Error(`${path.basename(notePath)} has an empty body`);

  const svgPath = path.join(IMG_DIR, path.basename(notePath).replace(/\.md$/, '.svg'));
  const hasImage = fs.existsSync(svgPath);

  console.log(`\n${dryRun ? 'DRY RUN — nothing will be posted' : 'LIVE — publishing to LinkedIn'}`);
  console.log(`  file    ${path.basename(notePath)}`);
  console.log(`  image   ${hasImage ? path.basename(svgPath) : 'none (text-only post)'}`);
  console.log(`  chars   ${commentary.length} (LinkedIn limit 3000)`);
  console.log(`  opening ${commentary.split('\n')[0]}`);

  if (commentary.length > 3000) throw new Error(`post is ${commentary.length} chars, over LinkedIn's 3000 limit`);

  if (dryRun) {
    let png = null;
    if (hasImage) {
      png = svgToPng(svgPath); // exercise the real conversion so a dry run proves it works
      console.log(`  png     ${(fs.statSync(png).size / 1024).toFixed(0)} KB rendered OK`);
    }
    console.log(`  token   ${TOKEN ? 'present' : 'MISSING — set LINKEDIN_ACCESS_TOKEN in .env'}`);
    console.log('\nDry run complete. Re-run with --live to publish.\n');
    return;
  }

  if (!TOKEN) throw new Error('LINKEDIN_ACCESS_TOKEN is not set in .env — cannot publish');

  const memberUrn = await getMemberUrn();
  let imageUrn = null;
  if (hasImage) imageUrn = await uploadImage(memberUrn, svgToPng(svgPath));

  const { urn, url } = await createPost(memberUrn, commentary, imageUrn);

  let updated = setFrontmatterField(raw, 'status', 'posted');
  updated = setFrontmatterField(updated, 'published_date', date);
  updated = setFrontmatterField(updated, 'linkedin_url', url || urn || 'posted');
  fs.writeFileSync(notePath, updated);

  logger.info('linkedin-publish posted', { file: path.basename(notePath), urn });
  console.log(`\nPosted. ${url || urn}`);
  console.log(`Note updated: status: posted\n`);
}

run().catch((err) => {
  logger.error ? logger.error(err.message) : logger.warn(err.message);
  console.error(`\nlinkedin-publish failed: ${err.message}\n`);
  process.exit(1);
});
