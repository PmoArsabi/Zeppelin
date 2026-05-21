const SEP = ' | '

export function lugaresToDb(lugares: string[], ordenPreferido?: readonly string[]): string | null {
  const order = ordenPreferido?.length ? ordenPreferido : lugares
  const ordered = order.filter(l => lugares.includes(l))
  const extra = lugares.filter(l => !ordered.includes(l))
  const all = [...ordered, ...extra]
  return all.length > 0 ? all.join(SEP) : null
}

export function dbToLugares(value: string | null | undefined, nombresValidos?: readonly string[]): string[] {
  const v = (value ?? '').trim()
  if (!v) return []
  const valid = nombresValidos ? new Set(nombresValidos) : null
  return v
    .split(SEP)
    .map(s => s.trim())
    .filter(s => (valid ? valid.has(s) : Boolean(s)))
}
