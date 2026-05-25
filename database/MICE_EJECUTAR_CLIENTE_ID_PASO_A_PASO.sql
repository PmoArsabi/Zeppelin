-- =============================================================================
-- ZEPPELIN MICE — Ejecutar en Supabase → SQL Editor
-- NO crea la tabla th_solicitud_mice (ya existe).
-- Solo agrega cliente_id, migra datos y quita la columna texto "cliente".
--
-- Después: Settings → API → Reload schema (o esperar 1 minuto).
-- =============================================================================


-- =============================================================================
-- PASO 0 — REVISAR (solo lectura, no cambia nada)
-- Ejecuta este bloque primero y mira el resultado.
-- =============================================================================

-- ¿Existe la tabla de solicitudes?
select exists (
  select 1 from information_schema.tables
  where table_schema = 'public' and table_name = 'th_solicitud_mice'
) as tabla_th_solicitud_mice_existe;

-- ¿Qué columnas tiene HOY?
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'th_solicitud_mice'
order by ordinal_position;

-- ¿Existe el catálogo de clientes en raw?
select column_name, data_type
from information_schema.columns
where table_schema = 'raw' and table_name = 'xmart_clientes_zeppelin'
order by ordinal_position;

-- Muestra 3 clientes de ejemplo (debe verse columna "id" y "fullname")
select id, fullname
from raw.xmart_clientes_zeppelin
order by fullname
limit 3;


-- =============================================================================
-- PASO 1 — COLUMNAS FK DE CATÁLOGO (si aún no las tienes)
-- Si en el PASO 0 ya ves: estado_codigo, sector_id, probabilidad_codigo
-- puedes SALTAR este paso.
-- Si NO las tienes, ejecuta TODO el archivo del repo:
--   database/migrations/013_mice_fk_catalogos.sql
-- (copia y pega el archivo completo en otra pestaña del SQL Editor)
-- =============================================================================


-- =============================================================================
-- PASO 2 — AGREGAR cliente_id Y MIGRAR DATOS
-- Ejecuta este bloque completo.
-- =============================================================================

-- 2.1 Nueva columna (solo el ID del cliente)
alter table public.th_solicitud_mice
  add column if not exists cliente_id bigint;

-- 2.2 Copiar el ID desde el catálogo raw, usando el nombre que tenías guardado
--     (solo filas que aún no tienen cliente_id)
update public.th_solicitud_mice s
set cliente_id = c.id
from raw.xmart_clientes_zeppelin c
where s.cliente_id is null
  and s.cliente is not null
  and trim(s.cliente) <> ''
  and lower(trim(s.cliente)) = lower(trim(c.fullname));

-- 2.3 Relación formal con la tabla de clientes
do $$ begin
  alter table public.th_solicitud_mice
    add constraint th_solicitud_mice_cliente_id_fk
    foreign key (cliente_id) references raw.xmart_clientes_zeppelin (id);
exception when duplicate_object then null;
end $$;

create index if not exists th_solicitud_mice_cliente_id_idx
  on public.th_solicitud_mice (cliente_id);

-- 2.4 Quitar columna texto duplicada (ya no se usa)
alter table public.th_solicitud_mice
  drop column if exists cliente;

comment on column public.th_solicitud_mice.cliente_id is
  'FK raw.xmart_clientes_zeppelin.id — único campo de cliente en cabecera.';


-- =============================================================================
-- PASO 3 — VERIFICAR (después del paso 2)
-- =============================================================================

-- ¿Cuántas filas quedaron SIN cliente_id? (debería ser 0 o muy pocas)
select count(*) as filas_sin_cliente_id
from public.th_solicitud_mice
where cliente_id is null;

-- Si hay filas sin match, ver cuáles son:
select id, mzp, nombre
from public.th_solicitud_mice
where cliente_id is null
limit 20;

-- Ver últimas solicitudes con nombre del cliente (desde raw)
select
  s.mzp,
  s.cliente_id,
  c.fullname as cliente_nombre,
  s.nombre
from public.th_solicitud_mice s
left join raw.xmart_clientes_zeppelin c on c.id = s.cliente_id
order by s.created_at desc
limit 10;

-- Confirmar que la columna "cliente" (texto) ya no existe
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'th_solicitud_mice'
  and column_name = 'cliente';
-- Resultado esperado: 0 filas


-- =============================================================================
-- PASO 4 — RECARGAR API DE SUPABASE
-- En el panel: Settings → API → Reload schema
-- (o ejecuta la línea de abajo)
-- =============================================================================

notify pgrst, 'reload schema';
