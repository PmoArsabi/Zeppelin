export const SERVICIOS_MICE_CATALOGO = [
  {
    id: 'SRV-01',
    label: 'Tiquetes / Vuelos',
    shortLabel: 'Tiquetes',
    ejemplos: 'Vuelos, tiquetes aéreos, tiquetes nacionales/internacionales.',
  },
  {
    id: 'SRV-02',
    label: 'Alojamiento',
    shortLabel: 'Alojamiento',
    ejemplos: 'Hotel, alojamiento, habitación.',
  },
  {
    id: 'SRV-03',
    label: 'Traslados',
    shortLabel: 'Traslados',
    ejemplos: 'Transporte, traslados, acompañamiento en aeropuerto.',
  },
  {
    id: 'SRV-04',
    label: 'Alimentos y Bebidas (AyB)',
    shortLabel: 'AyB',
    ejemplos: 'Alimentación, catering, cenas, almuerzos, desayunos, coffee break, refrigerios.',
  },
  {
    id: 'SRV-05',
    label: 'Eventos / Salones',
    shortLabel: 'Eventos',
    ejemplos: 'Alquiler de salón, reserva de salón, ayudas audiovisuales, decoración.',
  },
  {
    id: 'SRV-06',
    label: 'Actividades y Entretenimiento',
    shortLabel: 'Actividades',
    ejemplos: 'Tours, actividades, giras, eventos deportivos, música/shows.',
  },
  {
    id: 'SRV-07',
    label: 'Asistencia y Logística',
    shortLabel: 'Asistencia',
    ejemplos: 'Tarjeta de asistencia, seguro de viaje, cartucheras/marca maletas.',
  },
  {
    id: 'SRV-08',
    label: 'Otros / Corporativos',
    shortLabel: 'Otros',
    ejemplos: 'Bonos, planes convención (paquete todo en uno).',
  },
] as const

export type ServicioMiceId = (typeof SERVICIOS_MICE_CATALOGO)[number]['id']

export const SERVICIOS_MICE_IDS = SERVICIOS_MICE_CATALOGO.map(s => s.id)

export function servicioMicePorId(id: string) {
  return SERVICIOS_MICE_CATALOGO.find(s => s.id === id)
}
