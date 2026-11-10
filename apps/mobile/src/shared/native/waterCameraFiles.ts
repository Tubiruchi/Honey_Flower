/** getPhoto's camera output is confined to this app's processed cache or private Pictures. */
export function isOwnedCameraFile(path: string) {
  return /^file:\/\/\/(?:data\/(?:user\/\d+|data)\/com\.honeyflower\.app\/cache|storage\/emulated\/\d+\/Android\/data\/com\.honeyflower\.app\/files\/Pictures)\/JPEG_\d{8}_\d{6}_\d+\.jpg$/.test(
    path,
  );
}
