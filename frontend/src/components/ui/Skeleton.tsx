import type { CSSProperties } from 'react'

interface SkeletonProps {
  className?: string
  style?: CSSProperties
}

export default function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      style={style}
      className={`rounded-lg bg-slate-200 dark:bg-gray-700/60 animate-pulse ${className}`}
    />
  )
}
