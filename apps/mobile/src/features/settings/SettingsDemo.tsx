import { useState } from 'react';
import type { AlertIntensity } from '@honeyflower/contracts';
import { AlertLevel, Input, SettingRow } from '../../shared/components';

export function SettingsDemo() {
  const [name, setName] = useState('Alex');
  const [tone, setTone] = useState<AlertIntensity>('gentle');
  const [reminders, setReminders] = useState(false);
  return (
    <div className="hf-stack">
      <h1 className="hf-type-heading-xl">Tu perfil</h1>
      <Input
        label="¿Cómo quieres que te llame tu planta?"
        value={name}
        onChange={(event) => setName(event.target.value)}
        help="Nombre de ejemplo, solo se conserva mientras esta vista esté abierta."
        autoComplete="nickname"
      />
      <AlertLevel value={tone} onChange={setTone} />
      <SettingRow
        label="Recordatorios"
        description="Control de ejemplo. No programa notificaciones ni solicita permisos."
        checked={reminders}
        onChange={setReminders}
      />
      <p className="hf-muted">
        Los horarios, permisos Android y guardado de preferencias se integrarán más adelante.
      </p>
    </div>
  );
}
