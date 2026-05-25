/** Primera letra mayúscula, resto minúsculas (ej. TELEVISION → Television) */
export function formatSectorNombre(nombre: string): string {
  const t = nombre.trim()
  if (!t) return ''
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
}
