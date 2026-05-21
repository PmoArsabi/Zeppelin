-- =============================================================================
-- Zeppelin — MICE: catálogos en BD + tablas de relación (reemplaza datos quemados)
-- Ejecutar en Supabase → SQL Editor DESPUÉS de 001 y 002
-- Es idempotente: puede correrse más de una vez sin romper datos existentes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Utilidades
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- -----------------------------------------------------------------------------
-- 1. Perfiles (responsable / display_name)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- Lectura de perfiles para asignar tiqueteador en cotizaciones MICE (misma tabla de usuarios)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = auth.uid() or public.is_admin());

-- -----------------------------------------------------------------------------
-- 2. Catálogos simples (lookup)
-- -----------------------------------------------------------------------------

-- Años del formulario
create table if not exists public.anios_mice (
  anio smallint primary key,
  activo boolean not null default true
);
insert into public.anios_mice (anio) values (2026), (2025)
on conflict (anio) do nothing;

-- Monedas
create table if not exists public.monedas_mice (
  codigo text primary key check (codigo in ('COP', 'USD', 'EUR')),
  nombre text not null,
  activo boolean not null default true
);
insert into public.monedas_mice (codigo, nombre) values
  ('COP', 'Peso colombiano'),
  ('USD', 'Dólar estadounidense'),
  ('EUR', 'Euro')
on conflict (codigo) do nothing;

-- Estados cotización
create table if not exists public.estados_mice (
  codigo text primary key,
  nombre text not null unique,
  orden smallint not null default 0,
  activo boolean not null default true
);
insert into public.estados_mice (codigo, nombre, orden) values
  ('cerrado', 'Cerrado', 1),
  ('no_adjudicado', 'No adjudicado - No ganado', 2),
  ('cancelado', 'Cancelado', 3)
on conflict (codigo) do nothing;

-- Probabilidad
create table if not exists public.probabilidades_mice (
  codigo text primary key,
  nombre text not null unique,
  orden smallint not null default 0,
  activo boolean not null default true
);
insert into public.probabilidades_mice (codigo, nombre, orden) values
  ('baja', 'Baja', 1),
  ('media', 'Media', 2),
  ('alta', 'Alta', 3),
  ('na', 'N/A', 4)
on conflict (codigo) do nothing;

-- Lugar (Nacional / Internacional)
create table if not exists public.lugares_mice (
  id smallserial primary key,
  nombre text not null unique,
  orden smallint not null default 0,
  activo boolean not null default true
);
insert into public.lugares_mice (nombre, orden) values
  ('Nacional', 1),
  ('Internacional', 2)
on conflict (nombre) do nothing;

-- Tiqueteador: NO es catálogo aparte → ver tiqueteador_user_id en solicitudes_mice (FK auth.users / profiles)

-- Servicios SRV-01 … SRV-08
create table if not exists public.servicios_mice (
  id text primary key,
  label text not null,
  short_label text not null,
  ejemplos text,
  orden smallint not null default 0,
  activo boolean not null default true
);
insert into public.servicios_mice (id, label, short_label, ejemplos, orden) values
  ('SRV-01', 'Tiquetes / Vuelos', 'Tiquetes',
   'Vuelos, tiquetes aéreos, tiquetes nacionales/internacionales.', 1),
  ('SRV-02', 'Alojamiento', 'Alojamiento',
   'Hotel, alojamiento, habitación.', 2),
  ('SRV-03', 'Traslados', 'Traslados',
   'Transporte, traslados, acompañamiento en aeropuerto.', 3),
  ('SRV-04', 'Alimentos y Bebidas (AyB)', 'AyB',
   'Alimentación, catering, cenas, almuerzos, desayunos, coffee break, refrigerios.', 4),
  ('SRV-05', 'Eventos / Salones', 'Eventos',
   'Alquiler de salón, reserva de salón, ayudas audiovisuales, decoración.', 5),
  ('SRV-06', 'Actividades y Entretenimiento', 'Actividades',
   'Tours, actividades, giras, eventos deportivos, música/shows.', 6),
  ('SRV-07', 'Asistencia y Logística', 'Asistencia',
   'Tarjeta de asistencia, seguro de viaje, cartucheras/marca maletas.', 7),
  ('SRV-08', 'Otros / Corporativos', 'Otros',
   'Bonos, planes convención (paquete todo en uno).', 8)
