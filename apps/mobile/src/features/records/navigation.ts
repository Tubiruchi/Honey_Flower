import { useLocation, useNavigate } from 'react-router-dom';

export function useOpenRecords() {
  const navigate = useNavigate();
  const location = useLocation();
  return (day?: number, eventId?: string) =>
    navigate('/perfil/registros', {
      state: {
        from: ['/inicio', '/perfil', '/inicio/agua', '/inicio/protector'].includes(
          location.pathname,
        )
          ? location.pathname
          : '/perfil',
        sourceKey: location.key,
        day,
        eventId,
      },
    });
}
export function recordsOrigin(value: unknown): string | null {
  if (
    !value ||
    typeof value !== 'object' ||
    !('from' in value) ||
    !('sourceKey' in value) ||
    typeof value.sourceKey !== 'string'
  )
    return null;
  return typeof value.from === 'string' &&
    ['/inicio', '/perfil', '/inicio/agua', '/inicio/protector'].includes(value.from)
    ? value.from
    : null;
}
