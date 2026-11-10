# Adaptadores del dispositivo

`waterCamera.ts` implementa el puerto `WaterCamera`: desde 0.3.1 Android y web usan
getUserMedia, un video dentro de la app y captura JPEG en canvas. El origen de los metadatos
continúa siendo Android en la APK. No abre una cámara externa ni un selector de archivos.
Los puertos se pueden inyectar únicamente en pruebas e historias.

El stream se detiene al capturar o salir de la app. La URL blob sigue viva durante la revisión,
incluso al volver del segundo plano, y se libera al repetir, finalizar o descartar.
`waterCameraFiles.ts` restringe la limpieza a archivos JPEG del plugin en las carpetas privadas de la app.
La limpieza y appRestoredResult quedan como compatibilidad con capturas pendientes de 0.3.0;
la cámara integrada no crea esos archivos. El intento normal conserva metadatos sin imagen.

El analizador predeterminado declara resultado incierto y pide revisión personal. YOLO sigue pendiente.
Un ejemplo aprobado de Storybook no representa un detector instalado.

`reminders.ts` usa el permiso de Local Notifications en Android y `GuardedRemindersPlugin` para
alarmas inexactas, canales, apertura y pulso de linterna. `ReminderReceiver` verifica calma,
vencimiento, permiso, duplicados y máximo real en el momento de entrega. No se solicitan alarmas
exactas ni se evita No molestar. La linterna exige aceptación y permiso, compatibilidad y primer plano;
se detiene al pausar. Web declara estas capacidades no disponibles. Los puertos se inyectan en historias.

`localStorage.ts` usa `durableStorage` para confirmar perfil, reservas e intento temporal con un
commit nativo antes de publicar. La migración valida el valor anterior; una copia WebView antigua
no sustituye el nativo. El navegador conserva su adaptador web. La operación y las reglas son comunes.

Las pruebas de dispositivos Android se ejecutan por separado de las historias. El receptor se ha
comprobado con el servicio de notificaciones del emulador; el pulso físico queda para el teléfono.
