-- =============================================================================
-- Zeppelin — Log de auditoría genérico (todos los módulos)
-- Reemplaza solicitud_mice_auditoria (006) con tabla única por columna modulo
-- Ejecutar en Supabase → SQL Editor
-- =============================================================================

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create table if not exists public.log_auditoria (
  id uuid primary key default gen_random_uuid(),
  modulo text not null check (modulo in ('solicitudes-mice', 'solicitudes-corporativos')),
  id_registro uuid not null,
  user_id uuid not null references auth.users (id) on delete restrict,
  autor_nombre text,
  fecha_actualizacion timestamptz not null default now(),
  observacion text not null check (char_length(trim(observacion)) >= 1)
);

create index if not exists log_auditoria_modulo_registro_idx
  on public.log_auditoria (modulo, id_registro, fecha_actualizacion desc);

comment on table public.log_auditoria is
  'Historial de cambios al editar registros; modulo identifica Solicitud MICE, Solicitud Corp, etc.';
comment on column public.log_auditoria.modulo is
  'solicitudes-mice | solicitudes-corporativos (alineado a ModuleId de la app)';
comment on column public.log_auditoria.id_registro is
  'UUID del registro editado en la tabla del módulo';
comment on column public.log_auditoria.observacion is
  'Detalle legible: una línea por campo modificado';

-- Migrar datos de 006 solo si existía la tabla antigua (opcional)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'solicitud_mice_auditoria'
  ) then
    insert into public.log_auditoria (modulo, id_registro, user_id, autor_nombre, fecha_actualizacion, observacion)
    select
      'solicitudes-mice',
      a.id_registro,
      a.user_id,
      a.autor_nombre,
      a.fecha_actualizacion,
      a.observacion
    from public.solicitud_mice_auditoria a
    where not exists (
      select 1 from public.log_auditoria l
      where l.modulo = 'solicitudes-mice' and l.id = a.id
    );
  end if;
end $$;

alter table public.log_auditoria enable row level security;

drop policy if exists log_auditoria_select on public.log_auditoria;
create policy log_auditoria_select on public.log_auditoria
  for select to authenticated
  using (
    (modulo = 'solicitudes-mice' and exists (
      select 1 from public.solicitudes_mice s
      where s.id = id_registro and (s.user_id = auth.uid() or public.is_admin())
    ))
    or (modulo = 'solicitudes-corporativos' and exists (
      select 1 from public.solicitudes s
      where s.id = id_registro and (s.user_id = auth.uid() or public.is_admin())
    ))
  );

drop policy if exists log_auditoria_insert on public.log_auditoria;
create policy log_auditoria_insert on public.log_auditoria
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      (modulo = 'solicitudes-mice' and exists (
        select 1 from public.solicitudes_mice s
        where s.id = id_registro and (s.user_id = auth.uid() or public.is_admin())
      ))
      or (modulo = 'solicitudes-corporativos' and exists (
        select 1 from public.solicitudes s
        where s.id = id_registro and (s.user_id = auth.uid() or public.is_admin())
      ))
    )
  );

grant select, insert on public.log_auditoria to authenticated;

-- Opcional: eliminar tabla antigua solo-MICE (descomenta si ya migraste)
-- drop table if exists public.solicitud_mice_auditoria cascade;

notify pgrst, 'reload schema';

-- Fin 007
