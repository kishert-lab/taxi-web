import { Button } from './Button'
import { Modal } from './Modal'

export function ConfirmModal({
  open,
  title,
  description,
  confirmText = 'Подтвердить',
  onCancel,
  onConfirm,
  isLoading,
}: {
  open: boolean
  title: string
  description: string
  confirmText?: string
  onCancel: () => void
  onConfirm: () => void
  isLoading?: boolean
}) {
  return (
    <Modal title={title} open={open} onClose={onCancel}>
      <p className="text-sm text-slate-600">{description}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="button" variant="danger" disabled={isLoading} onClick={onConfirm}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  )
}
