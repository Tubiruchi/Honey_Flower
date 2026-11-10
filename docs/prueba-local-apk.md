# Prueba local y APK Android · 0.4.1

Entrega del **10 de noviembre de 2026**. Identificador `com.honeyflower.app`,
`versionName 0.4.1-local`, `versionCode 10`. Mantiene la firma de depuración de las APK anteriores
para actualizar conservando los datos. Requiere Android 7 o posterior y WebView actualizado.

## Funciones disponibles

Una instalación nueva comienza en onboarding. **Ya tengo cuenta** abre el acceso; una persona
nueva configura sus hábitos, llega al resumen y después crea su cuenta o continúa sin cuenta.
Al confirmar el correo en el mismo dispositivo, la configuración se aplica a la cuenta y se abre
Inicio sin repetir pantallas. Registro, acceso, recuperación y retorno están conectados al proyecto
HoneyFlower de Supabase. Ver [integración de cuentas](integracion-supabase.md).

- **Inicio:** día de planta, calendario, agua, protector y estado derivado de los registros.
  Debajo de la planta permanece solo «Ver todos los registros», morado y subrayado.
- **Navegación:** cápsula flotante con exterior transparente; el contenido se desplaza por detrás
  y conserva espacio al final para acceder a las últimas acciones.
- **Agua:** cantidades manuales y fotografía real cuando corresponde. La foto y la confirmación
  comparten pantalla; permite repetir, cancelar y recuperar el intento normal. La revisión es
  personal; el reconocimiento automático lo integrará su responsable posteriormente.
- **Protector:** aplicación inicial y reaplicaciones en citas con ventana de 60 minutos, acortada
  por la siguiente cita o cierre del día. Contexto a mitad de ventana y control de duplicados.
- **Registros:** consulta, filtros, corrección/eliminación del día abierto y deshacer. Los días
  cerrados son de consulta y conservan sus metas históricas.
- **Análisis:** jardín mensual, Vivas/Marchitas y progreso del ciclo seleccionado. Una planta
  por semana, normalmente 4–5 cierres por mes. Sin plantas de ejemplo al instalar.
- **Perfil:** datos y estadísticas reales, nombre, metas, horarios, tono, ajustes de avisos,
  fuentes y privacidad. Los horarios actualizan las próximas citas de hoy; las metas nuevas
  comienzan el siguiente día de planta. Los registros y días cerrados se conservan.
- **Revisión de UX:** Análisis y Perfil sin los textos y enlaces retirados; un único editor
  de horarios en Perfil, ilustración completa y avisos superiores de guardado. Barras de
  desplazamiento ocultas manteniendo el desplazamiento funcional.
- **Mensajes de la planta:** recordatorios de agua/protector según las citas activas con la
  app abierta; cierre manual/automático y acceso al registro sin guardar automáticamente.
- **Avisos Android:** permiso explícito, agenda local, calma y máximo compartido de 1–24 por día
  de planta. Apagarlos cancela la agenda y conserva las elecciones de sonido/linterna. Las alarmas
  usan precisión cuando se autoriza **Alarmas y recordatorios** en Android. Sin ese permiso
  pueden retrasarse; negar permisos permite seguir registrando hábitos.
- **Señales opcionales:** sonido solo en nivel reforzado y pulso de linterna solo con aceptación,
  permiso, compatibilidad y app visible. Respetan los ajustes del sistema y No molestar.

El guardado Android confirma perfil, operaciones, agenda e intento mediante almacenamiento
privado nativo antes de mostrar éxito. Migra la copia WebView anterior validada y conserva recibos
para no duplicar reintentos. En navegador se usa su almacenamiento local.

Las cuentas están activadas, pero todavía no hay sincronización de hábitos ni reconocimiento automático.
Las fotos son temporales y no se guardan con el registro ni se envían a un servidor. Desinstalar o
borrar datos elimina esta copia; la copia de seguridad automática de Android está desactivada.

## Cámara temporal para revisión visual

