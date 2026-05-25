type PageTitleProps = {
  children: React.ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3'
  /** page: encabezado principal; section: bloques del formulario; modal: diálogos */
  size?: 'page' | 'section' | 'modal'
}

const sizeClass: Record<NonNullable<PageTitleProps['size']>, string> = {
  page: 'text-2xl font-bold tracking-tight',
  section: 'text-sm font-semibold',
  modal: 'text-base font-semibold',
}

const colorClass = 'text-orange-500 dark:text-orange-400'

export default function PageTitle({
  children,
  className = '',
  as: Tag = 'h1',
  size = 'page',
}: PageTitleProps) {
  return (
    <Tag className={`${sizeClass[size]} ${colorClass} ${className}`.trim()}>
      {children}
    </Tag>
  )
}
