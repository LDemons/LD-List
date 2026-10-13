-- LD-List · Esquema inicial
--
-- Modelo:
--   media_item            catálogo común a todas las categorías
--   film, series, game,   detalle específico por categoría (herencia por tabla:
--   anime, album, song    PK = FK a media_item, y el tipo queda forzado por FK compuesta)
--   creator/media_credit  personas y empresas (director, estudio, artista...)
--   genre/media_genre     géneros
--   external_ref          vínculo con TMDB / IGDB / AniList / MusicBrainz
--   entry                 relación de cada usuario con un ítem: estado, nota y desempate
--   ranking (vista)       posición global y por categoría
--
-- Los usuarios viven en auth.users (Supabase Auth). Seguridad (RLS y permisos)
-- en la migración siguiente.

create extension if not exists pg_trgm with schema extensions;

-- ───────────────────────────── Tipos ─────────────────────────────

-- Nota de 1.0 a 10.0 con un decimal. El cliente rechaza más decimales antes de
-- llegar aquí, porque numeric(3,1) redondearía en silencio (9.85 -> 9.9).
create domain public.rating as numeric(3, 1)
    check (value between 1.0 and 10.0);

create type public.media_type as enum ('film', 'series', 'game', 'anime', 'album', 'song');
create type public.entry_status as enum ('planned', 'in_progress', 'completed', 'on_hold', 'dropped');
create type public.credit_role as enum (
    'director', 'writer', 'creator', 'developer', 'publisher', 'studio', 'artist', 'composer'
);
create type public.external_provider as enum ('tmdb', 'igdb', 'anilist', 'musicbrainz');
create type public.anime_format as enum ('tv', 'movie', 'ova', 'ona', 'special');
create type public.album_kind as enum ('album', 'ep', 'single', 'compilation', 'live');

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end $$;

-- ──────────────────────────── Catálogo ───────────────────────────

create table public.media_item (
    id             bigint generated always as identity primary key,
    type           public.media_type not null,
    title          text        not null check (char_length(btrim(title)) between 1 and 300),
    original_title text        check (char_length(original_title) <= 300),
    release_date   date        check (release_date between '1800-01-01' and '2200-12-31'),
    -- Solo https: evita esquemas como javascript: o data: al mostrar la imagen.
    cover_url      text        check (char_length(cover_url) <= 2048 and cover_url ~ '^https://'),
    synopsis       text        check (char_length(synopsis) <= 5000),
    -- Quién lo agregó al catálogo: solo esa persona puede editarlo o borrarlo.
    created_by     uuid        default auth.uid() references auth.users (id) on delete set null,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    -- Destino de las FK compuestas (id, type) de las tablas de detalle.
    constraint media_item_id_type_key unique (id, type)
);

create index media_item_type_idx on public.media_item (type);
create index media_item_created_by_idx on public.media_item (created_by);
create index media_item_title_trgm_idx on public.media_item using gin (title extensions.gin_trgm_ops);

create trigger media_item_set_updated_at
    before update on public.media_item
    for each row execute function public.set_updated_at();

-- Tablas de detalle. Cada una fija su columna media_type con default + check y
-- la incluye en la FK, así un ítem 'game' no puede tener fila en film, y el
-- tipo de un media_item no puede cambiar mientras tenga detalle.

create table public.film (
    id              bigint            primary key,
    media_type      public.media_type not null default 'film' check (media_type = 'film'),
    runtime_minutes smallint          check (runtime_minutes between 1 and 2000),
    foreign key (id, media_type) references public.media_item (id, type) on delete cascade
);

create table public.series (
    id            bigint            primary key,
    media_type    public.media_type not null default 'series' check (media_type = 'series'),
    season_count  smallint          check (season_count between 1 and 500),
    episode_count smallint          check (episode_count between 1 and 20000),
    end_date      date              check (end_date between '1800-01-01' and '2200-12-31'),
    foreign key (id, media_type) references public.media_item (id, type) on delete cascade
);

create table public.game (
    id         bigint            primary key,
    media_type public.media_type not null default 'game' check (media_type = 'game'),
    platforms  text[]            not null default '{}'
        check (cardinality(platforms) <= 30 and array_position(platforms, null) is null),
    foreign key (id, media_type) references public.media_item (id, type) on delete cascade
);

create table public.anime (
    id            bigint              primary key,
    media_type    public.media_type   not null default 'anime' check (media_type = 'anime'),
    format        public.anime_format,
    episode_count smallint            check (episode_count between 1 and 20000),
    end_date      date                check (end_date between '1800-01-01' and '2200-12-31'),
    foreign key (id, media_type) references public.media_item (id, type) on delete cascade
);

create table public.album (
    id          bigint            primary key,
    media_type  public.media_type not null default 'album' check (media_type = 'album'),
    kind        public.album_kind not null default 'album',
    track_count smallint          check (track_count between 1 and 1000),
    foreign key (id, media_type) references public.media_item (id, type) on delete cascade
);

create table public.song (
    id               bigint            primary key,
    media_type       public.media_type not null default 'song' check (media_type = 'song'),
    duration_seconds integer           check (duration_seconds between 1 and 86400),
    -- Apunta a album (no a media_item) para garantizar que es un álbum.
    album_id         bigint            references public.album (id) on delete set null,
    track_number     smallint          check (track_number between 1 and 1000),
    foreign key (id, media_type) references public.media_item (id, type) on delete cascade
);

