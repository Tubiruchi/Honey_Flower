import { useState } from 'react';
import {
  DailyProgress,
  HabitAction,
  PlantStatus,
  SyncStatus,
  WeeklyGrid,
} from '../../shared/components';
import { demoPlant, demoWeek } from '../../stories/fixtures';

/** Vista de composición local: no guarda registros ni ejecuta reglas de cierre. */
export function HomeDemo() {
  const [water, setWater] = useState(500);
  const [sunscreen, setSunscreen] = useState(0);
  const progress = ((water / 2000 + sunscreen / 2) / 2) * 100;
  return (
    <div className="hf-stack">
      <div>
        <p className="hf-muted">Pequeños cuidados, nuevas hojas</p>
        <h1 className="hf-type-heading-xl">Tu jardín empieza contigo</h1>
      </div>
      <PlantStatus {...demoPlant} />
      <div className="hf-habits">
        <HabitAction
          kind="water"
          summary={`${water.toLocaleString('es-MX')} / 2,000 mL`}
          actionLabel="Registrar +250 mL"
          completed={water >= 2000}
          onRegister={() => setWater(Math.min(water + 250, 2000))}
        />
        <HabitAction
          kind="sunscreen"
          summary={`${sunscreen} / 2 aplicaciones`}
          actionLabel={sunscreen === 0 ? 'Registrar aplicación' : 'Registrar reaplicación'}
          completed={sunscreen >= 2}
          onRegister={() => setSunscreen(Math.min(sunscreen + 1, 2))}
        />
      </div>
      <DailyProgress value={progress} provisional />
      <WeeklyGrid days={demoWeek} />
      <SyncStatus state="offline" pendingCount={Math.max(0, (water - 500) / 250 + sunscreen)} />
    </div>
  );
}
