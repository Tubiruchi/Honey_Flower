# Integración · Bloque 4: agua con fotografía

Fecha: **8 de noviembre de 2026**. Cuarto bloque del [plan de integración](plan-integracion-mockups-app-fase-3.md).

## Entrega

El botón +250 mL de Inicio solicita una fotografía cuando hay un día operativo cerrado con agua
por debajo del 100 %. La solicitud no activa la cámara automáticamente. Una vez confirmado y
guardado un registro con foto, el acceso rápido vuelve a registrar directamente hasta que otro
cierre incompleto genere el requisito. Protector, consulta y edición histórica no activan esta cámara.
Se conserva el Inicio aprobado: debajo de la planta solo está el enlace morado subrayado al historial.

La app toma una foto desde la cámara del dispositivo. Android abre su cámara del sistema; en el
navegador se usa video en directo y canvas, con conexión segura. Permiso denegado, dispositivo sin
cámara, fallo o cancelación anterior a la foto permiten reintentar o salir; no habilitan guardar.
No hay sustitución por imágenes de muestra ni por un selector de galería.

La fotografía, el mensaje y RegistrationConfirmation comparten una sola pantalla. La persona
puede corregir el volumen o volver a tomar la foto conservando la cantidad. No se intercala el paso
histórico «Revisar registro». Se reutilizan CameraPhoto, CameraFocus, CameraShutter, PlantPrompt,
PlantCharacter, RegistrationConfirmation y los componentes de aprobación cuando corresponda.

Referencias de Figma revisadas con contexto y captura:

- [P-C01 · cámara](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=247-4921).
- [P-C03 · salida](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=247-4992).
- [P-C05 · confirmación integrada](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=295-5290).

## Análisis y confirmación

El repositorio no contiene un detector de objetos verificable. El puerto predeterminado devuelve
**resultado incierto y revisión personal** tras una foto real. Un fallo de análisis posterior a la
captura permite esa misma revisión. No se muestra una aprobación automática inventada, no se mide
el volumen a partir de la foto y la imagen no se presenta como prueba de consumo.

El puerto de análisis admite aprobación con identificador de analizador, rechazo y resultado
incierto. Solo las historias de demostración inyectan esos resultados para revisar sus estados.
Integrar y evaluar un detector real sigue pendiente.

## Guardado y recursos

WaterController conserva un intento con identificadores estables, cantidad, día y origen. No crea
eventos al abrir, fotografiar, repetir ni cancelar. Antes de confirmar persiste únicamente el
borrador mínimo; tras la confirmación personal congela la operación antes de enviarla al repositorio.
El repositorio vuelve a comprobar día, requisito de foto, datos e identidad antes de confirmar el alta.

Un error de escritura bloquea cambios de cantidad y nueva captura, mantiene la foto en memoria y
ofrece reintentar la misma operación o cerrar el guardado pendiente. Si la respuesta se pierde,
el recibo persistido permite reconocer el éxito sin duplicar el evento. La recuperación de una
operación ya confirmada se comprueba antes de su vencimiento; una operación sin guardar no pasa
silenciosamente al siguiente día. Eliminar o deshacer el evento verificado restablece el requisito
si todavía corresponde; editar su volumen conserva el instante y la verificación.

El perfil solo conserva versión de verificación, captureId, instante, origen y resultado; la
aprobación requiere además identificar al analizador. Ni el perfil ni el borrador almacenan fotos,
base64, URI, webPath o URLs de previsualización. La cámara Android necesita un archivo temporal
privado mientras entrega la imagen; se eliminan el original y su eventual copia procesada al
terminar, repetir o descartar. La limpieza se restringe al nombre y directorios del plugin dentro
de la propia app. Al volver a activar la cámara se retiran sus temporales huérfanos.

Cancelar o Atrás pide «¿Salir sin registrar?». Continuar mantiene foto y cantidad; salir descarta
solo ese intento. El segundo plano detiene el video web y requiere activarlo otra vez. Android
mantiene el intento antes de abrir su Activity de cámara y recupera el resultado retenido mediante
appRestoredResult. Si una recarga pierde la foto temporal, se conserva la cantidad y se solicita
otra captura. Una operación que ya fue confirmada personalmente se puede recuperar sin repetirla.

## Comprobaciones

- `npm run check`: tokens, lint, tipos y formato.
- `npm test`: **423 pruebas**: ocho de onboarding, 60 de lógica local y 355 historias.
- Compilación web y Storybook completas. Continúa la advertencia previa sobre tamaño del paquete.
- Navegador con cámara de video virtual de pruebas: getUserMedia, captura real en canvas, foto blob,
  confirmación integrada, tamaños 320/360/402/480, Atrás/continuar, error de escritura, operación
  congelada, recarga y reintento único, ausencia de imagen en almacenamiento y retorno al registro rápido.
- Navegador con permiso de cámara explícitamente denegado: aviso de permiso, sin confirmación
  ni evento, y salida que descarta únicamente el borrador. Evidencia: `.qa/phase4-web-denied.json`.
- Android: compilación debug con Camera, App y Filesystem. En el emulador Pixel_7 se verificaron
  la cámara del sistema, cancelación sin alta, lectura de la foto privada, giro sin perderla,
  botón Atrás, cierre real del proceso durante captura, nuevo proceso y appRestoredResult con
  la misma cantidad de 425 mL, confirmación de un único evento y eliminación de los temporales.
  La comprobación nativa se registra en `.qa/phase4-native.json`. Se restauraron los datos previos
  del emulador y sus ajustes de rotación al terminar.

Las evidencias de navegador están en `.qa/phase4-browser.json` y sus capturas, sin incluirlas en
el repositorio. Las historias con puertos de prueba no acreditan permisos ni sensores físicos.
Hace falta repetir el recorrido en un teléfono físico y con TalkBack antes de distribuir una
versión final. La APK descargable de cierre corresponde al bloque 8; esta fase no reemplaza el
artefacto anterior identificado como 0.2.0.

## Fuentes técnicas

- [Capacitor Camera](https://capacitorjs.com/docs/apis/camera): origen de cámara, URI temporal,
  Activity Android y necesidad de restaurar resultados.
- [Capacitor App](https://capacitorjs.com/docs/apis/app): appRestoredResult y eventos de aplicación.
- [Capacitor Filesystem](https://capacitorjs.com/docs/apis/filesystem): directorios propios y eliminación.
- [Ionic · botón Atrás](https://ionicframework.com/docs/developing/hardware-back-button): prioridad
  del manejador de salida frente a la navegación ordinaria.
