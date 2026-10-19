import { figmaComponents } from '../../assets/figma/components';

export interface PlantCharacterProps {
  species?: 'sprout' | 'cactus';
  view?: 'full' | 'face';
  decorative?: boolean;
}
export function PlantCharacter({
  species = 'sprout',
  view = 'full',
  decorative = false,
}: PlantCharacterProps) {
  return (
    <div
      className={`hf-character hf-character--${species} hf-character--${view}`}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : species === 'sprout' ? 'Brote' : 'Cactus'}
      aria-hidden={decorative || undefined}
    >
      <img
        src={
          species === 'sprout'
            ? figmaComponents.character.imgIlustracionPngAprobadaBrote
            : figmaComponents.character.imgIlustracionPngAprobadaCactus
        }
        alt=""
      />
    </div>
  );
}
