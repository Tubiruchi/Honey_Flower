import type { Meta, StoryObj } from '@storybook/react-vite';
import source from '@honeyflower/design-tokens/source';

const meta = { title: 'Fundamentos/Tokens', tags: ['!autodocs'] } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const SemanticColors: Story = {
  name: 'Colores semánticos',
  render: () => (
    <section className="hf-stack" aria-label="Paleta semántica de HoneyFlower">
      <h1 className="hf-type-heading-xl">Color con propósito</h1>
      <p>
        Roles compartidos por la app y Storybook. Fuente: registro de tokens v1.0 del 18 de octubre
        de 2026.
      </p>
      <div className="hf-foundation-swatches">
        {Object.entries(source.tokens)
          .filter(([name]) => name.startsWith('color/semantic/'))
          .map(([name, token]) => (
            <div className="hf-swatch" key={name}>
              <div className="hf-swatch__color" style={{ background: token.web }} />
              <strong>{name.replace('color/semantic/', '')}</strong>
              <code>{token.web}</code>
            </div>
          ))}
      </div>
    </section>
  ),
};

export const Typography: Story = {
  name: 'Tipografía',
  render: () => (
    <section className="hf-stack" aria-label="Estilos tipográficos">
      <h1 className="hf-type-heading-xl">Plus Jakarta Sans</h1>
      {Object.entries(source.textStyles).map(([name]) => (
        <div key={name}>
          <p className="hf-muted">{name}</p>
          <p className={name.replace('type/', 'hf-type-')}>
            Pequeños cuidados, nuevas hojas. Áéíóú ñ ¿cómo estás?
          </p>
        </div>
      ))}
    </section>
  ),
};
