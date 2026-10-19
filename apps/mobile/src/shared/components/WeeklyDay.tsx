import { figmaComponents } from '../../assets/figma/components';
export interface WeeklyDayProps {
  day: number;
  state: 'current' | 'complete' | 'future' | 'partial' | 'missed';
}
export function WeeklyDay({ day, state }: WeeklyDayProps) {
  const labels = {
    current: 'Actual',
    complete: 'Completo',
    future: 'Próximo',
    partial: 'Parcial',
    missed: 'Sin registros',
  };
  return (
    <div
      className={`hf-weekly-day hf-weekly-day--${state}`}
      role="img"
      aria-label={`D${day}: ${labels[state]}`}
    >
      <span>D{day}</span>
      {state === 'current' ? (
        <img src={figmaComponents.weekly.imgHfIconLeaf} alt="" />
      ) : state === 'complete' ? (
        <img src={figmaComponents.weekly.imgHfIconCheck} alt="" />
      ) : state === 'partial' || state === 'missed' ? (
        <span className="hf-type-caption">{state === 'partial' ? 'Parcial' : '0%'}</span>
      ) : null}
    </div>
  );
}
