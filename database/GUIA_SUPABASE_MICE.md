# Guía Supabase — Módulo MICE (Zeppelin)

Script listo para copiar y ejecutar en **Supabase → SQL Editor**. Crea catálogos (hoy en el frontend), la tabla principal y las relaciones.

---

## Orden de ejecución

Ejecuta **un archivo completo cada vez**, en este orden:

| Paso | Archivo | Qué hace |
|------|---------|----------|
| 1 | `migrations/001_solicitudes_mice.sql` | Tabla `solicitudes_mice`, `sectores_mice`, RLS base |
| 2 | `migrations/002_solicitudes_mice_moneda.sql` | Columna `moneda_cotizacion` (si 001 no la tenía) |
| 3 | `migrations/003_mice_catalogos_y_relaciones.sql` | **Catálogos + tablas N:M + vista + RLS** |
| 4 | `migrations/004_tiqueteador_desde_usuarios.sql` | Solo si corriste 003 con `tiqueteadores_mice` |
| 5–8 | `005` … `008` | Seguimiento MICE, auditoría, corp (según módulo) |
| **9** | **`migrations/009_nomenclatura_td_th_itd.sql`** | **Renombra tablas a `td_` / `th_` / `itd_` (obligatorio para la app actual)** |
| 10 | `010_rename_th_solicitud_corporativos.sql` | Corrección nombre cabecera corp (si aplica) |
| 11 | `011_mzp_consecutivo_config.sql` | Consecutivo MZP automático (`td_config`) |
| 12 | `012_rename_itd_profiles_to_td_profiles.sql` | Perfiles: `itd_profiles` → `td_profiles` (si aplica) |
| **13** | **`migrations/013_mice_fk_catalogos.sql`** | **FK `estado_codigo`, `probabilidad_codigo`, `sector_id` + trigger de sincronía** |

> Ver mapeo completo en `GUIA_RENOMBRADO_TABLAS.md`. Si la base está vacía, el paso 3 también crea `solicitudes_mice` si no existe (009 la renombra a `th_solicitud_mice`).

---

## Diagrama de tablas

```
auth.users
    │
    ├── profiles (display_name)
    │
    └── solicitudes_mice ──┬── solicitud_mice_servicios ──► servicios_mice
                           ├── solicitud_mice_destinos ──► paises_destino + ciudades_destino
                           └── solicitud_mice_lugares ───► lugares_mice

Catálogos (solo lectura en app):
  anios_mice, monedas_mice, estados_mice, probabilidades_mice,
  sectores_mice, paises_destino, ciudades_destino
  auth.users / profiles → tiqueteador (no catálogo aparte)
```

---

## Catálogos creados (datos del formulario)

| Tabla | Contenido |
|-------|-----------|
| `anios_mice` | 2025, 2026 |
| `monedas_mice` | COP, USD, EUR |
| `estados_mice` | Cerrado, No adjudicado - No ganado, Cancelado |
| `probabilidades_mice` | Baja, Media, Alta, N/A |
| `lugares_mice` | Nacional, Internacional |
| *(usuarios)* | Tiqueteador = `profiles` / `auth.users` (`tiqueteador_user_id`) |
| `servicios_mice` | SRV-01 … SRV-08 (label, short_label, ejemplos) |
| `sectores_mice` | 28 sectores del Excel |
| `paises_destino` + `ciudades_destino` | Mismo listado que `paises-ciudades-destino.ts` |

---

## Tablas de relación (cómo guardar el formulario)

Al guardar una cotización, además de `solicitudes_mice` conviene insertar en:

### Servicios (obligatorio ≥ 1)

```sql
insert into public.solicitud_mice_servicios (solicitud_id, servicio_id, orden)
values
  ('<uuid-solicitud>', 'SRV-01', 0),
  ('<uuid-solicitud>', 'SRV-03', 1);
```

### Destinos (obligatorio ≥ 1)

