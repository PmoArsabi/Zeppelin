-- =============================================================================
-- ZEPPELIN MICE — Limpiar th_solicitud_mice (solo columnas necesarias)
-- Ejecutar en Supabase → SQL Editor (una sola vez).
-- NO borra la tabla. NO borra datos de solicitudes.
--
-- DESPUÉS: Settings → API → Reload schema
-- =============================================================================


-- =============================================================================
-- PASO A — Quitar triggers que escribían columnas texto (si existen)
-- =============================================================================

drop trigger if exists th_solicitud_mice_sync_catalogos on public.th_solicitud_mice;

drop trigger if exists solicitud_mice_seguimientos_sync_text on public.th_solicitud_mice_seguimientos;


-- =============================================================================
-- PASO B — CREAR columna que falta: cliente_id
-- =============================================================================

alter table public.th_solicitud_mice
  add column if not exists cliente_id integer;


-- =============================================================================
-- PASO C — Rellenar IDs desde texto (antes de borrar columnas)
-- =============================================================================

-- Cliente: texto → raw.xmart_clientes_zeppelin.customerid (no existe columna "id")
update public.th_solicitud_mice s
set cliente_id = c.customerid
from (
  select distinct on (customerid) customerid, fullname
  from raw.xmart_clientes_zeppelin
  where customerid is not null and trim(fullname) <> ''
  order by customerid, _ingested_at desc nulls last
) c
where s.cliente_id is null
  and s.cliente is not null
  and trim(s.cliente) <> ''
  and lower(trim(s.cliente)) = lower(trim(c.fullname));

-- Estado: texto → td_estados.codigo
update public.th_solicitud_mice s
set estado_codigo = e.codigo
from public.td_estados e
where s.estado_codigo is null
  and s.estado is not null
  and trim(s.estado) <> ''
  and lower(trim(s.estado)) = lower(trim(e.nombre));

-- Sector: texto → td_sectores.id
update public.th_solicitud_mice s
set sector_id = sec.id
from public.td_sectores sec
where s.sector_id is null
  and s.sector is not null
  and trim(s.sector) <> ''
  and lower(trim(s.sector)) = lower(trim(sec.nombre));

-- Probabilidad: texto → td_probabilidades.codigo
update public.th_solicitud_mice s
set probabilidad_codigo = p.codigo
from public.td_probabilidades p
where s.probabilidad_codigo is null
  and s.probabilidad is not null
  and trim(s.probabilidad) <> ''
  and lower(trim(s.probabilidad)) = lower(trim(p.nombre));


-- =============================================================================
-- PASO D — FK cliente_id (si no existe)
-- =============================================================================

-- FK opcional: solo si customerid es único en raw (si falla, puedes omitir este bloque)
create unique index if not exists xmart_clientes_zeppelin_customerid_uidx
  on raw.xmart_clientes_zeppelin (customerid);

do $$ begin
  alter table public.th_solicitud_mice
    add constraint th_solicitud_mice_cliente_id_fk
    foreign key (cliente_id) references raw.xmart_clientes_zeppelin (customerid);
exception when duplicate_object then null;
  when others then
    raise notice 'FK cliente_id omitida: %', sqlerrm;
end $$;

create index if not exists th_solicitud_mice_cliente_id_idx
  on public.th_solicitud_mice (cliente_id);


-- =============================================================================
-- PASO E — ELIMINAR columnas que NO van en cabecera
-- (servicios/lugar/destinos/seguimiento → tablas hijas)
-- (estado/sector/probabilidad/cliente → solo *_codigo o *_id)
-- =============================================================================

alter table public.th_solicitud_mice drop column if exists responsable_nombre;
alter table public.th_solicitud_mice drop column if exists cliente;
alter table public.th_solicitud_mice drop column if exists sector;
alter table public.th_solicitud_mice drop column if exists estado;
alter table public.th_solicitud_mice drop column if exists servicios;
alter table public.th_solicitud_mice drop column if exists lugar;
alter table public.th_solicitud_mice drop column if exists pais_destino;
alter table public.th_solicitud_mice drop column if exists ciudad_destino;
alter table public.th_solicitud_mice drop column if exists tiqueteador_asignado;
alter table public.th_solicitud_mice drop column if exists probabilidad;
alter table public.th_solicitud_mice drop column if exists seguimiento;


-- =============================================================================
-- PASO F — Vista resumen (sin columnas legacy)
-- =============================================================================

drop view if exists public.v_solicitudes_mice_resumen;

create or replace view public.v_solicitudes_mice_resumen as
select
  s.id,
  s.anio,
  s.mzp,
  s.cliente_id,
  c.fullname as cliente_nombre,
  s.nombre,
  s.estado_codigo,
  e.nombre as estado_nombre,
  s.moneda_cotizacion,
  s.valor_cotizado,
  s.utilidad_proyectada,
  s.fecha_solicitud,
  s.fecha_entrega,
  s.responsable_id,
  p.display_name as responsable_nombre,
  s.probabilidad_codigo,
  prob.nombre as probabilidad_nombre,
  s.sector_id,
  sec.nombre as sector_nombre,
  s.pax,
  s.tiqueteador_user_id,
  tiq.display_name as tiqueteador_nombre,
  (
    select string_agg(srv.short_label, ' + ' order by sm.orden, sm.servicio_id)
    from public.th_solicitud_mice_servicios sm
    join public.td_servicios srv on srv.id = sm.servicio_id
    where sm.solicitud_id = s.id
  ) as servicios_resumen,
  (
    select string_agg(l.nombre, ' | ' order by l.orden)
    from public.th_solicitud_mice_lugares sl
    join public.td_lugares l on l.id = sl.lugar_id
    where sl.solicitud_id = s.id
  ) as lugares_resumen,
  (
    select string_agg(pa.nombre || ' — ' || ci.nombre, '; ' order by d.orden, d.id)
    from public.th_solicitud_mice_destinos d
    join public.td_pais_destino pa on pa.id = d.pais_id
    join public.td_ciudades_destino ci on ci.id = d.ciudad_id
    where d.solicitud_id = s.id
  ) as destinos_resumen,
  s.created_at,
  s.updated_at
from public.th_solicitud_mice s
left join (
  select distinct on (customerid) customerid, fullname
  from raw.xmart_clientes_zeppelin
  where customerid is not null
  order by customerid, _ingested_at desc nulls last
) c on c.customerid = s.cliente_id
left join public.td_estados e on e.codigo = s.estado_codigo
left join public.td_probabilidades prob on prob.codigo = s.probabilidad_codigo
left join public.td_sectores sec on sec.id = s.sector_id
left join public.td_profiles p on p.id = s.responsable_id
left join public.td_profiles tiq on tiq.id = s.tiqueteador_user_id
where s.activo = true;

grant select on public.v_solicitudes_mice_resumen to authenticated;


-- =============================================================================
-- PASO G — Comprobar columnas finales
-- =============================================================================

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'th_solicitud_mice'
order by ordinal_position;

-- Debe quedar aprox.:
-- id, user_id, anio, responsable_id, cliente_id, mzp, nombre,
-- inicio, fin, estado_codigo, valor_cotizado, utilidad_proyectada,
-- fecha_solicitud, fecha_entrega, pax, activo, created_at, updated_at,
-- moneda_cotizacion, sector_id, tiqueteador_user_id, probabilidad_codigo

notify pgrst, 'reload schema';
