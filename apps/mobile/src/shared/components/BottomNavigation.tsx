import { Icon } from './Icon';
import type { IconProps } from './Icon';
export const navigationItems = [
  { value: 'home', label: 'Inicio', icon: 'home' },
  { value: 'garden', label: 'Jardín', icon: 'leaf' },
  { value: 'profile', label: 'Perfil', icon: 'user' },
] as const;
export function NavigationItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: IconProps['name'];
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`hf-navigation-item${active ? ' is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      <span className="hf-navigation-item__icon">
        <Icon name={icon} inheritColor />
      </span>
      <span>{label}</span>
    </button>
  );
}
export function BottomNavigation({
  active = 'home',
  gardenLabel = 'Jardín',
  onNavigate,
}: {
  active?: (typeof navigationItems)[number]['value'];
  gardenLabel?: string;
  onNavigate: (value: (typeof navigationItems)[number]['value']) => void;
}) {
  return (
    <nav className="hf-bottom-navigation" aria-label="Navegación principal">
      {navigationItems.map((item) => (
        <NavigationItem
          key={item.value}
          label={item.value === 'garden' ? gardenLabel : item.label}
          icon={item.icon}
          active={active === item.value}
          onClick={() => onNavigate(item.value)}
        />
      ))}
    </nav>
  );
}
