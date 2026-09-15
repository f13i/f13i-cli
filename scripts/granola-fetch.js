#!/usr/bin/env node
require('dotenv').config({ quiet: true });
const granola = require('../utils/granola-api-client');

// Usage:
//   node scripts/granola-fetch.js list [days] [titleFilter]
//   node scripts/granola-fetch.js show <noteId> [--transcript]
//
// list  → "id | ISO date | folder | title" for notes created in the last N days
//         (default 8), optionally filtered by case-insensitive title substring.
// show  → one note's summary + private notes, transcript appended on --transcript.
//
// Exists so headless/scheduled runs can read Granola over the public API without
// the Granola MCP being authorised in that session.

async function list(days, filter) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  let cursor, rows = [];
  do {
    const page = await granola.getNotes({ page_size: 30, created_after: since, cursor });
    for (const n of page.notes || []) {
      const title = n.title || '(untitled)';
      if (filter && !title.toLowerCase().includes(filter.toLowerCase())) continue;
      rows.push(`${n.id} | ${n.created_at} | ${title}`);
    }
    cursor = page.hasMore ? page.cursor : null;
  } while (cursor);
  console.log(rows.length ? rows.join('\n') : `(no notes in last ${days}d${filter ? ` matching "${filter}"` : ''})`);
}

async function show(id, withTranscript) {
  const n = await granola.getNote(id, withTranscript);
  const folders = (n.folder_membership || []).map(f => f.name).join(', ') || '(none)';
  const people = (n.attendees || []).map(a => a.name || a.email).join(', ') || '(none)';
  console.log(`# ${n.title || '(untitled)'}`);
  console.log(`date: ${n.created_at}\nfolder: ${folders}\nattendees: ${people}\nurl: ${n.web_url}\n`);
  console.log('## Summary\n');
  console.log(n.summary_markdown || n.summary_text || '(no summary)');
  if (n.private_notes_markdown || n.private_notes_text) {
    console.log('\n## Private notes\n');
    console.log(n.private_notes_markdown || n.private_notes_text);
  }
  if (withTranscript && Array.isArray(n.transcript)) {
    console.log('\n## Transcript\n');
    console.log(n.transcript
      .map(s => `${s.speaker?.attribution === 'me' ? 'Farhan' : 'Them'}: ${s.text || ''}`)
      .join('\n'));
  }
}

const [cmd, a, b] = process.argv.slice(2);
(async () => {
  if (cmd === 'list') await list(Number(a) || 8, b);
  else if (cmd === 'show') await show(a, process.argv.includes('--transcript'));
  else {
    console.error('usage: granola-fetch.js list [days] [titleFilter] | show <noteId> [--transcript]');
    process.exit(1);
  }
})().catch(e => { console.error(e.message); process.exit(1); });
