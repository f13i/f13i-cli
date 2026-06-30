import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { PIECES_KEY } from './useContentPieces'

// Subscribe to Postgres changes on content_pieces and invalidate the query
// cache on any insert/update/delete. In Phase 1 this keeps multiple tabs in
// sync; in Phase 2 external agent writes propagate to the board with no extra
// work (this is the answer to PRD open-question #3 — realtime decided up front).
export function useRealtime() {
  const qc = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('content_pieces_stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content_pieces' },
        () => qc.invalidateQueries({ queryKey: PIECES_KEY }),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [qc])
}
