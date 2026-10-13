import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { MediaType } from '@/lib/dominio'
import { fusionarOrden } from '@/lib/orden'
import { supabase } from '@/lib/supabase'

export type FilaRanking = {
  entry_id: number
  media_item_id: number
  type: MediaType
  title: string
  score: number
  tie_order: number
  position: number
  cover_url: string | null
  release_date: string | null
}

export const claveRanking = (tipo: MediaType | 'global') => ['ranking', tipo] as const

export function useRanking(tipo: MediaType | 'global') {
  return useQuery({
    queryKey: claveRanking(tipo),
    queryFn: async (): Promise<FilaRanking[]> => {
      const columnaPosicion = tipo === 'global' ? 'global_position' : 'category_position'
      let consulta = supabase
        .from('ranking')
        .select('entry_id, media_item_id, type, title, score, tie_order, global_position, category_position, cover_url, release_date')
        .order(columnaPosicion, { ascending: true })
        .limit(1000)
      if (tipo !== 'global') consulta = consulta.eq('type', tipo)
      const { data, error } = await consulta
      if (error) throw error
      return (data ?? []).map((f) => ({
        entry_id: f.entry_id!,
        media_item_id: f.media_item_id!,
        type: f.type!,
        title: f.title!,
        score: f.score!,
        tie_order: f.tie_order!,
        position: (tipo === 'global' ? f.global_position : f.category_position)!,
        cover_url: f.cover_url,
        release_date: f.release_date,
      }))
    },
  })
}

/**
 * Reordena un grupo de empate. Actualiza la caché de forma optimista y la
 * restaura si el servidor rechaza el cambio.
 */
export function useReordenarEmpate(tipo: MediaType | 'global') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ nota, idsEnOrden }: { nota: number; idsEnOrden: number[] }) => {
      const { data, error } = await supabase.from('entry').select('id').eq('score', nota).order('tie_order')
      if (error) throw error
      const final = fusionarOrden((data ?? []).map((f) => f.id), idsEnOrden)
      const { error: errorRpc } = await supabase.rpc('reorder_tie_group', { p_entry_ids: final })
      if (errorRpc) throw errorRpc
    },
    onMutate: async ({ idsEnOrden }) => {
      const clave = claveRanking(tipo)
      await queryClient.cancelQueries({ queryKey: clave })
      const anterior = queryClient.getQueryData<FilaRanking[]>(clave)
      if (anterior) {
        const orden = new Map(idsEnOrden.map((id, i) => [id, i]))
        const grupo = anterior.filter((f) => orden.has(f.entry_id))
        const posiciones = grupo.map((f) => f.position).sort((a, b) => a - b)
        const reordenado = [...grupo].sort((a, b) => orden.get(a.entry_id)! - orden.get(b.entry_id)!)
        const nuevo = new Map(reordenado.map((f, i) => [f.entry_id, { ...f, position: posiciones[i] }]))
        queryClient.setQueryData<FilaRanking[]>(
          clave,
          anterior.map((f) => nuevo.get(f.entry_id) ?? f).sort((a, b) => a.position - b.position),
        )
      }
      return { anterior }
    },
    onError: (_error, _variables, contexto) => {
      if (contexto?.anterior) queryClient.setQueryData(claveRanking(tipo), contexto.anterior)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['ranking'] }),
  })
}
