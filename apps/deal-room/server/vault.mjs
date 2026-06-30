import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { VAULT_PATH, CONTENT_DIRS, IDEAS_BACKLOG, CAPTURE_DIR } from './config.mjs'

const abs = (rel) => path.join(VAULT_PATH, rel)

// --- Reading -----------------------------------------------------------------

/** All content notes across CONTENT_DIRS, parsed. Skips index/readme files. */
export async function listContentNotes() {
  const out = []
  for (const dir of CONTENT_DIRS) {
    let entries
    try {
      entries = await fs.readdir(abs(dir))
    } catch {
      continue // dir may not exist on every machine
    }
    for (const name of entries) {
      if (!name.endsWith('.md')) continue
      if (/^\d*0*-?(index|readme)/i.test(name)) continue
      const rel = path.join(dir, name)
      try {
        const raw = await fs.readFile(abs(rel), 'utf8')
        const fm = matter(raw)
        out.push({
          relpath: rel,
          data: fm.data,
          body: fm.content,
          wordCount: countWords(fm.content),
        })
      } catch {
        // unreadable file — skip rather than fail the whole list
      }
    }
  }
  return out
}

/** Read-only idea cards parsed from the backlog markdown file (top-level
 *  bullets). Returns [] if the file is missing. */
export async function listBacklogIdeas() {
  let raw
  try {
    raw = await fs.readFile(abs(IDEAS_BACKLOG), 'utf8')
  } catch {
    return []
  }
  const body = matter(raw).content
  const ideas = []
  const lines = body.split('\n')
  lines.forEach((line, i) => {
    const m = /^[-*]\s+(.*\S)\s*$/.exec(line)
    if (!m) return
    // prefer the bold lead "**Title** — rest", else the whole bullet
    const bold = /\*\*(.+?)\*\*/.exec(m[1])
    const title = (bold ? bold[1] : m[1]).replace(/\s*[—–-].*$/, '').trim()
    if (!title) return
    ideas.push({ index: i, title: title.slice(0, 120) })
  })
  return ideas
}

// --- Writing -----------------------------------------------------------------

/** Patch ONLY the frontmatter `stage:` field, leaving the note body and other
 *  keys byte-for-byte intact. Adds frontmatter / the key if absent. */
export async function patchStage(relpath, stage) {
  const full = abs(relpath)
  const raw = await fs.readFile(full, 'utf8')
  const next = setFrontmatterKey(raw, 'stage', stage)
  await fs.writeFile(full, next, 'utf8')
}

/** Apply several frontmatter keys at once (body untouched). Values must be
 *  pre-formatted YAML scalars/inline arrays (see formatYaml in api.mjs). */
export async function patchFrontmatter(relpath, kv) {
  const full = abs(relpath)
  let raw = await fs.readFile(full, 'utf8')
  for (const [key, value] of Object.entries(kv)) {
    raw = setFrontmatterKey(raw, key, value)
  }
  await fs.writeFile(full, raw, 'utf8')
}

/** Generic single-key frontmatter patch on raw markdown. Body untouched. */
export function setFrontmatterKey(raw, key, value) {
  const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/.exec(raw)
  const line = `${key}: ${value}`
  if (!fmMatch) {
    // no frontmatter — prepend a block
    return `---\n${line}\n---\n\n${raw}`
  }
  const block = fmMatch[1]
  const keyRe = new RegExp(`^${escapeRe(key)}:.*$`, 'm')
  const newBlock = keyRe.test(block)
    ? block.replace(keyRe, line)
    : `${block}\n${line}`
  const before = raw.slice(0, fmMatch.index)
  const after = raw.slice(fmMatch.index + fmMatch[0].length)
  return `${before}---\n${newBlock}\n---\n${after}`
}

/** Create a new idea note from a captured title. Returns its relpath. */
export async function createIdeaNote(title) {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'idea'
  const stamp = new Date().toISOString().slice(0, 10)
  let rel = path.join(CAPTURE_DIR, `${stamp}-${slug}.md`)
  // avoid clobbering an existing file
  let n = 2
  while (await exists(abs(rel))) {
    rel = path.join(CAPTURE_DIR, `${stamp}-${slug}-${n++}.md`)
  }
  const content = `---\ntitle: ${escapeYaml(title)}\ntype: article\nstatus: draft\nstage: idea\ncreated: ${stamp}\ntags: []\n---\n\n# ${title}\n\n`
  await fs.mkdir(path.dirname(abs(rel)), { recursive: true })
  await fs.writeFile(abs(rel), content, 'utf8')
  return rel
}

export async function deleteNote(relpath) {
  await fs.rm(abs(relpath))
}

// --- helpers -----------------------------------------------------------------

function countWords(text) {
  const t = text.replace(/[#*_>`\-\[\]()]/g, ' ').trim()
  if (!t) return 0
  return t.split(/\s+/).length
}

async function exists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const escapeYaml = (s) => (/[:#]/.test(s) ? JSON.stringify(s) : s)
