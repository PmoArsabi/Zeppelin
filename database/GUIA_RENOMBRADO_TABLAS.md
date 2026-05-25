# Guía — Renombrado de tablas (td_ / th_ / itd_)

## Mapeo aplicado

| Antes | Después | Rol |
|-------|---------|-----|
| `anios_mice` | `td_anios_mice` | Catálogo |
| `monedas_mice` | `td_monedas` | Catálogo |
| `estados_mice` | `td_estados` | Catálogo |
| `probabilidades_mice` | `td_probabilidades` | Catálogo |
| `lugares_mice` | `td_lugares` | Catálogo |
| `servicios_mice` | `td_servicios` | Catálogo |
| `sectores_mice` | `td_sectores` | Catálogo |
| `paises_destino` | `td_pais_destino` | Catálogo |
| `ciudades_destino` | `td_ciudades_destino` | Catálogo |
| `profiles` | `td_profiles` | Perfiles internos |
| `solicitudes_mice` | `th_solicitud_mice` | Cabecera MICE |
| `solicitud_mice_servicios` | `th_solicitud_mice_servicios` | Relación MICE |
| `solicitud_mice_destinos` | `th_solicitud_mice_destinos` | Relación MICE |
| `solicitud_mice_lugares` | `th_solicitud_mice_lugares` | Relación MICE |
| `solicitud_mice_seguimientos` | `th_solicitud_mice_seguimientos` | Bitácora MICE |
| `log_auditoria` | `th_log_auditoria` | Auditoría |
| `solicitudes` | `th_solicitud_corporativos` | Cabecera Corp |
| `solicitud_seguimientos` | `th_solicitud_seguimientos` | Bitácora Corp |

**Sin cambio en esta migración:** `auth.users`, `raw.xmart_clientes_zeppelin`, vista `v_solicitudes_mice_resumen` (solo se recrea el SQL interno), tabla deprecada `solicitud_mice_auditoria` si aún existe.

## Orden de ejecución

1. Tener aplicadas las migraciones **001–008** con los nombres **antiguos**.
2. Copiar y ejecutar **`migrations/009_nomenclatura_td_th_itd.sql`** completo en Supabase → SQL Editor.
3. Si aplica: **`010_rename_th_solicitud_corporativos.sql`**, **`012_rename_itd_profiles_to_td_profiles.sql`**.
4. Revisar el resultado final del script: debe listar las tablas nuevas (Corp: `th_solicitud_corporativos`).
5. **Settings → API → Reload schema** (el script también envía `NOTIFY`).
6. Desplegar el **frontend** actualizado de este repositorio.
7. Probar: listado MICE, guardar cotización, servicios/destinos/lugares, seguimiento, auditoría, solicitudes corp.

## Si ya renombraste a mano

El script es **idempotente**: omite tablas cuyo nombre nuevo ya existe. Aun así conviene ejecutarlo para recrear vista, funciones de trigger, políticas RLS y `NOTIFY`.

## Instalación en base vacía

1. Ejecutar **001 → 008** (crean nombres legacy).
2. Ejecutar **009** y, si aplica, **010** (renombra todo al estándar final).

## Trigger de registro (`profiles` → `td_profiles`)

Si en Supabase tienes una función/trigger al crear usuario en `auth.users` que hace `INSERT INTO public.profiles` o `itd_profiles`, actualízala a `public.td_profiles` (SQL Editor → Database → Functions / buscar `handle_new_user` o similar).

## Checklist de prueba

- [ ] Catálogos MICE cargan en formulario (años, monedas, estados, …)
- [ ] Crear / editar cotización MICE
- [ ] Tiqueteador y responsable (lista desde `td_profiles`)
- [ ] Seguimiento chat MICE
- [ ] Historial de cambios (auditoría)
- [ ] Listado y edición solicitudes corporativas
- [ ] Seguimiento corp
