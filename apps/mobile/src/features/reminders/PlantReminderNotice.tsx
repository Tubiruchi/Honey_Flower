import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, IconButton, PlantCharacter } from '../../shared/components';
import type { Reminder } from './model';
import './reminders.css';

export function PlantReminderNotice({
  reminder,
  species,
  onClose,
  onOpen,
}: {
  reminder: Reminder;
  species: 'sprout' | 'cactus';
  onClose: () => void;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const node = ref.current;
    node?.showPopover?.();
    return () => node?.hidePopover?.();
  }, []);
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => close.current(), 12_000);
    return () => window.clearTimeout(timer);
  }, [paused]);
  const content = (
    <div
      ref={ref}
      popover="manual"
      className="plant-reminder"
      aria-label="Recordatorio"
      role="status"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <PlantCharacter species={species} />
      <div className="plant-reminder__body">
        <p className="hf-type-body-sm">{reminder.body}</p>
        <Button variant="text" onClick={onOpen}>
          {reminder.kind === 'water' ? 'Registrar agua' : 'Registrar protector'}
        </Button>
      </div>
      <IconButton label="Cerrar recordatorio" icon="close" onClick={onClose} />
    </div>
  );
  const dialog = document.querySelector('dialog[open]');
  return dialog ? createPortal(content, dialog) : content;
}
