export const TIPOS = ['film', 'series', 'game', 'anime', 'album', 'song'] as const
export type Tipo = (typeof TIPOS)[number]

export const PROVEEDORES = ['tmdb', 'igdb', 'anilist', 'musicbrainz'] as const
export type Proveedor = (typeof PROVEEDORES)[number]

/** Qué proveedor atiende cada categoría. */
export const PROVEEDOR_DE: Record<Tipo, Proveedor> = {
  film: 'tmdb',
  series: 'tmdb',
  game: 'igdb',
  anime: 'anilist',
  album: 'musicbrainz',
  song: 'musicbrainz',
}

/** Resultado de búsqueda, igual al tipo `Candidato` del frontend. */
export type Candidato = {
  provider: Proveedor
  externalId: string
  type: Tipo
  title: string
  subtitle: string | null
  year: string | null
  coverUrl: string | null
}

export type Credito = { name: string; role: string }

/** Formato que espera public.create_media_item(jsonb). */
export type ItemPayload = {
  type: Tipo
  title: string
  original_title: string | null
  release_date: string | null
  cover_url: string | null
  synopsis: string | null
  details: Record<string, unknown>
  creators: Credito[]
  genres: string[]
  external: { provider: Proveedor; external_id: string; raw: unknown }
}

/** Error con mensaje seguro para el usuario y código HTTP. */
export class ErrorPublico extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export type Fetcher = typeof fetch
