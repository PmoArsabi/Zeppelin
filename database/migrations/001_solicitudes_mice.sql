-- =============================================================================
-- Módulo: Solicitud MICE (alineado a "control de cotizaciones MICE.xlsx")
-- Ejecutar en Supabase → SQL Editor
-- =============================================================================

create table if not exists public.sectores_mice (
  id smallserial primary key,
  nombre text not null unique
);

-- Sectores reales del Excel (268 filas de datos)
insert into public.sectores_mice (nombre) values
  ('Academico'), ('Agroindustrial'), ('Arquitectura'), ('Aseguradora'),
  ('Automotores'), ('Automotriz'), ('Banca'), ('Comercio de pinturas'),
  ('Comunicaciones'), ('Educativo'), ('Electrocarburos'), ('Farma'),
  ('Farmaceutica'), ('Fundacion'), ('Industrial'), ('Marketing'),
  ('Multinivel'), ('Oleoducto'), ('Otros'), ('Periodico'), ('Pharma'),
  ('Retail'), ('Salud'), ('Seguros'), ('Servicios'), ('TELEVISION'),
  ('Tecnologia'), ('Television')
on conflict (nombre) do nothing;

create table if not exists public.solicitudes_mice (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,

  anio smallint not null check (anio >= 2000 and anio <= 2100),

  responsable_id uuid not null references auth.users (id) on delete restrict,
  responsable_nombre text not null,

  cliente text not null,
  sector text,
  mzp text,
  nombre text not null,

  -- Fechas del evento (YYYY-MM-DD desde el formulario)
  inicio date,
  fin date,
  constraint solicitudes_mice_fechas_evento check (
    fin is null or inicio is null or fin >= inicio
  ),

  estado text not null default 'Cerrado'
    check (estado in (
      'Cerrado',
      'No adjudicado - No ganado',
      'Cancelado'
    )),

  valor_cotizado numeric(15, 2) check (valor_cotizado is null or valor_cotizado >= 0),
  utilidad_proyectada numeric(15, 2),

  fecha_solicitud date not null default (current_date),
  fecha_entrega date,

  servicios text,
  pax integer check (pax is null or pax >= 0),
  lugar text,
  pais_destino text,
  ciudad_destino text,
  tiqueteador_asignado text,

  probabilidad text check (probabilidad is null or probabilidad in (
    'Baja', 'Media', 'Alta', 'N/A'
  )),

  seguimiento text,
  activo boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists solicitudes_mice_user_id_idx on public.solicitudes_mice (user_id);
create index if not exists solicitudes_mice_anio_idx on public.solicitudes_mice (anio);
create index if not exists solicitudes_mice_estado_idx on public.solicitudes_mice (estado);
create index if not exists solicitudes_mice_mzp_idx on public.solicitudes_mice (mzp);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists solicitudes_mice_updated_at on public.solicitudes_mice;
create trigger solicitudes_mice_updated_at
  before update on public.solicitudes_mice
  for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

alter table public.solicitudes_mice enable row level security;
alter table public.sectores_mice enable row level security;

create policy sectores_mice_select on public.sectores_mice
  for select to authenticated using (true);

create policy solicitudes_mice_select on public.solicitudes_mice
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy solicitudes_mice_insert on public.solicitudes_mice
  for insert to authenticated
  with check (user_id = auth.uid() and responsable_id = auth.uid());

create policy solicitudes_mice_update on public.solicitudes_mice
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy solicitudes_mice_delete on public.solicitudes_mice
  for delete to authenticated
  using (public.is_admin());
