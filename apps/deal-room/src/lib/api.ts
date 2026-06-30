// Data-access layer. EVERY read/write goes through here — the single seam over
// the local backend (which fronts the Obsidian vault + Beehiiv). Components
// never fetch directly.

import type { ContentPiece, ContentPieceInput, Stage } from './types'

const BASE = '/api'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (body?.error) msg = body.error
    } catch {
      /* non-JSON error */
    }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

export async function listPieces(): Promise<ContentPiece[]> {
  return json<ContentPiece[]>(await fetch(`${BASE}/pieces`))
}

/** Quick capture — the backend only needs a title; it creates an idea note. */
export async function createPiece(input: ContentPieceInput): Promise<void> {
  await json(
    await fetch(`${BASE}/pieces`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: input.title }),
    }),
  )
}

export async function updatePiece(
  id: string,
  patch: ContentPieceInput,
): Promise<void> {
  await json(
    await fetch(`${BASE}/pieces/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  )
}

export async function updateStage(id: string, stage: Stage): Promise<void> {
  return updatePiece(id, { stage })
}

export async function deletePiece(id: string): Promise<void> {
  await json(
    await fetch(`${BASE}/pieces/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  )
}
