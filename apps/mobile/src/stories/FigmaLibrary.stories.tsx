import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import {
  AppBar,
  BottomNavigation,
  Button,
  CalendarDay,
  Feedback,
  GardenCollectionRow,
  HabitSummary,
  Icon,
  IconButton,
  InfoCard,
  Input,
  MonthNavigator,
  OnboardingProgress,
  PlantCharacter,
  ProfileStat,
  SettingRow,
  SettingsLink,
  Stepper,
  StreakBadge,
  TimeRow,
  ToneSelector,
  WeeklyDay,
  iconSources,
} from '../shared/components';
import type { ReactNode } from 'react';

function Sample({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="hf-library-sample">
      <h2 className="hf-type-heading-md">{title}</h2>
      <div className="hf-stack">{children}</div>
    </section>
  );
}
const action = fn();
const meta = {
  title: 'Figma/Biblioteca',
  parameters: {
    edgeToEdge: true,
    docs: {
      description: {
        component:
          'Vista general de los componentes compartidos. Cada familia tiene sus variantes y controles en el catálogo. [Biblioteca original en Figma](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=65-676).',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Vista general',
  render: () => (
    <main className="hf-library-overview">
      <h1 className="hf-type-heading-xl">Componentes HoneyFlower</h1>
      <p className="hf-muted">La misma base visual en Storybook y en la aplicación.</p>
      <div className="hf-library-grid">
        <Sample title="Botones">
          <Button onClick={action}>Continuar</Button>
          <Button variant="secondary" onClick={action}>
            Acción secundaria
          </Button>
          <Button variant="text" onClick={action}>
            Acción de texto
          </Button>
          <Button variant="sunscreen" onClick={action}>
            Registrar aplicación
          </Button>
          <IconButton label="Volver" onClick={action} />
        </Sample>
        <Sample title="Campos">
          <Input label="Nombre" defaultValue="Alex" help="Puedes cambiarlo después." />
          <Input type="email" label="Correo electrónico" placeholder="tu@correo.com" />
          <Input type="password" label="Contraseña" defaultValue="ejemplo-local" />
        </Sample>
        <Sample title="Preferencias">
          <SettingRow
            label="Recibir notificaciones"
            description="Puedes usar la app con los avisos apagados."
            checked
            onChange={action}
          />
          <SettingRow
            label="Recibir notificaciones"
            description="Puedes usar la app con los avisos apagados."
            checked={false}
            disabled
            onChange={action}
          />
          <ToneSelector value="medium" onChange={action} />
        </Sample>
        <Sample title="Cantidad y horarios">
          <Stepper
            label="Reaplicaciones"
            value={2}
            min={0}
            max={6}
            unit="reaplicaciones"
            onChange={action}
          />
          <TimeRow label="Recordatorio" value="08:00" onChange={action} />
          <TimeRow label="Recordatorio" value="08:00" disabled onChange={action} />
        </Sample>
        <Sample title="Mensajes y tarjetas">
          <Feedback variant="info" title="Revisa tu correo">
            <p>Te enviaremos instrucciones para recuperar el acceso.</p>
          </Feedback>
          <Feedback variant="error" title="No pudimos continuar">
            <p>Revisa los datos e inténtalo de nuevo.</p>
          </Feedback>
          <InfoCard title="Registra, cuida y colecciona" icon={<Icon name="leaf" />}>
            <p>Dos hábitos, siete días y una planta para tu jardín.</p>
          </InfoCard>
        </Sample>
        <Sample title="Hábitos">
          <HabitSummary value="1,000 / 2,000 mL" />
          <HabitSummary kind="sunscreen" value="1 / 3 aplicaciones" />
          <StreakBadge />
          <OnboardingProgress step={3} />
        </Sample>
        <Sample title="Semana y calendario">
          <div className="hf-row">
            <WeeklyDay day={2} state="complete" />
            <WeeklyDay day={3} state="current" />
            <WeeklyDay day={4} state="future" />
          </div>
          <div className="hf-row">
            <CalendarDay day="Dom" date="18" state="complete" />
            <CalendarDay day="Lun" date="19" state="partial" selected />
            <CalendarDay day="Mar" date="20" state="missed" />
            <CalendarDay day="Mié" date="21" state="future" today />
          </div>
        </Sample>
        <Sample title="Navegación">
          <AppBar title="HONEYFLOWER" onBack={action} />
          <BottomNavigation active="garden" onNavigate={action} />
          <MonthNavigator onPrevious={action} onNext={action} />
        </Sample>
        <Sample title="Jardín y perfil">
          <GardenCollectionRow onOpen={action} />
          <SettingsLink onClick={action} />
          <ProfileStat />
          <PlantCharacter />
        </Sample>
        <Sample title="Iconos originales">
          <div className="hf-icon-library">
            {(Object.keys(iconSources) as Array<keyof typeof iconSources>).map((name) => (
              <div key={name}>
                <Icon name={name} />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </Sample>
      </div>
    </main>
  ),
};
