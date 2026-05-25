-- =============================================================================
-- Fix: cambiar PK de td_estados (y td_probabilidades) cuando ya existe estado_id FK
-- Ejecutar este bloque completo en DBeaver / Supabase.
-- =============================================================================

alter table public.th_solicitud_mice drop constraint if exists th_solicitud_mice_estado_codigo_fk;
alter table public.th_solicitud_mice drop constraint if exists th_solicitud_mice_estado_id_fk;
alter table public.th_solicitud_mice drop constraint if exists th_solicitud_mice_probabilidad_codigo_fk;
alter table public.th_solicitud_mice drop constraint if exists th_solicitud_mice_probabilidad_id_fk;

-- td_estados
alter table public.td_estados add column if not exists id smallserial;

update public.td_estados e
set id = sub.rn
from (
  select codigo, row_number() over (order by orden, codigo)::smallint as rn
  from public.td_estados
  where id is null
) sub
where e.codigo = sub.codigo and e.id is null;

alter table public.td_estados alter column id set not null;
alter table public.td_estados drop constraint if exists estados_mice_pkey;
alter table public.td_estados drop constraint if exists td_estados_pkey;
alter table public.td_estados add constraint td_estados_pkey primary key (id);
create unique index if not exists td_estados_codigo_uidx on public.td_estados (codigo);

-- td_probabilidades
alter table public.td_probabilidades add column if not exists id smallserial;

update public.td_probabilidades p
set id = sub.rn
from (
  select codigo, row_number() over (order by orden, codigo)::smallint as rn
  from public.td_probabilidades
  where id is null
) sub
where p.codigo = sub.codigo and p.id is null;

alter table public.td_probabilidades alter column id set not null;
alter table public.td_probabilidades drop constraint if exists probabilidades_mice_pkey;
alter table public.td_probabilidades drop constraint if exists td_probabilidades_pkey;
alter table public.td_probabilidades add constraint td_probabilidades_pkey primary key (id);
create unique index if not exists td_probabilidades_codigo_uidx on public.td_probabilidades (codigo);

-- Recrear FKs en cabecera
alter table public.th_solicitud_mice add column if not exists estado_id smallint;
alter table public.th_solicitud_mice add column if not exists probabilidad_id smallint;

do $$ begin
  alter table public.th_solicitud_mice
    add constraint th_solicitud_mice_estado_id_fk
    foreign key (estado_id) references public.td_estados (id);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.th_solicitud_mice
    add constraint th_solicitud_mice_probabilidad_id_fk
    foreign key (probabilidad_id) references public.td_probabilidades (id);
exception when duplicate_object then null;
end $$;

select id, codigo, nombre from public.td_estados order by orden;
select id, codigo, nombre from public.td_probabilidades order by orden;

notify pgrst, 'reload schema';
