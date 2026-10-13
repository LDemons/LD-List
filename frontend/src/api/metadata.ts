// Cliente de la Edge Function `metadata` (supabase/functions/metadata), que
// busca e importa datos de TMDB, IGDB, AniList y MusicBrainz. Las API keys
// viven solo en la función, nunca en el navegador.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ExternalProvider, MediaType } from '@/lib/dominio'
import { supabase } from '@/lib/supabase'

export type Candidato = {
  provider: ExternalProvider
  externalId: string
  type: MediaType
  title: string
  subtitle: string | null
  year: string | null
  coverUrl: string | null
}

async function invocar<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('metadata', { body, signal })
  if (error) throw error
  return data as T
}

export function useBuscarMetadata(tipo: MediaType, consulta: string) {
  return useQuery({
    queryKey: ['metadata', tipo, consulta],
    enabled: consulta.length >= 2,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: ({ signal }) =>
      invocar<{ results: Candidato[] }>({ action: 'search', type: tipo, query: consulta }, signal).then((r) => r.results),
  })
}

export function useImportarMetadata() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (c: Pick<Candidato, 'provider' | 'externalId' | 'type'>) =>
      invocar<{ mediaItemId: number }>({
        action: 'import',
        type: c.type,
        provider: c.provider,
        externalId: c.externalId,
      }).then((r) => r.mediaItemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogo'] }),
  })
}
