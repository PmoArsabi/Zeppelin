-- =============================================================================
-- Zeppelin — MICE: cliente_id FK → raw.xmart_clientes_zeppelin (elimina cliente text)
-- Ejecutar en Supabase → SQL Editor DESPUÉS de 013_mice_fk_catalogos.sql
-- Idempotente. Al final: NOTIFY pgrst o Reload schema en API.
-- =============================================================================

-- FK: raw.xmart_clientes_zeppelin.customerid (int4), no existe columna "id"

alter table public.th_solicitud_mice
  add column if not exists cliente_id integer;

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

alter table public.th_solicitud_mice
  drop column if exists cliente;

comment on column public.th_solicitud_mice.cliente_id is
  'FK raw.xmart_clientes_zeppelin.customerid — fuente de verdad del cliente.';

-- Vista resumen con nombre desde catálogo raw
drop view if exists public.v_solicitudes_mice_resumen;

create or replace view public.v_solicitudes_mice_resumen as
select
  s.id,
  s.anio,
  s.mzp,
  s.cliente_id,
  c.fullname as cliente_nombre,
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
    select string_agg(p.nombre || ' — ' || ci.nombre, '; ' order by d.orden, d.id)
    from public.th_solicitud_mice_destinos d
    join public.td_pais_destino p on p.id = d.pais_id
    join public.td_ciudades_destino ci on ci.id = d.ciudad_id
    where d.solicitud_id = s.id
  ), s.pais_destino) as destinos_resumen,
  s.created_at,
  s.updated_at
from public.th_solicitud_mice s
left join (
  select distinct on (customerid) customerid, fullname
  from raw.xmart_clientes_zeppelin
  where customerid is not null
  order by customerid, _ingested_at desc nulls last
) c on c.customerid = s.cliente_id
where s.activo = true;

grant select on public.v_solicitudes_mice_resumen to authenticated;

notify pgrst, 'reload schema';
