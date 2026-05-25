-- =============================================================================
-- Zeppelin — MICE: FK a catálogos (estado, probabilidad, sector) + sincronía texto
-- Ejecutar en Supabase → SQL Editor DESPUÉS de 009 (tablas td_* / th_solicitud_mice)
-- Idempotente. Al final: NOTIFY pgrst o Reload schema en API.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Ampliar estados del flujo operativo (además del Excel histórico)
-- -----------------------------------------------------------------------------
insert into public.td_estados (codigo, nombre, orden) values
  ('en_cotizacion', 'En cotización', 10),
  ('cotizacion_enviada', 'Cotización Enviada', 11),
  ('abierto', 'Abierto', 12),
  ('en_operacion', 'En operación', 13),
  ('en_cierre', 'En cierre', 14),
  ('cerrado', 'Cerrado', 20),
  ('no_adjudicado', 'No adjudicado - No ganado', 30),
  ('cancelado', 'Cancelado', 40)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  orden = excluded.orden,
  activo = true;

-- Registrar estados huérfanos que existan solo en cabecera (texto libre previo)
insert into public.td_estados (codigo, nombre, orden)
select
  'legacy_' || substr(md5(lower(trim(s.estado))), 1, 12),
  trim(s.estado),
  99
from public.th_solicitud_mice s
where s.estado is not null
  and trim(s.estado) <> ''
  and not exists (
    select 1 from public.td_estados e
    where lower(trim(e.nombre)) = lower(trim(s.estado))
  )
group by trim(s.estado)
on conflict (nombre) do nothing;

-- Asegurar columna activo en sectores (001 no la tenía)
alter table public.td_sectores
  add column if not exists activo boolean not null default true;

-- -----------------------------------------------------------------------------
-- 2. Columnas FK en cabecera (sector_id ya existe desde 003)
-- -----------------------------------------------------------------------------
alter table public.th_solicitud_mice
  add column if not exists estado_codigo text;

alter table public.th_solicitud_mice
  add column if not exists probabilidad_codigo text;

do $$ begin
  alter table public.th_solicitud_mice
    add constraint th_solicitud_mice_estado_codigo_fk
    foreign key (estado_codigo) references public.td_estados (codigo);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.th_solicitud_mice
    add constraint th_solicitud_mice_probabilidad_codigo_fk
    foreign key (probabilidad_codigo) references public.td_probabilidades (codigo);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.th_solicitud_mice
    add constraint th_solicitud_mice_sector_id_fk
    foreign key (sector_id) references public.td_sectores (id);
exception when duplicate_object then null;
end $$;

-- Quitar check legacy de 001 que solo permitía 3 estados (si aún existe)
alter table public.th_solicitud_mice
  drop constraint if exists solicitudes_mice_estado_check;

create index if not exists th_solicitud_mice_estado_codigo_idx
  on public.th_solicitud_mice (estado_codigo);

create index if not exists th_solicitud_mice_sector_id_idx
  on public.th_solicitud_mice (sector_id);

-- -----------------------------------------------------------------------------
-- 3. Backfill desde texto existente
-- -----------------------------------------------------------------------------
update public.th_solicitud_mice s
set estado_codigo = e.codigo
from public.td_estados e
where s.estado_codigo is null
  and s.estado is not null
  and lower(trim(s.estado)) = lower(trim(e.nombre));

update public.th_solicitud_mice s
set probabilidad_codigo = p.codigo
from public.td_probabilidades p
where s.probabilidad_codigo is null
  and s.probabilidad is not null
  and lower(trim(s.probabilidad)) = lower(trim(p.nombre));

update public.th_solicitud_mice s
set sector_id = sec.id
from public.td_sectores sec
where s.sector_id is null
  and s.sector is not null
  and trim(s.sector) <> ''
  and lower(trim(s.sector)) = lower(trim(sec.nombre));

update public.th_solicitud_mice s
set tiqueteador_asignado = p.display_name
from public.td_profiles p
where s.tiqueteador_user_id is not null
  and p.id = s.tiqueteador_user_id
  and p.display_name is not null
  and (
    s.tiqueteador_asignado is null
    or trim(s.tiqueteador_asignado) = ''
    or s.tiqueteador_asignado <> p.display_name
  );

update public.th_solicitud_mice s
set responsable_nombre = coalesce(p.display_name, s.responsable_nombre)
from public.td_profiles p
where s.responsable_id = p.id
  and p.display_name is not null
  and (
    s.responsable_nombre is null
    or trim(s.responsable_nombre) = ''
    or s.responsable_nombre <> p.display_name
  );

