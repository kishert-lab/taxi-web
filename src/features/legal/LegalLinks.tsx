import { Link } from 'react-router-dom'

export function LegalLinks({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 ${className}`}>
      <Link className="font-medium text-amber-600 hover:text-amber-700" to="/legal/terms">
        Пользовательское соглашение
      </Link>
      <Link className="font-medium text-amber-600 hover:text-amber-700" to="/legal/privacy-policy">
        Политика конфиденциальности
      </Link>
      <Link className="font-medium text-amber-600 hover:text-amber-700" to="/legal/consent">
        Согласие на обработку данных
      </Link>
    </div>
  )
}
