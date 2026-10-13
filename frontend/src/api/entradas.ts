import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { EntryStatus, MediaType } from '@/lib/dominio'
import { supabase } from '@/lib/supabase'

export type EntradaDatos = {
  status: EntryStatus
  score: number | null
  started_on: string | null
  finished_on: string | null
  notes: string | null
}

const SELECT_LISTA =
  'id, status, score, updated_at, media_item:media_item_id!inner (id, type, title, cover_url, release_date)'

export function useMisEntradas(filtros: { estado: EntryStatus | 'todos'; tipo: MediaType | 'todos' }) {
  return useQuery({
    queryKey: ['entradas', filtros],
    queryFn: async () => {
      let consulta = supabase
        .from('entry')
        .select(SELECT_LISTA)
        .order('updated_at', { ascending: false })
        .limit(500)
      if (filtros.estado !== 'todos') consulta = consulta.eq('status', filtros.estado)
      if (filtros.tipo !== 'todos') consulta = consulta.eq('media_item.type', filtros.tipo)
      const { data, error } = await consulta
      if (error) throw error
      return data ?? []
    },
  })
}

/** La entrada del usuario para un ítem, o null si no está en su lista. */
export function useEntradaDeItem(mediaItemId: number) {
  return useQuery({
    queryKey: ['entrada', mediaItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entry')
        .select('id, status, score, started_on, finished_on, notes, rated_at, updated_at')
        .eq('media_item_id', mediaItemId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

function invalidarTodo(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['ranking'] }),
    queryClient.invalidateQueries({ queryKey: ['entradas'] }),
    queryClient.invalidateQueries({ queryKey: ['entrada'] }),
  ])
}

export function useGuardarEntrada(mediaItemId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    // Solo se envían las columnas que el usuario puede escribir; user_id,
    // tie_order y rated_at los pone la base de datos.
    mutationFn: async ({ entradaId, datos }: { entradaId: number | null; datos: EntradaDatos }) => {
      const fila = {
        status: datos.status,
        score: datos.score,
        started_on: datos.started_on,
        finished_on: datos.finished_on,
        notes: datos.notes,
      }
      const { error } =
        entradaId === null
          ? await supabase.from('entry').insert({ media_item_id: mediaItemId, ...fila })
          : await supabase.from('entry').update(fila).eq('id', entradaId)
      if (error) throw error
    },
    onSuccess: () => invalidarTodo(queryClient),
  })
}

export function useQuitarEntrada() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entradaId: number) => {
      const { error } = await supabase.from('entry').delete().eq('id', entradaId)
      if (error) throw error
    },
    onSuccess: () => invalidarTodo(queryClient),
  })
}
