-- LD-List · Crear un ítem del catálogo de forma atómica
--
-- public.create_media_item(p_item jsonb) inserta en una sola transacción el
-- media_item, su tabla de detalle, créditos, géneros y la referencia externa.
-- La usan el formulario manual y la Edge Function `metadata` al importar.
--
-- Es security invoker: corre con los permisos y el RLS de quien la llama, así
-- que created_by queda como el usuario actual y no puede tocar nada ajeno.
-- Si ya existe la referencia externa (provider, external_id), devuelve ese
-- ítem sin duplicarlo.
--
-- Formato:
-- {
--   "type": "film", "title": "...", "original_title": "...", "release_date": "2014-11-07",
--   "cover_url": "https://...", "synopsis": "...",
--   "details":  { ...columnas de la tabla de detalle... },
--   "creators": [ { "name": "...", "role": "director" } ],
--   "genres":   [ "Ciencia ficción" ],
--   "external": { "provider": "tmdb", "external_id": "157336", "raw": { ... } }
-- }

-- Lanza 22023 si el objeto tiene claves fuera de la lista permitida.
create function private.assert_keys(p_object jsonb, p_allowed text[], p_context text) returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
    v_key text;
begin
    if p_object is null or jsonb_typeof(p_object) <> 'object' then
        raise exception '% debe ser un objeto', p_context using errcode = '22023';
    end if;

    select k into v_key
      from jsonb_object_keys(p_object) as k
     where k <> all (p_allowed)
     limit 1;

    if v_key is not null then
        raise exception 'Campo no permitido en %: %', p_context, v_key using errcode = '22023';
    end if;
end $$;

revoke all on function private.assert_keys(jsonb, text[], text) from public;
grant execute on function private.assert_keys(jsonb, text[], text) to authenticated;

create function public.create_media_item(p_item jsonb) returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_type        public.media_type;
    v_details     jsonb;
    v_creators    jsonb;
    v_genres      jsonb;
    v_external    jsonb;
    v_provider    public.external_provider;
    v_external_id text;
    v_id          bigint;
    v_creator     jsonb;
    v_creator_id  bigint;
    v_genre_name  text;
    v_genre_id    smallint;
    v_position    smallint := 0;
