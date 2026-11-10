import { useRef } from 'react';
import type { CSSProperties } from 'react';
import { GardenBackdrop, PlantCharacter } from '../../shared/components';
import { phase2Assets } from '../../assets/figma/components/phase2';
import type { GardenPlant } from './model';

// Original Figma anchors in the 370 × 336 patio, scaled with the clean backdrop.
export const GARDEN_SLOTS = [
  { x: 40.84, y: 56.64, w: 132.923, h: 108, sx: 85.3, sy: 160.64 },
  { x: 203.64, y: 86.88, w: 132.923, h: 108, sx: 248.1, sy: 190.88 },
  { x: 34.68, y: 187.04, w: 137.846, h: 112, sx: 81.6, sy: 295.04 },
  { x: 204.88, y: 213.92, w: 137.846, h: 112, sx: 251.8, sy: 321.92 },
  { x: 130, y: 153, w: 110, h: 90, sx: 0, sy: 0 },
] as const;

export function GardenScene({
  plants,
  month,
  onOpen,
  onMove,
}: {
  plants: readonly GardenPlant[];
  month: string;
  onOpen: (index: number) => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  return (
    <div
      className="hf-garden-scene analysis-scene"
      role="group"
      onDragStart={(event) => event.preventDefault()}
      aria-label={`Jardín de ${month}: ${plants.length} ${plants.length === 1 ? 'planta viva' : 'plantas vivas'}`}
      onPointerDown={(event) => {
        if (event.isPrimary) {
          suppressClick.current = false;
          start.current = { x: event.clientX, y: event.clientY };
        }
      }}
      onPointerCancel={() => {
        start.current = null;
      }}
      onPointerUp={(event) => {
        const from = start.current;
        start.current = null;
        if (!from) return;
        const dx = event.clientX - from.x;
        const dy = event.clientY - from.y;
        if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          suppressClick.current = true;
          onMove(dx < 0 ? 1 : -1);
        }
      }}
    >
      <GardenBackdrop decorative />
      {plants
        .filter((plant) => plant.survived && plant.slot < GARDEN_SLOTS.length)
        .map((plant) => {
          const slot = GARDEN_SLOTS[plant.slot]!;
          const position: CSSProperties = {
            left: `${(slot.x / 370) * 100}%`,
            top: `${(slot.y / 336) * 100}%`,
            width: `${(slot.w / 370) * 100}%`,
            height: `${(slot.h / 336) * 100}%`,
            zIndex: Math.round(slot.y + slot.h),
          };
          return (
            <div key={plant.id}>
              {slot.sx !== 0 && (
                <img
                  className="analysis-scene__support"
                  src={phase2Assets.gardenSupport}
                  alt=""
                  width={44}
                  height={6}
                  style={{ left: `${(slot.sx / 370) * 100}%`, top: `${(slot.sy / 336) * 100}%` }}
                />
              )}
              <button
                type="button"
                className="hf-garden-scene__plant analysis-scene__plant"
                style={position}
                data-cycle-id={plant.id}
                data-slot={plant.slot}
                aria-label={`Ver progreso de ${plant.species === 'sprout' ? 'Brote' : 'Cactus'}, ciclo ${plant.index + 1}`}
                onClick={() => {
                  if (!suppressClick.current) onOpen(plant.index);
                  suppressClick.current = false;
                }}
              >
                <PlantCharacter species={plant.species} health="healthy" decorative />
              </button>
            </div>
          );
        })}
    </div>
  );
}
