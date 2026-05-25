-- =============================================================================
-- Renombra itd_profiles → td_profiles
-- Ejecutar en Supabase → SQL Editor si ya corriste 009 con itd_profiles
-- =============================================================================

do $$
begin
  if exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'itd_profiles'
  ) and not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'td_profiles'
  ) then
    alter table public.itd_profiles rename to td_profiles;
    raise notice 'Renamed itd_profiles → td_profiles';
  end if;
end $$;

-- Políticas RLS con nombres alineados a td_profiles
drop policy if exists itd_profiles_select on public.td_profiles;
drop policy if exists itd_profiles_update on public.td_profiles;
drop policy if exists itd_profiles_insert on public.td_profiles;
drop policy if exists profiles_select on public.td_profiles;
drop policy if exists profiles_update on public.td_profiles;
drop policy if exists profiles_insert on public.td_profiles;

create policy td_profiles_select on public.td_profiles
  for select to authenticated using (true);

create policy td_profiles_update on public.td_profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy td_profiles_insert on public.td_profiles
  for insert to authenticated
  with check (id = auth.uid());

notify pgrst, 'reload schema';

select table_name
from information_schema.tables
where table_schema = 'public' and table_name = 'td_profiles';
