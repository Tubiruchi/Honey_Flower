import { IconButton } from './IconButton';
export interface RecordDayNavigatorProps {
  state?: 'current' | 'closed';
  date?: string;
  detail?: string;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}
export function RecordDayNavigator({
  state = 'current',
  date = 'Mar, 27 oct',
  detail,
  previousDisabled,
  nextDisabled,
  onPrevious,
  onNext,
}: RecordDayNavigatorProps) {
  return (
    <div className="hf-record-day">
      <IconButton label="Día anterior" disabled={previousDisabled} onClick={onPrevious} />
      <div>
        <p className="hf-type-data-md">{date}</p>
        <p className="hf-type-caption">
          {detail ??
            (state === 'closed'
              ? 'Día cerrado · solo lectura'
              : 'Día abierto · cierra a las 12:00')}
        </p>
      </div>
      <IconButton
        label="Día siguiente"
        disabled={nextDisabled ?? state === 'current'}
        icon="chevron"
        onClick={onNext}
      />
    </div>
  );
}
