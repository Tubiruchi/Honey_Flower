# Arquitectura inicial de frontend

## Decisión

El repositorio existente solo tenía README. Se adopta un monorepo npm sin herramientas de
orquestación adicionales: `apps/mobile` contiene Ionic React y Storybook sobre Vite;
`packages/design-tokens` y `packages/contracts` se comparten mediante workspaces.

La API NestJS y las reglas de negocio tienen espacios reservados documentados; todavía no son
aplicaciones o paquetes ejecutables. No se añaden dependencias de infraestructura sin un caso de uso.
`packages/ui` no hace falta: app y catálogo ya importan los mismos componentes desde `shared`.

## Límites

- `app`: montaje de Ionic, estilos globales y rutas Inicio/Análisis/Perfil.
- `features`: composición y estado de cada vista. `features/local` implementa el modelo puro, contexto,
  persistencia versionada y pantallas de la prueba sin servidor; las historias antiguas conservan sus fixtures.
- `shared/components`: props tipadas, HTML semántico y callbacks; sin SQL ni plugins nativos.
- `shared/styles`: única entrada de tema para la app y el catálogo.
- `shared/data`: repositorio local, migración v1 → v2, ejecución de operaciones y reloj inyectable.
  El cliente HTTP y la sincronización quedan pendientes.
- `shared/native`: adaptadores reales de cámara, avisos y guardado Android; inferencia futura.
- `contracts`: vocabulario inicial de presentación. No representa todavía DTO ni validación de API.
- `domain`: futuras reglas puras compartidas, con pruebas de los límites de RN/RF antes de integrarlas.

El shell usa IonApp e IonPage con scroll propio. React Router 7 usa un data router para proteger
salidas durante edición/guardado. Inicio, Análisis y Perfil conservan la barra inferior y su estado
al abrir subpantallas; Registros y las entradas manuales de agua/protector tienen Volver y ocultan
la barra. El onboarding ocupa rutas separadas; **Ya tengo cuenta** inicia o recupera el perfil
local y abre Inicio. Terminar la configuración también activa un ciclo local, sin simular autenticación.
Ver [prueba local y APK](prueba-local-apk.md) e [implementación de onboarding](onboarding.md).
No hay autenticación ni pila nativa de pantallas. El historial de navegador y el evento de Atrás
de Ionic se gestionan en Registros; su verificación táctil Android queda para la entrega móvil.

La prueba local calcula progreso, salud por días cerrados, rachas y cierres semanales con datos
reales del dispositivo. Las muestras de Storybook usan fixtures aislados. La lógica local no acredita
sincronización, autoridad de servidor ni resolución de conflictos entre dispositivos.

El repositorio serializa las operaciones del proveedor y publica solo datos confirmados por el
almacenamiento. La envoltura v2 guarda el modelo local, revisiones e identificadores de operación
en una única escritura. El proveedor mantiene aparte el intento pendiente y coordina el reintento
con el formulario original. La entrada espera a la lectura y bloquea las rutas si falla, para
evitar crear un perfil sobre datos que no se pudieron recuperar.
Ver [entrega del bloque 1](fase-3-bloque-1-persistencia.md).

`features/records` compone los componentes de la biblioteca con el repositorio real. La selección
de día y filtro admite parámetros de URL; el retorno usa el origen de navegación y un destino
seguro para entradas directas. Inicio comparte los selectores y el resumen diario, y abre el
historial mediante un enlace de texto bajo la planta. Ver [bloque 2](fase-3-bloque-2-registros.md).

`features/home/model.ts` selecciona el día consultado y el ciclo activo. `cycleStats.healthScore`
expone el cálculo de días cerrados para el criterio visible de Inicio; cuerpo y rostro reciben
su mismo `health`. `HabitSummary` añade la composición métrica compartida con Registros.
El selector `waterPhotoTrigger` prepara el disparador por cierre diario incompleto; la captura
todavía no se activa. Ver [bloque 3](fase-3-bloque-3-inicio.md).

## Configuración y reproducibilidad

Node 24.13.0/npm 11, dependencias directas exactas y `package-lock.json`. Instalar con `npm ci`.
ESLint, TypeScript estricto, Prettier y `.editorconfig` comparten convenciones. No hay variables
de entorno requeridas. Al añadir integraciones, documentar solo nombres en `.env.example` y
mantener las credenciales de servidor fuera de Vite.

