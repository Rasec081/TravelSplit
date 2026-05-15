import { Modal } from "./Modal";

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onCancel,
  onConfirm,
  isLoading = false,
  tone = "danger",
}) {
  const confirmClass = tone === "danger" ? "danger-button" : "create-trip-button";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      description={description}
      footer={
        <>
          <button className="secondary-button" type="button" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </button>
          <button className={confirmClass} type="button" onClick={onConfirm} disabled={isLoading}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="modal-form" />
    </Modal>
  );
}

