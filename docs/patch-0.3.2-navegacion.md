# Parche 0.3.2 · navegación flotante sin franja de fondo

Fecha: **9 de noviembre de 2026**. Corrección visual solicitada después de la APK 0.3.1.

## Cambio

La franja procedía de `.local-navigation`: el contenedor ocupaba todo el ancho, tenía fondo
de lienzo y reservaba una fila debajo del scroll. Por eso se veía una separación recta aunque
la cápsula de BottomNavigation tuviera esquinas redondas.

Ahora el contenedor flota sobre Inicio, Análisis y Perfil, con fondo transparente. El contenido
continúa por detrás durante el desplazamiento. La cápsula conserva su fondo, forma, sombra,
iconos y estado seleccionado, según la referencia aportada por el usuario.

La zona exterior deja pasar los gestos y clics; la cápsula conserva sus controles activos.
El contenido tiene margen de desplazamiento al final, incluido el espacio seguro inferior,
para que las últimas acciones queden por encima del menú. Las rutas secundarias siguen sin
barra inferior. El estilo se aplica también a las composiciones de pantallas de Storybook.

No cambian registros, reglas de hábitos, preferencias, cámara integrada ni contratos de
conexión. El ajuste de espacio inferior se limita al shell de las tres pestañas, sin añadir
una franja vacía a la entrada manual u otras subpantallas.

## Entrega

- `artifacts/android/HoneyFlower-0.3.2-prueba.apk`
- `com.honeyflower.app`, `versionName 0.3.2-local`, `versionCode 5`.
- Tamaño: **22,862,315 bytes**.
- SHA-256: `54433ff30d02717c46a55f019c07ade3101a3a99c5ab0317bc0eb449a6a0451b`.
- Actualización sobre 0.3.1 con la misma firma, conservando los datos.
- El servidor de descarga ofrece 0.3.2. Los binarios anteriores permanecen como referencia.

## Comprobaciones

- `npm run check`: tokens, lint, tipos y formato.
- **414 historias en 78 archivos**, con interacciones y accesibilidad automática.
- Compilación web, Storybook y APK; firma y SHA-256 verificados.
- Navegador a 320/360/402/480 y altura reducida: contenedor transparente, cápsula original de
  88 px, scroll hasta el borde inferior, margen superior/esquinas sin bloquear el contenido,
  ausencia de desbordamiento horizontal y últimas acciones de Inicio/Perfil accesibles.
- Cambio de pestañas, conservación del desplazamiento y entrada/salida de Registros. Los eventos
  permanecen iguales y no hay errores de página.
- Pixel_7: actualización desde 0.3.1 conservando eventos y recibos; revisión del fondo transparente
  y scroll en las tres pestañas; historial, Atrás físico y preferencias; acceso temporal de cámara
  sin barra inferior ni cambios de datos. Cierre forzado y reapertura conservan registros y diseño.

Evidencias locales excluidas: `.qa/patch032-browser.json`, `.qa/patch032-native.json`, capturas
y registros de compilación, historias y descarga. Se restaura el perfil previo del emulador.
La revisión en el teléfono del usuario complementa estas pruebas.
