import { Modal } from '../../shared/ui/Modal'
import type { Tariff, TariffPayload } from './api'
import { TariffForm } from './TariffForm'

export function TariffEditModal({
  tariff,
  open,
  isSaving,
  onClose,
  onSubmit,
}: {
  tariff?: Tariff
  open: boolean
  isSaving: boolean
  onClose: () => void
  onSubmit: (payload: TariffPayload) => void
}) {
  return (
    <Modal title={tariff ? 'Редактирование тарифа' : 'Новый тариф'} open={open} onClose={onClose}>
      <TariffForm tariff={tariff} isSaving={isSaving} onSubmit={onSubmit} />
    </Modal>
  )
}
