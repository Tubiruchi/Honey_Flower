import { figmaComponents } from '../../assets/figma/components';
import { PlantCharacter } from './PlantCharacter';
import type { PlantCharacterProps } from './PlantCharacter';
import { Icon } from './Icon';

export function GreenhouseScene() {
  return (
    <img
      className="hf-greenhouse-scene"
      src={figmaComponents.greenhouse.imgHfGreenhouseScene}
      alt="Invernadero"
      width={338}
      height={200}
    />
  );
}
export function GardenBackdrop() {
  return (
    <div className="hf-garden-backdrop">
      <img
        src={figmaComponents.backdrop.imgIlustracionDeEntornoSinUiNiPersonajes}
        alt="Jardín dentro de un invernadero"
      />
    </div>
  );
}
export function GardenCollectionRow({
  name = 'Cactus dramático',
  date = '25 sep · Ciclo completado',
  species = 'cactus',
  onOpen,
}: {
  name?: string;
  date?: string;
  species?: PlantCharacterProps['species'];
  onOpen: () => void;
}) {
  return (
    <button className="hf-collection-row" type="button" onClick={onOpen}>
      <span className="hf-collection-row__portrait">
        <PlantCharacter view="face" species={species} decorative />
      </span>
      <span className="hf-collection-row__text">
        <span className="hf-type-label-md">{name}</span>
        <span className="hf-type-caption">{date}</span>
      </span>
      <Icon name="chevron" inheritColor />
    </button>
  );
}
export function MonthNavigator({
  month = 'Octubre 2026',
  count = '0 plantas ganadas este mes',
  nextDisabled,
  onPrevious,
  onNext,
}: {
  month?: string;
  count?: string;
  nextDisabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="hf-month-navigator">
      <button type="button" aria-label="Mes anterior" onClick={onPrevious}>
        <span>
          <Icon name="back" inheritColor />
        </span>
      </button>
      <div>
        <p className="hf-type-data-md">{month}</p>
        <p className="hf-type-caption">{count}</p>
      </div>
      <button type="button" aria-label="Mes siguiente" disabled={nextDisabled} onClick={onNext}>
        <span>
          <Icon name="chevron" inheritColor />
        </span>
      </button>
    </div>
  );
}
