-- LD-List · Rate limit de la Data API (PostgREST)
--
-- PostgREST ejecuta private.check_request() antes de cada petición
-- (db_pre_request). Las escrituras (POST, PATCH, PUT, DELETE) se limitan a
-- 60 por minuto por usuario, o por IP si no hay sesión. Las lecturas no se
-- pueden contar aquí porque se ejecutan en transacciones de solo lectura.
--
-- Otros límites del proyecto:
--   - Auth (login, tokens): supabase/config.toml, sección [auth.rate_limit].
--   - Edge Functions: cada función aplica su propio límite.

create table private.rate_limit (
    key          text        not null,
    requested_at timestamptz not null default now()
);

create index rate_limit_key_requested_at_idx on private.rate_limit (key, requested_at);

-- Sin grants: solo accesible desde la función security definer.
revoke all on private.rate_limit from public, anon, authenticated;

create function private.check_request() returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    max_requests constant integer  := 60;
    time_window  constant interval := interval '1 minute';
    req_method   text := current_setting('request.method', true);
    req_key      text;
    req_count    integer;
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

    delete from private.rate_limit
     where key = req_key
       and requested_at < now() - time_window;

    select count(*) into req_count
      from private.rate_limit
     where key = req_key;

    if req_count >= max_requests then
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

    insert into private.rate_limit (key) values (req_key);
end $$;

revoke all on function private.check_request() from public;
grant usage on schema private to anon;
grant execute on function private.check_request() to anon, authenticated;

alter role authenticator set pgrst.db_pre_request = 'private.check_request';
notify pgrst, 'reload config';
