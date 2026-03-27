// src/components/common/Button.tsx
import React from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  secondary: 'bg-primary-light text-primary hover:bg-[#e4ecf5]',
  ghost: 'bg-surface text-text-base border border-border hover:bg-bg',
  danger: 'bg-danger text-white hover:bg-red-700',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-sm',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${className || ''}`}
      {...props}
    />
  )
)

Button.displayName = 'Button'

export default Button
