# HoneyFlower

Base del proyecto Ionic React para el jardín de hábitos. La prioridad de esta entrega es
Storybook: componentes reales, tokens compartidos y pruebas reproducibles.

## Empezar

Requisitos: Node **24.13.0** (ver `.nvmrc`) y npm **11**. Ejecutar dentro de `Honey_Flower`:

```sh
npm ci
npm run storybook
```

Abrir [Storybook](http://localhost:6006). Para la app local:

```sh
npm run dev
```

Abrir [HoneyFlower](http://localhost:5173). Incluye Inicio, Análisis y Perfil con registros,
edición, estadísticas y preferencias que se conservan en el dispositivo.

La primera entrada ahora abre el [onboarding](http://localhost:5173/onboarding/bienvenida) de
ocho pantallas implementado desde Figma. Sus preferencias sí se conservan como borrador local,
sin crear cuenta. En esta fase **Ya tengo cuenta** lleva directamente a Inicio y activa la prueba
local. Terminar el onboarding también inicia el modo local; las siguientes aperturas recuperan
el perfil y los registros. Detalles: [prueba local y APK](docs/prueba-local-apk.md).

## Estructura

```text
apps/
  mobile/
    .storybook/                 Configuración, tema, viewports y accesibilidad
    src/
      app/                      Entrada, shell Ionic y navegación
      features/                 Composición de funcionalidades
      shared/components/        Componentes y *.stories.tsx junto a su implementación
      shared/styles/            Estilos comunes para app y Storybook
      shared/data/              Reservado para persistencia y API
      shared/native/            Reservado para adaptadores Capacitor
      stories/                  Bienvenida, fundamentos, composiciones y fixtures
    public/licenses/            Licencia de la fuente distribuida
  api/                          Espacio reservado para NestJS
packages/
  contracts/                    Tipos de presentación compartidos
  design-tokens/                Registro JSON y CSS generado
  domain/                       Espacio reservado para las reglas del MVP
scripts/                        Generación y verificación de tokens
docs/                           Guías de arquitectura y Storybook
```

Los documentos de producto y diseño originales permanecen en `../Docs`, fuera de este
repositorio. La instantánea de tokens necesaria para trabajar sí está versionada aquí.

## Verificación

Instalar el navegador de pruebas una vez:

```sh
npm exec --workspace @honeyflower/mobile -- playwright install chromium
```

Después:

```sh
npm run check
npm run test-storybook
npm run build
npm run build-storybook
```

`check` comprueba tokens, ESLint, TypeScript y formato. Las pruebas ejecutan las historias en
Chromium, sus interacciones y los controles automáticos de accesibilidad. El catálogo estático
se genera en `apps/mobile/storybook-static`; la app en `apps/mobile/dist`.

## Android

El proyecto Android está preparado y versionado. Para generar la APK de prueba en Windows:

```sh
npm run apk:build
npm run apk:serve
```

Se requiere Android Studio, Java 21 y SDK 36. La APK firmada y su SHA-256 se generan en
`artifacts/android`; el servidor imprime un enlace para descargarla desde el celular en la misma
red Wi-Fi. El identificador es `com.honeyflower.app`. Ver [compilación y alcance](docs/prueba-local-apk.md).

## Alcance actual

- 36 componentes compartidos y ocho pantallas de onboarding: las 22 familias de Figma,
  sus cinco componentes independientes, el catálogo de 26 iconos y ocho composiciones de dominio.
- 234 tokens con sus 137 alias, 14 estilos tipográficos, tres sombras y Plus Jakarta Sans local.
- Historias con variantes, estados e interacciones; app de demostración usando los mismos componentes.
- Tres pantallas funcionales sin servidor, diez pruebas de lógica local y APK Android instalable.
- Comprobaciones de CI preparadas para GitHub Actions, con catálogo descargable como artefacto.

Autenticación, backend, SQLite, sincronización, YOLO, RAG y notificaciones siguen pendientes.
Storybook presenta resultados nativos simulados por props; no prueba permisos o sensores.
Las ilustraciones originales y sus rostros ya se comparten con la biblioteca de Figma.
Las pruebas Android se realizan por separado: pasar Axe no sustituye TalkBack, teclado real o revisión visual.

Guías: [Storybook](docs/storybook.md), [onboarding](docs/onboarding.md), [arquitectura frontend](docs/arquitectura-frontend.md).
