import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BEEHIIV_API_KEY, BEEHIIV_PUBLICATION_ID } from './config.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const CACHE_FILE = path.join(here, 'cache', 'beehiiv-posts.json')

// Returns scheduled + published posts for the Deal Room. Uses the live Beehiiv
// API when BEEHIIV_API_KEY is set, otherwise falls back to the cached snapshot
// (server/cache/beehiiv-posts.json, refreshed via the Beehiiv MCP).
export async function getBeehiivPosts() {
  if (BEEHIIV_API_KEY) {
    try {
      return await fetchLive()
    } catch (err) {
      console.warn('[beehiiv] live fetch failed, using cache:', err.message)
    }
  }
  return readCache()
}

async function fetchLive() {
  const base = `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/posts`
  const results = []
  for (const status of ['scheduled', 'published']) {
    const url = `${base}?status=${status}&limit=100&order_by=created&direction=desc`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${BEEHIIV_API_KEY}` },
    })
    if (!res.ok) throw new Error(`Beehiiv ${status}: HTTP ${res.status}`)
    const json = await res.json()
    for (const p of json.data ?? []) {
      results.push({
        id: p.id,
        title: p.title,
        status: p.status,
        // v2 returns unix seconds for these
        scheduled_at: toIso(p.scheduled_at),
        created_at: toIso(p.created),
        updated_at: toIso(p.updated ?? p.created),
      })
    }
  }
  return results
}

async function readCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf8')
    return JSON.parse(raw).posts ?? []
  } catch {
    return []
  }
}

function toIso(v) {
  if (v == null) return null
  if (typeof v === 'number') return new Date(v * 1000).toISOString()
  return v
}
