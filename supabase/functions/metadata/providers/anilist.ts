// AniList (anime). API GraphQL pública, sin clave.

import { pedirJson } from '../http.ts'
import { anio, creditos, entero, fecha, lista, sinHtml, texto } from '../limpiar.ts'
import { ErrorPublico, type Candidato, type Fetcher, type ItemPayload } from '../tipos.ts'

const API = 'https://graphql.anilist.co'

type FechaAniList = { year?: number | null; month?: number | null; day?: number | null } | null

type Media = {
  id: number
  title?: { romaji?: string | null; english?: string | null; native?: string | null }
  startDate?: FechaAniList
  endDate?: FechaAniList
  format?: string | null
  episodes?: number | null
  status?: string | null
  description?: string | null
  genres?: string[] | null
  coverImage?: { extraLarge?: string | null; large?: string | null }
  studios?: { nodes?: { name?: string }[] }
}

const BUSQUEDA = `query ($q: String) {
  Page(perPage: 20) {
    media(search: $q, type: ANIME, isAdult: false, sort: SEARCH_MATCH) {
      id title { romaji english native } startDate { year month day } format episodes coverImage { large }
    }
  }
}`

const DETALLE = `query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id title { romaji english native } startDate { year month day } endDate { year month day }
    format episodes status description(asHtml: false) genres coverImage { extraLarge large }
    studios(isMain: true) { nodes { name } }
  }
}`

const FORMATOS: Record<string, string> = {
  TV: 'tv',
  TV_SHORT: 'tv',
  MOVIE: 'movie',
  OVA: 'ova',
  ONA: 'ona',
  SPECIAL: 'special',
  MUSIC: 'special',
}

function fechaDe(f: FechaAniList): string | null {
  if (!f?.year) return null
  const mm = String(f.month ?? 1).padStart(2, '0')
  const dd = String(f.day ?? 1).padStart(2, '0')
  return fecha(`${f.year}-${mm}-${dd}`)
}

function portada(m: Media): string | null {
  const url = m.coverImage?.extraLarge ?? m.coverImage?.large
  return typeof url === 'string' && url.startsWith('https://') ? url : null
}

function titulos(m: Media) {
  const titulo = texto(m.title?.english, 300) ?? texto(m.title?.romaji, 300)
  const romaji = texto(m.title?.romaji, 300)
  const nativo = texto(m.title?.native, 300)
  return { titulo, alternativo: romaji !== titulo ? romaji : nativo }
}

async function graphql<T>(fetcher: Fetcher, query: string, variables: Record<string, unknown>) {
  const r = await pedirJson<{ data?: T; errors?: unknown[] }>(fetcher, API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  if (!r.data) throw new ErrorPublico('El servicio externo devolvió un error.', 502)
  return r.data
}

export function normalizarBusqueda(m: Media): Candidato | null {
  const { titulo, alternativo } = titulos(m)
  if (!titulo || !Number.isInteger(m.id)) return null
  const formato = m.format ? FORMATOS[m.format] : undefined
  return {
    provider: 'anilist',
    externalId: String(m.id),
    type: 'anime',
    title: titulo,
    subtitle: [alternativo, formato?.toUpperCase()].filter(Boolean).join(' · ') || null,
    year: anio(fechaDe(m.startDate ?? null)),
    coverUrl: portada(m),
  }
}

export function normalizarDetalle(m: Media): ItemPayload {
  const { titulo, alternativo } = titulos(m)
  if (!titulo) throw new ErrorPublico('El elemento no tiene título.', 422)
  return {
    type: 'anime',
    title: titulo,
    original_title: texto(m.title?.native, 300) ?? alternativo,
    release_date: fechaDe(m.startDate ?? null),
    cover_url: portada(m),
    synopsis: sinHtml(m.description, 5000),
    details: {
      format: (m.format && FORMATOS[m.format]) || null,
      episode_count: entero(m.episodes, 1, 20000),
      end_date: m.status === 'FINISHED' ? fechaDe(m.endDate ?? null) : null,
    },
    creators: creditos((m.studios?.nodes ?? []).map((s) => s.name), 'studio', 5),
    genres: lista(m.genres ?? [], 20, 50),
    external: { provider: 'anilist', external_id: String(m.id), raw: m },
  }
}

export async function buscar(fetcher: Fetcher, consulta: string) {
  const datos = await graphql<{ Page?: { media?: Media[] } }>(fetcher, BUSQUEDA, { q: consulta })
  return (datos.Page?.media ?? []).map(normalizarBusqueda).filter((c): c is Candidato => c !== null)
}

export async function importar(fetcher: Fetcher, id: string) {
  if (!/^\d{1,10}$/.test(id)) throw new ErrorPublico('Identificador inválido.', 400)
  const datos = await graphql<{ Media?: Media | null }>(fetcher, DETALLE, { id: Number(id) })
  if (!datos.Media) throw new ErrorPublico('No se encontró ese elemento en el servicio externo.', 404)
  return normalizarDetalle(datos.Media)
}
