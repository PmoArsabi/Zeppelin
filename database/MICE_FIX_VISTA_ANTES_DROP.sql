-- =============================================================================
-- Fix rápido: recrear vista y luego borrar columnas legacy
-- (Si solo falló el DROP por v_solicitudes_mice_resumen)
-- Ejecutar todo este bloque en DBeaver / Supabase.
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
  s.estado_id,
  e.nombre as estado_nombre,
  s.moneda_cotizacion,
  s.valor_cotizado,
  s.utilidad_proyectada,
  s.fecha_solicitud,
  s.fecha_entrega,
  s.responsable_id,
  p.display_name as responsable_nombre,
  s.probabilidad_id,
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
left join public.td_estados e on e.id = s.estado_id
left join public.td_probabilidades prob on prob.id = s.probabilidad_id
left join public.td_sectores sec on sec.id = s.sector_id
left join public.td_profiles p on p.id = s.responsable_id
left join public.td_profiles tiq on tiq.id = s.tiqueteador_user_id
where s.activo = true;

grant select on public.v_solicitudes_mice_resumen to authenticated;

alter table public.th_solicitud_mice drop column if exists responsable_nombre;
alter table public.th_solicitud_mice drop column if exists cliente;
alter table public.th_solicitud_mice drop column if exists sector;
alter table public.th_solicitud_mice drop column if exists estado;
alter table public.th_solicitud_mice drop column if exists estado_codigo;
alter table public.th_solicitud_mice drop column if exists servicios;
alter table public.th_solicitud_mice drop column if exists lugar;
alter table public.th_solicitud_mice drop column if exists pais_destino;
alter table public.th_solicitud_mice drop column if exists ciudad_destino;
alter table public.th_solicitud_mice drop column if exists tiqueteador_asignado;
alter table public.th_solicitud_mice drop column if exists probabilidad;
alter table public.th_solicitud_mice drop column if exists probabilidad_codigo;
alter table public.th_solicitud_mice drop column if exists seguimiento;

select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'th_solicitud_mice'
order by ordinal_position;

notify pgrst, 'reload schema';
