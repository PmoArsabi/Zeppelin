interface FilterSearchFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  className?: string
}

export default function FilterSearchField({
  label,
  value,
  onChange,
  placeholder,
  className = '',
}: FilterSearchFieldProps) {
  return (
    <div className={`flex flex-col gap-0.5 min-w-0 ${className}`}>
      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-tight">{label}</span>
      <div className="relative">
        <svg
          className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"
          />
        </svg>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-8 pl-7 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700
                     bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white
                     placeholder-slate-400 dark:placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400
                     transition-all"
        />
      </div>
    </div>
  )
}
