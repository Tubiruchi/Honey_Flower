# Parche 0.3.1 · cámara integrada y fotografía temporal

Fecha: **9 de noviembre de 2026**. Soluciona el recorrido reportado en la APK 0.3.0.

## Causa y corrección

La cámara dentro de la app sí es posible. El adaptador anterior llamaba a `Camera.getPhoto`,
que abre una Activity de cámara separada en Android. Era la implementación elegida, no una
restricción de HoneyFlower. Ese retorno requiere recuperar el resultado si Android recrea el
proceso; el acceso temporal de Perfil tenía su intento solo en memoria y no participaba en la
recuperación persistente del registro normal. La retención de su foto dependía de que ese
proceso siguiera vivo. Ver [Camera v8](https://capacitorjs.com/docs/apis/camera).

En 0.3.1 Android y navegador comparten captura integrada con `getUserMedia`: video en directo
dentro de HoneyFlower, obturador propio y fotograma JPEG en canvas. En Android Capacitor tramita
el permiso de cámara de WebView, sin pedir micrófono ni abrir otra cámara. Se conservan las
composiciones, personajes y controles existentes.

La foto real se mantiene mediante una URL blob durante la revisión. No se reemplaza por una
imagen de muestra ni depende de una URI entregada por otra aplicación. El obturador espera a
que haya un fotograma disponible, evitando capturar antes de que arranque el video.

Al pausar/salir se detiene el stream; volver exige activarlo otra vez si aún no había foto. Una
foto ya capturada sigue visible al regresar, girar o cancelar la salida. Repetir, salir o
terminar libera la imagen. Las respuestas tardías de permisos/captura ya no pueden reabrir una
cámara cancelada ni reemplazar una sesión nueva.

El acceso de Perfil continúa marcado como **temporal**, sin crear eventos, recibos o un intento
persistente. Una recarga o finalización del proceso requiere una nueva foto; la imagen no se
guarda en el perfil, galería o servidor. El recorrido normal solo registra tras confirmación
personal y conserva sus metadatos Android. Reconocimiento y conexiones futuras mantienen su alcance.

La [guía de integración](conexiones-futuras.md) ahora explica que el analizador recibe una URL blob
también en Android y cómo leer sus bytes antes del puente de inferencia. Las funciones de archivo
y appRestoredResult se conservan solo para resultados pendientes de la cámara de versiones previas.

## Entrega

- APK: `artifacts/android/HoneyFlower-0.3.1-prueba.apk`.
- Android: `com.honeyflower.app`, `versionName 0.3.1-local`, `versionCode 4`.
- Tamaño: **23,329,597 bytes**.
- SHA-256: `c0e18cf7eb2aeffd2a65f010a2eef14490bcfb18022e46cd7a35183698f51202`.
- Misma firma que 0.3.0: actualizar sobre la app instalada conserva registros y preferencias.
- El servidor de descarga ofrece 0.3.1; las APK anteriores permanecen como referencia.

## Comprobaciones

- `npm run check`: tokens, lint, tipos y formato.
- **558 pruebas:** ocho de onboarding, 136 de lógica local y 414 historias en 78 archivos.
  Cuatro pruebas nuevas cubren pausa Android, foto en revisión, permiso tardío, respuesta
  obsoleta y captura que termina después de cancelar.
- Compilación web, Storybook y APK; firma y SHA-256 verificados.
- Navegador con cámara virtual: captura real en canvas, imagen visible, anchos 320/360/402/480,
  repetición, salida/continuación, foco, recarga y ausencia de cambios de registros desde Perfil.
- Pixel_7: actualización conservando eventos y recibos, permiso denegado y autorizado, video
  dentro de MainActivity y ausencia de otra Activity de cámara tanto antes como después del disparo.
- El JPEG capturado tiene bytes e imagen decodificables; el stream queda detenido después de
  capturar. La foto y cantidad permanecen en segundo plano/retorno, giro y salida/continuación.
- Repetir conserva la cantidad y libera el blob anterior. Terminar no cambia perfil, operaciones
  o intento persistente y libera la última imagen.
- El flujo normal confirma un único registro de 425 mL con origen Android, revisión personal y
  sin foto/URL en almacenamiento. El registro permanece tras cerrar completamente y reabrir.

Las pruebas Android se hicieron con cámara emulada. Una primera ejecución agotó la memoria
del entorno; se repitió con más memoria. Los eventos nativos Pause y Stop cubren también los
cambios rápidos entre aplicaciones. La validación en el teléfono del usuario sigue siendo
necesaria para su cámara física y versión de WebView.

Evidencias locales excluidas: `.qa/patch031-native.json`, `.qa/patch031-browser.log`,
capturas de video/foto y registros de pruebas/compilación/descarga. Se restauran perfil,
permisos y giro del emulador al terminar.
