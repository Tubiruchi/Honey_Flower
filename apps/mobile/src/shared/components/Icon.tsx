import type { CSSProperties } from 'react';
import { figmaComponents } from '../../assets/figma/components';

const source = figmaComponents.icons;
export const iconSources = {
  drop: source.imgHfIconDrop,
  sun: source.imgHfIconSun,
  clock: source.imgHfIconClock,
  leaf: source.imgHfIconLeaf,
  bell: source.imgHfIconBell,
  moon: source.imgHfIconMoon,
  user: source.imgHfIconUser,
  check: source.imgHfIconCheck,
  chevron: source.imgHfIconChevron,
  back: source.imgHfIconBack,
  plus: source.imgHfIconPlus,
  minus: source.imgHfIconMinus,
  volume: source.imgHfIconVolume,
  flash: source.imgHfIconFlash,
  shield: source.imgHfIconShield,
  mail: source.imgFrame10,
  lock: source.imgFrame9,
  eye: source.imgFrame8,
  eyeoff: source.imgFrame7,
  info: source.imgFrame6,
  offline: source.imgFrame5,
  home: source.imgFrame4,
  arrow: source.imgFrame3,
  close: source.imgFrame2,
  spinner: source.imgFrame1,
  settings: source.imgFrame,
} as const;

export interface IconProps {
  name: keyof typeof iconSources;
  /** Original monochrome artwork can inherit a control's semantic foreground. */
  inheritColor?: boolean;
  className?: string;
}

export function Icon({ name, inheritColor, className = '' }: IconProps) {
  const src = iconSources[name];
  return inheritColor ? (
    <span
      aria-hidden="true"
      className={`hf-icon hf-icon--tinted ${className}`}
      style={{ '--hf-icon-source': `url("${src}")` } as CSSProperties}
    />
  ) : (
    <img className={`hf-icon ${className}`} src={src} alt="" aria-hidden="true" />
  );
}
