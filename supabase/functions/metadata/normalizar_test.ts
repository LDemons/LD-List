// Tests de los normalizadores con respuestas de ejemplo (sin red).
// Ejecutar: deno test supabase/functions/metadata

import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@1'

import { fecha, lista, sinHtml, texto, urlHttps } from './limpiar.ts'
import * as anilist from './providers/anilist.ts'
import * as igdb from './providers/igdb.ts'
import * as musicbrainz from './providers/musicbrainz.ts'
import * as tmdb from './providers/tmdb.ts'
import { ErrorPublico } from './tipos.ts'

Deno.test('limpiar: fechas parciales y fuera de rango', () => {
  assertEquals(fecha('1997'), '1997-01-01')
  assertEquals(fecha('1997-05'), '1997-05-01')
  assertEquals(fecha('2014-11-07'), '2014-11-07')
  assertEquals(fecha(''), null)
  assertEquals(fecha('1500-01-01'), null)
  assertEquals(fecha('2020-13-45'), null)
})

Deno.test('limpiar: textos, listas y URLs', () => {
  assertEquals(texto('  hola   mundo ', 300), 'hola mundo')
  assertEquals(texto('x'.repeat(400), 300)?.length, 300)
  assertEquals(texto(42, 10), null)
  assertEquals(lista(['Acción', 'acción', '', 'Drama', null], 20, 50), ['Acción', 'Drama'])
  assertEquals(lista(Array(30).fill(0).map((_, i) => `g${i}`), 20, 50).length, 20)
  assertEquals(urlHttps('http://x.com/a.jpg'), null)
  assertEquals(urlHttps('javascript:alert(1)'), null)
  assertEquals(sinHtml('Uno<br>dos <i>tres</i> &amp; cuatro', 100), 'Uno\ndos tres & cuatro')
})

Deno.test('tmdb: película', () => {
  const c = tmdb.normalizarBusqueda('film', {
    id: 157336,
    title: 'Interstellar',
    original_title: 'Interstellar',
    release_date: '2014-11-05',
    poster_path: '/abc.jpg',
  })
  assertEquals(c, {
    provider: 'tmdb',
    externalId: '157336',
    type: 'film',
    title: 'Interstellar',
    subtitle: null,
    year: '2014',
    coverUrl: 'https://image.tmdb.org/t/p/w500/abc.jpg',
  })

  const p = tmdb.normalizarDetalle('film', {
    id: 157336,
    title: 'Interstellar',
    original_title: 'Interstellar',
    release_date: '2014-11-05',
    runtime: 169,
    overview: 'Viaje espacial.',
    poster_path: '/abc.jpg',
    genres: [{ name: 'Ciencia ficción' }, { name: 'Drama' }],
    credits: { crew: [{ job: 'Director', name: 'Christopher Nolan' }, { job: 'Writer', name: 'Jonathan Nolan' }] },
  })
  assertEquals(p.details, { runtime_minutes: 169 })
  assertEquals(p.creators, [{ name: 'Christopher Nolan', role: 'director' }])
  assertEquals(p.original_title, null)
  assertEquals((p.external.raw as Record<string, unknown>).credits, undefined)
})

Deno.test('tmdb: serie y poster con ruta sospechosa', () => {
  const p = tmdb.normalizarDetalle('series', {
    id: 1,
    name: 'Dark',
    original_name: 'Dark',
    first_air_date: '2017-12-01',
    last_air_date: '2020-06-27',
    in_production: false,
    number_of_seasons: 3,
    number_of_episodes: 26,
    poster_path: '/../../evil',
    created_by: [{ name: 'Baran bo Odar' }],
  })
  assertEquals(p.details, { season_count: 3, episode_count: 26, end_date: '2020-06-27' })
  assertEquals(p.cover_url, null)
  assertEquals(p.creators, [{ name: 'Baran bo Odar', role: 'creator' }])
})

