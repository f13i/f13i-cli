import os from 'node:os'
import path from 'node:path'
import dotenv from 'dotenv'

// Load apps/deal-room/.env (optional — every value has a sane default)
dotenv.config()

const HOME = os.homedir()

export const VAULT_PATH =
  process.env.OBSIDIAN_VAULT_PATH ||
  path.join(
    HOME,
    'Library/Mobile Documents/iCloud~md~obsidian/Documents/f13i-brain',
  )

// Vault folders scanned for Deal Room content notes (one note = one piece).
// Relative to VAULT_PATH.
export const CONTENT_DIRS = (
  process.env.DEAL_ROOM_CONTENT_DIRS || '50-content/articles'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// Idea backlog file surfaced as read-only cards in the Ideas column.
export const IDEAS_BACKLOG = (
  process.env.DEAL_ROOM_IDEAS_BACKLOG ||
  '70-projects/deal-room-newsletter/02-ideas.md'
).trim()

// New ideas captured in the UI are written here as real notes.
export const CAPTURE_DIR =
  process.env.DEAL_ROOM_CAPTURE_DIR || CONTENT_DIRS[0]

// Beehiiv — "The Deal Room"
export const BEEHIIV_PUBLICATION_ID =
  process.env.BEEHIIV_PUBLICATION_ID ||
  'pub_eb750555-d4a3-4f32-b716-60458e723f57'
export const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY || ''

export const PORT = Number(process.env.PORT || 5180)
