import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import './top-notice.css';

interface Props {
  message: string;
  variant?: 'success' | 'error';
  noticeId?: number;
  onDismiss?: () => void;
  children?: ReactNode;
}
export function TopNotice(props: Props) {
  return props.message ? (
    <NoticeCard key={`${props.noticeId ?? ''}:${props.variant}:${props.message}`} {...props} />
  ) : null;
}
function NoticeCard({ message, variant = 'success', onDismiss, children }: Props) {
  const [hidden, setHidden] = useState(false);
  const [paused, setPaused] = useState(false);
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    if (paused || hidden) return;
    const timer = window.setTimeout(
      () => {
        setHidden(true);
        dismiss.current?.();
      },
      variant === 'error' ? 8000 : 6000,
    );
    return () => window.clearTimeout(timer);
  }, [paused, hidden, variant]);
  if (hidden) return null;
  return (
    <div
      className="top-notice"
      role={variant === 'error' ? 'alert' : 'status'}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <Icon name={variant === 'error' ? 'info' : 'check'} inheritColor />
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
