import { Capacitor } from '@capacitor/core';
import type { Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { isOwnedCameraFile } from './waterCameraFiles.ts';
import { cameraError, WaterCameraError } from './waterCameraErrors.ts';

export interface CapturedWaterPhoto {
  id: string;
  url: string;
  capturedAt: number;
  source: 'web' | 'android';
  dispose: () => Promise<void>;
}
export interface WaterCameraSession {
  source: 'web' | 'android';
  stream?: MediaStream;
  capture: (captureId: string, video?: HTMLVideoElement | null) => Promise<CapturedWaterPhoto>;
  stop: () => void;
}
export interface WaterCamera {
  open: () => Promise<WaterCameraSession>;
  cleanup?: () => Promise<void>;
}
/** Only the plugin's camera files inside app-owned directories may be released. */
const cameraFilename = /^JPEG_\d{8}_\d{6}_\d+\.jpg$/;
async function clearCameraFiles() {
  // getPhoto creates both an app-private original and a processed cache copy.
  // Restrict cleanup to the plugin's exact camera filename in these two owned directories.
  for (const [directory, path] of [
    [Directory.External, 'Pictures'],
    [Directory.Cache, ''],
  ] as const) {
    try {
      const { files } = await Filesystem.readdir({ directory, path });
      await Promise.all(
        files
          .filter((file) => cameraFilename.test(file.name) && file.type === 'file')
          .map((file) =>
            Filesystem.deleteFile({ directory, path: path ? `${path}/${file.name}` : file.name }),
          ),
      );
    } catch {
      /* A missing or cleared cache needs no cleanup. */
    }
  }
}
export async function nativeWaterPhoto(
  photo: Photo,
  captureId: string,
): Promise<CapturedWaterPhoto> {
  if (!photo.path || !isOwnedCameraFile(photo.path))
    throw new WaterCameraError(
      'failed',
      'No pudimos recuperar el archivo temporal de la cámara. Vuelve a tomar la foto.',
    );
  const path = photo.path;
  let released = false;
  return {
    id: captureId,
    url: Capacitor.convertFileSrc(path),
    source: 'android',
    capturedAt: Date.now(),
    dispose: async () => {
      if (released) return;
      released = true;
      try {
        await Filesystem.deleteFile({ path });
      } catch {
        /* A cleared OS cache is already released. */
      }
      const filename = path.split('/').at(-1)!;
      try {
        await Filesystem.deleteFile({
          directory: Directory.External,
          path: `Pictures/${filename}`,
        });
      } catch {
        /* The private original may already be gone. */
      }
    },
  };
}
/** Both Android WebView and browser render their camera stream inside HoneyFlower. */
function inlineWaterCamera(source: 'web' | 'android'): WaterCamera {
  return {
    ...(source === 'android' ? { cleanup: clearCameraFiles } : {}),
    open: async () => {
      if (source === 'android') await clearCameraFiles();
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
        throw new WaterCameraError(
          'unavailable',
          'La cámara requiere una conexión segura y un navegador compatible.',
        );
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 1920 },
          },
          audio: false,
        });
      } catch (error) {
        // Some engines report NotSupportedError even when the permission is explicitly denied.
        let denied = false;
        try {
          denied = (await navigator.permissions?.query({ name: 'camera' }))?.state === 'denied';
        } catch {
          /* Permission queries are optional on older browsers. */
        }
        if (denied) throw cameraError({ name: 'NotAllowedError', message: '' });
        throw cameraError(error);
      }
      let stopped = false;
      return {
        source,
        stream,
        stop: () => {
          if (stopped) return;
          stopped = true;
          stream.getTracks().forEach((track) => track.stop());
        },
        capture: async (captureId, video) => {
          if (
            stopped ||
            !stream.getVideoTracks().some((track) => track.readyState === 'live') ||
            !video ||
            video.srcObject !== stream ||
            video.readyState < 2 ||
            !video.videoWidth ||
            !video.videoHeight
          )
            throw new WaterCameraError(
              'failed',
              'Espera a que aparezca la cámara y vuelve a tomar la foto.',
            );
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.round(video.videoHeight * scale);
          const drawing = canvas.getContext('2d');
          if (!drawing)
            throw new WaterCameraError('failed', 'El navegador no pudo preparar la fotografía.');
          drawing.drawImage(video, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
              (value) =>
                value
                  ? resolve(value)
                  : reject(new WaterCameraError('failed', 'No pudimos completar la fotografía.')),
              'image/jpeg',
              0.85,
            ),
          );
          const url = URL.createObjectURL(blob);
          let released = false;
          return {
            id: captureId,
            url,
            capturedAt: Date.now(),
            source,
            dispose: async () => {
              if (!released) {
                URL.revokeObjectURL(url);
                released = true;
              }
            },
          };
        },
      };
    },
  };
}
export const nativeWaterCamera = inlineWaterCamera('android');
export const browserWaterCamera = inlineWaterCamera('web');
export function deviceWaterCamera(): WaterCamera {
  return Capacitor.getPlatform() === 'android' ? nativeWaterCamera : browserWaterCamera;
}
