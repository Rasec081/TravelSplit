import { Children, useEffect, useId, useRef } from "react";

function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll(
      'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function Modal({
  isOpen,
  title,
  description,
  onClose,
  children,
  footer,
  isDismissable = true,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusFirst = () => {
      const focusables = getFocusableElements(dialog);
      const autoFocus = focusables.find((el) => el.hasAttribute("autofocus"));
      (autoFocus ?? focusables[0] ?? dialog).focus();
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape" && isDismissable) {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;

      const focusables = getFocusableElements(dialog);
      if (focusables.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener("keydown", onKeyDown);
    focusFirst();

    return () => {
      document.body.style.overflow = previousOverflow;
      dialog.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
  }, [isOpen, isDismissable]);

  if (!isOpen) return null;

  const footerCount = footer ? Children.count(footer) : 0;

  return (
    <div className="modal-overlay" role="presentation">
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="modal-dialog"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="modal-header">
          <div>
            <h2 className="modal-title" id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className="modal-description" id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          {isDismissable ? (
            <button
              className="icon-button"
              type="button"
              onClick={() => onCloseRef.current?.()}
              aria-label="Cerrar"
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </header>

        <div className="modal-body">{children}</div>

        {footer ? (
          <div className={`modal-actions ${footerCount === 1 ? "single-action" : ""}`}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
