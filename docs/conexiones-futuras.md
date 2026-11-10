# Guía de conexiones futuras · entrega para integración

Fecha: **9 de noviembre de 2026**. Base: APK local **0.3.3**.
Este documento describe los puntos de conexión existentes y lo pendiente para quien desarrolle
reconocimiento, servicios y cuentas. No implementa ni fija endpoints, modelos o credenciales.
La app funciona localmente mientras se completan esas partes.

## 1. Reconocimiento de agua: punto de entrada disponible

El contrato vigente está en `apps/mobile/src/features/water/analysis.ts`:

```ts
type WaterAnalysis =
  | { status: 'approved'; analyzer: string; message: string }
  | { status: 'rejected' | 'uncertain'; message: string };

interface WaterAnalyzer {
  analyze: (photo: CapturedWaterPhoto) => Promise<WaterAnalysis>;
}
```

`CapturedWaterPhoto` se define en `shared/native/waterCamera.ts`: contiene `id`, `url`,
`capturedAt`, `source: 'web' | 'android'` y `dispose()`. En 0.3.1 la captura está integrada:
la URL es de objeto (`blob:`) tanto en web como en Android, sin abrir otra aplicación.
No es una URL pública ni una ruta que Java pueda abrir directamente. El adaptador puede leer
los bytes con `fetch(photo.url)` desde WebView antes de invocar el puente de inferencia acordado.
La conversión/transporte hacia ese runtime pertenece a su integración; no guardar esos bytes
en el perfil. Solo la compatibilidad con resultados pendientes de 0.3.0 admite archivos privados.
El controlador conserva y libera la foto; el adaptador de análisis debe terminar de leerla antes
de resolver. No debe eliminarla, guardar su ruta en el perfil ni retenerla después de la operación.

Actualmente `WaterServices.tsx` selecciona la cámara real y `personalWaterReview`, que devuelve
`uncertain` de manera explícita. Para integrar el reconocimiento:

1. Implementar un `WaterAnalyzer` que invoque el puente/runtime del modelo acordado.
2. Traducir sus resultados al contrato anterior dentro del adaptador. Tensores, cajas, clases y
   confianza pertenecen al adaptador; la pantalla consume solo el resultado y su mensaje.
3. Seleccionarlo como analizador predeterminado en `WaterServices.tsx`, conservando la inyección
   de puertos para Storybook y pruebas. No sustituir la cámara real por la imagen del catálogo.
4. Mantener `WaterController` como dueño del intento, captura, revisión y operación de guardado.
   El analizador no llama al repositorio ni modifica cantidades, salud o plantas.

Interpretación de resultados:

- `approved`: objeto compatible según el modelo validado. Exige `analyzer` no vacío, hasta
  128 caracteres, con identidad/versionado útil para trazabilidad. Muestra la composición de
  aprobación y continúa hacia la **confirmación personal**.
- `rejected`: permite repetir la fotografía; no habilita confirmar ese resultado.
- `uncertain`: ofrece revisión personal, sin sello de aprobación automática.
- Una excepción de análisis conserva la foto y muestra revisión personal. Un fallo de permiso,
  captura o lectura de foto no habilita guardar. Acordar cualquier cambio de estas reglas antes
  de modificar el controlador.

Reconocer un envase no demuestra que se bebió agua y no mide mililitros. La persona introduce
la cantidad y confirma. Protector mantiene su flujo manual por ventanas y no abre cámara.
La política que exige fotografía está en `features/water/policy.ts`; el reconocimiento no la decide.

## 2. Información que debe entregar quien desarrolla el modelo

Antes de conectar, acordar y entregar:

- Modelo/exportación, runtime Android compatible, versiones y dispositivos mínimos soportados.
- Clases y orden de etiquetas; categorías admitidas y de contraste, umbrales y tratamiento de
  varios objetos, baja confianza, imagen vacía y objeto ajeno.
- Dimensiones de entrada, RGB/BGR, normalización, orientación, recorte/letterbox y postprocesado.
- Contrato del puente nativo: entrada real desde los bytes de la foto temporal, salida tipada y errores.
  Todavía no se ha creado un plugin de inferencia en este repositorio.
- Recursos/modelo incluidos en el binario o mecanismo acordado de descarga, integridad y
  versionado. Cualquier requisito de red debe documentarse y reflejarse en la privacidad.
- Tiempo de respuesta medido, límites de memoria, cancelación/salida durante inferencia y
  comportamiento sin disponibilidad. Un timeout no debe dejar la pantalla bloqueada.
- Imágenes de evaluación autorizadas y resultados reproducibles en Android real. Una fixture
  aprobada en Storybook no acredita el modelo.

La [especificación funcional](../../Docs/producto/01-especificacion-funcional-mvp-jardin.md)
es la referencia de producto para objetos y confirmación. La inferencia sigue a cargo de su
implementación correspondiente; esta entrega deja preparada la interfaz de integración.

## 3. Datos que se guardan y pruebas de aceptación de esa conexión

