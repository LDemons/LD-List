-- LD-List · Rate limit compartido para la Data API y las Edge Functions
--
-- private.hit_rate_limit() concentra el conteo por ventana de tiempo.
-- La usan:
--   - private.check_request(): escrituras de la Data API (60/min).
--   - public.edge_rate_limit(): cada Edge Function la llama antes de trabajar,
--     con el JWT del usuario, por bucket:
--       search 30/min · import 15/min
--     Al excederse lanza SQLSTATE P0429, que la función traduce a HTTP 429.

-- Devuelve false si la clave ya alcanzó el máximo en la ventana; si no,
-- registra el uso y devuelve true. Sin grants: solo la llaman otras funciones
-- security definer.
create function private.hit_rate_limit(p_key text, p_max integer, p_window interval) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_count integer;
begin
    delete from private.rate_limit
     where key = p_key
       and requested_at < now() - p_window;

    select count(*) into v_count
      from private.rate_limit
     where key = p_key;

    if v_count >= p_max then
        return false;
    end if;

    insert into private.rate_limit (key) values (p_key);
    return true;
end $$;

revoke all on function private.hit_rate_limit(text, integer, interval) from public;

create or replace function private.check_request() returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    req_method text := current_setting('request.method', true);
    req_key    text;
begin
    if req_method is null or req_method in ('GET', 'HEAD', 'OPTIONS') then
        return;
    end if;

    req_key := coalesce(
        'user:' || (select auth.uid())::text,
        'ip:' || nullif(btrim(split_part(
            current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1)), ''),
        'ip:desconocida'
    );

    if not private.hit_rate_limit(req_key, 60, interval '1 minute') then
        raise sqlstate 'PGRST' using
            message = json_build_object(
                'code', 'rate_limit',
                'message', 'Demasiadas solicitudes. Intenta de nuevo en un minuto.',
                'details', null,
                'hint', null)::text,
            detail = json_build_object(
                'status', 429,
                'headers', json_build_object('Retry-After', '60'))::text;
    end if;
end $$;

create function public.edge_rate_limit(p_bucket text) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user uuid := (select auth.uid());
    v_max  integer;
begin
    if v_user is null then
        raise exception 'Se requiere una sesión iniciada' using errcode = '42501';
    end if;

    v_max := case p_bucket
                 when 'search' then 30
                 when 'import' then 15
             end;
    if v_max is null then
        raise exception 'Bucket de rate limit desconocido' using errcode = '22023';
    end if;

    if not private.hit_rate_limit('edge:' || p_bucket || ':' || v_user::text, v_max, interval '1 minute') then
        raise exception 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' using errcode = 'P0429';
    end if;
end $$;

revoke all on function public.edge_rate_limit(text) from public, anon;
grant execute on function public.edge_rate_limit(text) to authenticated;
