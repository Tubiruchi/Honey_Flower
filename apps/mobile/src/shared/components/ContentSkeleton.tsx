import { IonSkeletonText } from '@ionic/react';
import './async-feedback.css';

export interface ContentSkeletonProps {
  lines?: number;
  label?: string;
  decorative?: boolean;
}

const widths = ['100%', '88%', '72%'];

export function ContentSkeleton({
  lines = 3,
  label = 'Cargando contenido',
  decorative = false,
}: ContentSkeletonProps) {
  const count = Math.max(1, Math.min(6, Math.trunc(lines)));
  return (
    <div
      className="hf-content-skeleton"
      role={decorative ? undefined : 'status'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
    >
      {Array.from({ length: count }, (_, index) => (
        <IonSkeletonText
          animated
          className="hf-content-skeleton__line"
          style={{ width: widths[index % widths.length] }}
          key={index}
        />
      ))}
    </div>
  );
}