`verification.ts` permite solo metadatos: versión, identidad/instante de captura, origen,
resultado e identificador del analizador cuando hay aprobación. El instante de captura no puede
ser posterior al registro. Fotos, base64, rutas y URLs de cámara no forman parte del perfil.

La confirmación genera una operación con identidad estable; el repositorio vuelve a validar
día, requisito y resultado. Un reintento conserva esa identidad. No crear eventos al fotografiar,
analizar, abrir una notificación, repetir ni cancelar.

Repetir las pruebas existentes de `local-water.test.mjs` y `WaterScreen.stories.tsx` y añadir las
del adaptador real: tres resultados, fallo/timeout, segundo plano, salida durante análisis,
captura restaurada, cambio de día, confirmación única, reintento tras respuesta perdida y
limpieza de temporales. Ver [flujo de agua implementado](fase-3-bloque-4-agua.md).

## 4. Otras conexiones posteriores

- **API y sincronización:** `shared/data/localRepository.ts`, `localOperations.ts` y
  `localSnapshot.ts` concentran confirmación, revisiones, recibos y recuperación. El cliente HTTP
  y la sincronización no están activos. Definir DTO, identificadores, autoridad de cada dato,
  resolución de conflictos y migración de la copia local antes de cambiar estas operaciones.
  `packages/contracts` contiene vocabulario de presentación, no contratos de servidor terminados.
- **Cuenta y sesión:** 0.4.0 implementa acceso, registro y recuperación en `/cuenta/*`, con
  adaptador Supabase preparado y conexión aún desactivada. «Ya tengo cuenta» abre acceso;
  «Continuar sin cuenta» conserva la prueba local. Las cuentas tienen almacenamiento separado
  por ID y no importan datos del invitado. Ver [configuración y pendientes](integracion-supabase.md).
- **Mensajes remotos/RAG:** hoy los mensajes usan reglas locales. Mantener el tono y la salida
  local si el servicio falla; una respuesta remota no debe registrar hábitos ni modificar métricas.
  No hay claves, servidor ni endpoint configurados para esta capacidad.
- **Avisos:** ya son locales y reales en Android, mediante `features/reminders` y
  `shared/native/reminders.ts`. No son push de servidor. Una conexión posterior no debe crear
  agendas duplicadas ni perder calma, máximo compartido, permisos o cancelación.
  `ForegroundReminders` muestra los mensajes locales con la app abierta, también en el navegador.
  Se deduplican por cita con los eventos del receptor Android. El aviso no registra un hábito.
  La agenda conserva las alarmas Android aún válidas aunque su hora ya haya pasado, porque la
  entrega del sistema puede demorarse; se retiran al cerrar su ventana o registrar el hábito.
  Los botones de prueba de 10 segundos ya se retiraron: los avisos usan citas reales y permisos
  Android de notificaciones y alarmas exactas. Las horas editadas actualizan las próximas citas
  de hoy; `effectiveAt` conserva la identidad de las aperturas pasadas al guardar varias versiones
  en el mismo día. No eliminar esas versiones ni reasignar registros históricos. Las metas
  nuevas siguen aplicándose al siguiente día de planta. Ver `patch-0.3.3-notificaciones.md`.

URLs y credenciales quedan por acordar. Las claves privadas de proveedores pertenecen al servicio
correspondiente, no al código que se distribuye dentro de la APK. La app actual no envía fotos ni
registros a un servidor. Si cambia ese comportamiento, actualizar fuentes/privacidad antes de activarlo.

## 5. Acceso temporal de cámara: retirar al realizar las conexiones

**TEMPORAL, solicitado para revisar la APK:** Perfil → Más opciones → **Probar cámara · temporal**.
Usa el encuadre, cámara del dispositivo y pantalla de fotografía del recorrido real. Permite repetir,
editar una cantidad de muestra y terminar o salir; no registra agua, no genera recibos y no modifica
el borrador persistente del recorrido normal. Los datos del intento de prueba viven solo en memoria.
Una recreación del proceso comienza otra prueba sin recuperar esa foto.

El aviso de temporalidad aparece en pantalla y en comentarios marcados `TEMPORARY`.
Al aceptar las conexiones definitivas:

1. Desactivar `TEMPORARY_CAMERA_PREVIEW_ENABLED` en `features/water/temporaryPreview.ts` para
   retirar a la vez el acceso de Perfil y la ruta `/perfil/prueba-camara`.
2. Eliminar ese archivo, el acceso/comentario de `ProfileScreen`, la ruta/importación y el destino
   de foco en `LocalShell`.
3. Retirar la propiedad y ramas `preview` de `WaterScreen`, el almacén en memoria y el aviso
   `water-preview-notice` de CSS. Conservar el recorrido normal y sus protecciones.
4. Retirar las tres historias `TemporaryCameraPreview`, `TemporaryPreviewCancel` y
   `TemporaryPreviewDenied`. Conservar las pruebas del registro de agua y del analizador.
5. Actualizar este documento, las notas de APK y el contenido de descarga. Comprobar que la ruta
   temporal ya no abre cámara y que el flujo real sigue exigiendo confirmación antes de guardar.

La retirada corresponde a la conexión aceptada, no a la simple presencia de un modelo de ejemplo.
