/** Catálogo país → ciudades para destinos MICE (ampliable) */
export const PAISES_CIUDADES_DESTINO: Record<string, string[]> = {
  'Colombia': [
    'Bogotá',
    'Medellín',
    'Cartagena',
    'Cali',
    'Barranquilla',
    'Santa Marta',
    'Pereira',
    'San Andrés',
  ],
  'Panamá': ['Ciudad de Panamá', 'Bocas del Toro', 'Boquete', 'Colón'],
  'República Dominicana': [
    'Punta Cana',
    'Santo Domingo',
    'La Romana',
    'Puerto Plata',
    'Samaná',
  ],
  'México': [
    'Ciudad de México',
    'Cancún',
    'Los Cabos',
    'Playa del Carmen',
    'Guadalajara',
    'Monterrey',
  ],
  'Estados Unidos': [
    'Miami',
    'Orlando',
    'Nueva York',
    'Las Vegas',
    'Los Ángeles',
    'Houston',
  ],
  'España': ['Madrid', 'Barcelona', 'Sevilla', 'Valencia', 'Málaga'],
  'Argentina': ['Buenos Aires', 'Mendoza', 'Córdoba', 'Bariloche'],
  'Chile': ['Santiago', 'Viña del Mar', 'Puerto Varas'],
  'Perú': ['Lima', 'Cusco', 'Arequipa'],
  'Brasil': ['Río de Janeiro', 'São Paulo', 'Salvador', 'Florianópolis'],
  'Costa Rica': ['San José', 'Guanacaste', 'La Fortuna'],
  'Ecuador': ['Quito', 'Guayaquil', 'Galápagos'],
  'Uruguay': ['Montevideo', 'Punta del Este'],
  'Paraguay': ['Asunción'],
  'Cuba': ['La Habana', 'Varadero'],
  'Puerto Rico': ['San Juan'],
}

export const PAISES_DESTINO_ORDENADOS = Object.keys(PAISES_CIUDADES_DESTINO).sort((a, b) =>
  a.localeCompare(b, 'es')
)

export function ciudadesPorPais(pais: string): string[] {
  return PAISES_CIUDADES_DESTINO[pais] ?? []
}
