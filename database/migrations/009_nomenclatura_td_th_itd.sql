-- =============================================================================
-- Zeppelin — Renombrado de tablas (td_ / th_ / itd_)
-- Ejecutar UNA vez en Supabase → SQL Editor (bases que ya tienen 001–008)
-- Idempotente: si una tabla ya tiene el nombre nuevo, se omite ese rename.
-- Después: Settings → API → Reload schema (o NOTIFY al final de este script)
-- =============================================================================

create or replace function public._zep_rename_table(old_name text, new_name text)
returns void
language plpgsql
as $$
begin
  if old_name = new_name then
    return;
  end if;
  if exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = old_name
  ) and not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = new_name
  ) then
    execute format('alter table public.%I rename to %I', old_name, new_name);
    raise notice 'Renamed public.% → public.%', old_name, new_name;
  elsif exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = new_name
  ) then
    raise notice 'Skip rename % → % (destino ya existe)', old_name, new_name;
  else
    raise notice 'Skip rename % → % (origen no existe)', old_name, new_name;
  end if;
end;
$$;

-- Catálogos / dimensiones (td_) y perfiles (td_profiles)
select public._zep_rename_table('anios_mice', 'td_anios_mice');
select public._zep_rename_table('monedas_mice', 'td_monedas');
select public._zep_rename_table('estados_mice', 'td_estados');
select public._zep_rename_table('probabilidades_mice', 'td_probabilidades');
select public._zep_rename_table('lugares_mice', 'td_lugares');
select public._zep_rename_table('servicios_mice', 'td_servicios');
select public._zep_rename_table('sectores_mice', 'td_sectores');
select public._zep_rename_table('paises_destino', 'td_pais_destino');
select public._zep_rename_table('ciudades_destino', 'td_ciudades_destino');
select public._zep_rename_table('profiles', 'td_profiles');
select public._zep_rename_table('itd_profiles', 'td_profiles');

-- Cabeceras y hechos (th_)
select public._zep_rename_table('solicitudes_mice', 'th_solicitud_mice');
select public._zep_rename_table('solicitud_mice_servicios', 'th_solicitud_mice_servicios');
select public._zep_rename_table('solicitud_mice_destinos', 'th_solicitud_mice_destinos');
select public._zep_rename_table('solicitud_mice_lugares', 'th_solicitud_mice_lugares');
select public._zep_rename_table('solicitud_mice_seguimientos', 'th_solicitud_mice_seguimientos');
select public._zep_rename_table('log_auditoria', 'th_log_auditoria');
select public._zep_rename_table('solicitudes', 'th_solicitud_corporativos');
select public._zep_rename_table('th_solicitud_corporativos', 'th_solicitud_corporativos');
select public._zep_rename_table('solicitud_seguimientos', 'th_solicitud_seguimientos');

-- -----------------------------------------------------------------------------
-- Funciones con nombres de tabla embebidos
-- -----------------------------------------------------------------------------
create or replace function public.validar_destino_ciudad_pais()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from public.td_ciudades_destino cd
    where cd.id = new.ciudad_id and cd.pais_id = new.pais_id
  ) then
    raise exception 'La ciudad no corresponde al país seleccionado';
  end if;
  return new;
end;
$$;

drop trigger if exists solicitud_mice_destinos_validar on public.th_solicitud_mice_destinos;
create trigger solicitud_mice_destinos_validar
  before insert or update on public.th_solicitud_mice_destinos
  for each row execute function public.validar_destino_ciudad_pais();

create or replace function public.sync_solicitud_seguimiento_text()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.th_solicitud_mice s
  set seguimiento = (
    select nullif(
      string_agg(
        to_char(h.created_at at time zone 'America/Bogota', 'YYYY-MM-DD HH24:MI')
        || ' | ' || h.autor_nombre || ': ' || h.mensaje,
        E'\n' order by h.created_at
      ),
      ''
    )
    from public.th_solicitud_mice_seguimientos h
    where h.solicitud_id = coalesce(NEW.solicitud_id, OLD.solicitud_id)
  )
  where s.id = coalesce(NEW.solicitud_id, OLD.solicitud_id);
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists solicitud_mice_seguimientos_sync_text on public.th_solicitud_mice_seguimientos;
create trigger solicitud_mice_seguimientos_sync_text
  after insert or update or delete on public.th_solicitud_mice_seguimientos
  for each row execute function public.sync_solicitud_seguimiento_text();

-- Corp (trigger en th_solicitud_seguimientos)
create or replace function public.sync_solicitud_corp_observaciones_text()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.th_solicitud_corporativos s
  set observaciones = (
    select nullif(
      string_agg(
        to_char(h.created_at at time zone 'America/Bogota', 'YYYY-MM-DD HH24:MI')
        || ' | ' || h.autor_nombre || ': ' || h.mensaje,
        E'\n' order by h.created_at
      ),
      ''
    )
    from public.th_solicitud_seguimientos h
    where h.solicitud_id = coalesce(NEW.solicitud_id, OLD.solicitud_id)
  )
  where s.id = coalesce(NEW.solicitud_id, OLD.solicitud_id);
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists solicitud_seguimientos_sync_text on public.th_solicitud_seguimientos;
create trigger solicitud_seguimientos_sync_text
  after insert or update or delete on public.th_solicitud_seguimientos
  for each row execute function public.sync_solicitud_corp_observaciones_text();

