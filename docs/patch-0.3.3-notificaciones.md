# Notificaciones del teléfono · corrección de 0.3.3

Fecha: 10 de noviembre de 2026. Conserva `versionName 0.3.3-local`; incrementa `versionCode`
a **7** para distinguir la actualización anterior y permitir instalarla conservando datos.

## Problema y comportamiento corregido

La entrega anterior aplazaba los horarios editados al siguiente día de planta. Su prueba de
10 segundos solo mostraba un mensaje con la app abierta, y Android usaba alarmas inexactas.
Esto no correspondía al recorrido solicitado: cambiar la hora y recibir una notificación
del sistema a esa hora, también con la app en segundo plano.

- Cambiar las horas actualiza las próximas citas de hoy y sustituye sus alarmas pendientes.
  Las aperturas pasadas conservan su versión e identidad para no invalidar registros guardados.
  Los días cerrados permanecen iguales. Cambiar la meta o cantidad de aplicaciones mantiene
  su aplicación al siguiente día de planta.
- Android usa alarmas exactas cuando se concede el permiso de **Alarmas y recordatorios**.
  Perfil → Notificaciones y horarios muestra el estado y el acceso explícito para autorizarlo.
  También hace falta el permiso normal de notificaciones. Sin precisión autorizada se conserva
  la programación aproximada y la pantalla explica que los avisos pueden retrasarse.
- Volver de los ajustes actualiza el estado y vuelve a programar las mismas citas con el
  permiso vigente. La concesión de precisión y los reinicios reprograman la agenda persistida.
- Eliminados los botones temporales de prueba y su reloj de 10 segundos. Se conserva el mensaje
  de planta en primer plano y la notificación Android con acceso al registro correspondiente.
- Se conservan apagado, calma, zona horaria, máximo compartido, deduplicación y cancelación por
  hábito completado o ventana cerrada. Avisar no añade registros automáticamente.

La programación sigue siendo local: no requiere backend, reconocimiento ni conexión a Internet.
Las restricciones del sistema y los ajustes de notificaciones siguen aplicándose. Forzar la
detención desde los ajustes de Android suspende la aplicación hasta volver a abrirla.

## Comprobaciones

145 pruebas de modelo local y 415 historias correctas. Se incluyen cancelación de la agenda
anterior, horarios nuevos vigentes hoy, conservación de asignaciones y días cerrados, y
reprogramación al cambiar el permiso de precisión. Tipos y compilación Android correctos.

La comprobación Android usa el editor real y la hora real del emulador, sin adelantar relojes
ni invocar manualmente el receptor. Ambos avisos aparecieron en el servicio de notificaciones
de Android con el proceso de la app detenido, sin crear registros de hábitos. Se restauró el
perfil del emulador al terminar. Evidencias en `.qa/notifications-native-*`.

APK firmada: `artifacts/android/HoneyFlower-0.3.3-prueba.apk`, 22,864,079 bytes.
SHA-256: `96f38dba731bdd42d9d14533502c27d3ca796f422bf1ab0c7fae2dec6f354fe4`.
La descarga por Wi-Fi se comprobó contra esos mismos bytes.

## Instalación y prueba

Actualizar sobre la instalación existente, sin desinstalar. En **Perfil → Notificaciones y
horarios**, autorizar notificaciones y **Permitir horarios exactos**. Volver a **Horarios de
hábitos**, elegir una hora futura cercana y guardar; salir a la pantalla principal del teléfono.
Al llegar la hora debe aparecer el mensaje en las notificaciones de Android.
