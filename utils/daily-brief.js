// Write one named section of today's daily brief, replacing it if it is
// already there. Agents that run more than once a day (7am, 6pm, Sunday)
// would otherwise stack copies of the same section at the bottom of the file.

const fs = require('fs');
const path = require('path');
const { VAULT, localDate } = require('./deals');

function dailyPath(date = localDate()) {
  return path.join(VAULT, '90-scratch', 'daily', `${date}.md`);
}

/**
 * Replace (or append) `## <heading>` in the daily brief with `body`.
 * The section runs until the next `## ` heading or end of file.
 * Returns the vault-relative path written.
 */
function upsertSection(heading, body, date = localDate()) {
  const file = dailyPath(date);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : `# ${date}\n`;

  const section = `## ${heading}\n\n${body.trim()}\n`;
  const lines = existing.split('\n');
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);

  let out;
  if (start === -1) {
    out = `${existing.replace(/\s*$/, '')}\n\n${section}`;
  } else {
    let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
    if (end === -1) end = lines.length;
    const before = lines.slice(0, start).join('\n').replace(/\s*$/, '');
    const after = lines.slice(end).join('\n');
    out = `${before}\n\n${section}${after ? `\n${after}` : ''}`;
  }

  fs.writeFileSync(file, out.endsWith('\n') ? out : `${out}\n`);
  return path.relative(VAULT, file);
}

module.exports = { upsertSection, dailyPath };
