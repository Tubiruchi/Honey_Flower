import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { IconButton } from '../../shared/components';
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
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
        onClose();
      }}
    >
      <header>
        <h2 id={id} className="hf-type-heading-md">
          {title}
        </h2>
        <IconButton label="Cerrar" icon="close" onClick={onClose} />
      </header>
      {children}
    </dialog>
  );
}