**Perfil → Más opciones → Probar cámara · temporal.**

1. Pulsar «Activar cámara» y después el obturador.
2. Ver la cámara en directo dentro de HoneyFlower y pulsar «Tomar foto».
3. Revisar la imagen dentro del diseño de Agua, el campo de cantidad y «Volver a tomar».
4. «Terminar prueba» vuelve a Perfil; cancelar permite continuar o descartar la prueba.

El aviso visible identifica que es temporal. Esta ruta no añade agua, no modifica registros
ni recibos, y usa un intento solo en memoria. Reiniciar ese proceso requiere otra fotografía.
Se retirará cuando se acepten las conexiones definitivas. Los comentarios `TEMPORARY` y la
[guía de conexiones futuras](conexiones-futuras.md) enumeran todos los puntos que hay que retirar.
El recorrido normal de agua continúa con su confirmación y guardado reales.

## Generar y descargar

La APK 0.4.1 conserva el [lote completo de correcciones de UX](revision-ux-0.3.3.md) y aplica el
[parche de recorrido onboarding–cuenta](patch-0.4.1-onboarding-cuenta.md).
La [corrección de notificaciones](patch-0.3.3-notificaciones.md) sustituye la prueba de botones:
en **Perfil → Notificaciones y horarios**, autoriza las notificaciones y **Permitir horarios
exactos**. En **Horarios de hábitos**, guarda una hora futura cercana y sal de la app. El aviso
se entrega mediante el sistema de notificaciones del teléfono.

En Windows: `npm ci`, Java 21, Android SDK 36 y Build Tools con licencias aceptadas.
El script usa `JAVA_HOME`/`ANDROID_HOME` o las ubicaciones habituales de Android Studio:

```powershell
npm run apk:build
npm run apk:serve
```

La compilación comprueba tipos, prepara recursos Android, ejecuta Gradle y verifica firma y SHA-256.
Genera:

- `artifacts/android/HoneyFlower-0.4.1-prueba.apk`
- `artifacts/android/HoneyFlower-0.4.1-prueba.apk.sha256`

Desde el celular, abrir la dirección **Misma red** que imprime el servidor. Ambos equipos deben
estar en la misma Wi-Fi. El servidor comparte solo APK e icono, sin publicar el repositorio.
Descargar e instalar; si Android lo solicita, permitir la instalación desde ese navegador.
Conservar la app instalada al actualizar para mantener sus datos. La conexión local depende
de la red y del firewall del equipo. Ctrl+C detiene el servidor de descarga.

La firma es de depuración para pruebas. Se conserva el archivo anterior 0.2.0 como referencia;
el servidor ofrece únicamente 0.4.1. Los binarios, claves y configuración local no se versionan.

## Recorrido prioritario en teléfono

Instalar/actualizar → onboarding → configurar hábitos → crear cuenta → confirmar correo → comprobar
que abre Inicio con la configuración elegida. Revisar también «Ya tengo cuenta», recuperación y
«Continuar sin cuenta» desde el resumen → agua → historial → editar/deshacer → protector en
horario → Análisis → Perfil → prueba temporal de cámara → preferencias → cerrar y reabrir.
Verificar que los cambios persisten y que el acceso temporal no altera los registros.

Revisar también Atrás, teclado, giro, segundo plano, permisos, TalkBack, sonido/linterna si el
equipo los admite y funcionamiento sin conexión. La comprobación física es posterior a las
pruebas de navegador y emulador; estas no acreditan sensores o accesibilidad de todos los teléfonos.
Ver [entrega y evidencias de fase 8](fase-3-bloque-8-apk.md).
La [corrección 0.3.1](patch-0.3.1-camara.md) sustituye la cámara externa de 0.3.0 por captura integrada.
La [corrección 0.3.3](patch-0.3.3-navegacion.md) elimina la franja de fondo alrededor del menú.

La [corrección 0.3.3](patch-0.3.3-inicio.md) simplifica fechas, subtítulo y racha de Inicio.
