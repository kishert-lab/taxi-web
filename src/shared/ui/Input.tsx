import { forwardRef, type InputHTMLAttributes } from 'react'

import { cn } from '../utils/cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#F59E0B] focus:ring-4 focus:ring-amber-100',
        className,
      )}
      {...props}
    />
  ),
)

Input.displayName = 'Input'
