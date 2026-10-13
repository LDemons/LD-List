// Edge Function `metadata`: busca e importa datos de TMDB, IGDB, AniList y
// MusicBrainz. Las API keys viven solo aquí, como secretos de Supabase.
//
// POST { action: 'search', type, query }                -> { results: Candidato[] }
// POST { action: 'import', type, provider, externalId } -> { mediaItemId }
//
// Orden de comprobaciones: CORS -> JWT -> Zod -> rate limit (en la BD, con el
// JWT del usuario) -> proveedor. La importación guarda con create_media_item
// usando el JWT del usuario, así que aplica su RLS. Nunca usa la service_role.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@4'

import * as anilist from './providers/anilist.ts'
import * as igdb from './providers/igdb.ts'
import * as musicbrainz from './providers/musicbrainz.ts'
import * as tmdb from './providers/tmdb.ts'
import { ErrorPublico, PROVEEDOR_DE, PROVEEDORES, TIPOS, type Candidato, type ItemPayload } from './tipos.ts'

const ORIGENES = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const CLAVE_PUBLICA =
  Deno.env.get('SUPABASE_ANON_KEY') ?? JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}').default

const TAMANO_MAXIMO_CUERPO = 2_000

const solicitudSchema = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('search'),
    type: z.enum(TIPOS),
    query: z.string().trim().min(2).max(100),
  }),
  z.strictObject({
    action: z.literal('import'),
    type: z.enum(TIPOS),
    provider: z.enum(PROVEEDORES),
    externalId: z.string().regex(/^[A-Za-z0-9-]{1,64}$/),
  }),
])

type Solicitud = z.infer<typeof solicitudSchema>

function cabecerasCors(origen: string | null): Record<string, string> | null {
  if (!origen || !ORIGENES.includes(origen)) return null
  return {
    'Access-Control-Allow-Origin': origen,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function responder(cuerpo: unknown, status: number, cors: Record<string, string> | null, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: {
      ...(cors ?? {}),
      ...extra,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

const credencialesIgdb = () => ({
  clientId: Deno.env.get('IGDB_CLIENT_ID'),
  clientSecret: Deno.env.get('IGDB_CLIENT_SECRET'),
})

async function buscar(s: Extract<Solicitud, { action: 'search' }>): Promise<Candidato[]> {
  switch (s.type) {
    case 'film':
    case 'series':
      return tmdb.buscar(fetch, Deno.env.get('TMDB_READ_TOKEN'), s.type, s.query)
    case 'game':
      return igdb.buscar(fetch, credencialesIgdb(), s.query)
    case 'anime':
      return anilist.buscar(fetch, s.query)
    case 'album':
    case 'song':
      return musicbrainz.buscar(fetch, s.type, s.query)
  }
}

async function obtenerPayload(s: Extract<Solicitud, { action: 'import' }>, supabase: SupabaseClient): Promise<ItemPayload> {
  switch (s.type) {
    case 'film':
    case 'series':
      return tmdb.importar(fetch, Deno.env.get('TMDB_READ_TOKEN'), s.type, s.externalId)
    case 'game':
      return igdb.importar(fetch, credencialesIgdb(), s.externalId)
    case 'anime':
      return anilist.importar(fetch, s.externalId)
    case 'album':
      return musicbrainz.importarAlbum(fetch, s.externalId)
    case 'song': {
      const { recording, releaseGroupId } = await musicbrainz.obtenerCancion(fetch, s.externalId)
      // Si el álbum ya está en el catálogo, se enlaza la canción con él.
      let albumId: number | null = null
      if (releaseGroupId) {
        const { data } = await supabase
          .from('external_ref')
          .select('media_item_id, media_item!inner(type)')
          .eq('provider', 'musicbrainz')
          .eq('external_id', releaseGroupId)
          .eq('media_item.type', 'album')
          .maybeSingle()
        albumId = data?.media_item_id ?? null
      }
      return musicbrainz.normalizarCancion(recording, albumId)
    }
  }
}

Deno.serve(async (req) => {
  const cors = cabecerasCors(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response(null, { status: cors ? 204 : 403, headers: cors ?? {} })
  if (!cors) return responder({ error: 'Origen no permitido.' }, 403, null)
  if (req.method !== 'POST') return responder({ error: 'Método no permitido.' }, 405, cors)

  const autorizacion = req.headers.get('Authorization') ?? ''
  const token = /^Bearer ([\w-]+\.[\w-]+\.[\w-]+)$/.exec(autorizacion)?.[1]
  if (!token) return responder({ error: 'Se requiere una sesión iniciada.' }, 401, cors)

  const cuerpo = await req.text()
  if (cuerpo.length > TAMANO_MAXIMO_CUERPO) return responder({ error: 'Solicitud demasiado grande.' }, 413, cors)
  let solicitud: Solicitud
  try {
    solicitud = solicitudSchema.parse(JSON.parse(cuerpo))
  } catch {
    return responder({ error: 'Solicitud inválida.' }, 400, cors)
  }
  if (solicitud.action === 'import' && PROVEEDOR_DE[solicitud.type] !== solicitud.provider) {
    return responder({ error: 'Proveedor incorrecto para esa categoría.' }, 400, cors)
  }

  const supabase = createClient(SUPABASE_URL, CLAVE_PUBLICA, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Verifica la firma y la vigencia del JWT. Con tokens malformados getClaims
  // lanza en vez de devolver error.
  let tokenValido = false
  try {
    const { data, error } = await supabase.auth.getClaims(token)
    tokenValido = !error && data?.claims?.role === 'authenticated' && !!data.claims.sub
  } catch {
    tokenValido = false
  }
  if (!tokenValido) return responder({ error: 'Se requiere una sesión iniciada.' }, 401, cors)

  // Rate limit por usuario; corre en la BD con el JWT del usuario.
  const { error: errorLimite } = await supabase.rpc('edge_rate_limit', { p_bucket: solicitud.action })
  if (errorLimite) {
    if (errorLimite.code === 'P0429') {
      return responder({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }, 429, cors, { 'Retry-After': '60' })
    }
    console.error('metadata: rate limit', errorLimite.code)
    return responder({ error: 'Se requiere una sesión iniciada.' }, 401, cors)
  }

  try {
    if (solicitud.action === 'search') {
      return responder({ results: await buscar(solicitud) }, 200, cors)
    }
    const payload = await obtenerPayload(solicitud, supabase)
    const { data, error } = await supabase.rpc('create_media_item', { p_item: payload })
    if (error || typeof data !== 'number') {
      console.error('metadata: create_media_item', error?.code)
      return responder({ error: 'No se pudo guardar el elemento en el catálogo.' }, 422, cors)
    }
    return responder({ mediaItemId: data }, 200, cors)
  } catch (e) {
    if (e instanceof ErrorPublico) return responder({ error: e.message }, e.status, cors)
    console.error('metadata: error inesperado', e instanceof Error ? e.name : typeof e)
    return responder({ error: 'Ocurrió un error inesperado.' }, 500, cors)
  }
})
