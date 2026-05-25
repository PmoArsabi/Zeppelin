-- =============================================================================
-- td_estados: PK = id (autoincremental), codigo queda UNIQUE (slug técnico)
-- Ejecutar en Supabase → SQL Editor. Después: Reload schema.
-- =============================================================================

-- 1) Quitar FKs que bloquean cambiar la PK del catálogo
alter table public.th_solicitud_mice
  drop constraint if exists th_solicitud_mice_estado_codigo_fk;
alter table public.th_solicitud_mice
  drop constraint if exists th_solicitud_mice_estado_id_fk;

-- 2) Agregar columna id (autoincremental)
alter table public.td_estados
  add column if not exists id smallserial;

-- Si la columna existía vacía, rellenar
update public.td_estados e
set id = sub.rn
from (
  select codigo, row_number() over (order by orden, codigo)::smallint as rn
  from public.td_estados
  where id is null
) sub
where e.codigo = sub.codigo and e.id is null;

alter table public.td_estados
  alter column id set not null;

-- 3) Quitar PK vieja en codigo y poner PK en id
alter table public.td_estados
  drop constraint if exists estados_mice_pkey;

alter table public.td_estados
  drop constraint if exists td_estados_pkey;

alter table public.td_estados
  add constraint td_estados_pkey primary key (id);

-- 4) codigo ya no es PK, pero sigue único (slug: en_cotizacion, cerrado, etc.)
create unique index if not exists td_estados_codigo_uidx
  on public.td_estados (codigo);

-- 5) th_solicitud_mice: usar estado_id (número), como sector_id
alter table public.th_solicitud_mice
  add column if not exists estado_id smallint;

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

do $$ begin
  alter table public.th_solicitud_mice
    add constraint th_solicitud_mice_estado_id_fk
    foreign key (estado_id) references public.td_estados (id);
exception when duplicate_object then null;
end $$;

create index if not exists th_solicitud_mice_estado_id_idx
  on public.th_solicitud_mice (estado_id);

-- 6) Ver estructura final
select id, codigo, nombre, orden, activo
from public.td_estados
order by orden;

notify pgrst, 'reload schema';
