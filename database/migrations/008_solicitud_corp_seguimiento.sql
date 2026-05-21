-- =============================================================================
-- Zeppelin — Historial de seguimientos solicitudes corporativas (bitácora chat)
-- Requiere: public.solicitudes (módulo Solicitud Corp ya en uso)
-- Ejecutar TODO este archivo en Supabase → SQL Editor → Run
-- Después: Settings → API → Reload schema (o esperar ~1 min) y F5 en la app
-- =============================================================================

-- Función usada en RLS (también definida en 005 MICE; idempotente)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create table if not exists public.solicitud_seguimientos (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete restrict,
  autor_nombre text not null,
  mensaje text not null check (char_length(trim(mensaje)) >= 1 and char_length(mensaje) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists solicitud_seguimientos_solicitud_idx
  on public.solicitud_seguimientos (solicitud_id, created_at);

comment on table public.solicitud_seguimientos is
  'Entradas de seguimiento por solicitud corporativa (trazabilidad con autor y fecha).';

-- Sincroniza texto legacy en solicitudes.observaciones (opcional, compatibilidad)
create or replace function public.sync_solicitud_corp_observaciones_text()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.solicitudes s
  set observaciones = (
    select nullif(
      string_agg(
        to_char(h.created_at at time zone 'America/Bogota', 'YYYY-MM-DD HH24:MI')
        || ' | ' || h.autor_nombre || ': ' || h.mensaje,
        E'\n' order by h.created_at
      ),
      ''
    )
    from public.solicitud_seguimientos h
    where h.solicitud_id = coalesce(NEW.solicitud_id, OLD.solicitud_id)
  )
  where s.id = coalesce(NEW.solicitud_id, OLD.solicitud_id);
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists solicitud_seguimientos_sync_text on public.solicitud_seguimientos;
create trigger solicitud_seguimientos_sync_text
  after insert or update or delete on public.solicitud_seguimientos
  for each row execute function public.sync_solicitud_corp_observaciones_text();

-- Migrar observaciones antiguas a la primera entrada del chat
insert into public.solicitud_seguimientos (solicitud_id, user_id, autor_nombre, mensaje, created_at)
select
  s.id,
  s.user_id,
  coalesce(nullif(trim(s.asesor), ''), 'Usuario'),
  trim(s.observaciones),
  coalesce(s.updated_at, s.created_at)
from public.solicitudes s
where s.observaciones is not null
  and trim(s.observaciones) <> ''
  and not exists (
    select 1 from public.solicitud_seguimientos h where h.solicitud_id = s.id
  );

alter table public.solicitud_seguimientos enable row level security;

drop policy if exists solicitud_seguimientos_select on public.solicitud_seguimientos;
create policy solicitud_seguimientos_select on public.solicitud_seguimientos
  for select to authenticated
  using (
    exists (
      select 1 from public.solicitudes s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists solicitud_seguimientos_insert on public.solicitud_seguimientos;
create policy solicitud_seguimientos_insert on public.solicitud_seguimientos
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.solicitudes s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  );

grant select, insert on public.solicitud_seguimientos to authenticated;
grant usage on schema public to authenticated;

notify pgrst, 'reload schema';

-- Verificación (debe devolver 1 fila: solicitud_seguimientos)
select table_name
from information_schema.tables
where table_schema = 'public' and table_name = 'solicitud_seguimientos';
