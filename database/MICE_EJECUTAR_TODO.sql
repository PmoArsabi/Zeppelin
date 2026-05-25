-- =============================================================================
-- ZEPPELIN MICE — EJECUTAR TODO (punto de entrada)
--
-- Contenido idéntico a: MICE_MIGRAR_HIJAS_Y_LIMPIAR_CABECERA.sql (script canónico).
-- Si modificas el SQL, edita el canónico y copia aquí, o ejecuta solo el canónico.
--
-- Una vez en Supabase / DBeaver → SQL Editor → Run.
-- Después: Settings → API → Reload schema
-- =============================================================================


-- =============================================================================
-- A) Quitar triggers que escribían columnas texto
-- =============================================================================

drop trigger if exists th_solicitud_mice_sync_catalogos on public.th_solicitud_mice;
drop trigger if exists solicitud_mice_seguimientos_sync_text on public.th_solicitud_mice_seguimientos;


-- =============================================================================
-- B) Catálogos: td_estados y td_probabilidades con PK = id (si aún no)
-- =============================================================================

alter table public.th_solicitud_mice
  drop constraint if exists th_solicitud_mice_estado_codigo_fk;
alter table public.th_solicitud_mice
  drop constraint if exists th_solicitud_mice_probabilidad_codigo_fk;
alter table public.th_solicitud_mice
  drop constraint if exists th_solicitud_mice_estado_id_fk;
alter table public.th_solicitud_mice
  drop constraint if exists th_solicitud_mice_probabilidad_id_fk;

-- td_estados.id
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

-- td_probabilidades.id
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


-- =============================================================================
-- C) Cabecera: rellenar *_id desde texto (antes de borrar columnas)
-- =============================================================================

alter table public.th_solicitud_mice add column if not exists cliente_id integer;
alter table public.th_solicitud_mice add column if not exists estado_id smallint;
alter table public.th_solicitud_mice add column if not exists probabilidad_id smallint;

-- Cliente
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'th_solicitud_mice' and column_name = 'cliente'
  ) then
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
  end if;
end $$;

-- Sector
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'th_solicitud_mice' and column_name = 'sector'
  ) then
    update public.th_solicitud_mice s
    set sector_id = sec.id
    from public.td_sectores sec
    where s.sector_id is null
      and s.sector is not null
      and trim(s.sector) <> ''
      and lower(trim(s.sector)) = lower(trim(sec.nombre));
  end if;
end $$;

-- Estado → estado_id
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'th_solicitud_mice' and column_name = 'estado_codigo'
  ) then
    update public.th_solicitud_mice s
    set estado_id = e.id
    from public.td_estados e
    where s.estado_id is null
      and s.estado_codigo is not null
      and (
        lower(trim(s.estado_codigo)) = lower(trim(e.codigo))
        or lower(trim(s.estado_codigo)) = lower(trim(e.nombre))
      );
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'th_solicitud_mice' and column_name = 'estado'
  ) then
    update public.th_solicitud_mice s
    set estado_id = e.id
    from public.td_estados e
    where s.estado_id is null
      and s.estado is not null
      and trim(s.estado) <> ''
      and lower(trim(s.estado)) = lower(trim(e.nombre));
  end if;
end $$;

-- Probabilidad → probabilidad_id
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'th_solicitud_mice' and column_name = 'probabilidad_codigo'
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
    where table_schema = 'public' and table_name = 'th_solicitud_mice' and column_name = 'probabilidad'
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

-- Tiqueteador: nombre → user_id
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'th_solicitud_mice' and column_name = 'tiqueteador_asignado'
  ) then
    update public.th_solicitud_mice s
    set tiqueteador_user_id = p.id
    from public.td_profiles p
    where s.tiqueteador_user_id is null
      and s.tiqueteador_asignado is not null
      and trim(s.tiqueteador_asignado) <> ''
      and lower(trim(p.display_name)) = lower(trim(s.tiqueteador_asignado));
  end if;
end $$;

-- FKs cabecera (si faltan)
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

create index if not exists th_solicitud_mice_estado_id_idx on public.th_solicitud_mice (estado_id);
create index if not exists th_solicitud_mice_probabilidad_id_idx on public.th_solicitud_mice (probabilidad_id);


-- =============================================================================
-- D) Servicios: cabecera.servicios → th_solicitud_mice_servicios
-- =============================================================================

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'th_solicitud_mice' and column_name = 'servicios'
  ) then
    raise notice 'Columna servicios ya no existe; omitiendo migración de servicios.';
    return;
  end if;

  insert into public.th_solicitud_mice_servicios (solicitud_id, servicio_id, orden)
  select
    m.solicitud_id,
    m.servicio_id,
    (row_number() over (partition by m.solicitud_id order by m.ord) - 1)::smallint as orden
  from (
    select distinct on (parts.solicitud_id, srv.id)
      parts.solicitud_id,
      srv.id as servicio_id,
      parts.ord
    from (
      select
        s.id as solicitud_id,
        trim(t.part) as token,
        t.ord
      from public.th_solicitud_mice s
      cross join lateral regexp_split_to_table(s.servicios, '\s*[+|,;]\s*')
        with ordinality as t(part, ord)
      where s.servicios is not null
        and trim(s.servicios) <> ''
        and trim(t.part) <> ''
        and not exists (
          select 1 from public.th_solicitud_mice_servicios sm
          where sm.solicitud_id = s.id
        )
    ) parts
    join public.td_servicios srv on (
      upper(parts.token) = upper(srv.id)
      or lower(parts.token) = lower(srv.label)
      or lower(parts.token) = lower(srv.short_label)
    )
    order by parts.solicitud_id, srv.id, parts.ord
  ) m
  on conflict (solicitud_id, servicio_id) do nothing;
