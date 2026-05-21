-- =============================================================================
-- Si ya ejecutaste 003 con tiqueteadores_mice, corre este script para alinearlo
-- Tiqueteador = usuario (auth.users / profiles), no catálogo aparte
-- =============================================================================

-- Quitar catálogo obsoleto
drop table if exists public.tiqueteadores_mice cascade;

-- Quitar FK antigua si existía
alter table public.solicitudes_mice
  drop column if exists tiqueteador_id;

-- Usuario tiqueteador (misma fuente que módulo Usuarios)
alter table public.solicitudes_mice
  add column if not exists tiqueteador_user_id uuid references auth.users (id) on delete set null;

-- Permitir leer perfiles para el desplegable de tiqueteador
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

comment on column public.solicitudes_mice.tiqueteador_user_id is
  'UUID del usuario tiqueteador (profiles / auth.users)';
comment on column public.solicitudes_mice.tiqueteador_asignado is
  'Nombre copiado de profiles.display_name al guardar (legacy / listados)';
