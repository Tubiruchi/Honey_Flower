# Fase 3 · Bloque 8: revisión integrada y APK 0.3.0

Fecha: **9 de noviembre de 2026**. Implementación y entrega local preparadas.
**Actualización posterior:** la [0.3.1](patch-0.3.1-camara.md) corrige el acceso de cámara;
esta página conserva la evidencia histórica de la entrega 0.3.0.
La APK se verifica en navegador y emulador; la aceptación en el teléfono del usuario, TalkBack y
el pulso físico de linterna permanecen pendientes de esa revisión.

## Entrega

- APK: `artifacts/android/HoneyFlower-0.3.0-prueba.apk`, **22,865,571 bytes**.
- SHA-256: `019f71db21f4548d08d94a85a16b89f259afca66f4b6bfdc68204b781641afba`.
- Identificador conservado: `com.honeyflower.app`.
- Android: `versionCode 3`, `versionName 0.3.0-local`, mínimo Android 7.
- Firma de depuración verificada y certificado coincidente con la APK 0.2.0 anterior.
- `apk:build` y `apk:serve` generan/ofrecen 0.3.0. Se conserva el artefacto anterior.
  No se subió a una tienda ni se publicó en un servidor remoto.

Los [recorridos y pasos de instalación](prueba-local-apk.md) describen las capacidades actuales.
La instalación nueva comienza sin eventos ni plantas ganadas; las fixtures pertenecen a pruebas
aisladas y nunca se copian como perfil inicial. Se mantienen los ajustes de Inicio y jardín pedidos.

## Cambio adicional acordado

Perfil → Más opciones → **Probar cámara · temporal** abre la misma composición de captura/foto
de Agua. Reutiliza `WaterScreen` y los componentes compartidos, con un intento en memoria y un
guardado de hábitos inaccesible. «Terminar prueba» libera la foto y vuelve a Perfil; cancelar
permite continuar o salir. El mensaje visible y los comentarios identifican su carácter temporal.

`temporaryPreview.ts` permite retirar acceso y ruta juntos. La
[guía de conexiones futuras](conexiones-futuras.md) documenta contratos de reconocimiento,
responsabilidades de captura/análisis/confirmación, otras conexiones pendientes y la lista exacta
para eliminar el acceso temporal cuando se acepten esas integraciones. No se implementó un detector.

## Comprobaciones

- `npm run check`: tokens, lint, tipos y formato.
- **554 pruebas automáticas:** ocho de onboarding, 132 de lógica local y **414 historias en
  78 archivos**, con interacciones y accesibilidad automática. Las tres nuevas comprueban la
  prueba temporal, repetición/liberación de foto, cancelación y permiso denegado sin escrituras
  en perfil, recibos o intento persistente.
- Compilación web, Storybook y Android mediante `npm run apk:build`; verificación de firma y
  SHA-256. Se conserva la advertencia previa sobre tamaño del paquete.
- Navegador con dispositivo virtual de cámara: captura en canvas y foto blob reales, cuatro
  anchos 320/360/402/480, movimiento reducido, campo de cantidad, salida/continuación, retorno
  de foco a Perfil, recarga sin abrir cámara automáticamente, ausencia de escrituras de la
  prueba temporal y edición/deshacer posterior. Sin errores de página ni desbordamiento horizontal.
- Pixel_7: actualización de la app instalada conservando eventos y recibos; agua rápida;
  historial, editar/eliminar/deshacer y Atrás físico; jardín inicialmente vacío.
- Cámara Android: cancelación sin alterar datos; foto privada visible en la prueba temporal,
  teclado del sistema, giro, Atrás/continuar y finalización sin cambiar perfil, recibos o intento
  persistente. Los archivos temporales se liberan al terminar.
- Agua normal tras la prueba: una foto del sistema y confirmación de 575 mL generan un solo
  evento con metadatos Android y revisión personal; sin rutas o imágenes en el perfil.
- Protector: confirmación de la cita abierta y ausencia de registro duplicado.
- Jardín con datos aislados: recursos originales cargados, selección de planta/ciclo y progreso
  actual de 34.5 %. Los datos controlados se restauran después; no forman parte de la APK inicial.
- Fuentes/privacidad regresan a Perfil. Preferencias independientes y registros sobreviven a
  un cierre forzado; apagar avisos deja la agenda vacía.

Los avisos se revisan además con permiso denegado y autorizado e instrumentación del receptor
sobre el servicio real de notificaciones Android: calma, vencimiento, apagado, publicación,
duplicados y máximo compartido. La señal física requiere un teléfono compatible.

El emulador bloqueó su cámara durante un primer intento. Se recuperó con gráficos por software
y arranque completo; el recorrido nativo posterior pasó. Se restauran perfil, permisos y giro del
entorno al terminar. Este incidente de pruebas no se presenta como validación de todos los equipos.

## Evidencias y aceptación pendiente

Evidencias locales excluidas del repositorio: `.qa/phase8-browser.json`,
`.qa/phase8-native.json`, `.qa/phase8-notifications-run.log`, capturas y registros de
compilación/comprobación. Los artefactos y la configuración del equipo también están excluidos.

Antes de considerar aceptada la versión en móvil, instalar/actualizar en el teléfono del usuario,
repetir el recorrido de la guía, revisar TalkBack, cámara física y segundo plano, y comprobar
sonido/linterna con los ajustes de ese equipo. Cuentas, sincronización y reconocimiento quedan
en sus conexiones posteriores; no son requisitos que se hayan dado por implementados aquí.
