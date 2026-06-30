import express from 'express'
import {
  listContentNotes,
  listBacklogIdeas,
  patchFrontmatter,
  createIdeaNote,
  deleteNote,
} from './vault.mjs'
import { getBeehiivPosts } from './beehiiv.mjs'
import {
  noteToPiece,
  backlogToPiece,
  beehiivToPiece,
  decodeVaultId,
} from './map.mjs'

export function apiRouter() {
  const router = express.Router()
  router.use(express.json())

  // GET /api/pieces — merge all three sources into the unified board
  router.get('/pieces', async (_req, res) => {
    try {
      const [notes, backlog, posts] = await Promise.all([
        listContentNotes(),
        listBacklogIdeas(),
        getBeehiivPosts(),
      ])

      // Vault notes, EXCEPT ones already shipped (published) — Beehiiv owns the
      // published end, so we don't double-show them.
      const vaultPieces = notes
        .map(noteToPiece)
        .filter((p) => p.stage !== 'published')

      const pieces = [
        ...vaultPieces,
        ...backlog.map(backlogToPiece),
        ...posts.map(beehiivToPiece),
      ]
      res.json(pieces)
    } catch (err) {
      console.error('[api] GET /pieces', err)
      res.status(500).json({ error: err.message })
    }
  })

  // POST /api/pieces — quick capture creates a new idea note in the vault
  router.post('/pieces', async (req, res) => {
    const title = String(req.body?.title || '').trim()
    if (!title) return res.status(400).json({ error: 'title required' })
    try {
      const relpath = await createIdeaNote(title)
      res.status(201).json({ ok: true, relpath })
    } catch (err) {
      console.error('[api] POST /pieces', err)
      res.status(500).json({ error: err.message })
    }
  })

  // PATCH /api/pieces/:id — write editable fields back to vault frontmatter.
  // Only vault-sourced pieces are writable; Beehiiv/backlog are read-only.
  router.patch('/pieces/:id', async (req, res) => {
    const relpath = decodeVaultId(req.params.id)
    if (!relpath) {
      return res
        .status(409)
        .json({ error: 'This card lives in Beehiiv or the backlog — read-only.' })
    }
    const kv = toFrontmatterPatch(req.body || {})
    if (Object.keys(kv).length === 0) {
      return res.status(400).json({ error: 'no writable fields' })
    }
    try {
      await patchFrontmatter(relpath, kv)
      res.json({ ok: true })
    } catch (err) {
      console.error('[api] PATCH /pieces', err)
      res.status(500).json({ error: err.message })
    }
  })

  // DELETE /api/pieces/:id — vault notes only
  router.delete('/pieces/:id', async (req, res) => {
    const relpath = decodeVaultId(req.params.id)
    if (!relpath) {
      return res
        .status(409)
        .json({ error: 'Only vault notes can be deleted here.' })
    }
    try {
      await deleteNote(relpath)
      res.json({ ok: true })
    } catch (err) {
      console.error('[api] DELETE /pieces', err)
      res.status(500).json({ error: err.message })
    }
  })

  return router
}

// Map UI fields -> vault frontmatter keys, formatting values as YAML.
// word_count is derived from the note body on read, so we never persist it.
const FIELD_TO_KEY = {
  stage: 'stage',
  human_override: 'human_override',
  format: 'format',
  assigned_to: 'assigned_to',
  hook: 'hook',
  title: 'title',
  notes: 'notes',
  inspiration_url: 'inspiration_url',
  topic_tags: 'tags',
  issue_number: 'issue',
}

function toFrontmatterPatch(body) {
  const kv = {}
  for (const [field, key] of Object.entries(FIELD_TO_KEY)) {
    if (!(field in body)) continue
    kv[key] = formatYaml(body[field])
  }
  return kv
}

function formatYaml(value) {
  if (Array.isArray(value)) {
    return `[${value.map((v) => quoteIfNeeded(String(v))).join(', ')}]`
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  if (value == null) return '""'
  return quoteIfNeeded(String(value))
}

function quoteIfNeeded(s) {
  // quote when YAML could misread the scalar
  if (s === '') return '""'
  if (/^[\s>|*&!%@`"']/.test(s) || /:\s|#|\n|^\[|^\{/.test(s)) {
    return JSON.stringify(s)
  }
  return s
}
