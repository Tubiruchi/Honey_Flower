import { figmaComponents } from '../../assets/figma/components';

export function Plant({ eyes = 'open' }: { eyes?: 'open' | 'closed' }) {
  return (
    <img
      className="hf-plant-art"
      src={eyes === 'open' ? figmaComponents.plant.imgFrame : figmaComponents.plant.imgFrame1}
      width={320}
      height={260}
      alt={`Planta con ojos ${eyes === 'open' ? 'abiertos' : 'cerrados'}`}
    />
  );
}
