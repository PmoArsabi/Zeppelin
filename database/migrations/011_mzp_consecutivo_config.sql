-- =============================================================================
-- Configuración del consecutivo MZP (inicio configurable por admin)
-- Ejecutar en Supabase → SQL Editor
-- =============================================================================

create table if not exists public.td_config (
  clave text primary key,
  valor text not null,
  descripcion text,
  updated_at timestamptz not null default now()
);

comment on table public.td_config is 'Parámetros de aplicación (clave/valor).';
comment on column public.td_config.clave is 'Identificador único del parámetro.';
comment on column public.td_config.valor is 'Valor en texto; la app interpreta según clave.';

-- Cambiar el inicio del MZP solo desde Supabase (Table Editor o SQL), no desde la app:
--   update public.td_config set valor = '117' where clave = 'mzp_consecutivo_inicio';

insert into public.td_config (clave, valor, descripcion)
values (
  'mzp_consecutivo_inicio',
  '1',
  'Primer número MZP (1 = MZP1). El siguiente asignado es max(último en th_solicitud_mice, inicio − 1) + 1.'
)
on conflict (clave) do nothing;

alter table public.td_config enable row level security;

drop policy if exists td_config_select on public.td_config;
create policy td_config_select on public.td_config
  for select to authenticated
  using (true);

drop policy if exists td_config_update on public.td_config;
create policy td_config_update on public.td_config
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists td_config_insert on public.td_config;
create policy td_config_insert on public.td_config
  for insert to authenticated
  with check (public.is_admin());

grant select, insert, update on public.td_config to authenticated;

notify pgrst, 'reload schema';
