// TMDB (películas y series). Requiere el secreto TMDB_READ_TOKEN
// (API Read Access Token v4). Datos en español cuando existen.

import { pedirJson } from '../http.ts'
import { anio, creditos, entero, fecha, lista, texto } from '../limpiar.ts'
import { ErrorPublico, type Candidato, type Fetcher, type ItemPayload } from '../tipos.ts'

const API = 'https://api.themoviedb.org/3'
const IMAGEN = 'https://image.tmdb.org/t/p/w500'

type Tipo = 'film' | 'series'

type ResultadoBusqueda = {
  id: number
  title?: string
  name?: string
  original_title?: string
  original_name?: string
  release_date?: string
  first_air_date?: string
  poster_path?: string | null
}

export type DetalleTmdb = ResultadoBusqueda & {
  overview?: string
  runtime?: number | null
  last_air_date?: string | null
  number_of_seasons?: number | null
  number_of_episodes?: number | null
  in_production?: boolean
  genres?: { name: string }[]
  created_by?: { name: string }[]
  credits?: { crew?: { job: string; name: string }[] }
}

function portada(path: string | null | undefined): string | null {
  return path && /^\/[\w.-]+$/.test(path) ? `${IMAGEN}${path}` : null
}

function cabeceras(token: string | undefined) {
  if (!token) throw new ErrorPublico('La búsqueda de películas y series aún no está configurada.', 503)
  return { Authorization: `Bearer ${token}`, Accept: 'application/json' }
}

export function normalizarBusqueda(tipo: Tipo, r: ResultadoBusqueda): Candidato | null {
  const titulo = texto(tipo === 'film' ? r.title : r.name, 300)
  if (!titulo || !Number.isInteger(r.id)) return null
  const original = texto(tipo === 'film' ? r.original_title : r.original_name, 300)
  return {
    provider: 'tmdb',
    externalId: String(r.id),
    type: tipo,
    title: titulo,
    subtitle: original && original !== titulo ? original : null,
    year: anio(fecha(tipo === 'film' ? r.release_date : r.first_air_date)),
    coverUrl: portada(r.poster_path),
  }
}

export function normalizarDetalle(tipo: Tipo, d: DetalleTmdb): ItemPayload {
  const titulo = texto(tipo === 'film' ? d.title : d.name, 300)
  if (!titulo) throw new ErrorPublico('El elemento no tiene título.', 422)
  const original = texto(tipo === 'film' ? d.original_title : d.original_name, 300)

  const details =
    tipo === 'film'
      ? { runtime_minutes: entero(d.runtime, 1, 2000) }
      : {
          season_count: entero(d.number_of_seasons, 1, 500),
          episode_count: entero(d.number_of_episodes, 1, 20000),
          end_date: d.in_production ? null : fecha(d.last_air_date),
        }

  const creadores =
    tipo === 'film'
      ? creditos((d.credits?.crew ?? []).filter((c) => c.job === 'Director').map((c) => c.name), 'director')
      : creditos((d.created_by ?? []).map((c) => c.name), 'creator')

  // El reparto completo puede ser enorme: no se guarda en raw.
  const { credits: _credits, ...raw } = d

  return {
    type: tipo,
    title: titulo,
    original_title: original !== titulo ? original : null,
    release_date: fecha(tipo === 'film' ? d.release_date : d.first_air_date),
    cover_url: portada(d.poster_path),
    synopsis: texto(d.overview, 5000),
    details,
    creators: creadores,
    genres: lista((d.genres ?? []).map((g) => g.name), 20, 50),
    external: { provider: 'tmdb', external_id: String(d.id), raw },
  }
}

export async function buscar(fetcher: Fetcher, token: string | undefined, tipo: Tipo, consulta: string) {
  const ruta = tipo === 'film' ? 'movie' : 'tv'
  const url = `${API}/search/${ruta}?${new URLSearchParams({ query: consulta, language: 'es-ES', include_adult: 'false', page: '1' })}`
  const datos = await pedirJson<{ results?: ResultadoBusqueda[] }>(fetcher, url, { headers: cabeceras(token) })
  return (datos.results ?? [])
    .slice(0, 20)
    .map((r) => normalizarBusqueda(tipo, r))
    .filter((c): c is Candidato => c !== null)
}

export async function importar(fetcher: Fetcher, token: string | undefined, tipo: Tipo, id: string) {
  if (!/^\d{1,10}$/.test(id)) throw new ErrorPublico('Identificador inválido.', 400)
  const ruta = tipo === 'film' ? 'movie' : 'tv'
  const extra: Record<string, string> = tipo === 'film' ? { append_to_response: 'credits' } : {}
  const url = `${API}/${ruta}/${id}?${new URLSearchParams({ language: 'es-ES', ...extra })}`
  const detalle = await pedirJson<DetalleTmdb>(fetcher, url, { headers: cabeceras(token) })
  return normalizarDetalle(tipo, detalle)
}
