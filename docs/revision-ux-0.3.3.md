# Revisión de UX · APK 0.3.3 actualizada

Fecha: **10 de noviembre de 2026**.

Las correcciones se acumularon manteniendo **0.3.3**. El 10 de noviembre el usuario autorizó
generar la APK: el archivo distribuido se ha reemplazado con este lote completo.

- Archivo: `artifacts/android/HoneyFlower-0.3.3-prueba.apk` · **22,864,079 bytes**.
- Android: `com.honeyflower.app`, `versionName 0.3.3-local`, `versionCode 7`.
- Firma de depuración verificada; versión visible y firma conservadas para actualizar la app.
- SHA-256: `96f38dba731bdd42d9d14533502c27d3ca796f422bf1ab0c7fae2dec6f354fe4`.
- Descarga comprobada por Wi-Fi: los bytes recibidos coinciden con el archivo firmado. El
  servidor evita almacenar la descarga en caché porque se conserva el nombre de archivo.
- Se instaló en el emulador de pruebas, sin modificar teléfonos personales.

**Corrección posterior de notificaciones:** se sustituyó la prueba de botones por avisos del
sistema Android. Las horas editadas actualizan las próximas citas de hoy; los registros y
días cerrados se conservan. Se añade el permiso explícito de alarmas exactas. Este cambio
sustituye las reglas iniciales de horario diferido y prueba temporal descritas en la revisión
previa. Detalles y validación en [notificaciones](patch-0.3.3-notificaciones.md).

## Análisis · incluido en la APK

- Eliminada la descripción bajo el título Análisis.
- Eliminado el enlace superior «Ver progreso de mi ciclo».
- Retirada la caja de jardín vacío y su acción «Ver planta actual». El contador mensual y el
  patio limpio permanecen; las colecciones vacías no añaden otra tarjeta explicativa.
- Retirado el enlace inferior para alternar entre ciclo en curso y último cerrado.
- Eliminada la explicación final sobre peso de hábitos y cálculo del porcentaje.

Se conservan la selección mensual, Vivas/Marchitas, las plantas ganadas, las gráficas y la
selección de un ciclo al pulsar su planta. Se mantiene la selección inicial de progreso
existente; no se cambia el cálculo ni los datos. El control opcional del componente genérico
CycleProgressPanel se oculta en la pantalla conectada.

Comprobado con lint, tipos, compilación web y **414 historias en 78 archivos**. Revisión en
navegador a 320/360/402/480, con jardín vacío y cuatro plantas: ausencia de elementos retirados,
selección de planta/foco, consulta de Marchitas, ausencia de desbordamiento, errores o cambios
de eventos. Evidencias locales en `.qa/ux033-analysis-*`.

Esta revisión se realizó antes de empaquetar. La compilación y sincronización Android del
lote completo se completaron después, con la autorización final del usuario.

## Perfil y preferencias · incluido en la APK

- Retirado el acceso duplicado a Horarios de hábitos dentro de Notificaciones. El editor único
  permanece en Perfil, incluyendo organizar, añadir y quitar citas de agua. La dirección antigua
  abre ese mismo editor para conservar los accesos existentes.
- Eliminado el subtítulo «Tu constancia y tus preferencias».
- Ajustado el contenedor de la ilustración para mostrar la planta completa, sin recortar arriba
  ni abajo y conservando sus proporciones.
- Las confirmaciones y errores de guardado en Perfil y sus preferencias se muestran en un aviso
  fijo en la parte superior, visible aunque la pantalla esté desplazada o haya un formulario
  abierto. Las confirmaciones duran 6 segundos; los errores, 8. Se pueden cerrar manualmente y
  el tiempo se pausa al interactuar con el aviso.
- Los fallos de guardado o agenda ofrecen reintento desde arriba. Al desaparecer el aviso se
  conservan los controles de recuperación y el intento pendiente; no se anuncia éxito antes de
  confirmar la escritura. En preferencias se prioriza un único aviso para evitar superposiciones.

Revisión en navegador a 320/360/402/480: ilustración completa, ausencia del subtítulo y del
acceso duplicado, guardado y lectura del horario, cierre automático/manual, confirmaciones
repetidas y aviso visible con desplazamiento. Se simuló un fallo de escritura y se reintentó
desde el aviso superior dentro del formulario: sin perder la edición ni confirmar datos antes
de guardarlos. Sin errores del navegador ni modificaciones de registros de hábitos.

Lint, tipos, formato de los archivos modificados y compilación web correctos. De 415 historias,
414 pasaron en la ejecución completa; la vista general de biblioteca agotó su tiempo y pasó
al repetirla por separado. Después del ajuste final de prioridad de avisos, las 27 historias
de Perfil y preferencias volvieron a pasar.

Evidencias locales en `.qa/ux033-profile-*` y `.qa/ux033-preferences-toast.png`.

## Desplazamiento y mensajes de la planta · incluido en la APK

- Ocultas las barras de desplazamiento en las pantallas y formularios. Se conserva el
  desplazamiento táctil, por rueda y por teclado, sin bloquear contenido fuera de pantalla.
- Añadido un reloj local para mostrar mensajes de la planta al cruzar las citas activas de
  agua/protector con la app visible, tanto en navegador como en Android. Se respetan la zona
  horaria, calma, máximo compartido, apagado y hábitos completados. Los horarios editados
  conservan la regla existente: se aplican desde el siguiente día de planta.
- Mensajes superiores con ilustración, cierre manual, desaparición a los 12 segundos y acceso
  al registro del hábito. Si coinciden dos mensajes se muestran uno tras otro; no se registran
  hábitos automáticamente ni se repite el mismo aviso al recibirlo también desde Android.
- Añadidas pruebas temporales de agua/protector en Perfil → Notificaciones y horarios →
  «Probar mensajes de mi planta». Llegan en 10 segundos manteniendo la app abierta. No cambian
  citas, registros ni métricas. El código y la retirada pendiente están documentados con
  `TEMPORARY` en la implementación y en `conexiones-futuras.md`.
- Corregida la cancelación prematura de alarmas Android: una alarma reservada puede conservarse
  después de su hora mientras su ventana siga vigente. El receptor mantiene su validación de
  permisos, calma, expiración, máximo y deduplicación. No se reproduce una alarma nueva atrasada.

Revisión en navegador: llegada al cruzar horarios de agua y protector usando el reloj de la
app; acceso a registro sin alta automática; pruebas de 10 segundos, incluida una sobre un
formulario abierto; cierre manual/automático; apagado y ausencia de errores. Desplazamiento
funcional sin barra a 320/360/402/480. Evidencias `.qa/ux033-reminders-*` y
`.qa/ux033-reminder-*.png`.

Verificación: **142 pruebas del modelo local y 415 historias de Storybook correctas**; lint,
tipos, formato y compilación web correctos. Compilación Java de depuración correcta. El
empaquetado final y su firma también se verificaron; evidencias `.qa/ux033-final-apk-*`.

La simulación funciona con la app abierta. Las notificaciones fuera de la app corresponden
al receptor Android y requieren permiso del sistema. La revisión de su entrega en segundo
plano en un teléfono sigue pendiente; la APK actualizada ya incluye este lote.
