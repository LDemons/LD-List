-- LD-List · La vista ranking expone también portada y fecha de estreno,
-- para pintar el ranking sin una segunda consulta. Las columnas nuevas van al
-- final (requisito de create or replace view); se mantienen los grants y
-- security_invoker.

create or replace view public.ranking
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
                          order by e.score desc, e.tie_order) as category_position,
       m.cover_url,
       m.release_date
  from public.entry e
  join public.media_item m on m.id = e.media_item_id
 where e.score is not null;
