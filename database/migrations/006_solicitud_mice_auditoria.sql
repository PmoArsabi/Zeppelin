-- =============================================================================
-- DEPRECADO: usar 007_log_auditoria_generico.sql (tabla log_auditoria + columna modulo)
-- Este script creaba solicitud_mice_auditoria solo para MICE.
-- =============================================================================

create table if not exists public.solicitud_mice_auditoria (
  id uuid primary key default gen_random_uuid(),
  id_registro uuid not null references public.solicitudes_mice (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete restrict,
  autor_nombre text,
  fecha_actualizacion timestamptz not null default now(),
  observacion text not null check (char_length(trim(observacion)) >= 1)
);

create index if not exists solicitud_mice_auditoria_registro_idx
  on public.solicitud_mice_auditoria (id_registro, fecha_actualizacion desc);

comment on table public.solicitud_mice_auditoria is
  'Historial de modificaciones al guardar una cotización MICE existente.';
comment on column public.solicitud_mice_auditoria.id_registro is
  'ID de la fila en solicitudes_mice';
comment on column public.solicitud_mice_auditoria.observacion is
  'Detalle legible de campos modificados (una línea por cambio).';

alter table public.solicitud_mice_auditoria enable row level security;

drop policy if exists solicitud_mice_auditoria_select on public.solicitud_mice_auditoria;
create policy solicitud_mice_auditoria_select on public.solicitud_mice_auditoria
  for select to authenticated
  using (
    exists (
      select 1 from public.solicitudes_mice s
      where s.id = id_registro and (s.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists solicitud_mice_auditoria_insert on public.solicitud_mice_auditoria;
create policy solicitud_mice_auditoria_insert on public.solicitud_mice_auditoria
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.solicitudes_mice s
      where s.id = id_registro and (s.user_id = auth.uid() or public.is_admin())
    )
  );

grant select, insert on public.solicitud_mice_auditoria to authenticated;

notify pgrst, 'reload schema';

-- Fin 006
