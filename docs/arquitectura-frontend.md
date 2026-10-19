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
- `shared/data`: futura persistencia local, outbox y cliente HTTP.
- `shared/native`: futuros adaptadores de cámara, avisos e inferencia Android.
- `contracts`: vocabulario inicial de presentación. No representa todavía DTO ni validación de API.
- `domain`: futuras reglas puras compartidas, con pruebas de los límites de RN/RF antes de integrarlas.

El shell usa IonApp e IonPage con scroll propio y navegación fija. React Router 7 resuelve Inicio,
Análisis y Perfil. El onboarding ocupa rutas separadas; **Ya tengo cuenta** inicia o recupera el perfil
local y abre Inicio. Terminar la configuración también activa un ciclo local, sin simular autenticación.
Ver [prueba local y APK](prueba-local-apk.md) e [implementación de onboarding](onboarding.md).
No hay pila nativa de pantallas ni guardas de sesión; revisar el historial/back Android en dispositivo.

La prueba local calcula progreso, salud por días cerrados, rachas y cierres semanales con datos
reales del dispositivo. Las muestras de Storybook usan fixtures aislados. La lógica local no acredita
sincronización, autoridad de servidor ni resolución de conflictos entre dispositivos.

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
