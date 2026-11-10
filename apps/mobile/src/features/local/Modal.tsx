import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { IconButton } from '../../shared/components';
import { LocalPendingRecovery } from './LocalDataBoundary';
export function Modal({
  title,
  onClose,
  children,
  busy = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="local-dialog"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header>
        <h2 id={id} className="hf-type-heading-md">
          {title}
        </h2>
        <IconButton label="Cerrar" icon="close" disabled={busy} onClick={onClose} />
      </header>
      {children}
      <LocalPendingRecovery inline />
    </dialog>
  );
}
