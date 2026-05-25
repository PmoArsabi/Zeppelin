import Select from '@/components/ui/Select'

interface FilterFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  className?: string
}

export default function FilterField({
  label,
  value,
  onChange,
  options,
  className = '',
}: FilterFieldProps) {
  return (
    <div className={`flex flex-col gap-0.5 min-w-0 ${className}`}>
      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-tight">{label}</span>
      <Select
        compact
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300"
      >
        <option value="">Todos</option>
        {options.map(o => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    </div>
  )
}