-- -----------------------------------------------------------------------------
-- 4. Trigger: FK → columnas texto (listados / Excel / compatibilidad)
-- -----------------------------------------------------------------------------
create or replace function public.sync_th_solicitud_mice_catalogos()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_nombre text;
begin
  -- Estado
  if new.estado_codigo is not null and trim(new.estado_codigo) <> '' then
    select e.nombre into v_nombre from public.td_estados e where e.codigo = new.estado_codigo;
    if v_nombre is not null then
      new.estado := v_nombre;
    end if;
  elsif new.estado is not null and trim(new.estado) <> '' then
    select e.codigo into new.estado_codigo
    from public.td_estados e
    where lower(trim(e.nombre)) = lower(trim(new.estado))
    limit 1;
  end if;

  -- Probabilidad
  v_nombre := null;
  if new.probabilidad_codigo is not null and trim(new.probabilidad_codigo) <> '' then
    select p.nombre into v_nombre from public.td_probabilidades p where p.codigo = new.probabilidad_codigo;
    if v_nombre is not null then
      new.probabilidad := v_nombre;
    end if;
  elsif new.probabilidad is not null and trim(new.probabilidad) <> '' then
    select p.codigo into new.probabilidad_codigo
    from public.td_probabilidades p
    where lower(trim(p.nombre)) = lower(trim(new.probabilidad))
    limit 1;
  end if;

  -- Sector
  v_nombre := null;
  if new.sector_id is not null then
    select sec.nombre into v_nombre from public.td_sectores sec where sec.id = new.sector_id;
    if v_nombre is not null then
      new.sector := v_nombre;
    end if;
  elsif new.sector is not null and trim(new.sector) <> '' then
    select sec.id into new.sector_id
    from public.td_sectores sec
    where lower(trim(sec.nombre)) = lower(trim(new.sector))
    limit 1;
  end if;

  -- Tiqueteador / responsable desde perfiles
  if new.tiqueteador_user_id is not null then
    select p.display_name into v_nombre from public.td_profiles p where p.id = new.tiqueteador_user_id;
    if v_nombre is not null and trim(v_nombre) <> '' then
      new.tiqueteador_asignado := v_nombre;
    end if;
  end if;

  if new.responsable_id is not null then
    select p.display_name into v_nombre from public.td_profiles p where p.id = new.responsable_id;
    if v_nombre is not null and trim(v_nombre) <> '' then
      new.responsable_nombre := v_nombre;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists th_solicitud_mice_sync_catalogos on public.th_solicitud_mice;
create trigger th_solicitud_mice_sync_catalogos
  before insert or update on public.th_solicitud_mice
  for each row execute function public.sync_th_solicitud_mice_catalogos();

comment on column public.th_solicitud_mice.estado_codigo is
  'FK td_estados.codigo — fuente de verdad; columna estado es snapshot para listados.';
comment on column public.th_solicitud_mice.probabilidad_codigo is
  'FK td_probabilidades.codigo — fuente de verdad; columna probabilidad es snapshot.';
comment on column public.th_solicitud_mice.sector_id is
  'FK td_sectores.id — fuente de verdad; columna sector es snapshot.';

-- -----------------------------------------------------------------------------
-- 5. Vista resumen (expone códigos FK)
-- -----------------------------------------------------------------------------
drop view if exists public.v_solicitudes_mice_resumen;

create or replace view public.v_solicitudes_mice_resumen as
select
  s.id,
  s.anio,
  s.mzp,
  s.cliente,
  s.nombre,
  s.estado,
  s.estado_codigo,
  s.moneda_cotizacion,
  s.valor_cotizado,
  s.utilidad_proyectada,
  s.fecha_solicitud,
  s.fecha_entrega,
  s.responsable_nombre,
  s.responsable_id,
  s.probabilidad,
  s.probabilidad_codigo,
  s.sector,
  s.sector_id,
  s.pax,
  coalesce((
    select string_agg(srv.short_label, ' + ' order by sm.orden, sm.servicio_id)
    from public.th_solicitud_mice_servicios sm
    join public.td_servicios srv on srv.id = sm.servicio_id
    where sm.solicitud_id = s.id
  ), s.servicios) as servicios_resumen,
  coalesce((
    select string_agg(l.nombre, ' | ' order by l.orden)
    from public.th_solicitud_mice_lugares sl
    join public.td_lugares l on l.id = sl.lugar_id
    where sl.solicitud_id = s.id
  ), s.lugar) as lugares_resumen,
  coalesce((
    select string_agg(p.nombre || ' — ' || c.nombre, '; ' order by d.orden, d.id)
    from public.th_solicitud_mice_destinos d
    join public.td_pais_destino p on p.id = d.pais_id
    join public.td_ciudades_destino c on c.id = d.ciudad_id
    where d.solicitud_id = s.id
  ), s.pais_destino) as destinos_resumen,
  s.created_at,
  s.updated_at
from public.th_solicitud_mice s
where s.activo = true;

grant select on public.v_solicitudes_mice_resumen to authenticated;

notify pgrst, 'reload schema';
