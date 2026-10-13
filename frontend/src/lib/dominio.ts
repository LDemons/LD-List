import {
  Clapperboard,
  Disc3,
  Gamepad2,
  Music,
  Sparkles,
  Tv,
  type LucideIcon,
} from 'lucide-react'

import { Constants, type Database } from '@/lib/database.types'

type Enums = Database['public']['Enums']

export type MediaType = Enums['media_type']
export type EntryStatus = Enums['entry_status']
export type CreditRole = Enums['credit_role']
export type AnimeFormat = Enums['anime_format']
export type AlbumKind = Enums['album_kind']
export type ExternalProvider = Enums['external_provider']

export const MEDIA_TYPES = Constants.public.Enums.media_type
export const ENTRY_STATUSES = Constants.public.Enums.entry_status
export const CREDIT_ROLES = Constants.public.Enums.credit_role
export const ANIME_FORMATS = Constants.public.Enums.anime_format
export const ALBUM_KINDS = Constants.public.Enums.album_kind

export const TIPO: Record<MediaType, { singular: string; plural: string; icono: LucideIcon }> = {
  film: { singular: 'Película', plural: 'Películas', icono: Clapperboard },
  series: { singular: 'Serie', plural: 'Series', icono: Tv },
  game: { singular: 'Videojuego', plural: 'Videojuegos', icono: Gamepad2 },
  anime: { singular: 'Anime', plural: 'Anime', icono: Sparkles },
  album: { singular: 'Álbum', plural: 'Álbumes', icono: Disc3 },
  song: { singular: 'Canción', plural: 'Canciones', icono: Music },
}

export const ESTADO: Record<EntryStatus, string> = {
  planned: 'Pendiente',
  in_progress: 'En curso',
  completed: 'Terminado',
  on_hold: 'En pausa',
  dropped: 'Abandonado',
}

export const ROL: Record<CreditRole, string> = {
  director: 'Dirección',
  writer: 'Guion',
  creator: 'Creación',
  developer: 'Desarrollo',
  publisher: 'Distribución',
  studio: 'Estudio',
  artist: 'Artista',
  composer: 'Música',
}

export const FORMATO_ANIME: Record<AnimeFormat, string> = {
  tv: 'TV',
  movie: 'Película',
  ova: 'OVA',
  ona: 'ONA',
  special: 'Especial',
}

export const TIPO_ALBUM: Record<AlbumKind, string> = {
  album: 'Álbum',
  ep: 'EP',
  single: 'Sencillo',
  compilation: 'Recopilatorio',
  live: 'En vivo',
}

export const PROVEEDOR: Record<ExternalProvider, string> = {
  tmdb: 'TMDB',
  igdb: 'IGDB',
  anilist: 'AniList',
  musicbrainz: 'MusicBrainz',
}

/** Formato de nota siempre con un decimal: 9 -> "9.0". */
export function formatearNota(nota: number | null | undefined): string {
  return nota == null ? '—' : nota.toFixed(1)
}

export function anio(fecha: string | null | undefined): string | null {
  return fecha ? fecha.slice(0, 4) : null
}
