import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Json } from '@/lib/database.types'
import type { MediaType } from '@/lib/dominio'
import { supabase } from '@/lib/supabase'
import { escaparIlike } from '@/lib/validacion'

const SELECT_FICHA = `
  id, type, title, original_title, release_date, cover_url, synopsis, created_by,
  film (runtime_minutes),
  series (season_count, episode_count, end_date),
  game (platforms),
  anime (format, episode_count, end_date),
  album (kind, track_count),
  song (duration_seconds, track_number, album_id),
  media_credit (role, position, creator (id, name)),
  genre (name),
  external_ref (provider, external_id)
`

export function useFicha(mediaItemId: number) {
  return useQuery({
    queryKey: ['ficha', mediaItemId],
    queryFn: async () => {
      const { data, error } = await supabase.from('media_item').select(SELECT_FICHA).eq('id', mediaItemId).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export type Ficha = NonNullable<ReturnType<typeof useFicha>['data']>

/** Álbumes del catálogo, para enlazar una canción agregada a mano. */
export function useBuscarEnCatalogo(texto: string, tipo: MediaType | null) {
  const limpio = texto.trim()
  return useQuery({
    queryKey: ['catalogo', tipo, limpio],
    enabled: limpio.length >= 2,
    queryFn: async () => {
      let consulta = supabase
        .from('media_item')
        .select('id, type, title, release_date, cover_url')
        .ilike('title', `%${escaparIlike(limpio)}%`)
        .order('title')
        .limit(20)
      if (tipo) consulta = consulta.eq('type', tipo)
      const { data, error } = await consulta
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCrearItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Json) => {
      const { data, error } = await supabase.rpc('create_media_item', { p_item: payload })
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogo'] }),
  })
}

export function useBorrarItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (mediaItemId: number) => {
      const { data, error } = await supabase.from('media_item').delete().eq('id', mediaItemId).select('id')
      if (error) throw error
      // El RLS no da error si no eres quien lo creó: simplemente no borra nada.
      if (!data?.length) throw { code: '42501' }
    },
    onSuccess: () => queryClient.invalidateQueries(),
  })
}
