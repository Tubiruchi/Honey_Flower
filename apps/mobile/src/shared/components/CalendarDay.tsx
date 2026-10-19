import { figmaComponents } from '../../assets/figma/components';
import { PlantCharacter } from './PlantCharacter';
import type { PlantCharacterProps } from './PlantCharacter';

export interface CalendarDayProps {
  day: string;
  date: string;
  state: 'complete' | 'partial' | 'missed' | 'future';
  progress?: number;
  selected?: boolean;
  today?: boolean;
  species?: PlantCharacterProps['species'];
  onSelect?: () => void;
}
export function CalendarDay({
  day,
  date,
  state,
  progress = 42,
  selected,
  today,
  species,
  onSelect,
}: CalendarDayProps) {
  const indicator =
    selected || state === 'complete'
      ? ''
      : state === 'partial'
        ? `${progress}%`
        : state === 'future'
          ? '—'
          : '0%';
  const label = `${day} ${indicator ? `${indicator} ` : ''}${date}, ${state === 'complete' ? 'completo' : state === 'partial' ? `${progress}%` : state === 'future' ? 'próximo' : 'sin registro'}${today ? ', hoy' : ''}`;
  const content = (
    <>
      <span className="hf-calendar-day__label">{day}</span>{' '}
      <span
        className={`hf-calendar-day__capsule hf-calendar-day__capsule--${state}${selected ? ' is-selected' : ''}${today ? ' is-today' : ''}`}
      >
        {selected ? (
          <PlantCharacter view="face" species={species} decorative />
        ) : state === 'complete' ? (
          <img src={figmaComponents.calendar.imgIcono} alt="" />
        ) : state === 'partial' ? (
          `${progress}%`
        ) : state === 'future' ? (
          '—'
        ) : (
          '0%'
        )}
      </span>{' '}
      <span className="hf-calendar-day__date">
        {date}
        {today && <img src={figmaComponents.calendar.imgMarcaDeHoy} alt="" />}
      </span>
    </>
  );
  return onSelect ? (
    <button
      type="button"
      className="hf-calendar-day"
      aria-label={label}
      aria-pressed={Boolean(selected)}
      aria-current={today ? 'date' : undefined}
      onClick={onSelect}
    >
      {content}
    </button>
  ) : (
    <div className="hf-calendar-day" role="img" aria-label={label}>
      {content}
    </div>
  );
}
