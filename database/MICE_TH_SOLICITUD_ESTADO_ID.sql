-- =============================================================================
-- th_solicitud_mice.estado_id → td_estados.id
-- Ejecutar en Supabase → SQL Editor. Después: Reload schema.
-- =============================================================================

alter table public.th_solicitud_mice
  add column if not exists estado_id smallint;

-- Rellenar desde estado_codigo o estado (texto)
update public.th_solicitud_mice s
set estado_id = e.id
from public.td_estados e
where s.estado_id is null
  and s.estado_codigo is not null
  and (
    lower(trim(s.estado_codigo)) = lower(trim(e.codigo))
    or lower(trim(s.estado_codigo)) = lower(trim(e.nombre))
  );

update public.th_solicitud_mice s
set estado_id = e.id
from public.td_estados e
where s.estado_id is null
  and s.estado is not null
  and lower(trim(s.estado)) = lower(trim(e.nombre));

alter table public.th_solicitud_mice
  drop constraint if exists th_solicitud_mice_estado_codigo_fk;

do $$ begin
  alter table public.th_solicitud_mice
    add constraint th_solicitud_mice_estado_id_fk
    foreign key (estado_id) references public.td_estados (id);
exception when duplicate_object then null;
end $$;

create index if not exists th_solicitud_mice_estado_id_idx
  on public.th_solicitud_mice (estado_id);

-- Ya no usar estado_codigo en cabecera (la app guarda estado_id)
alter table public.th_solicitud_mice
  drop column if exists estado_codigo;

select mzp, estado_id, e.nombre as estado
from public.th_solicitud_mice s
left join public.td_estados e on e.id = s.estado_id
order by s.created_at desc
limit 10;

notify pgrst, 'reload schema';
