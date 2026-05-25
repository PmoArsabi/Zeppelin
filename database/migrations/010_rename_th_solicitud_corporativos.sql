-- =============================================================================
-- Corrige nombre: th_solicitudes_corporativos → th_solicitud_corporativos
-- Ejecutar en Supabase → SQL Editor si ya corriste 009 con el nombre anterior
-- =============================================================================

do $$
begin
  if exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'th_solicitudes_corporativos'
  ) and not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'th_solicitud_corporativos'
  ) then
    alter table public.th_solicitudes_corporativos rename to th_solicitud_corporativos;
    raise notice 'Renamed th_solicitudes_corporativos → th_solicitud_corporativos';
  end if;
end $$;

-- Trigger seguimiento corp
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

-- RLS auditoría
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

-- RLS seguimiento corp
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

notify pgrst, 'reload schema';

select table_name
from information_schema.tables
where table_schema = 'public' and table_name = 'th_solicitud_corporativos';
