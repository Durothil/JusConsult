// src/components/common/Badge.tsx
import React from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  children: React.ReactNode
}

const badgeVariants: Record<string, string> = {
  default: 'bg-border text-text-base',
  success: 'bg-green-50 text-success',
  warning: 'bg-amber-50 text-warning',
  danger: 'bg-danger-bg text-danger',
  info: 'bg-primary-light text-primary',
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeVariants[variant]} ${className || ''}`}
      {...props}
    >
      {children}
    </span>
  )
)

Badge.displayName = 'Badge'

export default Badge
