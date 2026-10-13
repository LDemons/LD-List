-- LD-List · Seguridad: permisos mínimos y RLS
--
-- Principios:
--   - anon (sin sesión) no tiene acceso a nada.
--   - authenticated recibe solo los permisos que necesita, columna a columna
--     cuando importa (p. ej. no puede escribir user_id, created_by ni tie_order).
--   - RLS activo en todas las tablas:
--       catálogo  -> lo lee cualquier usuario con sesión; lo edita quien lo creó.
--       entry     -> cada usuario ve y toca solo lo suyo.
--   - Las funciones no se pueden ejecutar salvo permiso explícito.

-- ─────────────────────── Permisos por defecto ───────────────────────

-- Lo que se cree después en public no queda expuesto sin un grant explícito.
alter default privileges for role postgres in schema public
    revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
    revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
    revoke all on functions from anon, authenticated;
-- EXECUTE a PUBLIC es un default global de PostgreSQL: solo se quita a nivel global.
alter default privileges for role postgres
    revoke execute on functions from public;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- Esquema privado: no se expone en la Data API.
create schema private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ─────────────────────────── Catálogo ───────────────────────────

create function private.owns_media_item(p_media_item_id bigint) returns boolean
language sql
stable
set search_path = ''
as $$
    select exists (
        select 1
          from public.media_item m
         where m.id = p_media_item_id
           and m.created_by = (select auth.uid())
    );
$$;

revoke all on function private.owns_media_item(bigint) from public;
grant execute on function private.owns_media_item(bigint) to authenticated;

-- media_item
alter table public.media_item enable row level security;

grant select, delete on public.media_item to authenticated;
grant insert (type, title, original_title, release_date, cover_url, synopsis)
    on public.media_item to authenticated;
grant update (title, original_title, release_date, cover_url, synopsis)
    on public.media_item to authenticated;

create policy media_item_select on public.media_item
    for select to authenticated using (true);
create policy media_item_insert on public.media_item
    for insert to authenticated with check (created_by = (select auth.uid()));
create policy media_item_update on public.media_item
    for update to authenticated
    using (created_by = (select auth.uid()))
    with check (created_by = (select auth.uid()));
create policy media_item_delete on public.media_item
    for delete to authenticated using (created_by = (select auth.uid()));

-- Tablas que cuelgan de un media_item: las edita quien creó el ítem.
do $$
declare
    t record;
begin
    for t in
        select * from (values
            ('film', 'id'),
            ('series', 'id'),
            ('game', 'id'),
            ('anime', 'id'),
            ('album', 'id'),
            ('song', 'id'),
            ('media_credit', 'media_item_id'),
            ('media_genre', 'media_item_id'),
            ('external_ref', 'media_item_id')
        ) as v (tbl, fk)
    loop
        execute format('alter table public.%I enable row level security', t.tbl);
        execute format('grant select, insert, update, delete on public.%I to authenticated', t.tbl);
        execute format(
            'create policy %I on public.%I for select to authenticated using (true)',
            t.tbl || '_select', t.tbl);
        execute format(
            'create policy %I on public.%I for insert to authenticated
                 with check (private.owns_media_item(%I))',
            t.tbl || '_insert', t.tbl, t.fk);
        execute format(
            'create policy %I on public.%I for update to authenticated
                 using (private.owns_media_item(%I)) with check (private.owns_media_item(%I))',
            t.tbl || '_update', t.tbl, t.fk, t.fk);
        execute format(
            'create policy %I on public.%I for delete to authenticated
                 using (private.owns_media_item(%I))',
            t.tbl || '_delete', t.tbl, t.fk);
    end loop;
end $$;

-- creator
alter table public.creator enable row level security;

grant select, delete on public.creator to authenticated;
grant insert (name), update (name) on public.creator to authenticated;

create policy creator_select on public.creator
    for select to authenticated using (true);
create policy creator_insert on public.creator
    for insert to authenticated with check (created_by = (select auth.uid()));
create policy creator_update on public.creator
    for update to authenticated
    using (created_by = (select auth.uid()))
    with check (created_by = (select auth.uid()));
create policy creator_delete on public.creator
    for delete to authenticated using (created_by = (select auth.uid()));

-- genre: lista compartida; se puede leer y agregar, no editar ni borrar desde la app.
alter table public.genre enable row level security;

grant select on public.genre to authenticated;
grant insert (name) on public.genre to authenticated;

create policy genre_select on public.genre
    for select to authenticated using (true);
create policy genre_insert on public.genre
    for insert to authenticated with check (true);

-- ──────────────────────────── Entradas ───────────────────────────

alter table public.entry enable row level security;

-- user_id lo pone el default auth.uid(); tie_order y rated_at, el trigger.
grant select, delete on public.entry to authenticated;
grant insert (media_item_id, status, score, started_on, finished_on, notes)
    on public.entry to authenticated;
grant update (status, score, started_on, finished_on, notes)
    on public.entry to authenticated;

create policy entry_select on public.entry
    for select to authenticated using (user_id = (select auth.uid()));
create policy entry_insert on public.entry
    for insert to authenticated with check (user_id = (select auth.uid()));
create policy entry_update on public.entry
    for update to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));
create policy entry_delete on public.entry
    for delete to authenticated using (user_id = (select auth.uid()));

-- ──────────────────────────── Rankings ───────────────────────────

-- La vista es security_invoker: aplica el RLS de entry.
grant select on public.ranking to authenticated;
