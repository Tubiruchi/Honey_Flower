# Prueba local y APK Android · 0.2.0

La app funciona sin servidor ni cuenta. En esta fase **Ya tengo cuenta** abre Inicio directamente
y crea el perfil local si no existe. Las siguientes aperturas recuperan Inicio y los datos guardados.
Terminar el onboarding también inicia la prueba local con las preferencias elegidas.

## Funciones

- Inicio: calendario de siete ventanas de 24 horas, registros de +250/+500 mL, cantidad personalizada,
  aplicación inicial y reaplicaciones de protector. Historial con edición/eliminación del día abierto
  y deshacer el último registro; los días cerrados conservan sus datos.
- Análisis: gráficos por hábito, periodos Semanal/Mensual/Todo, avance del ciclo y colección de ciclos
  que sobrevivieron o terminaron marchitos. Una instalación nueva empieza sin registros ni plantas ganadas.
- Perfil: nombre, metas, cantidad de reaplicaciones, horarios y tono de mensajes locales. Las nuevas
  metas se aplican al siguiente día operativo. No se cambian metas ni porcentajes pasados.
- Persistencia versionada y validada en `localStorage`, clave `honeyflower.local.v1`. Fallos de escritura
  se muestran en pantalla. Guardar, cerrar y abrir la app conserva los registros en el mismo dispositivo.

Ambos hábitos pesan igual; cada uno se limita al 100% para el cálculo. La supervivencia usa 80% real,
sin redondear. La salud se calcula con días cerrados, y la racha exige ambos hábitos completos.
Al regresar tras una ausencia prolongada se cierra el ciclo activo y empieza uno nuevo; no se inventan
ciclos ni plantas por las semanas en que no se abrió la app.

No incluye autenticación, sincronización, cámara/YOLO, LLM ni avisos del sistema. Los horarios se guardan
como referencia; el perfil explica que esta APK todavía no envía notificaciones. Desinstalar o borrar
los datos de Android elimina esta copia. La copia de seguridad automática Android está desactivada.

## Diseño

Se comparten los componentes, tokens, fuentes y personajes originales con Storybook. Referencias:
[Inicio](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=132-2962),
[Perfil](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=154-3289) y
[estructura de Analíticas](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=109-829).
Analíticas aplica la paleta Dark a su wireframe. La pestaña central se llama Análisis en esta fase,
según la petición actual; `/jardin` redirige a `/analisis`. Las muestras con cifras de Figma solo
existen en **Pantallas / Prueba local**, con almacenamiento desactivado.

## Generar la APK

En Windows, instalar las dependencias con `npm ci`. Requiere Java 21, Android SDK Platform 36,
Build Tools y las licencias de SDK aceptadas. El script usa `JAVA_HOME`/`ANDROID_HOME` o detecta
las ubicaciones habituales de Android Studio. Las rutas locales no se versionan.

```powershell
npm run apk:build
```

El script comprueba TypeScript, compila, copia los recursos web al proyecto Android, ejecuta Gradle,
verifica la firma con `apksigner` y genera:

- `artifacts/android/HoneyFlower-0.2.0-prueba.apk`
- `artifacts/android/HoneyFlower-0.2.0-prueba.apk.sha256`

La APK está firmada con la clave de depuración de la máquina: es instalable para pruebas,
sin configuración de servidor remoto. Los fuentes Android se versionan; los recursos web copiados,
salidas, claves y `local.properties` se excluyen. El binario requiere Android 7 o posterior y WebView actualizado.

## Descargar desde el celular

```powershell
npm run apk:serve
```

Abrir desde el teléfono la dirección **Misma red** que imprime el servidor, con ambos dispositivos
en la misma red Wi-Fi. El servidor comparte únicamente la APK y el icono. No publica el repositorio.
Abrir la descarga e instalar; Android puede solicitar habilitar instalaciones desde ese navegador.
La conexión local depende de la red y de las reglas del firewall del equipo.

## Verificación

`npm run check`, `npm test` y `npm run build-storybook` verifican código, modelo, interacciones y
accesibilidad automática. Las pruebas de navegador comprueban salto del onboarding, registros,
edición, persistencia, metas futuras y anchos 320/360/402/480. La firma de la APK se verifica por separado.

Instalación y arranque verificados en un emulador Pixel 7. Con Wi-Fi y datos desactivados se probaron
las tres pantallas, registros, edición del nombre, recarga y reapertura completa conservando los datos.
La prueba funcional se ejecutó sobre WebView con CDP. El sistema del emulador presentó falta de memoria
y un aviso de System UI no responde; no se observó una excepción de la app. La validación táctil,
TalkBack y rendimiento en un teléfono físico siguen pendientes.
