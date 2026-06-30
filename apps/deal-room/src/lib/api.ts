// Data-access layer. EVERY read/write to Supabase goes through here — this is
// the single seam where a future sync layer (Beehiiv / Granola / Linear) plugs
// in without touching components. Do not call `supabase` from anywhere else.

import { supabase } from './supabase'
import type { ContentPiece, ContentPieceInput, Stage } from './types'

const TABLE = 'content_pieces'

export async function listPieces(): Promise<ContentPiece[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ContentPiece[]
}

export async function createPiece(
  input: ContentPieceInput,
): Promise<ContentPiece> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single()
  if (error) throw error
  return data as ContentPiece
}

export async function updatePiece(
  id: string,
  patch: ContentPieceInput,
): Promise<ContentPiece> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as ContentPiece
}

/** Stage moves go through their own call so the intent is explicit at the
 *  call site (the DB trigger handles stage_since / published_at). */
export async function updateStage(
  id: string,
  stage: Stage,
): Promise<ContentPiece> {
  return updatePiece(id, { stage })
}

export async function deletePiece(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}