Deno.test('igdb: juego con desarrolladora y distribuidora', () => {
  const p = igdb.normalizarDetalle({
    id: 1942,
    name: 'The Witcher 3: Wild Hunt',
    first_release_date: 1431993600,
    summary: 'RPG.',
    cover: { image_id: 'co1wyy' },
    platforms: [{ name: 'PC (Microsoft Windows)', abbreviation: 'PC' }, { name: 'PlayStation 4', abbreviation: 'PS4' }],
    genres: [{ name: 'Role-playing (RPG)' }],
    involved_companies: [
      { developer: true, publisher: true, company: { name: 'CD Projekt RED' } },
      { developer: false, publisher: true, company: { name: 'Bandai Namco' } },
    ],
  })
  assertEquals(p.release_date, '2015-05-19')
  assertEquals(p.cover_url, 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg')
  assertEquals(p.details, { platforms: ['PC (Microsoft Windows)', 'PlayStation 4'] })
  assertEquals(p.creators, [
    { name: 'CD Projekt RED', role: 'developer' },
    { name: 'Bandai Namco', role: 'publisher' },
  ])
})

Deno.test('igdb: escapa la consulta Apicalypse', () => {
  assertEquals(igdb.escaparApicalypse('a"; fields *; where id = 1'), 'a\\"  fields *  where id = 1')
})

Deno.test('anilist: anime', () => {
  const p = anilist.normalizarDetalle({
    id: 154587,
    title: { romaji: 'Sousou no Frieren', english: "Frieren: Beyond Journey's End", native: '葬送のフリーレン' },
    startDate: { year: 2023, month: 9, day: 29 },
    endDate: { year: 2024, month: 3, day: 22 },
    format: 'TV',
    episodes: 28,
    status: 'FINISHED',
    description: 'Una maga elfa.<br><br>(Fuente: X)',
    genres: ['Adventure', 'Drama'],
    coverImage: { extraLarge: 'https://s4.anilist.co/file/x.jpg' },
    studios: { nodes: [{ name: 'Madhouse' }] },
  })
  assertEquals(p.title, "Frieren: Beyond Journey's End")
  assertEquals(p.original_title, '葬送のフリーレン')
  assertEquals(p.details, { format: 'tv', episode_count: 28, end_date: '2024-03-22' })
  assertEquals(p.synopsis, 'Una maga elfa.\n\n(Fuente: X)')
  assertEquals(p.creators, [{ name: 'Madhouse', role: 'studio' }])
})

Deno.test('musicbrainz: álbum y canción', () => {
  const rg = {
    id: '48117b82-8d3d-3e3c-9b29-0e9a6b6b6f0e',
    title: 'Discovery',
    'first-release-date': '2001-03-12',
    'primary-type': 'Album',
    'artist-credit': [{ name: 'Daft Punk' }],
    genres: [{ name: 'french house' }],
  }
  const album = musicbrainz.normalizarAlbum(rg)
  assertEquals(album.details, { kind: 'album', track_count: null })
  assertEquals(album.cover_url, `https://coverartarchive.org/release-group/${rg.id}/front-500`)
  assertEquals(musicbrainz.tipoAlbum({ ...rg, 'secondary-types': ['Live'] }), 'live')

  const cancion = musicbrainz.normalizarCancion(
    {
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      title: 'One More Time',
      length: 320357,
      'artist-credit': [{ name: 'Daft Punk' }],
      releases: [{ id: 'x', title: 'Discovery', 'release-group': { id: rg.id } }],
    },
    7,
  )
  assertEquals(cancion.details, { duration_seconds: 320, album_id: 7 })
  assertEquals(cancion.creators, [{ name: 'Daft Punk', role: 'artist' }])
})

Deno.test('musicbrainz: escapa Lucene', () => {
  assertEquals(musicbrainz.escaparLucene('AC/DC: "Back" (in) black!'), 'AC\\/DC\\: \\"Back\\" \\(in\\) black\\!')
})

Deno.test('ids inválidos se rechazan antes de llamar al proveedor', async () => {
  let llamado = false
  const fetcher = (() => {
    llamado = true
    return Promise.resolve(new Response('{}'))
  }) as typeof fetch
  for (const intento of [
    () => tmdb.importar(fetcher, 't', 'film', '1; DROP'),
    () => igdb.importar(fetcher, { clientId: 'a', clientSecret: 'b' }, '1 | 2'),
    () => anilist.importar(fetcher, 'abc'),
    () => musicbrainz.importarAlbum(fetcher, '../x'),
  ]) {
    try {
      await intento()
      assert(false, 'debió fallar')
    } catch (e) {
      assert(e instanceof ErrorPublico && e.status === 400)
    }
  }
  assertEquals(llamado, false)
})

Deno.test('sin claves configuradas responde 503 sin llamar al proveedor', async () => {
  const fetcher = (() => Promise.reject(new Error('no debe llamarse'))) as typeof fetch
  try {
    await tmdb.buscar(fetcher, undefined, 'film', 'x')
    assert(false)
  } catch (e) {
    assert(e instanceof ErrorPublico && e.status === 503)
  }
  assertThrows(() => tmdb.normalizarDetalle('film', { id: 1 }), ErrorPublico)
})
