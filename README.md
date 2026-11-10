# HoneyFlower

Base del proyecto Ionic React para el jardín de hábitos. La prioridad de esta entrega es
Storybook: componentes reales, tokens compartidos y pruebas reproducibles.

## Gestión del proyecto

**Gestor del Proyecto: Pedro Ortegón** (GitHub: [`Tubiruchi`](https://github.com/Tubiruchi)). Coordina el plan por fases, el seguimiento de tareas y fechas, el registro de acuerdos y bloqueos, la revisión de evidencias y la preparación de la entrega. El proyecto se planifica del 19 de octubre al 4 de diciembre de 2026.

Consulta el [plan de gestión del proyecto](docs/gestion-del-proyecto.md) para ver las fases, responsabilidades y el mecanismo de coordinación. La frecuencia de reuniones indicada allí es una propuesta pendiente de confirmación del equipo.

## Plan de trabajo y ClickUp

El equipo organiza el trabajo en ClickUp con tareas por fase y rol, responsables, fechas, estimaciones de referencia, criterios de aceptación y subtareas. Las dependencias muestran el orden entre entregables; los estados se actualizan con base en evidencia. El tablero detallado se comparte dentro del equipo.

| Fase | Fechas       | Enfoque                                    |
| ---- | ------------ | ------------------------------------------ |
| 1    | 19–23 oct    | Diseño Figma y primera entrega de avances  |
| 2    | 26–30 oct    | Revisión del prototipo y alcance inmediato |
| 3    | 2–6 nov      | Flujos principales y estados               |
| 4    | 9–13 nov     | Jardín, progreso y revisión intermedia     |
| 5    | 16–20 nov    | Integraciones o simulaciones delimitadas   |
| 6    | 23–27 nov    | Integración del recorrido y correcciones   |
| 7    | 30 nov–4 dic | Preparación, validación, demo y cierre     |

La dedicación planeada es de aproximadamente dos horas por persona a la semana. Las estimaciones no son horas registradas. El tablero y sus fechas deben reflejar el avance comprobable del repositorio.

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
sin crear cuenta. En **0.4.0**, **Ya tengo cuenta** abre inicio de sesión y **Continuar sin cuenta**
recupera la prueba local. Las pantallas de registro y recuperación están preparadas para Supabase;
por indicación del usuario, la conexión todavía no se activa. Sin configuración no se crean
sesiones ficticias. Detalles: [cuentas y conexión](docs/integracion-supabase.md) y
[prueba local y APK](docs/prueba-local-apk.md).

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
      shared/data/              Repositorio local, migración, operaciones y reloj
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
- Inicio, Análisis, Perfil y Registros funcionales sin servidor, 136 pruebas de lógica local y APK Android 0.3.3 descargable.
- Primera fase de integración: guardado confirmado, migración de datos, reintentos y deshacer seguro.
  Detalles y comprobaciones: [persistencia común](docs/fase-3-bloque-1-persistencia.md).
- Segunda fase de integración: [Registros y navegación](docs/fase-3-bloque-2-registros.md), con filtros,
  consulta histórica, edición, eliminación confirmada y deshacer sobre datos locales.
- Tercera fase de integración: [Inicio y estados de la planta](docs/fase-3-bloque-3-inicio.md), con
  cuerpo/rostro coherentes, calendario operativo, métricas compartidas y registros rápidos reales.
- Cuarta fase de integración: [agua con fotografía](docs/fase-3-bloque-4-agua.md), cámara real,
  confirmación integrada, cantidad editable, reintento estable y recuperación del intento en Android.
- Quinta fase de integración: [protector por horarios](docs/fase-3-bloque-5-protector.md), ventanas
  de 60 minutos, contexto a mitad, confirmación personal, cita única y agenda versionada por día.
- Séptima fase de integración: [Perfil, preferencias y avisos](docs/fase-3-bloque-7-perfil.md),
  contenido público, ajustes confirmados, guardado durable Android y notificaciones locales reales.
- Octava fase de integración: [APK 0.3.0 y revisión integrada](docs/fase-3-bloque-8-apk.md),
  actualización conservando datos y cámara temporal desde Perfil sin guardar registros.
- Comprobaciones de CI preparadas para GitHub Actions, con catálogo descargable como artefacto.

Autenticación, backend, SQLite, sincronización, YOLO y RAG siguen pendientes.
Storybook presenta resultados nativos con puertos aislados; Android utiliza cámara y avisos locales reales.
La [APK 0.3.2](docs/patch-0.3.2-navegacion.md) presenta la navegación flotante sin franja de fondo.
Conserva la cámara integrada y la foto temporal de [0.3.1](docs/patch-0.3.1-camara.md);
la aceptación en teléfono y comprobación física de linterna siguen pendientes.
Las ilustraciones originales y sus rostros ya se comparten con la biblioteca de Figma.
Las pruebas Android se realizan por separado: pasar Axe no sustituye TalkBack, teclado real o revisión visual.

Guías: [Storybook](docs/storybook.md), [onboarding](docs/onboarding.md), [arquitectura frontend](docs/arquitectura-frontend.md).

Para quien conecte reconocimiento y servicios: [guía de conexiones futuras](docs/conexiones-futuras.md),
con contratos existentes y lista de retirada de la prueba temporal de cámara en Perfil.

La fase de Análisis integra el patio limpio de Figma y el jardín mensual desde ciclos cerrados,
con una planta por semana, archivo de Marchitas y progreso real por ciclo. La instalación nueva
permanece vacía. Ver [entrega del bloque 6](docs/fase-3-bloque-6-analisis.md).
