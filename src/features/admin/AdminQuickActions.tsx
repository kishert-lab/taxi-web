import {
  BadgeDollarSign,
  ClipboardList,
  FileText,
  MapPinned,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card } from '../../shared/ui/Card'

type AdminModule = {
  title: string
  description: string
  href: string
  icon: LucideIcon
}

const adminModules: AdminModule[] = [
  {
    title: 'Операционный контур',
    description: 'Заказы, назначение водителей и текущие статусы.',
    href: '/admin/orders',
    icon: ClipboardList,
  },
  {
    title: 'Исполнители',
    description: 'Водители, автомобили, пассажиры и таксопарки.',
    href: '/admin/drivers',
    icon: Users,
  },
  {
    title: 'Финансы',
    description: 'Счета платформы, долги таксопарков и выплаты.',
    href: '/admin/finance',
    icon: BadgeDollarSign,
  },
  {
    title: 'Тарифы и комиссии',
    description: 'Правила ценообразования и комиссии платформы.',
    href: '/admin/tariffs',
    icon: MapPinned,
  },
  {
    title: 'Контроль и аудит',
    description: 'Действия операторов и история изменений.',
    href: '/admin/audit-logs',
    icon: ShieldCheck,
  },
  {
    title: 'Юридические документы',
    description: 'Версии публичных условий и согласий.',
    href: '/admin/legal',
    icon: FileText,
  },
]

export function AdminQuickActions() {
  return (
    <section>
      <h2 className="text-lg font-bold text-slate-950">Управление платформой</h2>
      <p className="mt-1 text-sm text-slate-500">
        Быстрый доступ к основным рабочим разделам администрации.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {adminModules.map((module) => {
          const Icon = module.icon

          return (
            <Link key={module.href} to={module.href} className="group">
              <Card className="h-full transition group-hover:border-amber-300 group-hover:shadow-sm">
                <Icon className="h-5 w-5 text-amber-600" />
                <h3 className="mt-3 font-bold text-slate-950">{module.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{module.description}</p>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