on conflict (id) do update set
  label = excluded.label,
  short_label = excluded.short_label,
  ejemplos = excluded.ejemplos,
  orden = excluded.orden;

-- Sectores (si 001 no se corrió, crea la tabla)
create table if not exists public.sectores_mice (
  id smallserial primary key,
  nombre text not null unique,
  activo boolean not null default true
);
insert into public.sectores_mice (nombre) values
  ('Academico'), ('Agroindustrial'), ('Arquitectura'), ('Aseguradora'),
  ('Automotores'), ('Automotriz'), ('Banca'), ('Comercio de pinturas'),
  ('Comunicaciones'), ('Educativo'), ('Electrocarburos'), ('Farma'),
  ('Farmaceutica'), ('Fundacion'), ('Industrial'), ('Marketing'),
  ('Multinivel'), ('Oleoducto'), ('Otros'), ('Periodico'), ('Pharma'),
  ('Retail'), ('Salud'), ('Seguros'), ('Servicios'), ('TELEVISION'),
  ('Tecnologia'), ('Television')
on conflict (nombre) do nothing;

-- Países y ciudades destino
create table if not exists public.paises_destino (
  id smallserial primary key,
  nombre text not null unique,
  orden smallint not null default 0,
  activo boolean not null default true
);

create table if not exists public.ciudades_destino (
  id smallserial primary key,
  pais_id smallint not null references public.paises_destino (id) on delete cascade,
  nombre text not null,
  activo boolean not null default true,
  unique (pais_id, nombre)
);

-- Países
insert into public.paises_destino (nombre, orden) values
  ('Argentina', 1), ('Brasil', 2), ('Chile', 3), ('Colombia', 4),
  ('Costa Rica', 5), ('Cuba', 6), ('Ecuador', 7), ('España', 8),
  ('Estados Unidos', 9), ('México', 10), ('Panamá', 11), ('Paraguay', 12),
  ('Perú', 13), ('Puerto Rico', 14), ('República Dominicana', 15), ('Uruguay', 16)
on conflict (nombre) do nothing;

-- Ciudades por país (mismo catálogo que el frontend)
insert into public.ciudades_destino (pais_id, nombre)
select p.id, c.nombre from public.paises_destino p
join (values
  ('Colombia', 'Bogotá'), ('Colombia', 'Medellín'), ('Colombia', 'Cartagena'),
  ('Colombia', 'Cali'), ('Colombia', 'Barranquilla'), ('Colombia', 'Santa Marta'),
  ('Colombia', 'Pereira'), ('Colombia', 'San Andrés'),
  ('Panamá', 'Ciudad de Panamá'), ('Panamá', 'Bocas del Toro'), ('Panamá', 'Boquete'), ('Panamá', 'Colón'),
  ('República Dominicana', 'Punta Cana'), ('República Dominicana', 'Santo Domingo'),
  ('República Dominicana', 'La Romana'), ('República Dominicana', 'Puerto Plata'),
  ('República Dominicana', 'Samaná'),
  ('México', 'Ciudad de México'), ('México', 'Cancún'), ('México', 'Los Cabos'),
  ('México', 'Playa del Carmen'), ('México', 'Guadalajara'), ('México', 'Monterrey'),
  ('Estados Unidos', 'Miami'), ('Estados Unidos', 'Orlando'), ('Estados Unidos', 'Nueva York'),
  ('Estados Unidos', 'Las Vegas'), ('Estados Unidos', 'Los Ángeles'), ('Estados Unidos', 'Houston'),
  ('España', 'Madrid'), ('España', 'Barcelona'), ('España', 'Sevilla'),
  ('España', 'Valencia'), ('España', 'Málaga'),
  ('Argentina', 'Buenos Aires'), ('Argentina', 'Mendoza'), ('Argentina', 'Córdoba'), ('Argentina', 'Bariloche'),
  ('Chile', 'Santiago'), ('Chile', 'Viña del Mar'), ('Chile', 'Puerto Varas'),
  ('Perú', 'Lima'), ('Perú', 'Cusco'), ('Perú', 'Arequipa'),
  ('Brasil', 'Río de Janeiro'), ('Brasil', 'São Paulo'), ('Brasil', 'Salvador'), ('Brasil', 'Florianópolis'),
  ('Costa Rica', 'San José'), ('Costa Rica', 'Guanacaste'), ('Costa Rica', 'La Fortuna'),
  ('Ecuador', 'Quito'), ('Ecuador', 'Guayaquil'), ('Ecuador', 'Galápagos'),
  ('Uruguay', 'Montevideo'), ('Uruguay', 'Punta del Este'),
  ('Paraguay', 'Asunción'),
  ('Cuba', 'La Habana'), ('Cuba', 'Varadero'),
  ('Puerto Rico', 'San Juan')
) as c(pais, nombre) on p.nombre = c.pais
on conflict (pais_id, nombre) do nothing;

