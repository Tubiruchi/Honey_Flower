import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import type { Photo } from '@capacitor/camera';
import { useLocal } from '../local/LocalProvider';
import { WaterAttemptStore } from './attempt';
import { nativeWaterPhoto } from '../../shared/native/waterCamera';
import type { CapturedWaterPhoto } from '../../shared/native/waterCamera';

let restored: CapturedWaterPhoto | null = null;
const listeners = new Set<() => void>();
const restoredIds = new Set<string>();
export function takeRestoredWaterPhoto() {
  const photo = restored;
  restored = null;
  return photo;
}
export function onRestoredWaterPhoto(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function WaterRuntime() {
  const { storage, state } = useLocal();
  const navigate = useNavigate();
  const ready = !!state;
  useEffect(() => {
    if (!ready) return;
    let active = true;
    let handle: PluginListenerHandle | undefined;
    const store = new WaterAttemptStore(storage);
    const restore = async () => {
      try {
        const attempt = await store.read();
        if (active && attempt) void navigate('/inicio/agua', { replace: true });
      } catch {
        if (active) void navigate('/inicio/agua', { replace: true });
      }
    };
    if (Capacitor.getPlatform() === 'android') {
      void App.addListener('appRestoredResult', async (event) => {
        if (!active || event.pluginId !== 'Camera' || event.methodName !== 'getPhoto') return;
        const attempt = await store.read().catch(() => null);
        if (!attempt?.awaitingCapture || !attempt.captureId || attempt.command) return;
        if (restoredIds.has(attempt.captureId)) return;
        restoredIds.add(attempt.captureId);
        if (event.success) {
          try {
            const photo = await nativeWaterPhoto(event.data as Photo, attempt.captureId);
            if (!active) {
              await photo.dispose();
              return;
            }
            if (restored?.id === photo.id) return;
            if (restored) await restored.dispose();
            restored = photo;
            listeners.forEach((listener) => listener());
          } catch {
            /* The recovery screen retains the amount and asks for a new capture. */
          }
        }
        void navigate('/inicio/agua', { replace: true });
      }).then((result) => {
        handle = result;
        if (!active) void result.remove();
      });
    }
    void restore();
    return () => {
      active = false;
      void handle?.remove();
    };
  }, [ready, storage, navigate]);
  return null;
}
