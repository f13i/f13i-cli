// Map the two real sources (vault notes, Beehiiv posts) + the read-only idea
// backlog into the unified ContentPiece shape the React UI consumes.

const STAGES = ['idea', 'draft', 'qa', 'ready', 'published']
const FORMATS = ['article', 'quick_take', 'deep_dive', 'case_study', 'roundup']

// vault frontmatter `status` -> pipeline stage (when no explicit `stage:` yet)
const STATUS_TO_STAGE = {
  draft: 'draft',
  final: 'qa',
  reviewed: 'qa',
  published: 'published',
}

export function encodeVaultId(relpath) {
  return 'vault:' + Buffer.from(relpath, 'utf8').toString('base64url')
}

export function decodeVaultId(id) {
  if (!id.startsWith('vault:')) return null
  return Buffer.from(id.slice('vault:'.length), 'base64url').toString('utf8')
}

// --- vault note -> piece -----------------------------------------------------

export function noteToPiece(note) {
  const d = note.data || {}
  const stage = STAGES.includes(d.stage)
    ? d.stage
    : STATUS_TO_STAGE[String(d.status || '').toLowerCase()] || 'draft'

  const created = isoOrNull(d.created) || new Date(0).toISOString()
  const updated = isoOrNull(d.updated) || created
  const stageSince = isoOrNull(d.stage_since) || updated

  return {
    id: encodeVaultId(note.relpath),
    title: d.title || firstHeading(note.body) || prettyName(note.relpath),
    stage,
    format: FORMATS.includes(d.format) ? d.format : 'article',
    topic_tags: normalizeTags(d.tags),
    hook: d.hook || truncate(d.topic, 140) || '',
    notes: typeof d.notes === 'string' ? d.notes : '',
    inspiration_url: firstSource(d) || '',
    assigned_to: d.assigned_to || 'farhan',
    agent_status: d.agent_status ?? null,
    human_override: d.human_override === true || d.flagged === true,
    word_count: note.wordCount ?? null,
    issue_number: parseIssue(d),
    beehiiv_post_id: d.beehiiv_post_id || null,
    created_at: created,
    updated_at: updated,
    published_at: stage === 'published' ? isoOrNull(d.published) : null,
    stage_since: stageSince,
    source: 'vault',
    locked: false,
  }
}

// --- backlog bullet -> read-only idea card -----------------------------------

export function backlogToPiece(item) {
  const now = new Date().toISOString()
  return {
    id: `backlog:${item.index}`,
    title: item.title,
    stage: 'idea',
    format: 'article',
    topic_tags: [],
    hook: '',
    notes: 'From the idea backlog (read-only). Capture it as a note to track it.',
    inspiration_url: '',
    assigned_to: 'unassigned',
    agent_status: null,
    human_override: false,
    word_count: null,
    issue_number: null,
    beehiiv_post_id: null,
    created_at: now,
    updated_at: now,
    published_at: null,
    stage_since: now,
    source: 'backlog',
    locked: true,
  }
}

// --- beehiiv post -> piece ---------------------------------------------------

export function beehiivToPiece(post) {
  const stage = post.status === 'published' ? 'published' : 'ready'
  const when = post.scheduled_at || post.updated_at || post.created_at
  const { issue, title } = splitIssuePrefix(post.title)
  return {
    id: `beehiiv:${post.id}`,
    title,
    stage,
    format: 'article',
    topic_tags: [],
    hook: '',
    notes: '',
    inspiration_url: '',
    assigned_to: 'farhan',
    agent_status: null,
    human_override: false,
    word_count: null,
    issue_number: issue,
    beehiiv_post_id: post.id,
    created_at: post.created_at || when,
    updated_at: post.updated_at || when,
    published_at: post.status === 'published' ? when : null,
    stage_since: when || new Date().toISOString(),
    source: 'beehiiv',
    locked: true,
  }
}

// --- helpers -----------------------------------------------------------------

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map(String)
  if (typeof tags === 'string') return tags.split(',').map((s) => s.trim()).filter(Boolean)
  return []
}

function firstHeading(body) {
  const m = /^#\s+(.+)$/m.exec(body || '')
  return m ? m[1].trim() : null
}

function prettyName(relpath) {
  const base = relpath.split('/').pop().replace(/\.md$/, '')
  return base.replace(/^\d+[-_]/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function firstSource(d) {
  if (typeof d.inspiration_url === 'string') return d.inspiration_url
  if (Array.isArray(d.sources) && d.sources.length) return String(d.sources[0])
  return null
}

function parseIssue(d) {
  if (typeof d.issue === 'number') return d.issue
  if (typeof d.issue_number === 'number') return d.issue_number
  const m = /issue\s*#?\s*0*(\d+)/i.exec(String(d.notes || ''))
  return m ? Number(m[1]) : null
}

function splitIssuePrefix(title) {
  const m = /^\s*(\d+)\s*\/\s*(.+)$/.exec(title || '')
  if (m) return { issue: Number(m[1]), title: m[2].trim() }
  return { issue: null, title: (title || '').trim() }
}

function truncate(s, n) {
  if (typeof s !== 'string') return ''
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}

function isoOrNull(v) {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v)
  return isNaN(d.getTime()) ? null : d.toISOString()
}
