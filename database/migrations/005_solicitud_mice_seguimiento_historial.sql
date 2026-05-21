-- =============================================================================
-- Zeppelin — Historial de seguimientos MICE (bitácora tipo chat)
-- Ejecutar en Supabase → SQL Editor (requiere solicitudes_mice de 001)
-- Después: Settings → API → Reload schema (o recargar la app en 1 min)
-- =============================================================================

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create table if not exists public.solicitud_mice_seguimientos (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes_mice (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete restrict,
  autor_nombre text not null,
  mensaje text not null check (char_length(trim(mensaje)) >= 1 and char_length(mensaje) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists solicitud_mice_seguimientos_solicitud_idx
  on public.solicitud_mice_seguimientos (solicitud_id, created_at);

comment on table public.solicitud_mice_seguimientos is
  'Entradas de seguimiento por cotización MICE (trazabilidad con autor y fecha).';

-- Denormaliza historial en solicitudes_mice.seguimiento (compatibilidad Excel / listados)
create or replace function public.sync_solicitud_seguimiento_text()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.solicitudes_mice s
  set seguimiento = (
    select nullif(
      string_agg(
        to_char(h.created_at at time zone 'America/Bogota', 'YYYY-MM-DD HH24:MI')
        || ' | ' || h.autor_nombre || ': ' || h.mensaje,
        E'\n' order by h.created_at
      ),
      ''
    )
    from public.solicitud_mice_seguimientos h
    where h.solicitud_id = coalesce(NEW.solicitud_id, OLD.solicitud_id)
  )
  where s.id = coalesce(NEW.solicitud_id, OLD.solicitud_id);
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists solicitud_mice_seguimientos_sync_text on public.solicitud_mice_seguimientos;
create trigger solicitud_mice_seguimientos_sync_text
  after insert or update or delete on public.solicitud_mice_seguimientos
  for each row execute function public.sync_solicitud_seguimiento_text();

-- Migrar texto legacy (una sola entrada por solicitud que aún no tiene historial)
insert into public.solicitud_mice_seguimientos (solicitud_id, user_id, autor_nombre, mensaje, created_at)
select
  s.id,
  s.user_id,
  s.responsable_nombre,
  trim(s.seguimiento),
  coalesce(s.updated_at, s.created_at)
from public.solicitudes_mice s
where s.seguimiento is not null
  and trim(s.seguimiento) <> ''
  and not exists (
    select 1 from public.solicitud_mice_seguimientos h where h.solicitud_id = s.id
  );

-- RLS
alter table public.solicitud_mice_seguimientos enable row level security;

drop policy if exists solicitud_mice_seguimientos_select on public.solicitud_mice_seguimientos;
create policy solicitud_mice_seguimientos_select on public.solicitud_mice_seguimientos
  for select to authenticated
  using (
    exists (
      select 1 from public.solicitudes_mice s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists solicitud_mice_seguimientos_insert on public.solicitud_mice_seguimientos;
create policy solicitud_mice_seguimientos_insert on public.solicitud_mice_seguimientos
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.solicitudes_mice s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  );

grant select, insert on public.solicitud_mice_seguimientos to authenticated;

notify pgrst, 'reload schema';

-- Fin 005
