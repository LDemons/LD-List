-- LD-List · Reordenar un grupo de empate
--
-- Recibe los ids de TODAS las entradas del usuario que comparten una nota, en
-- el orden deseado, y les asigna tie_order = 1..n en una sola transacción.
-- Es la única forma de cambiar tie_order desde la app (no hay grant de update
-- sobre esa columna), por eso es security definer y valida todo por su cuenta.
--
-- Uso desde el cliente: supabase.rpc('reorder_tie_group', { p_entry_ids: [12, 7, 31] })

create function public.reorder_tie_group(p_entry_ids bigint[]) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user       uuid := (select auth.uid());
    v_count      integer := cardinality(p_entry_ids);
    v_found      integer;
    v_min_score  public.rating;
    v_max_score  public.rating;
    v_group_size integer;
begin
    if v_user is null then
        raise exception 'Se requiere una sesión iniciada' using errcode = '42501';
    end if;

    if v_count is null or v_count < 2 or v_count > 1000 then
        raise exception 'Se esperan entre 2 y 1000 entradas' using errcode = '22023';
    end if;

    if array_position(p_entry_ids, null) is not null
       or v_count <> (select count(distinct x) from unnest(p_entry_ids) as x) then
        raise exception 'La lista contiene ids nulos o repetidos' using errcode = '22023';
    end if;

    -- Bloquea las filas para que nadie cambie el grupo mientras se reordena.
    select count(*), min(e.score), max(e.score)
      into v_found, v_min_score, v_max_score
      from (select e.score
              from public.entry e
             where e.id = any (p_entry_ids)
               and e.user_id = v_user
               for update) as e;

    if v_found <> v_count or v_min_score is null or v_min_score <> v_max_score then
        raise exception 'Las entradas deben ser tuyas, tener nota y compartir la misma nota'
            using errcode = '22023';
    end if;

    select count(*) into v_group_size
      from public.entry e
     where e.user_id = v_user
       and e.score = v_min_score;

    if v_group_size <> v_count then
        raise exception 'Se debe enviar el grupo de empate completo (% entradas con nota %)',
            v_group_size, v_min_score
            using errcode = '22023';
    end if;

    update public.entry e
       set tie_order = o.position
      from unnest(p_entry_ids) with ordinality as o (entry_id, position)
     where e.id = o.entry_id;
end $$;

revoke all on function public.reorder_tie_group(bigint[]) from public, anon;
grant execute on function public.reorder_tie_group(bigint[]) to authenticated;