begin
    perform private.assert_keys(
        p_item,
        array['type', 'title', 'original_title', 'release_date', 'cover_url', 'synopsis',
              'details', 'creators', 'genres', 'external'],
        'el ítem');

    begin
        v_type := (p_item ->> 'type')::public.media_type;
    exception when invalid_text_representation then
        v_type := null;
    end;
    if v_type is null then
        raise exception 'Tipo de contenido inválido' using errcode = '22023';
    end if;

    v_details := coalesce(p_item -> 'details', '{}'::jsonb);
    v_creators := coalesce(p_item -> 'creators', '[]'::jsonb);
    v_genres := coalesce(p_item -> 'genres', '[]'::jsonb);
    v_external := p_item -> 'external';

    if jsonb_typeof(v_creators) <> 'array' or jsonb_array_length(v_creators) > 50 then
        raise exception 'creators debe ser una lista de hasta 50 elementos' using errcode = '22023';
    end if;
    if jsonb_typeof(v_genres) <> 'array' or jsonb_array_length(v_genres) > 20 then
        raise exception 'genres debe ser una lista de hasta 20 elementos' using errcode = '22023';
    end if;

    -- Referencia externa: si ya está en el catálogo, no se duplica.
    if v_external is not null and v_external <> 'null'::jsonb then
        perform private.assert_keys(v_external, array['provider', 'external_id', 'raw'], 'external');
        begin
            v_provider := (v_external ->> 'provider')::public.external_provider;
        exception when invalid_text_representation then
            v_provider := null;
        end;
        v_external_id := v_external ->> 'external_id';
        if v_provider is null or v_external_id is null then
            raise exception 'external requiere provider y external_id válidos' using errcode = '22023';
        end if;

        select r.media_item_id into v_id
          from public.external_ref r
         where r.provider = v_provider
           and r.external_id = v_external_id;
        if v_id is not null then
            return v_id;
        end if;
    end if;

    insert into public.media_item (type, title, original_title, release_date, cover_url, synopsis)
    values (
        v_type,
        btrim(p_item ->> 'title'),
        nullif(btrim(p_item ->> 'original_title'), ''),
        (p_item ->> 'release_date')::date,
        nullif(btrim(p_item ->> 'cover_url'), ''),
        nullif(btrim(p_item ->> 'synopsis'), '')
    )
    returning id into v_id;

    case v_type
    when 'film' then
        perform private.assert_keys(v_details, array['runtime_minutes'], 'details');
        insert into public.film (id, runtime_minutes)
        values (v_id, (v_details ->> 'runtime_minutes')::smallint);
    when 'series' then
        perform private.assert_keys(v_details, array['season_count', 'episode_count', 'end_date'], 'details');
        insert into public.series (id, season_count, episode_count, end_date)
        values (v_id, (v_details ->> 'season_count')::smallint,
                (v_details ->> 'episode_count')::smallint, (v_details ->> 'end_date')::date);
    when 'game' then
        perform private.assert_keys(v_details, array['platforms'], 'details');
        if v_details ? 'platforms' and (
               jsonb_typeof(v_details -> 'platforms') <> 'array'
               or exists (select 1
                            from jsonb_array_elements(v_details -> 'platforms') as p
                           where jsonb_typeof(p) <> 'string' or char_length(p #>> '{}') not between 1 and 50)) then
            raise exception 'platforms debe ser una lista de textos de 1 a 50 caracteres' using errcode = '22023';
        end if;
        insert into public.game (id, platforms)
        values (v_id, coalesce(
            (select array_agg(btrim(p)) from jsonb_array_elements_text(v_details -> 'platforms') as p),
            '{}'));
    when 'anime' then
        perform private.assert_keys(v_details, array['format', 'episode_count', 'end_date'], 'details');
        insert into public.anime (id, format, episode_count, end_date)
        values (v_id, (v_details ->> 'format')::public.anime_format,
                (v_details ->> 'episode_count')::smallint, (v_details ->> 'end_date')::date);
    when 'album' then
        perform private.assert_keys(v_details, array['kind', 'track_count'], 'details');
        insert into public.album (id, kind, track_count)
        values (v_id, coalesce((v_details ->> 'kind')::public.album_kind, 'album'),
                (v_details ->> 'track_count')::smallint);
    when 'song' then
        perform private.assert_keys(v_details, array['duration_seconds', 'album_id', 'track_number'], 'details');
        insert into public.song (id, duration_seconds, album_id, track_number)
        values (v_id, (v_details ->> 'duration_seconds')::integer,
                (v_details ->> 'album_id')::bigint, (v_details ->> 'track_number')::smallint);
    end case;

    -- Créditos: reusa un creador existente si el nombre coincide sin
    -- distinguir mayúsculas; si no, lo crea.
    for v_creator in select c from jsonb_array_elements(v_creators) as c loop
        perform private.assert_keys(v_creator, array['name', 'role'], 'creators');

        select cr.id into v_creator_id
          from public.creator cr
         where lower(cr.name) = lower(btrim(v_creator ->> 'name'))
         order by cr.id
         limit 1;

        if v_creator_id is null then
            insert into public.creator (name)
            values (btrim(v_creator ->> 'name'))
            returning id into v_creator_id;
        end if;

        insert into public.media_credit (media_item_id, creator_id, role, position)
        values (v_id, v_creator_id, (v_creator ->> 'role')::public.credit_role, v_position)
        on conflict do nothing;

        v_position := v_position + 1;
        v_creator_id := null;
    end loop;

    if exists (select 1 from jsonb_array_elements(v_genres) as g where jsonb_typeof(g) <> 'string') then
        raise exception 'genres debe contener solo textos' using errcode = '22023';
    end if;

    for v_genre_name in select btrim(g) from jsonb_array_elements_text(v_genres) as g loop
        insert into public.genre (name) values (v_genre_name) on conflict (name) do nothing;
        select ge.id into v_genre_id from public.genre ge where ge.name = v_genre_name;
        insert into public.media_genre (media_item_id, genre_id)
        values (v_id, v_genre_id)
        on conflict do nothing;
    end loop;

    if v_provider is not null then
        insert into public.external_ref (media_item_id, provider, external_id, raw)
        values (v_id, v_provider, v_external_id, v_external -> 'raw');
    end if;

    return v_id;
end $$;

revoke all on function public.create_media_item(jsonb) from public, anon;
grant execute on function public.create_media_item(jsonb) to authenticated;