Capacitor 8.4.3 integra Android con identificador `com.honeyflower.app` y `dist` como webDir.
Los fuentes Android se versionan; solo se ignoran salidas, recursos web copiados y configuración
local. `npm run apk:build` genera y verifica una APK de depuración instalable. Se probó la app
en el WebView de un emulador; la revisión en un teléfono físico sigue pendiente.

## Calidad y CI

`npm run check`: tokens actualizados, lint sin advertencias, tipos y formato.
`npm run test-storybook`: historias, interacciones y accesibilidad automática en Chromium.
`npm run build` y `npm run build-storybook`: compilaciones de distribución.

El workflow de GitHub Actions prepara los mismos pasos y conserva el catálogo como artefacto
durante siete días. Su ejecución remota queda pendiente de subir los cambios al repositorio.

`features/analysis` deriva colección mensual y progreso desde el estado confirmado. El repositorio
fija `LocalState.garden` una vez y conserva su zona al actualizar las preferencias. La colección
usa el cierre programado; las plantas tienen identidad por inicio de ciclo y anclaje independiente
del orden de la lista. `GardenScene` y `GardenCollectionList` componen los recursos originales;
`CycleProgressPanel` recibe metas históricas y días cerrados/actual/futuros. Las selecciones de mes
y ciclo se mantienen en la pestaña montada de Análisis. Ver [bloque 6](fase-3-bloque-6-analisis.md).

`features/preferences` compone formularios reales sobre operaciones de preferencias revisionadas;
`features/content` ofrece fuentes/privacidad fuera de la guarda de perfil, conservando el origen.
`features/reminders` separa planificación pura, reservas persistentes, reconciliación serializada y
estado visible. La agenda nunca crea eventos de hábitos. La zona y los horarios de agua se versionan
como los de protector para no alterar el día abierto al editar preferencias.

Android consulta/solicita el permiso con Local Notifications y agenda alarmas inexactas mediante
`GuardedRemindersPlugin`. `ReminderReceiver` vuelve a comprobar calma, vencimiento, permiso,
duplicados y máximo al entregar. Recupera solo alarmas futuras tras reinicio. La linterna usa un
pulso explícito y limitado a primer plano; no hay servicios de cámara en segundo plano.

`deviceLocalStorage` selecciona `durableStorage` en Android: perfil, reservas e intento temporal
se confirman con un commit privado nativo antes de publicar. Migra la copia WebView validada una
sola vez; después prevalece el valor nativo sobre esa copia. En web sigue `browserStorage` y en
historias se inyecta memoria. Las operaciones, recibos y reglas no dependen de la plataforma.
Ver [bloque 7](fase-3-bloque-7-perfil.md).

El bloque 8 reutiliza `WaterScreen` para una prueba temporal accesible desde Perfil. Su intento
usa memoria aislada, no consume resultados restaurados del recorrido normal y no puede ejecutar
una operación del repositorio. Acceso y ruta dependen de `temporaryPreview.ts`; la retirada al
aceptar conexiones está detallada en [conexiones futuras](conexiones-futuras.md).
La APK 0.3.0 conserva identificador y firma; ver [entrega móvil](fase-3-bloque-8-apk.md).

Desde [0.3.1](patch-0.3.1-camara.md), la cámara Android también usa stream de getUserMedia
dentro de WebView. El obturador captura un JPEG en memoria y conserva su URL de objeto en
WaterController hasta repetir o salir. Al poner la app en segundo plano se detiene el stream,
sin liberar una foto que ya esté en revisión. Los resultados de Camera.getPhoto y sus archivos
solo permanecen para compatibilidad de capturas pendientes de la versión anterior.

Desde [0.3.2](patch-0.3.2-navegacion.md), `.local-shell--tabs` reserva espacio de scroll para la
cápsula inferior; `.local-navigation` es una capa absoluta transparente. Solo la cápsula recibe
eventos de puntero, dejando pasar los gestos por su zona exterior. El scroll ocupa la altura
completa y permite ver el contenido detrás del menú. Las subpantallas conservan su composición.
