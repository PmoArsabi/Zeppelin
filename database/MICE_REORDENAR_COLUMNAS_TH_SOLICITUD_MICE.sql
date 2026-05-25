-- =============================================================================
-- Reordenar columnas de th_solicitud_mice (orden físico en DBeaver / pgAdmin)
--
-- PostgreSQL NO tiene ALTER COLUMN ... FIRST/AFTER.
-- Se recrea la tabla con el orden deseado y se reenganchan las FK hijas.
--
-- IMPORTANTE:
-- - Haz backup antes (o prueba en staging).
-- - Tu lista NO incluye responsable_id; la app Zeppelin SÍ lo usa.
--   Si aún existe en tu tabla, descomenta la línea marcada en CREATE TABLE
--   y en el INSERT, o perderás ese dato.
--
-- DESPUÉS: Settings → API → Reload schema
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0) Vista (depende de la tabla)
-- -----------------------------------------------------------------------------
drop view if exists public.v_solicitudes_mice_resumen;


-- -----------------------------------------------------------------------------
-- 1) Quitar FKs hijas → th_solicitud_mice (evita error al borrar tabla vieja)
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select
      c.conname,
      quote_ident(n.nspname) || '.' || quote_ident(t.relname) as child_table
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.contype = 'f'
      and c.confrelid = 'public.th_solicitud_mice'::regclass
  loop
    execute format('alter table %s drop constraint if exists %I', r.child_table, r.conname);
  end loop;
end $$;


-- -----------------------------------------------------------------------------
-- 1b) Políticas RLS que referencian th_solicitud_mice (bloquean DROP TABLE)
-- -----------------------------------------------------------------------------
drop policy if exists solicitud_mice_servicios_all on public.th_solicitud_mice_servicios;
drop policy if exists solicitud_mice_destinos_all on public.th_solicitud_mice_destinos;
drop policy if exists solicitud_mice_lugares_all on public.th_solicitud_mice_lugares;
drop policy if exists solicitud_mice_seguimientos_select on public.th_solicitud_mice_seguimientos;
drop policy if exists solicitud_mice_seguimientos_insert on public.th_solicitud_mice_seguimientos;

drop policy if exists log_auditoria_select on public.th_log_auditoria;
drop policy if exists log_auditoria_insert on public.th_log_auditoria;

drop policy if exists th_solicitud_mice_select on public.th_solicitud_mice;
drop policy if exists th_solicitud_mice_insert on public.th_solicitud_mice;
drop policy if exists th_solicitud_mice_update on public.th_solicitud_mice;
drop policy if exists th_solicitud_mice_delete on public.th_solicitud_mice;
drop policy if exists solicitudes_mice_select on public.th_solicitud_mice;
drop policy if exists solicitudes_mice_insert on public.th_solicitud_mice;
drop policy if exists solicitudes_mice_update on public.th_solicitud_mice;
drop policy if exists solicitudes_mice_delete on public.th_solicitud_mice;


-- -----------------------------------------------------------------------------
-- 2) Tabla nueva con orden de columnas solicitado
-- -----------------------------------------------------------------------------
drop table if exists public.th_solicitud_mice_new;

create table public.th_solicitud_mice_new (
  id                  uuid primary key default gen_random_uuid(),
  anio                smallint not null,
  cliente_id          integer,
  sector_id           smallint,
  mzp                 text,
  nombre              text not null,
  inicio              text,
  fin                 text,
  estado_id           smallint,
  probabilidad_id     smallint,
  moneda_cotizacion   text not null default 'COP',
  valor_cotizado      numeric(15, 2),
  utilidad_proyectada numeric(15, 2),
  fecha_solicitud     date not null default current_date,
  fecha_entrega       date,
  pax                 integer,
  tiqueteador_user_id uuid,
  activo              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  user_id             uuid not null,
  updated_by          uuid
  -- responsable_id   uuid,  -- descomentar si la app debe seguir guardando responsable
);

-- Si inicio/fin en tu BD son text, ejecuta antes del INSERT:
-- alter table public.th_solicitud_mice_new alter column inicio type text using inicio::text;
-- alter table public.th_solicitud_mice_new alter column fin type text using fin::text;


