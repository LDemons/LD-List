-- LD-List · Esquema inicial (PostgreSQL 18)
--
-- Modelo:
--   media_item            catálogo común a todas las categorías
--   film, series, game,   detalle específico por categoría (herencia por tabla:
--   anime, album, song    PK = FK a media_item, y el tipo queda forzado por FK compuesta)
--   creator/media_credit  personas y empresas (director, estudio, artista...)
--   genre/media_genre     géneros
--   external_ref          vínculo con TMDB / IGDB / AniList / MusicBrainz
--   entry                 mi relación con cada ítem: estado, nota y orden de desempate
--   ranking (vista)       posición global y por categoría

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ───────────────────────────── Tipos ─────────────────────────────

-- Nota de 1.0 a 10.0 con un decimal. La API rechaza más decimales antes de
-- llegar aquí, porque numeric(3,1) redondearía en silencio (9.85 -> 9.9).
CREATE DOMAIN rating AS numeric(3, 1)
    CHECK (VALUE BETWEEN 1.0 AND 10.0);

CREATE TYPE media_type AS ENUM ('film', 'series', 'game', 'anime', 'album', 'song');
CREATE TYPE entry_status AS ENUM ('planned', 'in_progress', 'completed', 'on_hold', 'dropped');
CREATE TYPE credit_role AS ENUM (
    'director', 'writer', 'creator', 'developer', 'publisher', 'studio', 'artist', 'composer'
);
CREATE TYPE external_provider AS ENUM ('tmdb', 'igdb', 'anilist', 'musicbrainz');
CREATE TYPE anime_format AS ENUM ('tv', 'movie', 'ova', 'ona', 'special');
CREATE TYPE album_kind AS ENUM ('album', 'ep', 'single', 'compilation', 'live');

CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END $$;

-- ──────────────────────────── Usuarios ───────────────────────────

