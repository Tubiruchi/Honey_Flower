import { create } from 'storybook/theming';
import source from '@honeyflower/design-tokens/source';

const tokens = source.tokens;

export const honeyflowerTheme = create({
  base: 'dark',
  brandTitle: 'HoneyFlower',
  fontBase: `${tokens['typography/base/family/sans'].value}, sans-serif`,
  colorPrimary: tokens['color/base/lavender-400'].value,
  colorSecondary: tokens['color/base/periwinkle-400'].value,
  appBg: tokens['color/base/plum-950'].value,
  appContentBg: tokens['color/base/plum-950'].value,
  barBg: tokens['color/base/plum-900'].value,
  textColor: tokens['color/base/white'].value,
});
