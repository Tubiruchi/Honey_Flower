import { useContext, useEffect } from 'react';
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router-dom';

/** Component previews can use MemoryRouter; the app and navigation tests use a data router. */
export function RouteEditGuard(props: { active: boolean; busy: boolean; onCancel: () => void }) {
  const dataRouter = useContext(UNSAFE_DataRouterContext);
  return dataRouter ? <DataRouteEditGuard {...props} /> : null;
}
function DataRouteEditGuard({
  active,
  busy,
  onCancel,
}: {
  active: boolean;
  busy: boolean;
  onCancel: () => void;
}) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      active && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (!busy) onCancel();
    blocker.reset();
  }, [blocker, busy, onCancel]);
  return null;
}
