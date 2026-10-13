// IGDB (videojuegos). Requiere los secretos IGDB_CLIENT_ID e IGDB_CLIENT_SECRET
// (app de Twitch Developers). El token OAuth se cachea en memoria mientras la
// instancia de la función siga viva.

import { pedirJson } from '../http.ts'
import { anio, creditos, fechaUnix, lista, texto } from '../limpiar.ts'
import { ErrorPublico, type Candidato, type Fetcher, type ItemPayload } from '../tipos.ts'

const API = 'https://api.igdb.com/v4/games'
const IMAGEN = 'https://images.igdb.com/igdb/image/upload/t_cover_big'

export type Credenciales = { clientId: string | undefined; clientSecret: string | undefined }

type Juego = {
  id: number
  name?: string
  first_release_date?: number
  summary?: string
  cover?: { image_id?: string }
  platforms?: { name?: string; abbreviation?: string }[]
  genres?: { name?: string }[]
  involved_companies?: { developer?: boolean; publisher?: boolean; company?: { name?: string } }[]
}

let tokenCache: { valor: string; expira: number } | null = null

async function token(fetcher: Fetcher, c: Credenciales): Promise<string> {
  if (!c.clientId || !c.clientSecret) {
    throw new ErrorPublico('La búsqueda de videojuegos aún no está configurada.', 503)
  }
  if (tokenCache && tokenCache.expira > Date.now() + 60_000) return tokenCache.valor
  // El secreto va en el cuerpo, no en la URL, para que no termine en logs.
  const r = await pedirJson<{ access_token?: string; expires_in?: number }>(fetcher, 'https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      grant_type: 'client_credentials',
    }),
  })
  if (!r.access_token) throw new ErrorPublico('No se pudo autenticar con IGDB.', 502)
  tokenCache = { valor: r.access_token, expira: Date.now() + (r.expires_in ?? 3600) * 1000 }
  return r.access_token
}

async function consultar(fetcher: Fetcher, c: Credenciales, cuerpo: string): Promise<Juego[]> {
  return pedirJson<Juego[]>(fetcher, API, {
    method: 'POST',
    headers: {
      'Client-ID': c.clientId!,
      Authorization: `Bearer ${await token(fetcher, c)}`,
      Accept: 'application/json',
      'Content-Type': 'text/plain',
    },
    body: cuerpo,
  })
}

/** Escapa el texto para usarlo dentro de comillas en Apicalypse. */
export function escaparApicalypse(texto: string): string {
  return texto.replace(/[\\"]/g, (c) => `\\${c}`).replace(/[\r\n;]/g, ' ')
}

function portada(imageId: string | undefined): string | null {
  return imageId && /^[a-z0-9]+$/i.test(imageId) ? `${IMAGEN}/${imageId}.jpg` : null
}

export function normalizarBusqueda(j: Juego): Candidato | null {
  const titulo = texto(j.name, 300)
  if (!titulo || !Number.isInteger(j.id)) return null
  const plataformas = lista((j.platforms ?? []).map((p) => p.abbreviation ?? p.name), 4, 20)
  return {
    provider: 'igdb',
    externalId: String(j.id),
    type: 'game',
    title: titulo,
    subtitle: plataformas.length ? plataformas.join(', ') : null,
    year: anio(fechaUnix(j.first_release_date)),
    coverUrl: portada(j.cover?.image_id),
  }
}

export function normalizarDetalle(j: Juego): ItemPayload {
  const titulo = texto(j.name, 300)
  if (!titulo) throw new ErrorPublico('El elemento no tiene título.', 422)
  const empresas = j.involved_companies ?? []
  return {
    type: 'game',
    title: titulo,
    original_title: null,
    release_date: fechaUnix(j.first_release_date),
    cover_url: portada(j.cover?.image_id),
    synopsis: texto(j.summary, 5000),
    details: { platforms: lista((j.platforms ?? []).map((p) => p.name ?? p.abbreviation), 30, 50) },
    creators: [
      ...creditos(empresas.filter((e) => e.developer).map((e) => e.company?.name), 'developer', 5),
      ...creditos(empresas.filter((e) => e.publisher && !e.developer).map((e) => e.company?.name), 'publisher', 5),
    ],
    genres: lista((j.genres ?? []).map((g) => g.name), 20, 50),
    external: { provider: 'igdb', external_id: String(j.id), raw: j },
  }
}

export async function buscar(fetcher: Fetcher, c: Credenciales, consulta: string) {
  const juegos = await consultar(
    fetcher,
    c,
    `search "${escaparApicalypse(consulta)}"; fields name,first_release_date,cover.image_id,platforms.abbreviation,platforms.name; where version_parent = null; limit 20;`,
  )
  return juegos.map(normalizarBusqueda).filter((x): x is Candidato => x !== null)
}

export async function importar(fetcher: Fetcher, c: Credenciales, id: string) {
  if (!/^\d{1,10}$/.test(id)) throw new ErrorPublico('Identificador inválido.', 400)
  const juegos = await consultar(
    fetcher,
    c,
    `fields name,first_release_date,summary,cover.image_id,platforms.name,platforms.abbreviation,genres.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name; where id = ${id}; limit 1;`,
  )
  if (!juegos[0]) throw new ErrorPublico('No se encontró ese elemento en el servicio externo.', 404)
  return normalizarDetalle(juegos[0])
}
