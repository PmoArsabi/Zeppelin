-- =============================================================================
-- FK: th_solicitud_mice.probabilidad_id → td_probabilidades.id
-- Ejecutar en Supabase / DBeaver (todo el archivo).
-- Después: Settings → API → Reload schema
-- =============================================================================

-- 1) Quitar FK vieja (por código texto, si existía)
alter table public.th_solicitud_mice
  drop constraint if exists th_solicitud_mice_probabilidad_codigo_fk;

alter table public.th_solicitud_mice
  drop constraint if exists th_solicitud_mice_probabilidad_id_fk;


-- 2) Catálogo td_probabilidades debe tener PK = id
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

-- Solo cambiar PK si aún está en codigo (evita error si ya es id)
do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    where tc.table_schema = 'public'
      and tc.table_name = 'td_probabilidades'
      and tc.constraint_type = 'PRIMARY KEY'
      and kcu.column_name = 'codigo'
  ) then
    alter table public.th_solicitud_mice
      drop constraint if exists th_solicitud_mice_probabilidad_id_fk;

    alter table public.td_probabilidades drop constraint if exists probabilidades_mice_pkey;
    alter table public.td_probabilidades drop constraint if exists td_probabilidades_pkey;
    alter table public.td_probabilidades add constraint td_probabilidades_pkey primary key (id);
  end if;
end $$;

create unique index if not exists td_probabilidades_codigo_uidx
  on public.td_probabilidades (codigo);


-- 3) Columna en cabecera
alter table public.th_solicitud_mice
  add column if not exists probabilidad_id smallint;


-- 4) Rellenar probabilidad_id si hay datos legacy (opcional)
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'th_solicitud_mice'
      and column_name = 'probabilidad_codigo'
  ) then
    update public.th_solicitud_mice s
    set probabilidad_id = p.id
    from public.td_probabilidades p
    where s.probabilidad_id is null
      and s.probabilidad_codigo is not null
      and lower(trim(s.probabilidad_codigo)) = lower(trim(p.codigo));
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'th_solicitud_mice'
      and column_name = 'probabilidad'
  ) then
    update public.th_solicitud_mice s
    set probabilidad_id = p.id
    from public.td_probabilidades p
    where s.probabilidad_id is null
      and s.probabilidad is not null
      and trim(s.probabilidad) <> ''
      and lower(trim(s.probabilidad)) = lower(trim(p.nombre));
  end if;
end $$;


-- 5) Limpiar valores huérfanos (bloquean la FK)
update public.th_solicitud_mice s
set probabilidad_id = null
where s.probabilidad_id is not null
  and not exists (
    select 1 from public.td_probabilidades p where p.id = s.probabilidad_id
  );


-- 6) Crear FK + índice
alter table public.th_solicitud_mice
  add constraint th_solicitud_mice_probabilidad_id_fk
  foreign key (probabilidad_id)
  references public.td_probabilidades (id)
  on delete restrict
  on update cascade;

create index if not exists th_solicitud_mice_probabilidad_id_idx
  on public.th_solicitud_mice (probabilidad_id);

comment on column public.th_solicitud_mice.probabilidad_id is
  'FK td_probabilidades.id — Baja / Media / Alta';


-- 7) Verificación
select id, codigo, nombre, orden
from public.td_probabilidades
order by orden;

select
  s.mzp,
  s.probabilidad_id,
  p.codigo,
  p.nombre as probabilidad
from public.th_solicitud_mice s
left join public.td_probabilidades p on p.id = s.probabilidad_id
order by s.created_at desc
limit 15;

select
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name as references_table,
  ccu.column_name as references_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.table_schema = 'public'
  and tc.table_name = 'th_solicitud_mice'
  and tc.constraint_type = 'FOREIGN KEY'
  and kcu.column_name = 'probabilidad_id';

notify pgrst, 'reload schema';
