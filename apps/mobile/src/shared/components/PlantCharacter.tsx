import { figmaComponents } from '../../assets/figma/components';
import { phase2Assets } from '../../assets/figma/components/phase2';
import type { PlantHealth } from '@honeyflower/contracts';

export interface PlantCharacterProps {
  species?: 'sprout' | 'cactus';
  view?: 'full' | 'face';
  health?: PlantHealth;
  decorative?: boolean;
}
export function PlantCharacter({
  species = 'sprout',
  view = 'full',
  health = 'healthy',
  decorative = false,
}: PlantCharacterProps) {
  return (
    <div
      className={`hf-character hf-character--${species} hf-character--${view} hf-character--${health}`}
      role={decorative ? undefined : 'img'}
      aria-label={
        decorative
          ? undefined
          : `${species === 'sprout' ? 'Brote' : 'Cactus'} ${{ healthy: 'saludable', neglected: 'descuidada', withered: 'marchita' }[health]}`
      }
      aria-hidden={decorative || undefined}
    >
      <img
        src={
          health !== 'healthy'
            ? phase2Assets[species][health]
            : species === 'sprout'
              ? figmaComponents.character.imgIlustracionPngAprobadaBrote
              : figmaComponents.character.imgIlustracionPngAprobadaCactus
        }
        alt=""
      />
    </div>
  );
}
