import * as React from 'react'
import { cn } from '@/lib/utils'

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export function Switch({ checked, onCheckedChange, className, ...props }: SwitchProps) {
  return (
    <label className={cn('relative inline-flex items-center', className)}>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className="sr-only peer"
        {...props}
      />

      <span className="w-12 h-7 bg-white/20 rounded-full peer-checked:bg-blue-500 transition-colors duration-200 block" />

      <span
        aria-hidden
        className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 peer-checked:translate-x-5"
      />
    </label>
  )
}

export default Switch
