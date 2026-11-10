# Parche 0.3.3 · Inicio simplificado

Fecha: **10 de noviembre de 2026**. Primera corrección de UX por pantalla.

## Cambios solicitados

- Se elimina la fecha y el rango del ciclo debajo del saludo.
- El día activo conserva solo la fecha seleccionada, sin «En curso».
- Se elimina el rango «Del … al …» con fechas y horas.
- Se elimina el subtítulo bajo «Tu planta», también en estados de cuidado bajo.
- La racha muestra solo el rayo y el número, con ancho compacto. Su etiqueta accesible
  conserva la descripción y la unidad para lectores de pantalla.

Los días anteriores/futuros mantienen su indicación Cerrado/Próximo y los controles de
registro correspondientes. No cambian el día de planta, las metas, el cálculo de salud,
la racha ni los datos guardados. La fecha seleccionada y el calendario permiten saber
qué día se consulta. La navegación flotante y cámara integrada siguen disponibles.

## Entrega

- APK: `artifacts/android/HoneyFlower-0.3.3-prueba.apk`.
- `com.honeyflower.app`, `versionName 0.3.3-local`, `versionCode 6`.
- Tamaño: **22,865,140 bytes**.
- SHA-256: `febd16eab8902070a5f16bf662bd89180e0fc6d94506c9760a9a70c9a22a3972`.
- Misma firma de actualización; instalar sobre 0.3.2 conserva registros y preferencias.

## Verificación

- Tokens, lint, tipos y formato de los archivos modificados.
- **414 historias en 78 archivos**, incluidas las variantes de Inicio y racha accesible.
- Compilaciones web, Storybook y Android; firma y descarga verificadas.
- Navegador a 320/360/402/480: textos retirados, racha de ancho inferior a 100 px, una sola
  fecha seleccionada, sin desbordamiento ni errores. Días cerrados/futuros no permiten
  registrar; volver al actual habilita el registro sin modificar eventos durante la consulta.
- Android Pixel_7: Inicio simplificado, actualización con eventos/recibos conservados,
  navegación, historial, Atrás, preferencias y entrada de cámara temporal. Reapertura
  conservando los datos. Se restaura el perfil de pruebas al terminar.

El control global de formato detectó cambios previos ajenos al parche en
`docs/gestion-del-proyecto.md` y `docs/QA_Casos_Prueba.md`; no se reformatean en esta entrega.
Los archivos de este parche se comprueban por separado.

Evidencias locales excluidas: `.qa/patch033-browser.json`, `.qa/patch033-native.json`,
capturas y registros de pruebas, compilación y descarga.