```sql
insert into public.solicitud_mice_destinos (solicitud_id, pais_id, ciudad_id, orden)
select
  '<uuid-solicitud>',
  p.id,
  c.id,
  0
from public.paises_destino p
join public.ciudades_destino c on c.pais_id = p.id
where p.nombre = 'Panamá' and c.nombre = 'Ciudad de Panamá';
```

### Lugares (opcional, 1 o 2)

```sql
insert into public.solicitud_mice_lugares (solicitud_id, lugar_id)
select '<uuid-solicitud>', id from public.lugares_mice where nombre = 'Nacional';
```

### Tiqueteador (usuario del sistema, no catálogo)

```sql
update public.solicitudes_mice
set
  tiqueteador_user_id = '<uuid-usuario-profiles>',
  tiqueteador_asignado = (select display_name from public.profiles where id = '<uuid-usuario-profiles>')
where id = '<uuid-solicitud>';
```

Listar usuarios para el desplegable:

```sql
select id, display_name from public.profiles
where display_name is not null
order by display_name;
```

---

## Fuente de verdad en cabecera (después de 013)

| Campo guardado (FK) | Catálogo | Columna texto (solo lectura / trigger) |
|--------------------|----------|----------------------------------------|
| `estado_codigo` | `td_estados` | `estado` |
| `probabilidad_codigo` | `td_probabilidades` | `probabilidad` |
| `sector_id` | `td_sectores` | `sector` |
| `moneda_cotizacion` | `td_monedas` | — (el código es el PK) |
| `responsable_id` / `tiqueteador_user_id` | `td_profiles` | `responsable_nombre` / `tiqueteador_asignado` |

El trigger `sync_th_solicitud_mice_catalogos` rellena las columnas texto al insertar/actualizar.

## Columnas legacy en `th_solicitud_mice`

El frontend **todavía** escribe texto en:

- `servicios` → `SRV-01 | SRV-03`
- `lugar` → `Nacional | Internacional`
- `pais_destino` / `ciudad_destino` → separados por ` | `

La fuente de verdad para esos campos son `th_solicitud_mice_servicios`, `_destinos` y `_lugares`. La vista `v_solicitudes_mice_resumen` prioriza las tablas N:M.

---

## Consultas útiles después de migrar

**Listar países y ciudades (para el formulario):**

```sql
select p.nombre as pais, c.nombre as ciudad
from public.paises_destino p
join public.ciudades_destino c on c.pais_id = p.id
where p.activo and c.activo
order by p.nombre, c.nombre;
```

**Servicios activos:**

```sql
select id, label, short_label from public.servicios_mice
where activo order by orden;
```

**Resumen de cotizaciones:**

```sql
select * from public.v_solicitudes_mice_resumen
order by fecha_solicitud desc;
```

---

## Rol admin

Las políticas usan `auth.jwt() -> app_metadata ->> 'role' = 'admin'`.

En Supabase → Authentication → Users → usuario → **App Metadata**:

```json
{ "role": "admin" }
```

---

## Siguiente paso en el frontend (pendiente)

1. Cargar catálogos con `supabase.from('servicios_mice').select()` etc.
2. Al guardar: `insert` en `solicitud_mice_*` además del row principal.
3. Quitar datos quemados de `data/*.ts` o usarlos como fallback offline.

---

## Si algo falla

| Error | Solución |
|-------|----------|
| `relation solicitudes_mice does not exist` | Ejecuta `001` primero |
| `column moneda_cotizacion` | Ejecuta `002` |
| FK `mzp` / filas viejas sin MZP | Corrige datos o relaja constraint temporalmente |
| No ves `raw.xmart_clientes` | Es otro esquema; expón `raw` en API Settings de Supabase |

---

## Archivos en este repo

```
database/
  GUIA_SUPABASE_MICE.md          ← esta guía
  MODELO_SOLICITUDES_MICE.md     ← mapeo Excel
  migrations/
    001_solicitudes_mice.sql
    002_solicitudes_mice_moneda.sql
    003_mice_catalogos_y_relaciones.sql   ← catálogos + relaciones
```
