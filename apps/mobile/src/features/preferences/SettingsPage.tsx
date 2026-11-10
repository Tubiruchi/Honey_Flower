/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- The page main is a keyboard-accessible scroll region. */
import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { IconButton } from '../../shared/components';
import './preferences.css';

export function SettingsPage({
  title,
  description,
  onBack,
  footer,
  children,
}: {
  title: string;
  description: string;
  onBack: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [title]);
  useEffect(() => {
    const handler = (event: Event) =>
      (
        event as CustomEvent<{ register: (priority: number, callback: () => void) => void }>
      ).detail?.register(30, onBack);
    document.addEventListener('ionBackButton', handler);
    return () => document.removeEventListener('ionBackButton', handler);
  }, [onBack]);
  return (
    <div className="settings-page">
      <header className="hf-preferences-header">
        <IconButton className="hf-preferences-back" label="Volver" onClick={onBack} />
        <div>
          <h1 ref={heading} tabIndex={-1} id={id} className="hf-type-heading-md">
            {title}
          </h1>
          <p className="hf-type-caption hf-secondary">{description}</p>
        </div>
      </header>
      <main className="settings-content" aria-labelledby={id} tabIndex={0}>
        {children}
      </main>
      {footer && <footer className="settings-footer">{footer}</footer>}
    </div>
  );
}
