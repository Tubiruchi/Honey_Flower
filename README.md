# HoneyFlower

Base del proyecto Ionic React para el jardín de hábitos. La prioridad de esta entrega es
Storybook: componentes reales, tokens compartidos y pruebas reproducibles.

## Empezar

Requisitos: Node **24.13.0** (ver `.nvmrc`) y npm **11**. Ejecutar dentro de `Honey_Flower`:

```sh
npm ci
npm run storybook
```

Abrir [Storybook](http://localhost:6006). Para la app de demostración:

```sh
npm run dev
```

Abrir [HoneyFlower](http://localhost:5173). Incluye Inicio, Jardín y Perfil con datos locales de
ejemplo. Los cambios se pierden al recargar o salir de la vista.

La primera entrada ahora abre el [onboarding](http://localhost:5173/onboarding/bienvenida) de
ocho pantallas implementado desde Figma. Sus preferencias sí se conservan como borrador local,
sin crear cuenta ni activar un ciclo. La demostración de Inicio/Jardín/Perfil sigue disponible
en `/inicio`. Detalles y límites: [onboarding](docs/onboarding.md).

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

Capacitor queda configurado. Para generar el proyecto nativo cuando se vaya a trabajar en Android:

```sh
npm run build
npm run android:add
npm run android:sync
npm run android:open
```

Se requiere Android Studio con su SDK/JDK compatible. `android:add` se ejecuta una vez por copia
de trabajo; la carpeta generada se ignora de momento. El identificador de desarrollo configurado
es `com.honeyflower.app`. No se ha generado ni probado un APK en esta entrega.

## Alcance actual

- 16 componentes compartidos, ocho pantallas de onboarding y variantes en Storybook.
- 234 tokens con sus 137 alias, 14 estilos tipográficos, tres sombras y Plus Jakarta Sans local.
- Historias con variantes, estados e interacciones; app de demostración usando los mismos componentes.
- Comprobaciones de CI preparadas para GitHub Actions, con catálogo descargable como artefacto.

Autenticación, backend, SQLite, sincronización, YOLO, RAG y notificaciones siguen pendientes.
Storybook presenta resultados nativos simulados por props; no prueba permisos o sensores.
Los iconos de planta son provisionales. La revisión de Figma y las pruebas Android se realizan
por separado: pasar Axe no sustituye TalkBack, teclado real o revisión visual.

Guías: [Storybook](docs/storybook.md), [onboarding](docs/onboarding.md), [arquitectura frontend](docs/arquitectura-frontend.md).
