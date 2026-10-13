// MusicBrainz (álbumes = release-group, canciones = recording) y portadas de
// Cover Art Archive. Sin clave, pero exige un User-Agent identificable y como
// máximo 1 petición por segundo.

import { pedirJson } from '../http.ts'
import { anio, creditos, entero, fecha, lista, texto } from '../limpiar.ts'
import { ErrorPublico, type Candidato, type Fetcher, type ItemPayload } from '../tipos.ts'

const API = 'https://musicbrainz.org/ws/2'
const PORTADAS = 'https://coverartarchive.org/release-group'
const USER_AGENT = 'LD-List/1.0 (https://github.com/LDemons/LD-List)'
const MBID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

type Tipo = 'album' | 'song'

type ArtistCredit = { name?: string; joinphrase?: string }[]

type ReleaseGroup = {
  id: string
  title?: string
  'first-release-date'?: string
  'primary-type'?: string | null
  'secondary-types'?: string[]
  'artist-credit'?: ArtistCredit
  genres?: { name?: string }[]
}

type Recording = {
  id: string
  title?: string
  length?: number | null
  'first-release-date'?: string
  'artist-credit'?: ArtistCredit
  genres?: { name?: string }[]
  releases?: { id: string; title?: string; 'release-group'?: { id?: string } }[]
}

/** Escapa los caracteres especiales de la sintaxis Lucene de MusicBrainz. */
export function escaparLucene(texto: string): string {
  return texto.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, (c) => `\\${c}`)
}

function artistas(credito: ArtistCredit | undefined): string | null {
  if (!credito?.length) return null
  return texto(credito.map((a) => `${a.name ?? ''}${a.joinphrase ?? ''}`).join(''), 200)
}

function portada(releaseGroupId: string | undefined, tamano: 250 | 500): string | null {
  return releaseGroupId && MBID.test(releaseGroupId) ? `${PORTADAS}/${releaseGroupId}/front-${tamano}` : null
}

export function tipoAlbum(rg: ReleaseGroup): string {
  const secundarios = rg['secondary-types'] ?? []
  if (secundarios.includes('Compilation')) return 'compilation'
  if (secundarios.includes('Live')) return 'live'
  if (rg['primary-type'] === 'EP') return 'ep'
  if (rg['primary-type'] === 'Single') return 'single'
  return 'album'
}

function pedir<T>(fetcher: Fetcher, ruta: string, params: Record<string, string>) {
  return pedirJson<T>(fetcher, `${API}/${ruta}?${new URLSearchParams({ ...params, fmt: 'json' })}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  })
}

export function normalizarBusquedaAlbum(rg: ReleaseGroup): Candidato | null {
  const titulo = texto(rg.title, 300)
  if (!titulo || !MBID.test(rg.id)) return null
  return {
    provider: 'musicbrainz',
    externalId: rg.id,
    type: 'album',
    title: titulo,
    subtitle: artistas(rg['artist-credit']),
    year: anio(fecha(rg['first-release-date'])),
    coverUrl: portada(rg.id, 250),
  }
}

export function normalizarBusquedaCancion(r: Recording): Candidato | null {
  const titulo = texto(r.title, 300)
  if (!titulo || !MBID.test(r.id)) return null
  const lanzamiento = r.releases?.[0]
  return {
    provider: 'musicbrainz',
    externalId: r.id,
    type: 'song',
    title: titulo,
    subtitle: [artistas(r['artist-credit']), texto(lanzamiento?.title, 100)].filter(Boolean).join(' · ') || null,
    year: anio(fecha(r['first-release-date'])),
    coverUrl: portada(lanzamiento?.['release-group']?.id, 250),
  }
}

export function normalizarAlbum(rg: ReleaseGroup): ItemPayload {
  const titulo = texto(rg.title, 300)
  if (!titulo) throw new ErrorPublico('El elemento no tiene título.', 422)
  return {
    type: 'album',
    title: titulo,
    original_title: null,
    release_date: fecha(rg['first-release-date']),
    cover_url: portada(rg.id, 500),
    synopsis: null,
    details: { kind: tipoAlbum(rg), track_count: null },
    creators: creditos((rg['artist-credit'] ?? []).map((a) => a.name), 'artist'),
    genres: lista((rg.genres ?? []).map((g) => g.name), 20, 50),
    external: { provider: 'musicbrainz', external_id: rg.id, raw: rg },
  }
}

/** `albumId` es el media_item del álbum si ya está en el catálogo. */
export function normalizarCancion(r: Recording, albumId: number | null): ItemPayload {
  const titulo = texto(r.title, 300)
  if (!titulo) throw new ErrorPublico('El elemento no tiene título.', 422)
  return {
    type: 'song',
    title: titulo,
    original_title: null,
    release_date: fecha(r['first-release-date']),
    cover_url: portada(r.releases?.[0]?.['release-group']?.id, 500),
    synopsis: null,
    details: {
      duration_seconds: entero(typeof r.length === 'number' ? Math.round(r.length / 1000) : null, 1, 86400),
      album_id: albumId,
    },
    creators: creditos((r['artist-credit'] ?? []).map((a) => a.name), 'artist'),
    genres: lista((r.genres ?? []).map((g) => g.name), 20, 50),
    external: { provider: 'musicbrainz', external_id: r.id, raw: r },
  }
}

export async function buscar(fetcher: Fetcher, tipo: Tipo, consulta: string) {
  const q = escaparLucene(consulta)
  if (tipo === 'album') {
    const datos = await pedir<{ 'release-groups'?: ReleaseGroup[] }>(fetcher, 'release-group', { query: q, limit: '20' })
    return (datos['release-groups'] ?? []).map(normalizarBusquedaAlbum).filter((c): c is Candidato => c !== null)
  }
  const datos = await pedir<{ recordings?: Recording[] }>(fetcher, 'recording', { query: q, limit: '20' })
  return (datos.recordings ?? []).map(normalizarBusquedaCancion).filter((c): c is Candidato => c !== null)
}

export async function importarAlbum(fetcher: Fetcher, id: string) {
  if (!MBID.test(id)) throw new ErrorPublico('Identificador inválido.', 400)
  const rg = await pedir<ReleaseGroup>(fetcher, `release-group/${id}`, { inc: 'artist-credits+genres' })
  return normalizarAlbum(rg)
}

/**
 * La canción se normaliza aparte (normalizarCancion) porque antes hay que
 * buscar en el catálogo el álbum de `releaseGroupId` para enlazarlo.
 */
export async function obtenerCancion(fetcher: Fetcher, id: string) {
  if (!MBID.test(id)) throw new ErrorPublico('Identificador inválido.', 400)
  const recording = await pedir<Recording>(fetcher, `recording/${id}`, {
    inc: 'artist-credits+genres+releases+release-groups',
  })
  return { recording, releaseGroupId: recording.releases?.[0]?.['release-group']?.id ?? null }
}
