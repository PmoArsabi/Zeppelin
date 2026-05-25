-- =============================================================================
-- Arreglar td_estados: id numérico (PK) + codigo slug + nombre visible
-- Y th_solicitud_mice: estado_id (como sector_id)
-- Ejecutar en Supabase → SQL Editor. Después: Reload schema.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Normalizar td_estados: codigo = técnico, nombre = lo que ve el usuario
-- -----------------------------------------------------------------------------
update public.td_estados set codigo = 'cotizacion_enviada', nombre = 'Cotización Enviada'
where lower(trim(codigo)) in ('cotización enviada', 'cotizacion enviada')
   or lower(trim(nombre)) in ('cotización enviada', 'cotizacion enviada');

update public.td_estados set codigo = 'en_operacion', nombre = 'En operación'
where lower(trim(codigo)) in ('en operación', 'en operacion')
   or lower(trim(nombre)) in ('en operación', 'en operacion');

update public.td_estados set codigo = 'en_cierre', nombre = 'En cierre'
where lower(trim(codigo)) = 'en cierre' or lower(trim(nombre)) = 'en cierre';

update public.td_estados set codigo = 'en_cotizacion', nombre = 'En cotización'
where lower(trim(codigo)) in ('en cotización', 'en cotizacion')
   or lower(trim(nombre)) in ('en cotización', 'en cotizacion');

update public.td_estados set codigo = 'cerrado', nombre = 'Cerrado'
where lower(trim(codigo)) = 'cerrado' or lower(trim(nombre)) = 'cerrado';

update public.td_estados set codigo = 'cancelado', nombre = 'Cancelado'
where lower(trim(codigo)) = 'cancelado' or lower(trim(nombre)) = 'cancelado';

update public.td_estados set codigo = 'no_adjudicado', nombre = 'No adjudicado - No ganado'
where lower(trim(codigo)) like '%no adjudicado%'
   or lower(trim(nombre)) in ('no ganado', 'no adjudicado - no ganado', 'no adjudicado -no ganado');

insert into public.td_estados (codigo, nombre, orden) values
  ('abierto', 'Abierto', 12)
on conflict (codigo) do update set nombre = excluded.nombre, orden = excluded.orden, activo = true;

-- -----------------------------------------------------------------------------
-- 2) Agregar id numérico a td_estados (si no existe)
-- -----------------------------------------------------------------------------
alter table public.td_estados add column if not exists id smallint;

update public.td_estados e
set id = sub.rn
from (
  select codigo, row_number() over (order by orden, codigo) as rn
  from public.td_estados
  where id is null
) sub
where e.codigo = sub.codigo and e.id is null;

-- Secuencia para nuevos estados
do $$ begin
  create sequence if not exists td_estados_id_seq;
  perform setval(
    'td_estados_id_seq',
    coalesce((select max(id) from public.td_estados), 0) + 1,
    false
  );
  alter table public.td_estados
    alter column id set default nextval('td_estados_id_seq');
  alter sequence td_estados_id_seq owned by public.td_estados.id;
exception when others then null;
end $$;

alter table public.td_estados alter column id set not null;

-- Quitar FKs que bloquean cambiar PK del catálogo
alter table public.th_solicitud_mice
  drop constraint if exists th_solicitud_mice_estado_codigo_fk;
alter table public.th_solicitud_mice
  drop constraint if exists th_solicitud_mice_estado_id_fk;

alter table public.td_estados drop constraint if exists estados_mice_pkey;
alter table public.td_estados drop constraint if exists td_estados_pkey;
alter table public.td_estados drop constraint if exists td_estados_codigo_key;

alter table public.td_estados add primary key (id);
create unique index if not exists td_estados_codigo_uidx on public.td_estados (codigo);

-- -----------------------------------------------------------------------------
-- 3) th_solicitud_mice: columna estado_id (como sector_id)
-- -----------------------------------------------------------------------------
alter table public.th_solicitud_mice add column if not exists estado_id smallint;

update public.th_solicitud_mice s
set estado_id = e.id
from public.td_estados e
where s.estado_id is null
  and (
    (s.estado_codigo is not null and lower(trim(s.estado_codigo)) = lower(trim(e.codigo)))
    or (s.estado_codigo is not null and lower(trim(s.estado_codigo)) = lower(trim(e.nombre)))
    or (s.estado is not null and lower(trim(s.estado)) = lower(trim(e.nombre)))
  );

do $$ begin
  alter table public.th_solicitud_mice
    add constraint th_solicitud_mice_estado_id_fk
    foreign key (estado_id) references public.td_estados (id);
exception when duplicate_object then null;
end $$;

create index if not exists th_solicitud_mice_estado_id_idx
  on public.th_solicitud_mice (estado_id);

-- Opcional: quitar estado_codigo cuando la app use solo estado_id
-- alter table public.th_solicitud_mice drop column if exists estado_codigo;

-- -----------------------------------------------------------------------------
-- 4) Ver resultado
-- -----------------------------------------------------------------------------
select id, codigo, nombre, orden, activo from public.td_estados order by orden;

select mzp, estado_id, estado_codigo from public.th_solicitud_mice order by created_at desc limit 10;

notify pgrst, 'reload schema';
