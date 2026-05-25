-- =============================================================================
-- DEPRECADO: usar MICE_MIGRAR_HIJAS_Y_LIMPIAR_CABECERA.sql o MICE_EJECUTAR_TODO.sql.
-- Este archivo solo hace DROP sin copiar servicios/destinos/lugares/seguimiento.
-- =============================================================================

-- 1) Triggers que rellenaban texto (si existen)
drop trigger if exists th_solicitud_mice_sync_catalogos on public.th_solicitud_mice;
drop trigger if exists solicitud_mice_seguimientos_sync_text on public.th_solicitud_mice_seguimientos;

-- 2) Corregir estado_codigo si guardaste el NOMBRE en vez del código
update public.th_solicitud_mice s
set estado_codigo = e.codigo
from public.td_estados e
where lower(trim(e.nombre)) = lower(trim(s.estado_codigo))
  and s.estado_codigo is not null
  and s.estado_codigo <> e.codigo;

update public.th_solicitud_mice s
set estado_codigo = e.codigo
from public.td_estados e
where s.estado_codigo is null
  and s.estado is not null
  and lower(trim(s.estado)) = lower(trim(e.nombre));

-- 3) ELIMINAR columnas que NO van (11 columnas)
alter table public.th_solicitud_mice drop column if exists responsable_nombre;
alter table public.th_solicitud_mice drop column if exists cliente;
alter table public.th_solicitud_mice drop column if exists sector;
alter table public.th_solicitud_mice drop column if exists estado;
alter table public.th_solicitud_mice drop column if exists servicios;
alter table public.th_solicitud_mice drop column if exists lugar;
alter table public.th_solicitud_mice drop column if exists pais_destino;
alter table public.th_solicitud_mice drop column if exists ciudad_destino;
alter table public.th_solicitud_mice drop column if exists tiqueteador_asignado;
alter table public.th_solicitud_mice drop column if exists probabilidad;
alter table public.th_solicitud_mice drop column if exists seguimiento;

-- 4) Comprobar: deben quedar 23 columnas
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'th_solicitud_mice'
order by ordinal_position;

notify pgrst, 'reload schema';