-- -----------------------------------------------------------------------------
-- 3) Copiar datos (solo columnas que existan en la tabla actual)
-- -----------------------------------------------------------------------------
do $$
declare
  v_has_responsable boolean;
  v_has_updated_by  boolean;
  v_sql             text;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'th_solicitud_mice'
      and column_name = 'responsable_id'
  ) into v_has_responsable;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'th_solicitud_mice'
      and column_name = 'updated_by'
  ) into v_has_updated_by;

  v_sql := format(
    $q$
    insert into public.th_solicitud_mice_new (
      id, anio, cliente_id, sector_id, mzp, nombre, inicio, fin,
      estado_id, probabilidad_id, moneda_cotizacion, valor_cotizado, utilidad_proyectada,
      fecha_solicitud, fecha_entrega, pax, tiqueteador_user_id, activo,
      created_at, updated_at, user_id, updated_by
    )
    select
      id, anio, cliente_id, sector_id, mzp, nombre, inicio, fin,
      estado_id, probabilidad_id, moneda_cotizacion, valor_cotizado, utilidad_proyectada,
      fecha_solicitud, fecha_entrega, pax, tiqueteador_user_id, activo,
      created_at, updated_at, user_id,
      %s
    from public.th_solicitud_mice
    $q$,
    case when v_has_updated_by then 'updated_by' else 'null::uuid' end
  );

  execute v_sql;

  if v_has_responsable then
    raise warning
      'La tabla vieja tenía responsable_id pero la nueva NO. Revisa si debes descomentar responsable_id en CREATE/INSERT.';
  end if;
end $$;


-- -----------------------------------------------------------------------------
-- 4) Reemplazar tabla
-- -----------------------------------------------------------------------------
drop table public.th_solicitud_mice;
alter table public.th_solicitud_mice_new rename to th_solicitud_mice;


-- -----------------------------------------------------------------------------
-- 5) FKs, checks e índices de cabecera
-- -----------------------------------------------------------------------------
alter table public.th_solicitud_mice
  add constraint th_solicitud_mice_user_id_fk
  foreign key (user_id) references auth.users (id) on delete restrict;

alter table public.th_solicitud_mice
  add constraint th_solicitud_mice_updated_by_fk
  foreign key (updated_by) references auth.users (id) on delete set null;

alter table public.th_solicitud_mice
  add constraint th_solicitud_mice_tiqueteador_user_id_fk
  foreign key (tiqueteador_user_id) references auth.users (id) on delete set null;

do $$ begin
  alter table public.th_solicitud_mice
    add constraint th_solicitud_mice_cliente_id_fk
    foreign key (cliente_id) references raw.xmart_clientes_zeppelin (customerid);
exception when others then
  raise notice 'FK cliente_id omitida: %', sqlerrm;
end $$;

alter table public.th_solicitud_mice
  add constraint th_solicitud_mice_sector_id_fk
  foreign key (sector_id) references public.td_sectores (id);

alter table public.th_solicitud_mice
  add constraint th_solicitud_mice_estado_id_fk
  foreign key (estado_id) references public.td_estados (id);

alter table public.th_solicitud_mice
  add constraint th_solicitud_mice_probabilidad_id_fk
  foreign key (probabilidad_id) references public.td_probabilidades (id);

do $$ begin
  alter table public.th_solicitud_mice
    add constraint th_solicitud_mice_moneda_fk
    foreign key (moneda_cotizacion) references public.td_monedas (codigo);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.th_solicitud_mice
    add constraint th_solicitud_mice_mzp_format check (mzp is null or mzp ~ '^MZP[0-9]{1,3}$');
exception when duplicate_object then null;
end $$;

-- check fechas evento solo si inicio/fin son tipo date en tu BD

do $$ begin
  alter table public.th_solicitud_mice
    add constraint th_solicitud_mice_fechas_solicitud
    check (fecha_entrega is null or fecha_entrega >= fecha_solicitud);
exception when duplicate_object then null;
end $$;

create index if not exists th_solicitud_mice_user_id_idx on public.th_solicitud_mice (user_id);
create index if not exists th_solicitud_mice_anio_idx on public.th_solicitud_mice (anio);
create index if not exists th_solicitud_mice_estado_id_idx on public.th_solicitud_mice (estado_id);
create index if not exists th_solicitud_mice_sector_id_idx on public.th_solicitud_mice (sector_id);
create index if not exists th_solicitud_mice_probabilidad_id_idx on public.th_solicitud_mice (probabilidad_id);
create index if not exists th_solicitud_mice_cliente_id_idx on public.th_solicitud_mice (cliente_id);
create index if not exists th_solicitud_mice_mzp_idx on public.th_solicitud_mice (mzp);


-- -----------------------------------------------------------------------------
-- 6) FKs hijas de vuelta
-- -----------------------------------------------------------------------------
alter table public.th_solicitud_mice_servicios
  add constraint th_solicitud_mice_servicios_solicitud_id_fk
  foreign key (solicitud_id) references public.th_solicitud_mice (id) on delete cascade;