create index song_album_id_idx on public.song (album_id);

-- Personas y empresas. Sin unique en el nombre: puede haber homónimos.
create table public.creator (
    id         bigint generated always as identity primary key,
    name       text        not null check (char_length(btrim(name)) between 1 and 200),
    created_by uuid        default auth.uid() references auth.users (id) on delete set null,
    created_at timestamptz not null default now()
);

create index creator_name_trgm_idx on public.creator using gin (name extensions.gin_trgm_ops);
create index creator_created_by_idx on public.creator (created_by);

create table public.media_credit (
    media_item_id bigint             not null references public.media_item (id) on delete cascade,
    creator_id    bigint             not null references public.creator (id) on delete cascade,
    role          public.credit_role not null,
    position      smallint           not null default 0 check (position between 0 and 1000),
    primary key (media_item_id, creator_id, role)
);

create index media_credit_creator_id_idx on public.media_credit (creator_id);

create table public.genre (
    id   smallint generated always as identity primary key,
    name text not null unique check (char_length(btrim(name)) between 1 and 50)
);

create table public.media_genre (
    media_item_id bigint   not null references public.media_item (id) on delete cascade,
    genre_id      smallint not null references public.genre (id) on delete cascade,
    primary key (media_item_id, genre_id)
);

create index media_genre_genre_id_idx on public.media_genre (genre_id);

create table public.external_ref (
    media_item_id bigint                   not null references public.media_item (id) on delete cascade,
    provider      public.external_provider not null,
    external_id   text                     not null check (char_length(external_id) between 1 and 100),
    -- Respuesta cruda del proveedor, para re-procesar sin volver a pedirla.
    raw           jsonb                    check (pg_column_size(raw) <= 1048576),
    fetched_at    timestamptz              not null default now(),
    primary key (provider, external_id),
    constraint external_ref_media_item_provider_key unique (media_item_id, provider)
);

-- ───────────────────────── Entradas y notas ──────────────────────

-- Una fila por (usuario, ítem). Sin historial: volver a calificar sobrescribe.
--
-- Desempate manual: tie_order ordena las entradas con la misma nota dentro de
-- un mismo usuario. Es un único orden total, así que el ranking por categoría
-- es siempre un subconjunto coherente del global. Puede tener huecos; solo
-- importa el orden relativo. Se cambia solo con public.reorder_tie_group().
create table public.entry (
    id            bigint generated always as identity primary key,
    user_id       uuid                not null default auth.uid()
                                      references auth.users (id) on delete cascade,
    media_item_id bigint              not null references public.media_item (id) on delete restrict,
    status        public.entry_status not null default 'planned',
    score         public.rating,
    tie_order     integer,
    started_on    date                check (started_on between '1900-01-01' and '2200-12-31'),
    finished_on   date                check (finished_on between '1900-01-01' and '2200-12-31'),
    notes         text                check (char_length(notes) <= 5000),
    rated_at      timestamptz,
    created_at    timestamptz         not null default now(),
    updated_at    timestamptz         not null default now(),
    constraint entry_user_media_item_key unique (user_id, media_item_id),
    constraint entry_score_tie_order_check check ((score is null) = (tie_order is null)),
    constraint entry_score_rated_at_check check ((score is null) = (rated_at is null)),
    constraint entry_dates_check check (finished_on >= started_on),
    -- Diferida para poder reordenar un grupo entero (intercambiar posiciones)
    -- dentro de una transacción sin choques intermedios.
    constraint entry_tie_order_key unique (user_id, score, tie_order)
        deferrable initially deferred
);

create index entry_media_item_id_idx on public.entry (media_item_id);
create index entry_ranking_idx on public.entry (user_id, score desc, tie_order)
    where score is not null;

create trigger entry_set_updated_at
    before update on public.entry
    for each row execute function public.set_updated_at();

-- Al poner o cambiar la nota, la entrada pasa al final de su grupo de empate
-- y se actualiza rated_at. Al quitarla, se limpian ambos. Un update que solo
-- toca tie_order (reordenar) no dispara este trigger.
create function public.entry_assign_tie_order() returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.score is null then
        new.tie_order := null;
        new.rated_at := null;
    elsif tg_op = 'INSERT' or new.score is distinct from old.score then
        select coalesce(max(e.tie_order), 0) + 1
          into new.tie_order
          from public.entry e
         where e.user_id = new.user_id
           and e.score = new.score;
        new.rated_at := now();
    end if;
    return new;
end $$;

create trigger entry_assign_tie_order
    before insert or update of score on public.entry
    for each row execute function public.entry_assign_tie_order();

-- ──────────────────────────── Rankings ───────────────────────────

-- security_invoker: la vista respeta el RLS de entry (cada usuario ve lo suyo).
-- row_number y no rank: con desempate manual no hay posiciones repetidas.
-- Filtrar por type sobre la vista conserva global_position (se calcula antes).
create view public.ranking
with (security_invoker = true) as
select e.user_id,
       e.id      as entry_id,
       m.id      as media_item_id,
       m.type,
       m.title,
       e.score,
       e.tie_order,
       row_number() over (partition by e.user_id
                          order by e.score desc, e.tie_order) as global_position,
       row_number() over (partition by e.user_id, m.type
                          order by e.score desc, e.tie_order) as category_position
  from public.entry e
  join public.media_item m on m.id = e.media_item_id
 where e.score is not null;
