-- Si ya ejecutaste 001 sin moneda_cotizacion, corre este script:
alter table public.solicitudes_mice
  add column if not exists moneda_cotizacion text not null default 'COP'
    check (moneda_cotizacion in ('COP', 'USD', 'EUR'));