-- -----------------------------------------------------------------------------
-- 3. Ajustes a solicitudes_mice (tabla principal de 001)
-- -----------------------------------------------------------------------------
create table if not exists public.solicitudes_mice (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  anio smallint not null,
  responsable_id uuid not null references auth.users (id) on delete restrict,
  responsable_nombre text not null,
  cliente text not null,
  sector text,
  mzp text not null,
  nombre text not null,
  inicio date,
  fin date,
  estado text not null default 'Cerrado',
  valor_cotizado numeric(15, 2),
  utilidad_proyectada numeric(15, 2),
  fecha_solicitud date not null default (current_date),
  fecha_entrega date,
  servicios text,
  pax integer,
  lugar text,
  pais_destino text,
  ciudad_destino text,
  tiqueteador_asignado text,
  probabilidad text,
  seguimiento text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.solicitudes_mice
  add column if not exists moneda_cotizacion text not null default 'COP';

alter table public.solicitudes_mice
  add column if not exists sector_id smallint references public.sectores_mice (id);

alter table public.solicitudes_mice
  add column if not exists tiqueteador_user_id uuid references auth.users (id) on delete set null;

-- Nombre visible (denormalizado desde profiles.display_name al guardar)
comment on column public.solicitudes_mice.tiqueteador_asignado is
  'Copia de display_name del usuario tiqueteador; ver tiqueteador_user_id';
comment on column public.solicitudes_mice.tiqueteador_user_id is
  'Usuario asignado como tiqueteador (misma tabla profiles / auth.users)';

-- FK opcionales a catálogos por código/nombre (denormalizado + FK)
do $$ begin
  alter table public.solicitudes_mice
    add constraint solicitudes_mice_moneda_fk
    foreign key (moneda_cotizacion) references public.monedas_mice (codigo);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.solicitudes_mice
    add constraint solicitudes_mice_anio_fk
    foreign key (anio) references public.anios_mice (anio);
exception when duplicate_object then null;
end $$;

-- Constraints alineados al formulario
do $$ begin
  alter table public.solicitudes_mice
    add constraint solicitudes_mice_mzp_format check (mzp ~ '^MZP[0-9]{1,3}$');
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.solicitudes_mice
    add constraint solicitudes_mice_fechas_evento
    check (fin is null or inicio is null or fin >= inicio);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.solicitudes_mice
    add constraint solicitudes_mice_fechas_solicitud
    check (fecha_entrega is null or fecha_entrega >= fecha_solicitud);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.solicitudes_mice
    add constraint solicitudes_mice_anio_form check (anio in (2025, 2026));
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- 4. Tablas de relación (N:M) — fuente de verdad normalizada
-- -----------------------------------------------------------------------------

create table if not exists public.solicitud_mice_servicios (
  solicitud_id uuid not null references public.solicitudes_mice (id) on delete cascade,
  servicio_id text not null references public.servicios_mice (id) on delete restrict,
  orden smallint not null default 0,
  created_at timestamptz not null default now(),
  primary key (solicitud_id, servicio_id)
);

create index if not exists solicitud_mice_servicios_servicio_idx
  on public.solicitud_mice_servicios (servicio_id);

create table if not exists public.solicitud_mice_destinos (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes_mice (id) on delete cascade,
  pais_id smallint not null references public.paises_destino (id) on delete restrict,
  ciudad_id smallint not null references public.ciudades_destino (id) on delete restrict,
  orden smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (solicitud_id, pais_id, ciudad_id)
);

-- Valida que la ciudad pertenezca al país elegido
create or replace function public.validar_destino_ciudad_pais()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from public.ciudades_destino cd
    where cd.id = new.ciudad_id and cd.pais_id = new.pais_id
  ) then
    raise exception 'La ciudad no corresponde al país seleccionado';
  end if;
  return new;