CREATE TABLE app_user (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username      text        NOT NULL UNIQUE CHECK (btrim(username) <> ''),
    password_hash text        NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────── Catálogo ───────────────────────────

CREATE TABLE media_item (
    id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type           media_type  NOT NULL,
    title          text        NOT NULL CHECK (btrim(title) <> ''),
    original_title text,
    release_date   date,
    cover_url      text,
    synopsis       text,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    -- Destino de las FK compuestas (id, type) de las tablas de detalle.
    CONSTRAINT media_item_id_type_key UNIQUE (id, type)
);

CREATE INDEX media_item_type_idx ON media_item (type);
CREATE INDEX media_item_title_trgm_idx ON media_item USING gin (title gin_trgm_ops);

CREATE TRIGGER media_item_set_updated_at
    BEFORE UPDATE ON media_item
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Tablas de detalle. Cada una fija su columna media_type con DEFAULT + CHECK y
-- la incluye en la FK, así un ítem 'game' no puede tener fila en film, y el
-- tipo de un media_item no puede cambiar mientras tenga detalle.

CREATE TABLE film (
    id              bigint     PRIMARY KEY,
    media_type      media_type NOT NULL DEFAULT 'film' CHECK (media_type = 'film'),
    runtime_minutes smallint   CHECK (runtime_minutes > 0),
    FOREIGN KEY (id, media_type) REFERENCES media_item (id, type) ON DELETE CASCADE
);

CREATE TABLE series (
    id            bigint     PRIMARY KEY,
    media_type    media_type NOT NULL DEFAULT 'series' CHECK (media_type = 'series'),
    season_count  smallint   CHECK (season_count > 0),
    episode_count smallint   CHECK (episode_count > 0),
    end_date      date,
    FOREIGN KEY (id, media_type) REFERENCES media_item (id, type) ON DELETE CASCADE
);

CREATE TABLE game (
    id         bigint     PRIMARY KEY,
    media_type media_type NOT NULL DEFAULT 'game' CHECK (media_type = 'game'),
    platforms  text[]     NOT NULL DEFAULT '{}',
    FOREIGN KEY (id, media_type) REFERENCES media_item (id, type) ON DELETE CASCADE
);

CREATE TABLE anime (
    id            bigint       PRIMARY KEY,
    media_type    media_type   NOT NULL DEFAULT 'anime' CHECK (media_type = 'anime'),
    format        anime_format,
    episode_count smallint     CHECK (episode_count > 0),
    end_date      date,
    FOREIGN KEY (id, media_type) REFERENCES media_item (id, type) ON DELETE CASCADE
);

CREATE TABLE album (
    id          bigint     PRIMARY KEY,
    media_type  media_type NOT NULL DEFAULT 'album' CHECK (media_type = 'album'),
    kind        album_kind NOT NULL DEFAULT 'album',
    track_count smallint   CHECK (track_count > 0),
    FOREIGN KEY (id, media_type) REFERENCES media_item (id, type) ON DELETE CASCADE
);

CREATE TABLE song (
    id               bigint     PRIMARY KEY,
    media_type       media_type NOT NULL DEFAULT 'song' CHECK (media_type = 'song'),
    duration_seconds integer    CHECK (duration_seconds > 0),
    -- Apunta a album (no a media_item) para garantizar que es un álbum.
    album_id         bigint     REFERENCES album (id) ON DELETE SET NULL,
    track_number     smallint   CHECK (track_number > 0),
    FOREIGN KEY (id, media_type) REFERENCES media_item (id, type) ON DELETE CASCADE
);

CREATE INDEX song_album_id_idx ON song (album_id);

-- Personas y empresas. Sin UNIQUE en el nombre: puede haber homónimos.
CREATE TABLE creator (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       text        NOT NULL CHECK (btrim(name) <> ''),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX creator_name_trgm_idx ON creator USING gin (name gin_trgm_ops);

CREATE TABLE media_credit (
    media_item_id bigint      NOT NULL REFERENCES media_item (id) ON DELETE CASCADE,
    creator_id    bigint      NOT NULL REFERENCES creator (id) ON DELETE CASCADE,
    role          credit_role NOT NULL,
    position      smallint    NOT NULL DEFAULT 0,  -- orden en que se muestran
    PRIMARY KEY (media_item_id, creator_id, role)
);

CREATE INDEX media_credit_creator_id_idx ON media_credit (creator_id);

CREATE TABLE genre (
    id   smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL UNIQUE CHECK (btrim(name) <> '')
);

CREATE TABLE media_genre (
    media_item_id bigint   NOT NULL REFERENCES media_item (id) ON DELETE CASCADE,
    genre_id      smallint NOT NULL REFERENCES genre (id) ON DELETE CASCADE,
    PRIMARY KEY (media_item_id, genre_id)
);

CREATE INDEX media_genre_genre_id_idx ON media_genre (genre_id);

CREATE TABLE external_ref (
    media_item_id bigint            NOT NULL REFERENCES media_item (id) ON DELETE CASCADE,
    provider      external_provider NOT NULL,
    external_id   text              NOT NULL,
    raw           jsonb,  -- respuesta cruda del proveedor, para re-procesar sin volver a pedirla
    fetched_at    timestamptz       NOT NULL DEFAULT now(),
    PRIMARY KEY (provider, external_id),
    CONSTRAINT external_ref_media_item_provider_key UNIQUE (media_item_id, provider)
);

-- ───────────────────────── Entradas y notas ──────────────────────

-- Una fila por (usuario, ítem). Sin historial: volver a calificar sobrescribe.
--
-- Desempate manual: tie_order ordena las entradas con la misma nota dentro de
-- un mismo usuario. Es un único orden total, así que el ranking por categoría
-- es siempre un subconjunto coherente del global. Puede tener huecos; solo
-- importa el orden relativo.
CREATE TABLE entry (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       bigint       NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    media_item_id bigint       NOT NULL REFERENCES media_item (id) ON DELETE RESTRICT,
    status        entry_status NOT NULL DEFAULT 'planned',
    score         rating,
    tie_order     integer,
    started_on    date,
    finished_on   date,
    notes         text,
    rated_at      timestamptz,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT entry_user_media_item_key UNIQUE (user_id, media_item_id),
    CONSTRAINT entry_score_tie_order_check CHECK ((score IS NULL) = (tie_order IS NULL)),
    CONSTRAINT entry_score_rated_at_check CHECK ((score IS NULL) = (rated_at IS NULL)),
    CONSTRAINT entry_dates_check CHECK (finished_on >= started_on),
    -- Diferida para poder reordenar un grupo entero (intercambiar posiciones)
    -- dentro de una transacción sin choques intermedios.
    CONSTRAINT entry_tie_order_key UNIQUE (user_id, score, tie_order)
        DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX entry_media_item_id_idx ON entry (media_item_id);
CREATE INDEX entry_ranking_idx ON entry (user_id, score DESC, tie_order)
    WHERE score IS NOT NULL;

CREATE TRIGGER entry_set_updated_at
    BEFORE UPDATE ON entry
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Al poner o cambiar la nota, la entrada pasa al final de su grupo de empate
-- y se actualiza rated_at. Al quitarla, se limpian ambos. Un UPDATE que solo
-- toca tie_order (reordenar a mano) no dispara este trigger.
CREATE FUNCTION entry_assign_tie_order() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.score IS NULL THEN
        NEW.tie_order := NULL;
        NEW.rated_at := NULL;
    ELSIF TG_OP = 'INSERT' OR NEW.score IS DISTINCT FROM OLD.score THEN
        SELECT coalesce(max(e.tie_order), 0) + 1
          INTO NEW.tie_order
          FROM entry e
         WHERE e.user_id = NEW.user_id
           AND e.score = NEW.score;
        NEW.rated_at := now();
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER entry_assign_tie_order
    BEFORE INSERT OR UPDATE OF score ON entry
    FOR EACH ROW EXECUTE FUNCTION entry_assign_tie_order();

-- ──────────────────────────── Rankings ───────────────────────────

-- row_number y no rank: con desempate manual no hay posiciones repetidas.
-- Filtrar por type sobre la vista conserva global_position (se calcula antes).
CREATE VIEW ranking AS
SELECT e.user_id,
       e.id      AS entry_id,
       m.id      AS media_item_id,
       m.type,
       m.title,
       e.score,
       e.tie_order,
       row_number() OVER (PARTITION BY e.user_id
                          ORDER BY e.score DESC, e.tie_order) AS global_position,
       row_number() OVER (PARTITION BY e.user_id, m.type
                          ORDER BY e.score DESC, e.tie_order) AS category_position
  FROM entry e
  JOIN media_item m ON m.id = e.media_item_id
 WHERE e.score IS NOT NULL;

COMMIT;
