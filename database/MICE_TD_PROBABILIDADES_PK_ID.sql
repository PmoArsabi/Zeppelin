-- =============================================================================
-- td_probabilidades: PK = id (autoincremental)
-- th_solicitud_mice: probabilidad_id → td_probabilidades.id
-- Ejecutar en Supabase → SQL Editor. Después: Reload schema.
-- =============================================================================

alter table public.th_solicitud_mice
  drop constraint if exists th_solicitud_mice_probabilidad_codigo_fk;
alter table public.th_solicitud_mice
  drop constraint if exists th_solicitud_mice_probabilidad_id_fk;

alter table public.td_probabilidades
  add column if not exists id smallserial;

update public.td_probabilidades p
set id = sub.rn
from (
  select codigo, row_number() over (order by orden, codigo)::smallint as rn
  from public.td_probabilidades
  where id is null
) sub
where p.codigo = sub.codigo and p.id is null;

alter table public.td_probabilidades
  alter column id set not null;

alter table public.td_probabilidades
  drop constraint if exists probabilidades_mice_pkey;
alter table public.td_probabilidades
  drop constraint if exists td_probabilidades_pkey;

alter table public.td_probabilidades
  add constraint td_probabilidades_pkey primary key (id);

create unique index if not exists td_probabilidades_codigo_uidx
  on public.td_probabilidades (codigo);

alter table public.th_solicitud_mice
  add column if not exists probabilidad_id smallint;

update public.th_solicitud_mice s
set probabilidad_id = p.id
from public.td_probabilidades p
where s.probabilidad_id is null
  and s.probabilidad_codigo is not null
  and lower(trim(s.probabilidad_codigo)) = lower(trim(p.codigo));

update public.th_solicitud_mice s
set probabilidad_id = p.id
from public.td_probabilidades p
where s.probabilidad_id is null
  and s.probabilidad is not null
  and lower(trim(s.probabilidad)) = lower(trim(p.nombre));

alter table public.th_solicitud_mice
  drop constraint if exists th_solicitud_mice_probabilidad_id_fk;

alter table public.th_solicitud_mice
  add constraint th_solicitud_mice_probabilidad_id_fk
  foreign key (probabilidad_id) references public.td_probabilidades (id);

create index if not exists th_solicitud_mice_probabilidad_id_idx
  on public.th_solicitud_mice (probabilidad_id);

alter table public.th_solicitud_mice
  drop column if exists probabilidad_codigo;

select id, codigo, nombre, orden, activo from public.td_probabilidades order by orden;

select mzp, probabilidad_id, p.nombre as probabilidad
from public.th_solicitud_mice s
left join public.td_probabilidades p on p.id = s.probabilidad_id
order by s.created_at desc
limit 10;

notify pgrst, 'reload schema';
