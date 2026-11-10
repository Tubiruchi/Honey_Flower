import { useEffect, useRef } from 'react';
import type { HabitKind } from '@honeyflower/contracts';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { SwipeAction } from './SwipeAction';
export interface RecordItemProps {
  kind?: HabitKind;
  state?: 'normal' | 'actions' | 'readonly';
  title?: string;
  detail?: string;
  onActionsChange?: (open: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}
export function RecordItem({
  kind = 'water',
  state = 'normal',
  title,
  detail = '17:30 · Registro manual',
  onActionsChange,
  onEdit,
  onDelete,
}: RecordItemProps) {
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const actions = state === 'actions';
  const root = useRef<HTMLDivElement>(null);
  const previousActions = useRef(actions);
  useEffect(() => {
    if (actions !== previousActions.current)
      root.current?.querySelector<HTMLButtonElement>('button')?.focus();
    previousActions.current = actions;
  }, [actions]);
  const readonly = state === 'readonly';
  const label = title ?? (kind === 'water' ? '250 mL de agua' : 'Aplicación inicial');
  return (
    <div
      ref={root}
      className={`hf-record-item hf-record-item--${kind}${actions ? ' hf-record-item--actions' : ''}`}
      role="group"
      aria-label={label}
      onPointerDown={(event) => {
        pointer.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerCancel={() => {
        pointer.current = null;
      }}
      onPointerUp={(event) => {
        const start = pointer.current;
        pointer.current = null;
        if (readonly || !start) return;
        const dx = event.clientX - start.x;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(event.clientY - start.y) * 2)
          onActionsChange?.(dx < 0);
      }}
    >
      <div className="hf-record-item__body">
        {!actions && <Icon name={kind === 'water' ? 'drop' : 'sun'} inheritColor />}
        <div className="hf-record-item__text">
          <p className="hf-type-label-md">{label}</p>
          <p className="hf-type-caption">{detail}</p>
        </div>
        {!actions &&
          (readonly ? (
            <span className="hf-record-item__lock">
              <Icon name="lock" inheritColor />
              <span className="hf-sr-only">Solo lectura</span>
            </span>
          ) : (
            <IconButton
              label={`Opciones de ${label}`}
              icon="options"
              onClick={() => onActionsChange?.(true)}
            />
          ))}
      </div>
      {actions && (
        <>
          {kind === 'water' && (
            <SwipeAction
              action="edit"
              onClick={onEdit}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onActionsChange?.(false);
              }}
            />
          )}
          <SwipeAction
            action="delete"
            onClick={onDelete}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onActionsChange?.(false);
            }}
          />
        </>
      )}
    </div>
  );
}