end $$;


-- =============================================================================
-- E) Destinos: pais_destino + ciudad_destino → th_solicitud_mice_destinos
-- =============================================================================

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'th_solicitud_mice' and column_name = 'pais_destino'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'th_solicitud_mice' and column_name = 'ciudad_destino'
  ) then
    raise notice 'Columnas pais_destino/ciudad_destino ya no existen; omitiendo migración de destinos.';
    return;
  end if;

  insert into public.th_solicitud_mice_destinos (solicitud_id, pais_id, ciudad_id, orden)
  select
    s.id,
    p.id,
    c.id,
    0::smallint
  from public.th_solicitud_mice s
  join public.td_pais_destino p
    on lower(trim(p.nombre)) = lower(trim(s.pais_destino))
  join public.td_ciudades_destino c
    on c.pais_id = p.id
   and lower(trim(c.nombre)) = lower(trim(s.ciudad_destino))
  where s.pais_destino is not null
    and trim(s.pais_destino) <> ''
    and s.ciudad_destino is not null
    and trim(s.ciudad_destino) <> ''
    and not exists (
      select 1 from public.th_solicitud_mice_destinos d
      where d.solicitud_id = s.id
    )
  on conflict (solicitud_id, pais_id, ciudad_id) do nothing;
end $$;


-- =============================================================================
-- F) Lugares: lugar → th_solicitud_mice_lugares
-- =============================================================================

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'th_solicitud_mice' and column_name = 'lugar'
  ) then
    raise notice 'Columna lugar ya no existe; omitiendo migración de lugares.';
    return;
  end if;

  insert into public.th_solicitud_mice_lugares (solicitud_id, lugar_id)
  select s.id, l.id
  from public.th_solicitud_mice s
  join public.td_lugares l
    on lower(trim(l.nombre)) = lower(trim(s.lugar))
  where s.lugar is not null
    and trim(s.lugar) <> ''
    and not exists (
      select 1 from public.th_solicitud_mice_lugares sl
      where sl.solicitud_id = s.id
    )
  on conflict do nothing;
end $$;


-- =============================================================================
-- G) Seguimiento: cabecera.seguimiento → th_solicitud_mice_seguimientos
-- =============================================================================

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'th_solicitud_mice' and column_name = 'seguimiento'
  ) then
    raise notice 'Columna seguimiento ya no existe; omitiendo migración de seguimiento.';
    return;
  end if;

  insert into public.th_solicitud_mice_seguimientos (
    solicitud_id, user_id, autor_nombre, mensaje, created_at
  )
  select
    s.id,
    s.user_id,
    coalesce(nullif(trim(p.display_name), ''), 'Migración legacy'),
    left(trim(s.seguimiento), 2000),
    coalesce(s.updated_at, s.created_at)
  from public.th_solicitud_mice s
  left join public.td_profiles p on p.id = s.responsable_id
  where s.seguimiento is not null
    and trim(s.seguimiento) <> ''
    and lower(trim(s.seguimiento)) not in ('true', 'false')
    and char_length(trim(s.seguimiento)) > 3
    and not exists (
      select 1 from public.th_solicitud_mice_seguimientos h
      where h.solicitud_id = s.id
    );
end $$;


-- =============================================================================
-- H) Vista resumen (recrear ANTES de DROP columnas legacy)
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


-- =============================================================================
-- I) Eliminar columnas texto / códigos legacy de cabecera
-- =============================================================================

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


-- =============================================================================
-- J) Verificación
-- =============================================================================

select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'th_solicitud_mice'
order by ordinal_position;

select
  s.mzp,
  s.cliente_id,
  s.estado_id,
  s.sector_id,
  s.probabilidad_id,
  (select count(*) from public.th_solicitud_mice_servicios sm where sm.solicitud_id = s.id) as n_servicios,
  (select count(*) from public.th_solicitud_mice_destinos d where d.solicitud_id = s.id) as n_destinos,
  (select count(*) from public.th_solicitud_mice_lugares sl where sl.solicitud_id = s.id) as n_lugares,
  (select count(*) from public.th_solicitud_mice_seguimientos h where h.solicitud_id = s.id) as n_seguimientos
from public.th_solicitud_mice s
order by s.created_at desc
limit 30;

notify pgrst, 'reload schema';
