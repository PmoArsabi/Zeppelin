-- Catálogos como tipos enumerados para garantizar consistencia en el reporting
create type estado_solicitud as enum (
  'FINALIZADO', 'EN TRÁMITE', 'PENDIENTE', 'ANULADO', 'COTIZACIÓN RECHAZADA'
);

create type tipo_solicitud as enum (
  'EMISIÓN', 'CAMBIO', 'REEMBOLSO', 'COTIZACIÓN', 'VOUCHER',
  'ANULACIÓN', 'CONFIRMACIÓN', 'SEGUIMIENTO'
);

create type modalidad_solicitud as enum ('ONLINE', 'OFFLINE');

-- Tabla principal de solicitudes operativas
create table solicitudes (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  user_id       uuid not null references auth.users(id) on delete cascade,

  -- Información básica
  fecha         date not null,
  localizador   text not null check (
                  localizador ~ '^[A-Za-z0-9]{3,}$'
                ),
  cliente       text not null,
  asesor        text not null,
  ciudad        text,

  -- Servicios (SI/NO)
  tiquetes      boolean not null,
  hoteles       boolean not null,
  transportes   boolean not null,
  asistencia    boolean not null,
  otros         boolean not null,

  -- Detalle de otros (obligatorio cuando otros = true)
  detalle_otros text check (
                  char_length(detalle_otros) <= 100
                ),

  -- Clasificación
  estado        estado_solicitud not null,
  tipo          tipo_solicitud not null,
  modalidad     modalidad_solicitud not null,

  -- Observaciones
  observaciones text check (char_length(observaciones) <= 200),

  -- Regla: si otros=true, detalle_otros es obligatorio
  constraint detalle_otros_required check (
    otros = false or (otros = true and detalle_otros is not null and detalle_otros <> '')
  )
);

-- Índices para los campos más usados en reportes y filtros
create index solicitudes_user_id_idx    on solicitudes (user_id);
create index solicitudes_fecha_idx      on solicitudes (fecha desc);
create index solicitudes_cliente_idx    on solicitudes (cliente);
create index solicitudes_estado_idx     on solicitudes (estado);

-- RLS: cada usuario ve y gestiona solo sus propios registros
alter table solicitudes enable row level security;

create policy "Usuarios ven sus solicitudes"
  on solicitudes for select
  using (auth.uid() = user_id);

create policy "Usuarios crean sus solicitudes"
  on solicitudes for insert
  with check (auth.uid() = user_id);

create policy "Usuarios actualizan sus solicitudes"
  on solicitudes for update
  using (auth.uid() = user_id);

create policy "Usuarios eliminan sus solicitudes"
  on solicitudes for delete
  using (auth.uid() = user_id);