end;
$$;

drop trigger if exists solicitud_mice_destinos_validar on public.solicitud_mice_destinos;
create trigger solicitud_mice_destinos_validar
  before insert or update on public.solicitud_mice_destinos
  for each row execute function public.validar_destino_ciudad_pais();

create index if not exists solicitud_mice_destinos_solicitud_idx
  on public.solicitud_mice_destinos (solicitud_id);

create table if not exists public.solicitud_mice_lugares (
  solicitud_id uuid not null references public.solicitudes_mice (id) on delete cascade,
  lugar_id smallint not null references public.lugares_mice (id) on delete restrict,
  primary key (solicitud_id, lugar_id)
);

-- -----------------------------------------------------------------------------
-- 5. Vista útil para listados / reportes
-- -----------------------------------------------------------------------------
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
    from public.solicitud_mice_servicios sm
    join public.servicios_mice srv on srv.id = sm.servicio_id
    where sm.solicitud_id = s.id
  ), s.servicios) as servicios_resumen,
  coalesce((
    select string_agg(l.nombre, ' | ' order by l.orden)
    from public.solicitud_mice_lugares sl
    join public.lugares_mice l on l.id = sl.lugar_id
    where sl.solicitud_id = s.id
  ), s.lugar) as lugares_resumen,
  coalesce((
    select string_agg(p.nombre || ' — ' || c.nombre, '; ' order by d.orden, d.id)
    from public.solicitud_mice_destinos d
    join public.paises_destino p on p.id = d.pais_id
    join public.ciudades_destino c on c.id = d.ciudad_id
    where d.solicitud_id = s.id
  ), s.pais_destino) as destinos_resumen,
  s.created_at,
  s.updated_at
from public.solicitudes_mice s
where s.activo = true;

-- -----------------------------------------------------------------------------
-- 6. RLS catálogos (solo lectura para autenticados)
-- -----------------------------------------------------------------------------
alter table public.anios_mice enable row level security;
alter table public.monedas_mice enable row level security;
alter table public.estados_mice enable row level security;
alter table public.probabilidades_mice enable row level security;
alter table public.lugares_mice enable row level security;
alter table public.servicios_mice enable row level security;
alter table public.paises_destino enable row level security;
alter table public.ciudades_destino enable row level security;
alter table public.solicitud_mice_servicios enable row level security;
alter table public.solicitud_mice_destinos enable row level security;
alter table public.solicitud_mice_lugares enable row level security;

-- Macro: política select para catálogos
do $$
declare
  t text;
begin
  foreach t in array array[
    'anios_mice', 'monedas_mice', 'estados_mice', 'probabilidades_mice',
    'lugares_mice', 'servicios_mice',
    'paises_destino', 'ciudades_destino', 'sectores_mice'
  ] loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format(
      'create policy %I_select on public.%I for select to authenticated using (true)',
      t, t
    );
  end loop;
end $$;

-- RLS tablas de relación (misma regla que solicitudes_mice)
drop policy if exists solicitud_mice_servicios_all on public.solicitud_mice_servicios;
create policy solicitud_mice_servicios_all on public.solicitud_mice_servicios
  for all to authenticated
  using (
    exists (
      select 1 from public.solicitudes_mice s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.solicitudes_mice s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists solicitud_mice_destinos_all on public.solicitud_mice_destinos;
create policy solicitud_mice_destinos_all on public.solicitud_mice_destinos
  for all to authenticated
  using (
    exists (
      select 1 from public.solicitudes_mice s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.solicitudes_mice s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists solicitud_mice_lugares_all on public.solicitud_mice_lugares;
create policy solicitud_mice_lugares_all on public.solicitud_mice_lugares
  for all to authenticated
  using (
    exists (
      select 1 from public.solicitudes_mice s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.solicitudes_mice s
      where s.id = solicitud_id and (s.user_id = auth.uid() or public.is_admin())
    )
  );

-- Vista: lectura para autenticados
grant select on public.v_solicitudes_mice_resumen to authenticated;

-- -----------------------------------------------------------------------------
-- Fin 003
-- -----------------------------------------------------------------------------
