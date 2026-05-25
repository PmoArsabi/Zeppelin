-- =============================================================================
-- EJECUTA ESTO UNA VEZ en Supabase → SQL Editor (si estado_codigo tiene nombres)
-- =============================================================================

insert into public.td_estados (codigo, nombre, orden) values
  ('no_adjudicado', 'No adjudicado - No ganado', 30)
on conflict (codigo) do update set nombre = excluded.nombre, activo = true;

update public.th_solicitud_mice s
set estado_codigo = e.codigo, estado = e.nombre
from public.td_estados e
where s.estado_codigo is not null
  and trim(s.estado_codigo) <> ''
  and not exists (select 1 from public.td_estados x where x.codigo = s.estado_codigo)
  and lower(trim(s.estado_codigo)) = lower(trim(e.nombre));

update public.th_solicitud_mice s
set estado_codigo = e.codigo, estado = e.nombre
from public.td_estados e
where (s.estado_codigo is null or not exists (
    select 1 from public.td_estados x where x.codigo = s.estado_codigo))
  and lower(trim(s.estado)) = lower(trim(e.nombre));

update public.th_solicitud_mice
set estado_codigo = 'no_adjudicado',
    estado = (select nombre from public.td_estados where codigo = 'no_adjudicado')
where lower(trim(estado)) = 'no ganado'
   or lower(trim(coalesce(estado_codigo, ''))) = 'no ganado';

-- Verificación (estado_codigo debe ser corto: abierto, cerrado, cotizacion_enviada…)
select mzp, estado, estado_codigo, sector_id, probabilidad_codigo
from public.th_solicitud_mice
order by created_at desc;

notify pgrst, 'reload schema';
