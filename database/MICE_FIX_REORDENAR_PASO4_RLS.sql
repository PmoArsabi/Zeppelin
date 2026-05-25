-- =============================================================================
-- Fix paso 4 del reordenamiento: si ya tienes th_solicitud_mice_new con datos
-- y falló DROP TABLE por políticas RLS.
-- Ejecutar TODO este archivo.
-- =============================================================================

begin;

drop view if exists public.v_solicitudes_mice_resumen;

-- Quitar políticas que bloquean DROP de th_solicitud_mice
drop policy if exists solicitud_mice_servicios_all on public.th_solicitud_mice_servicios;
drop policy if exists solicitud_mice_destinos_all on public.th_solicitud_mice_destinos;
drop policy if exists solicitud_mice_lugares_all on public.th_solicitud_mice_lugares;
drop policy if exists solicitud_mice_seguimientos_select on public.th_solicitud_mice_seguimientos;
drop policy if exists solicitud_mice_seguimientos_insert on public.th_solicitud_mice_seguimientos;
drop policy if exists log_auditoria_select on public.th_log_auditoria;
drop policy if exists log_auditoria_insert on public.th_log_auditoria;
drop policy if exists th_solicitud_mice_select on public.th_solicitud_mice;
drop policy if exists th_solicitud_mice_insert on public.th_solicitud_mice;
drop policy if exists th_solicitud_mice_update on public.th_solicitud_mice;
drop policy if exists th_solicitud_mice_delete on public.th_solicitud_mice;
drop policy if exists solicitudes_mice_select on public.th_solicitud_mice;
drop policy if exists solicitudes_mice_insert on public.th_solicitud_mice;
drop policy if exists solicitudes_mice_update on public.th_solicitud_mice;
drop policy if exists solicitudes_mice_delete on public.th_solicitud_mice;

-- Si aún no copiaste datos, NO ejecutes el DROP; usa MICE_REORDENAR_COLUMNAS_TH_SOLICITUD_MICE.sql completo
drop table if exists public.th_solicitud_mice;

alter table if exists public.th_solicitud_mice_new rename to th_solicitud_mice;

commit;

-- Después ejecuta desde el paso 5 en adelante de:
-- database/MICE_REORDENAR_COLUMNAS_TH_SOLICITUD_MICE.sql
-- (FKs, índices, políticas 6b, trigger, vista)
