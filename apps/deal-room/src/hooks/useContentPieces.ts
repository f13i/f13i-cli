import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  createPiece,
  deletePiece,
  listPieces,
  updatePiece,
  updateStage,
} from '../lib/api'
import type { ContentPiece, ContentPieceInput, Stage } from '../lib/types'

export const PIECES_KEY = ['content_pieces'] as const

export function useContentPieces() {
  return useQuery({
    queryKey: PIECES_KEY,
    queryFn: listPieces,
  })
}

export function useCreatePiece() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ContentPieceInput) => createPiece(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PIECES_KEY }),
  })
}

export function useUpdatePiece() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ContentPieceInput }) =>
      updatePiece(id, patch),
    // Optimistic: patch the cache immediately so edits feel instant.
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: PIECES_KEY })
      const prev = qc.getQueryData<ContentPiece[]>(PIECES_KEY)
      qc.setQueryData<ContentPiece[]>(PIECES_KEY, (old) =>
        (old ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(PIECES_KEY, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: PIECES_KEY }),
  })
}

export function useUpdateStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: Stage }) =>
      updateStage(id, stage),
    // Optimistic stage move — the card lands in the new column before the
    // round-trip, then realtime/refetch reconciles.
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: PIECES_KEY })
      const prev = qc.getQueryData<ContentPiece[]>(PIECES_KEY)
      qc.setQueryData<ContentPiece[]>(PIECES_KEY, (old) =>
        (old ?? []).map((p) =>
          p.id === id
            ? { ...p, stage, stage_since: new Date().toISOString() }
            : p,
        ),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(PIECES_KEY, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: PIECES_KEY }),
  })
}

export function useDeletePiece() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePiece(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: PIECES_KEY })
      const prev = qc.getQueryData<ContentPiece[]>(PIECES_KEY)
      qc.setQueryData<ContentPiece[]>(PIECES_KEY, (old) =>
        (old ?? []).filter((p) => p.id !== id),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(PIECES_KEY, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: PIECES_KEY }),
  })
}
