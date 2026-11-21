import { IonToast } from '@ionic/react';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import './top-notice.css';

interface Props {
  message: string;
  variant?: 'success' | 'warning' | 'error';
  noticeId?: number;
  onDismiss?: () => void;
  autoDismiss?: boolean;
  children?: ReactNode;
}
export function TopNotice(props: Props) {
  if (!props.message) return null;
  const key = `${props.noticeId ?? ''}:${props.variant}:${props.message}`;
  return !props.children && props.variant !== 'error' ? (
    <TransientToast key={key} {...props} />
  ) : (
    <NoticeCard key={key} {...props} />
  );
}
function TransientToast({ message, variant = 'success', onDismiss, autoDismiss = true }: Props) {
  const [open, setOpen] = useState(true);
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  }, [onDismiss]);
  if (!open) return null;
  return (
    <IonToast
      isOpen={open}
      animated={false}
      message={message}
      position="top"
      swipeGesture="vertical"
      duration={autoDismiss ? (variant === 'warning' ? 8000 : 6000) : 0}
      cssClass={`hf-toast hf-toast--${variant}`}
      style={
        {
          '--background': 'var(--hf-color-surface-raised, #48345f)',
          '--color': 'var(--hf-color-text-primary, #ffffff)',
          '--button-color': 'var(--hf-color-text-link, #be97f4)',
        } as CSSProperties
      }
      buttons={[{ text: 'Cerrar', role: 'cancel' }]}
      onDidDismiss={() => {
        setOpen(false);
        dismiss.current?.();
      }}
    />
  );
}
function NoticeCard({
  message,
  variant = 'success',
  onDismiss,
  autoDismiss = true,
  children,
}: Props) {
  const [hidden, setHidden] = useState(false);
  const [paused, setPaused] = useState(false);
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    if (!autoDismiss || paused || hidden) return;
    const timer = window.setTimeout(
      () => {
        setHidden(true);
        dismiss.current?.();
      },
      variant === 'error' ? 8000 : 6000,
    );
    return () => window.clearTimeout(timer);
  }, [autoDismiss, paused, hidden, variant]);
  if (hidden) return null;
  return (
    <div
      className="top-notice"
      role={variant === 'success' ? 'status' : 'alert'}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <Icon name={variant === 'success' ? 'check' : 'info'} inheritColor />
      <div className="top-notice__body">
        <p>{message}</p>
        {children}
      </div>
      <IconButton
        label="Cerrar aviso"
        icon="close"
        onClick={() => {
          setHidden(true);
          dismiss.current?.();
        }}
      />
    </div>
  );
}
