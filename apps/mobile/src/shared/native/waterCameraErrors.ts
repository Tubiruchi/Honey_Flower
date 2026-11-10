export class WaterCameraError extends Error {
  code: 'denied' | 'unavailable' | 'cancelled' | 'failed';
  constructor(code: WaterCameraError['code'], message: string) {
    super(message);
    this.code = code;
  }
}
export function cameraError(error: unknown): WaterCameraError {
  if (error instanceof WaterCameraError) return error;
  // DOMException and errors returned by native bridges need not inherit this realm's Error.
  const details =
    typeof error === 'object' && error !== null
      ? (error as { name?: unknown; message?: unknown })
      : {};
  const name = typeof details.name === 'string' ? details.name : '';
  const message = typeof details.message === 'string' ? details.message : String(error);
  if (name === 'NotAllowedError' || /permission|denied|not authorized/i.test(message))
    return new WaterCameraError(
      'denied',
      'La cámara no tiene permiso. Autorízala en los ajustes del dispositivo y vuelve a intentar.',
    );
  if (/cancel/i.test(message))
    return new WaterCameraError(
      'cancelled',
      'Se canceló la fotografía. Puedes volver a tomarla o salir sin registrar.',
    );
  if (name === 'NotFoundError' || /not available|not implemented|no camera/i.test(message))
    return new WaterCameraError(
      'unavailable',
      'No encontramos una cámara disponible en este dispositivo.',
    );
  return new WaterCameraError(
    'failed',
    'No pudimos completar la fotografía. Reintenta sin perder tu cantidad.',
  );
}
