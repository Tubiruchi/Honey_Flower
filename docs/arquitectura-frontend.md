# Arquitectura inicial de frontend

## Decisión

El repositorio existente solo tenía README. Se adopta un monorepo npm sin herramientas de
orquestación adicionales: `apps/mobile` contiene Ionic React y Storybook sobre Vite;
`packages/design-tokens` y `packages/contracts` se comparten mediante workspaces.

La API NestJS y las reglas de negocio tienen espacios reservados documentados; todavía no son
aplicaciones o paquetes ejecutables. No se añaden dependencias de infraestructura sin un caso de uso.
`packages/ui` no hace falta: app y catálogo ya importan los mismos componentes desde `shared`.

## Límites

- `app`: montaje de Ionic, estilos globales y rutas Inicio/Jardín/Perfil.
- `features`: composición y estado de cada vista. Las vistas actuales son demostraciones en memoria.
- `shared/components`: props tipadas, HTML semántico y callbacks; sin SQL ni plugins nativos.
- `shared/styles`: única entrada de tema para la app y el catálogo.
- `shared/data`: futura persistencia local, outbox y cliente HTTP.
- `shared/native`: futuros adaptadores de cámara, avisos e inferencia Android.
- `contracts`: vocabulario inicial de presentación. No representa todavía DTO ni validación de API.
- `domain`: futuras reglas puras compartidas, con pruebas de los límites de RN/RF antes de integrarlas.

El shell de demostración usa IonApp, IonPage, IonHeader, IonContent e IonFooter. React Router 7
resuelve sus tres rutas. El onboarding ocupa rutas separadas sin pestañas ni encabezado de la demo;
la primera entrada recupera su borrador local. El flujo termina en un límite de cuenta explícito,
sin simular autenticación ni activar ciclos. Ver [implementación de onboarding](onboarding.md).
No hay pila nativa de pantallas ni guardas de sesión; revisar el historial/back Android en dispositivo.

La demo calcula únicamente el progreso visible de sus fixtures. El estado de planta se recibe
como dato, sin cambiarlo al registrar agua. No implementa cierres, supervivencia o políticas offline.

## Configuración y reproducibilidad

Node 24.13.0/npm 11, dependencias directas exactas y `package-lock.json`. Instalar con `npm ci`.
ESLint, TypeScript estricto, Prettier y `.editorconfig` comparten convenciones. No hay variables
de entorno requeridas. Al añadir integraciones, documentar solo nombres en `.env.example` y
mantener las credenciales de servidor fuera de Vite.

Capacitor 8.4.3 prepara el destino Android con identificador local `com.honeyflower.app` y `dist`
como webDir. El proyecto Android se generará cuando comience la integración nativa; las carpetas
generadas se ignoran temporalmente. Antes del puente Kotlin, revisar esta decisión y versionar
el código nativo propio. Esta entrega no acredita compilación de APK ni pruebas en dispositivo.

## Calidad y CI

`npm run check`: tokens actualizados, lint sin advertencias, tipos y formato.
`npm run test-storybook`: historias, interacciones y accesibilidad automática en Chromium.
`npm run build` y `npm run build-storybook`: compilaciones de distribución.

El workflow de GitHub Actions prepara los mismos pasos y conserva el catálogo como artefacto
durante siete días. Su ejecución remota queda pendiente de subir los cambios al repositorio.
