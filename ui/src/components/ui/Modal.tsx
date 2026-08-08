import { type ReactNode, useEffect, useRef } from 'react';
import { XIcon } from './icons';

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-full max-w-md rounded-2xl border border-line bg-white p-5 shadow-2xl shadow-ink/20"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold tracking-tight text-ink">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-panel hover:text-ink"
          aria-label="Close"
        >
          <XIcon size={16} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
