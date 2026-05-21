import { useMemo } from 'react'
import CustomSelect from './CustomSelect'

interface YearInputProps {
  id?: string
  value: number
  onChange: (year: number) => void
  error?: boolean
  minYear?: number
  maxYear?: number
  disabled?: boolean
}

function buildYearOptions(minYear: number, maxYear: number) {
  const options: { value: string; label: string }[] = []
  for (let y = maxYear; y >= minYear; y--) {
    options.push({ value: String(y), label: String(y) })
  }
  return options
}

/** Selector de año (solo el número, sin mes ni día). */
export default function YearInput({
  id,
  value,
  onChange,
  error,
  minYear = 2000,
  maxYear = 2100,
  disabled,
}: YearInputProps) {
  const options = useMemo(() => buildYearOptions(minYear, maxYear), [minYear, maxYear])

  const inRange = value >= minYear && value <= maxYear
  const selectValue = inRange ? String(value) : ''

  const allOptions = useMemo(() => {
    if (selectValue && !options.some(o => o.value === selectValue)) {
      return [{ value: selectValue, label: selectValue }, ...options]
    }
    return options
  }, [options, selectValue])

  return (
    <CustomSelect
      id={id}
      value={selectValue}
      onChange={v => onChange(v ? parseInt(v, 10) : 0)}
      options={allOptions}
      placeholder="Seleccionar año..."
      searchable
      error={error}
      disabled={disabled}
    />
  )
}
