import { Input } from './Input'
import type { ColorOption } from './color-options'

export function ColorPicker({
  value,
  onChange,
  options,
  type = 'text',
}: {
  value: string
  onChange: (value: string) => void
  options: ColorOption[]
  type?: 'text' | 'hex'
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = value === option.value

          return (
            <button
              key={option.value}
              type="button"
              className={`flex h-9 items-center gap-2 rounded-xl border px-2 text-xs font-medium transition ${
                isSelected
                  ? 'border-[#F59E0B] bg-amber-50 text-slate-950'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
              onClick={() => onChange(option.value)}
            >
              <span
                className="h-5 w-5 rounded-full border border-slate-200"
                style={{ backgroundColor: option.swatch }}
              />
              {option.label}
            </button>
          )
        })}
      </div>
      <div className="flex gap-2">
        {type === 'hex' ? (
          <input
            className="h-10 w-12 rounded-xl border border-slate-200 bg-white p-1"
            type="color"
            value={value || '#000000'}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : null}
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={type === 'hex' ? '#F59E0B' : 'Введите цвет'}
        />
      </div>
    </div>
  )
}
