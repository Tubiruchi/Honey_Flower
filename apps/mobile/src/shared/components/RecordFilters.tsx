import { useId } from 'react';
import { Segment } from './ToneSelector';
export type RecordFilter = 'all' | 'water' | 'sunscreen';
export interface RecordFiltersProps {
  value: RecordFilter;
  onChange: (value: RecordFilter) => void;
}
export function RecordFilters({ value, onChange }: RecordFiltersProps) {
  const name = useId();
  return (
    <fieldset className="hf-record-filters">
      <legend className="hf-sr-only">Filtrar registros</legend>
      {(
        [
          ['all', 'Todos'],
          ['water', 'Agua'],
          ['sunscreen', 'Protector'],
        ] as const
      ).map(([key, label]) => (
        <Segment
          key={key}
          name={name}
          value={key}
          label={label}
          checked={value === key}
          onChange={() => onChange(key)}
        />
      ))}
    </fieldset>
  );
}
