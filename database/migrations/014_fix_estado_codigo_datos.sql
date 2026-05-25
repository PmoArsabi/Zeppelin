-- =============================================================================
-- CORRECCIÓN: estado_codigo tenía el NOMBRE en vez del código (ej. "Cerrado" vs "cerrado")
-- Ejecutar en Supabase → SQL Editor (después de 013)
-- =============================================================================

-- 1) Corregir filas donde estado_codigo no es un código válido en td_estados
update public.th_solicitud_mice s
set
  estado_codigo = e.codigo,
  estado = e.nombre
from public.td_estados e
where s.estado_codigo is not null
  and trim(s.estado_codigo) <> ''
  and not exists (
    select 1 from public.td_estados x where x.codigo = s.estado_codigo
  )
  and lower(trim(s.estado_codigo)) = lower(trim(e.nombre));

-- 2) Por si el nombre está en columna estado (ej. "No ganado")
update public.th_solicitud_mice s
set
  estado_codigo = e.codigo,
  estado = e.nombre
from public.td_estados e
where (s.estado_codigo is null or not exists (
    select 1 from public.td_estados x where x.codigo = s.estado_codigo
  ))
  and lower(trim(s.estado)) = lower(trim(e.nombre));

-- 3) Asegurar estado en catálogo y alias "No ganado"
insert into public.td_estados (codigo, nombre, orden) values
  ('no_adjudicado', 'No adjudicado - No ganado', 30)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  orden = excluded.orden,
  activo = true;

update public.th_solicitud_mice s
set
  estado_codigo = 'no_adjudicado',
  estado = coalesce(
    (select e.nombre from public.td_estados e where e.codigo = 'no_adjudicado'),
    'No adjudicado - No ganado'
  )
where lower(trim(s.estado)) = 'no ganado'
   or lower(trim(s.estado_codigo)) = 'no ganado'
   or lower(trim(s.estado_codigo)) like 'no adjudicado%no ganado%';

-- 4) Trigger: si llega un "código" que en realidad es nombre, convertir antes de guardar
create or replace function public.sync_th_solicitud_mice_catalogos()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_nombre text;
begin
  if new.estado_codigo is not null and trim(new.estado_codigo) <> '' then
    if not exists (select 1 from public.td_estados where codigo = new.estado_codigo) then
      select e.codigo into new.estado_codigo
      from public.td_estados e
      where lower(trim(e.nombre)) = lower(trim(new.estado_codigo))
      limit 1;
    end if;
  end if;

  if new.probabilidad_codigo is not null and trim(new.probabilidad_codigo) <> '' then
    if not exists (select 1 from public.td_probabilidades where codigo = new.probabilidad_codigo) then
      select p.codigo into new.probabilidad_codigo
      from public.td_probabilidades p
      where lower(trim(p.nombre)) = lower(trim(new.probabilidad_codigo))
      limit 1;
    end if;
  end if;

  if new.estado_codigo is not null and trim(new.estado_codigo) <> '' then
    select e.nombre into v_nombre from public.td_estados e where e.codigo = new.estado_codigo;
    if v_nombre is not null then
      new.estado := v_nombre;
    end if;
  elsif new.estado is not null and trim(new.estado) <> '' then
    select e.codigo into new.estado_codigo
    from public.td_estados e
    where lower(trim(e.nombre)) = lower(trim(new.estado))
    limit 1;
    if new.estado_codigo is null and lower(trim(new.estado)) = 'no ganado' then
      new.estado_codigo := 'no_adjudicado';
      select nombre into new.estado from public.td_estados where codigo = 'no_adjudicado';
    end if;
  end if;

  v_nombre := null;
  if new.probabilidad_codigo is not null and trim(new.probabilidad_codigo) <> '' then
    select p.nombre into v_nombre from public.td_probabilidades p where p.codigo = new.probabilidad_codigo;
    if v_nombre is not null then
      new.probabilidad := v_nombre;
    end if;
  elsif new.probabilidad is not null and trim(new.probabilidad) <> '' then
    select p.codigo into new.probabilidad_codigo
    from public.td_probabilidades p
    where lower(trim(p.nombre)) = lower(trim(new.probabilidad))
    limit 1;
  end if;

  v_nombre := null;
  if new.sector_id is not null then
    select sec.nombre into v_nombre from public.td_sectores sec where sec.id = new.sector_id;
    if v_nombre is not null then
      new.sector := v_nombre;
    end if;
  elsif new.sector is not null and trim(new.sector) <> '' then
    select sec.id into new.sector_id
    from public.td_sectores sec
    where lower(trim(sec.nombre)) = lower(trim(new.sector))
    limit 1;
  end if;

  if new.tiqueteador_user_id is not null then
    select p.display_name into v_nombre from public.td_profiles p where p.id = new.tiqueteador_user_id;
    if v_nombre is not null and trim(v_nombre) <> '' then
      new.tiqueteador_asignado := v_nombre;
    end if;
  end if;

  if new.responsable_id is not null then
    select p.display_name into v_nombre from public.td_profiles p where p.id = new.responsable_id;
    if v_nombre is not null and trim(v_nombre) <> '' then
      new.responsable_nombre := v_nombre;
    end if;
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';
