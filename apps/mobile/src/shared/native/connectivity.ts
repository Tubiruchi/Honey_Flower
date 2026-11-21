import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import type { NetworkPlugin } from '@capacitor/network';

export interface ConnectivityListenerHandle {
  remove: () => Promise<void>;
}

export interface ConnectivityPort {
  getStatus: () => Promise<boolean>;
  addListener: (listener: (connected: boolean) => void) => Promise<ConnectivityListenerHandle>;
}

export interface ConnectivitySnapshot {
  connected: boolean;
  initial: boolean;
  recovered: boolean;
}

export function createCapacitorConnectivity(
  network: Pick<NetworkPlugin, 'getStatus' | 'addListener'> = Network,
): ConnectivityPort {
  return {
    async getStatus() {
      return (await network.getStatus()).connected;
    },
    addListener(listener) {
      return network.addListener('networkStatusChange', ({ connected }) => listener(connected));
    },
  };
}

export function createBrowserConnectivity(
  target: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
  status: Pick<Navigator, 'onLine'> = navigator,
): ConnectivityPort {
  return {
    async getStatus() {
      return status.onLine !== false;
    },
    async addListener(listener) {
      const online = () => listener(true);
      const offline = () => listener(false);
      target.addEventListener('online', online);
      target.addEventListener('offline', offline);
      return {
        async remove() {
          target.removeEventListener('online', online);
          target.removeEventListener('offline', offline);
        },
      };
    },
  };
}

export function createDeviceConnectivity(): ConnectivityPort {
  return Capacitor.isNativePlatform() ? createCapacitorConnectivity() : createBrowserConnectivity();
}

export function watchConnectivity(
  connectivity: ConnectivityPort,
  listener: (snapshot: ConnectivitySnapshot) => void,
): () => Promise<void> {
  let active = true;
  let previous: boolean | null = null;
  const publish = (connected: boolean) => {
    if (!active || previous === connected) return;
    const initial = previous === null;
    const recovered = previous === false && connected;
    previous = connected;
    listener({ connected, initial, recovered });
  };
  const handle = connectivity.addListener(publish).catch(() => null);
  void connectivity
    .getStatus()
    .then(publish)
    .catch(() => undefined);
  return async () => {
    active = false;
    const listenerHandle = await handle;
    await listenerHandle?.remove();
  };
}