alter table public.th_solicitud_mice_destinos
  add constraint th_solicitud_mice_destinos_solicitud_id_fk
  foreign key (solicitud_id) references public.th_solicitud_mice (id) on delete cascade;

alter table public.th_solicitud_mice_lugares
  add constraint th_solicitud_mice_lugares_solicitud_id_fk
  foreign key (solicitud_id) references public.th_solicitud_mice (id) on delete cascade;

alter table public.th_solicitud_mice_seguimientos
  add constraint th_solicitud_mice_seguimientos_solicitud_id_fk
  foreign key (solicitud_id) references public.th_solicitud_mice (id) on delete cascade;


-- -----------------------------------------------------------------------------
-- 6b) Restaurar políticas RLS en tablas hijas y auditoría
-- -----------------------------------------------------------------------------
create policy solicitud_mice_servicios_all on public.th_solicitud_mice_servicios
  for all to authenticated
  using (
    exists (
      select 1 from public.th_solicitud_mice s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.th_solicitud_mice s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  );

create policy solicitud_mice_destinos_all on public.th_solicitud_mice_destinos
  for all to authenticated
  using (
    exists (
      select 1 from public.th_solicitud_mice s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.th_solicitud_mice s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  );

create policy solicitud_mice_lugares_all on public.th_solicitud_mice_lugares
  for all to authenticated
  using (
    exists (
      select 1 from public.th_solicitud_mice s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.th_solicitud_mice s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  );

create policy solicitud_mice_seguimientos_select on public.th_solicitud_mice_seguimientos
  for select to authenticated
  using (
    exists (
      select 1 from public.th_solicitud_mice s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  );

create policy solicitud_mice_seguimientos_insert on public.th_solicitud_mice_seguimientos
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.th_solicitud_mice s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  );

create policy log_auditoria_select on public.th_log_auditoria
  for select to authenticated
  using (
    (modulo = 'solicitudes-mice' and exists (
      select 1 from public.th_solicitud_mice s
      where s.id = id_registro and (s.user_id = auth.uid() or public.is_admin())
    ))
    or (modulo = 'solicitudes-corporativos' and exists (
      select 1 from public.th_solicitud_corporativos s
      where s.id = id_registro and (s.user_id = auth.uid() or public.is_admin())
    ))
  );

create policy log_auditoria_insert on public.th_log_auditoria
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      (modulo = 'solicitudes-mice' and exists (
        select 1 from public.th_solicitud_mice s
        where s.id = id_registro and (s.user_id = auth.uid() or public.is_admin())
      ))
      or (modulo = 'solicitudes-corporativos' and exists (
        select 1 from public.th_solicitud_corporativos s
        where s.id = id_registro and (s.user_id = auth.uid() or public.is_admin())
      ))
    )
  );


-- -----------------------------------------------------------------------------
-- 7) Trigger updated_at + RLS cabecera
-- -----------------------------------------------------------------------------
drop trigger if exists solicitudes_mice_updated_at on public.th_solicitud_mice;
drop trigger if exists th_solicitud_mice_updated_at on public.th_solicitud_mice;

create trigger th_solicitud_mice_updated_at
  before update on public.th_solicitud_mice
  for each row execute function public.set_updated_at();

alter table public.th_solicitud_mice enable row level security;

drop policy if exists th_solicitud_mice_select on public.th_solicitud_mice;
drop policy if exists th_solicitud_mice_insert on public.th_solicitud_mice;
drop policy if exists th_solicitud_mice_update on public.th_solicitud_mice;
drop policy if exists th_solicitud_mice_delete on public.th_solicitud_mice;

create policy th_solicitud_mice_select on public.th_solicitud_mice
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy th_solicitud_mice_insert on public.th_solicitud_mice
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());

create policy th_solicitud_mice_update on public.th_solicitud_mice
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy th_solicitud_mice_delete on public.th_solicitud_mice
  for delete to authenticated
  using (public.is_admin());


-- -----------------------------------------------------------------------------
-- 8) Vista resumen (usa user_id si no hay responsable_id)
-- -----------------------------------------------------------------------------
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
  s.user_id as responsable_id,
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
  s.updated_at,
  s.updated_by
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
left join public.td_profiles p on p.id = s.user_id
left join public.td_profiles tiq on tiq.id = s.tiqueteador_user_id
where s.activo = true;

grant select on public.v_solicitudes_mice_resumen to authenticated;


-- -----------------------------------------------------------------------------
-- 9) Verificar orden de columnas
-- -----------------------------------------------------------------------------
select ordinal_position, column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'th_solicitud_mice'
order by ordinal_position;

commit;

notify pgrst, 'reload schema';
