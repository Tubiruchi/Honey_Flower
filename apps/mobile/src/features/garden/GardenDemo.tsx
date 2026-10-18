import { useState } from 'react';
import { Flower2 } from 'lucide-react';
import { Button, GardenPlant } from '../../shared/components';

export function GardenDemo() {
  const [showHistory, setShowHistory] = useState(false);
  const [selected, setSelected] = useState(false);
  return (
    <div className="hf-stack">
      <h1 className="hf-type-heading-xl">Tu jardín</h1>
      <div className="hf-row" role="group" aria-label="Colección de plantas">
        <Button
          variant={showHistory ? 'secondary' : 'primary'}
          aria-pressed={!showHistory}
          onClick={() => {
            setShowHistory(false);
            setSelected(false);
          }}
        >
          Vivas
        </Button>
        <Button
          variant={showHistory ? 'primary' : 'secondary'}
          aria-pressed={showHistory}
          onClick={() => {
            setShowHistory(true);
            setSelected(false);
          }}
        >
          Marchitas
        </Button>
      </div>
      {showHistory ? (
        <div className="hf-card">
          <Flower2 size={40} aria-hidden="true" />
          <h2 className="hf-type-heading-md">Sin plantas marchitas</h2>
          <p className="hf-muted">En esta demostración no hay ciclos archivados.</p>
        </div>
      ) : (
        <GardenPlant
          name="Margarita"
          species="Margarita"
          cycleLabel="Ciclo de ejemplo"
          result="survived"
          onOpen={() => setSelected(true)}
        />
      )}
      {selected && (
        <p className="hf-card" role="status">
          Margarita es una planta de ejemplo. El historial real se añadirá al implementar los
          ciclos.
        </p>
      )}
    </div>
  );
}
