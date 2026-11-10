import type { CapturedWaterPhoto } from '../../shared/native/waterCamera.ts';
export type WaterAnalysis =
  | { status: 'approved'; analyzer: string; message: string }
  | { status: 'rejected' | 'uncertain'; message: string };
export interface WaterAnalyzer {
  analyze: (photo: CapturedWaterPhoto) => Promise<WaterAnalysis>;
}
/** No object model is shipped yet. A real photo permits personal review, never a fabricated positive detection. */
export const personalWaterReview: WaterAnalyzer = {
  analyze: async () => ({
    status: 'uncertain',
    message:
      'Revisión personal: la identificación automática no está disponible. Confirma tu foto y la cantidad que bebiste.',
  }),
};
