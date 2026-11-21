# HoneyFlower

Base del proyecto Ionic React para el jardín de hábitos. La prioridad de esta entrega es
Storybook: componentes reales, tokens compartidos y pruebas reproducibles.

## Gestión del proyecto

**Gestor del Proyecto: Pedro Ortegón** (GitHub: [`Tubiruchi`](https://github.com/Tubiruchi)). Coordina el plan por fases, el seguimiento de tareas y fechas, el registro de acuerdos y bloqueos, la revisión de evidencias y la preparación de la entrega. El proyecto se planifica del 19 de octubre al 4 de diciembre de 2026.

El plan detallado, las responsabilidades y el mecanismo de coordinación se conservan fuera del
repositorio en `../Docs/implementacion-app/gestion-del-proyecto.md`.

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

La primera entrada abre el [onboarding](http://localhost:5173/onboarding/bienvenida) de ocho
pantallas implementado desde Figma. En **0.4.2**, **Ya tengo cuenta** abre el inicio de sesión;
las personas nuevas configuran primero sus hábitos y se registran al terminar. La confirmación
de correo aplica esa configuración a la cuenta una sola vez y abre Inicio, sin repetir el
onboarding. **Continuar sin cuenta** está disponible en el resumen. Registro y recuperación están
conectados al proyecto HoneyFlower de Supabase. Sin configuración válida no se crean sesiones
ficticias. Los detalles de cuentas, conexión y APK están en la documentación externa.

En **0.4.3**, Análisis permite recorrer al menos los últimos doce meses, incluso durante el
primer mes de uso. Vivas y Marchitas comparten el jardín ilustrado y las plantas marchitas se
muestran completas, sin la tarjeta ni los indicadores auxiliares retirados.

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
supabase/migrations/            Esquema versionado para sincronización remota
```

Toda la documentación ampliada permanece fuera de este repositorio en `../Docs`. Los documentos
que antes estaban en `docs/` se conservan en `../Docs/implementacion-app`; la instantánea de tokens
necesaria para compilar sí está versionada aquí.

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
red Wi-Fi. El identificador es `com.honeyflower.app`.

## Alcance actual

- 36 componentes compartidos y ocho pantallas de onboarding: las 22 familias de Figma,
  sus cinco componentes independientes, el catálogo de 26 iconos y ocho composiciones de dominio.
- 234 tokens con sus 137 alias, 14 estilos tipográficos, tres sombras y Plus Jakarta Sans local.
- Historias con variantes, estados e interacciones; app de demostración usando los mismos componentes.
- Inicio, Análisis, Perfil y Registros funcionales, 194 pruebas de lógica local y APK Android 0.4.3 descargable.
- Primera fase de integración: guardado confirmado, migración de datos, reintentos y deshacer seguro.
- Segunda fase de integración: Registros y navegación, con filtros,
  consulta histórica, edición, eliminación confirmada y deshacer sobre datos locales.
- Tercera fase de integración: Inicio y estados de la planta, con
  cuerpo/rostro coherentes, calendario operativo, métricas compartidas y registros rápidos reales.
- Cuarta fase de integración: agua con fotografía, cámara real,
  confirmación integrada, cantidad editable, reintento estable y recuperación del intento en Android.
- Quinta fase de integración: protector por horarios, ventanas
  de 60 minutos, contexto a mitad, confirmación personal, cita única y agenda versionada por día.
- Séptima fase de integración: Perfil, preferencias y avisos,
  contenido público, ajustes confirmados, guardado durable Android y notificaciones locales reales.
- Octava fase de integración: APK y revisión integrada,
  actualización conservando datos y cámara temporal desde Perfil sin guardar registros.
- Base remota de sincronización: nueve tablas versionadas en Supabase para perfiles,
  preferencias, ciclos, metas, agendas, registros, operaciones, revisiones y dispositivos; todas
  protegidas con RLS y sin almacenar fotografías.
- Almacenamiento SQLite Android: una base aislada por cuenta, migraciones transaccionales versionadas,
  llaves foráneas y modo WAL. Las fases 2 y 3 importan perfil, preferencias, ciclos, metas, horarios,
  registros y operaciones, y convierten SQLite en la fuente principal del repositorio. El almacenamiento
  anterior permanece como espejo de recuperación y conserva las claves temporales y de notificaciones.
- Sincronización fase 4: cada cambio de una cuenta entra atómicamente en una outbox SQLite, se reintenta
  sin duplicados y se entrega como operación pendiente a Supabase. La app consulta su confirmación,
  conserva los cambios durante cortes de red y muestra el estado real en Perfil. Invitados y fotografías
  temporales quedan fuera de la sincronización.
- Sincronización fase 5: un procesador privado de PostgreSQL valida cada operación, aplica en una sola
  transacción perfiles, preferencias, ciclos, metas, agendas y registros, avanza la revisión del servidor
  y responde `applied`, `rejected` o `conflict`. La APK no obtiene permisos directos de escritura sobre
  las tablas canónicas y las fotografías continúan fuera del contrato remoto.
- Sincronización fase 6: una lectura autenticada y protegida por RLS descarga la proyección canónica
  cuando cambia el cursor. SQLite la instala atómicamente solo si no apareció otro cambio local,
  registra el avance de cada instalación y reconcilia rechazos conservando su auditoría. Un segundo
  dispositivo puede recuperar perfil, preferencias, ciclos, metas, horarios y registros confirmados.
- Sincronización fase 7: los ajustes por conflicto dejan un aviso persistente y conducen a revisar
  Perfil o Registros; reconocer el aviso no elimina el recibo de auditoría. Cerrar sesión con cambios
  pendientes exige una decisión explícita y conserva la base aislada para reintentar con la misma cuenta.
- Comprobaciones de CI preparadas para GitHub Actions, con catálogo descargable como artefacto.

La autenticación por correo, SQLite y la sincronización bidireccional con Supabase ya están conectadas.
Las fases 6 y 7 recuperan en otro dispositivo la proyección confirmada, restauran el estado canónico tras
un rechazo sin pisar cambios pendientes y hacen visible cualquier ajuste para que la persona lo revise.
Todavía faltan políticas de producto para conflictos que no admitan reconciliación automática, el backend
de dominio, YOLO y RAG. SQLite sigue siendo la fuente inmediata de uso de la APK y Supabase conserva la
proyección verificada de cada cuenta.
Storybook presenta resultados nativos con puertos aislados; Android utiliza cámara y avisos locales reales.
La navegación flotante no tiene franja de fondo y conserva la cámara integrada con foto temporal;
la aceptación en teléfono y comprobación física de linterna siguen pendientes.
Las ilustraciones originales y sus rostros ya se comparten con la biblioteca de Figma.
Las pruebas Android se realizan por separado: pasar Axe no sustituye TalkBack, teclado real o revisión visual.

Las guías de Storybook, onboarding, arquitectura y conexiones futuras están en
`../Docs/implementacion-app`, junto con el historial de fases y parches.

La fase de Análisis integra el patio limpio de Figma y el jardín mensual desde ciclos cerrados,
con una planta por semana, Vivas/Marchitas sobre el mismo jardín y progreso real por ciclo. La
instalación nueva permanece vacía.
