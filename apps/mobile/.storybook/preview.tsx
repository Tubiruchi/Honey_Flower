import type { Preview } from '@storybook/react-vite';
import { honeyflowerTheme } from './theme';
import '../src/app/setup';
import '../src/shared/styles/index.css';
import '../src/stories/figma-states.css';

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    docs: { theme: honeyflowerTheme },
    layout: 'fullscreen',
    backgrounds: {
      options: { dark: { name: 'HoneyFlower · Dark', value: '#211A30' } },
    },
    viewport: {
      options: {
        small: { name: 'Móvil 320', styles: { width: '320px', height: '740px' } },
        medium: { name: 'Móvil 360', styles: { width: '360px', height: '800px' } },
        reference: { name: 'Referencia 402', styles: { width: '402px', height: '874px' } },
        wide: { name: 'Móvil 480', styles: { width: '480px', height: '900px' } },
      },
    },
    a11y: { test: 'error' },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    options: {
      storySort: {
        order: [
          'Bienvenida',
          'Fundamentos',
          'Figma',
          'Base',
          'Hábitos',
          'Planta',
          'Recordatorios',
          'Cámara',
          'Sincronización',
          'Jardín',
          'Pantallas',
        ],
      },
    },
  },
  initialGlobals: { backgrounds: { value: 'dark' } },
  decorators: [
    (Story, context) => (
      <div
        className={`${context.parameters.edgeToEdge ? 'hf-story-edge' : 'hf-story-frame'} hf-reference-${context.parameters.referenceState ?? 'normal'}`}
        lang="es"
        style={
          context.parameters.designWidth
            ? { maxWidth: context.parameters.designWidth + 48 }
            : undefined
        }
      >
        <Story />
      </div>
    ),
  ],
};

export default preview;