-- -----------------------------------------------------------------------------
-- Vista de resumen MICE
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
  s.moneda_cotizacion,
  s.valor_cotizado,
  s.utilidad_proyectada,
  s.fecha_solicitud,
  s.fecha_entrega,
  s.responsable_nombre,
  s.probabilidad,
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

-- -----------------------------------------------------------------------------
-- RLS: th_log_auditoria (referencias a cabeceras renombradas)
-- -----------------------------------------------------------------------------
drop policy if exists log_auditoria_select on public.th_log_auditoria;
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

drop policy if exists log_auditoria_insert on public.th_log_auditoria;
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
-- RLS: tablas de relación MICE → th_solicitud_mice
-- -----------------------------------------------------------------------------
drop policy if exists solicitud_mice_servicios_all on public.th_solicitud_mice_servicios;
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

drop policy if exists solicitud_mice_destinos_all on public.th_solicitud_mice_destinos;
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

drop policy if exists solicitud_mice_lugares_all on public.th_solicitud_mice_lugares;
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

-- -----------------------------------------------------------------------------
-- RLS: seguimientos MICE y Corp
-- -----------------------------------------------------------------------------
drop policy if exists solicitud_mice_seguimientos_select on public.th_solicitud_mice_seguimientos;
create policy solicitud_mice_seguimientos_select on public.th_solicitud_mice_seguimientos
  for select to authenticated
  using (
    exists (
      select 1 from public.th_solicitud_mice s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists solicitud_mice_seguimientos_insert on public.th_solicitud_mice_seguimientos;
create policy solicitud_mice_seguimientos_insert on public.th_solicitud_mice_seguimientos
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.th_solicitud_mice s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists solicitud_seguimientos_select on public.th_solicitud_seguimientos;
create policy solicitud_seguimientos_select on public.th_solicitud_seguimientos
  for select to authenticated
  using (
    exists (
      select 1 from public.th_solicitud_corporativos s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists solicitud_seguimientos_insert on public.th_solicitud_seguimientos;
create policy solicitud_seguimientos_insert on public.th_solicitud_seguimientos
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.th_solicitud_corporativos s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  );

-- Catálogos td_* (políticas select)
do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      ('anios_mice', 'td_anios_mice'),
      ('monedas_mice', 'td_monedas'),
      ('estados_mice', 'td_estados'),
      ('probabilidades_mice', 'td_probabilidades'),
      ('lugares_mice', 'td_lugares'),
      ('servicios_mice', 'td_servicios'),
      ('paises_destino', 'td_pais_destino'),
      ('ciudades_destino', 'td_ciudades_destino'),
      ('sectores_mice', 'td_sectores')
    ) as t(old_name, new_name)
  loop
    if exists (
      select 1 from pg_tables
      where schemaname = 'public' and tablename = rec.new_name
    ) then
      execute format('drop policy if exists %I_select on public.%I', rec.old_name, rec.new_name);
      execute format(
        'create policy %I_select on public.%I for select to authenticated using (true)',
        rec.new_name, rec.new_name
      );
    end if;
  end loop;
end $$;

-- td_profiles: políticas
drop policy if exists profiles_select on public.td_profiles;
drop policy if exists profiles_update on public.td_profiles;
drop policy if exists profiles_insert on public.td_profiles;
drop policy if exists itd_profiles_select on public.td_profiles;
drop policy if exists itd_profiles_update on public.td_profiles;
drop policy if exists itd_profiles_insert on public.td_profiles;

create policy td_profiles_select on public.td_profiles
  for select to authenticated using (true);

create policy td_profiles_update on public.td_profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy td_profiles_insert on public.td_profiles
  for insert to authenticated
  with check (id = auth.uid());

-- RLS cabecera MICE (th_solicitud_mice)
drop policy if exists solicitudes_mice_select on public.th_solicitud_mice;
drop policy if exists solicitudes_mice_insert on public.th_solicitud_mice;
drop policy if exists solicitudes_mice_update on public.th_solicitud_mice;
drop policy if exists solicitudes_mice_delete on public.th_solicitud_mice;

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

drop policy if exists sectores_mice_select on public.td_sectores;
create policy td_sectores_select on public.td_sectores
  for select to authenticated using (true);

grant select, insert on public.th_log_auditoria to authenticated;
grant select, insert on public.th_solicitud_mice_seguimientos to authenticated;
grant select, insert on public.th_solicitud_seguimientos to authenticated;

drop function if exists public._zep_rename_table(text, text);

notify pgrst, 'reload schema';

-- Verificación rápida (debe listar nombres nuevos)
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'td_anios_mice', 'td_monedas', 'td_estados', 'td_probabilidades',
    'td_lugares', 'td_servicios', 'td_sectores', 'td_pais_destino',
    'td_ciudades_destino', 'td_profiles', 'th_solicitud_mice',
    'th_solicitud_mice_servicios', 'th_solicitud_mice_destinos',
    'th_solicitud_mice_lugares', 'th_solicitud_mice_seguimientos',
    'th_log_auditoria', 'th_solicitud_corporativos', 'th_solicitud_seguimientos'
  )
order by table_name;
