import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { deviceWaterCamera } from '../../shared/native/waterCamera';
import type { WaterCamera } from '../../shared/native/waterCamera';
import { personalWaterReview } from './analysis';
import type { WaterAnalyzer } from './analysis';
const defaults = { camera: deviceWaterCamera(), analyzer: personalWaterReview };
const WaterServices = createContext(defaults);
/** Isolated previews inject ports; the application always uses its device camera. */
export function WaterServicesProvider({
  camera,
  analyzer = personalWaterReview,
  children,
}: {
  camera: WaterCamera;
  analyzer?: WaterAnalyzer;
  children: ReactNode;
}) {
  return <WaterServices.Provider value={{ camera, analyzer }}>{children}</WaterServices.Provider>;
}
export const useWaterServices = () => useContext(WaterServices);
