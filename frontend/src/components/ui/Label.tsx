interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
  optional?: boolean
}

export default function Label({ children, required, optional, className = '', ...props }: LabelProps) {
  return (
    <label
      className={`block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
      {optional && <span className="text-slate-400 font-normal ml-1 text-xs">(opcional)</span>}
    </label>
  )
}
