# Storybook

## Iniciar y compilar

Desde la raíz del repositorio, `npm ci` y `npm run storybook`. El catálogo se abre en
`http://localhost:6006`. `npm run build-storybook` genera `apps/mobile/storybook-static`.
No hacen falta cuenta, credenciales, API ni servicios de pago.

Versiones instaladas: Storybook 10.6.2, React 19.3.1, Ionic 9.0.8, Vite 8.3.4 y TypeScript 5.9.3.
El lockfile fija el árbol completo. Vitest 4.1.12 usa Playwright para ejecutar Chromium.

## Convenciones

- Componente: `src/shared/components/Nombre.tsx`. Historia: `Nombre.stories.tsx` en la misma carpeta.
- Metadatos CSF 3 con `satisfies Meta<typeof Componente>` y `StoryObj<typeof meta>`.
- Categorías: Base, Hábitos, Planta, Recordatorios, Cámara, Sincronización y Jardín.
- Textos de producto en español, props y tipos en inglés; nombres de archivos en PascalCase.
- Variantes por `args`; eventos por callbacks. Usar `fn()` de `storybook/test` para observarlos.
- Un ejemplo interactivo usa un componente contenedor con estado, separado del render de la historia.
- Fixtures deterministas en `src/stories/fixtures`; sin fechas aleatorias, consultas reales ni secretos.
- Fundamentos y composiciones viven en `src/stories`; nunca crear una segunda versión de la UI.

## Biblioteca de Figma

La revisión del 18 de octubre de 2026 cubre las 22 familias con variantes y los cinco
componentes independientes de [Componentes](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=65-676),
además de los 26 iconos originales. **Figma / Biblioteca / Vista general** reúne una muestra;
cada familia tiene sus historias, controles y documentación individual.

Base: Button, IconButton, Input, Switch, Segment, ToneSelector, SettingRow, Stepper, TimeRow,
Feedback, InfoCard, OnboardingProgress, AppBar, NavigationItem, BottomNavigation, ProfileStat
y SettingsLink. Se conservan los 20 estados de Button y las 15 combinaciones de Input.

Planta y hábitos: Plant, PlantCharacter, CalendarDay, WeeklyDay, HabitSummary y StreakBadge.
Jardín: GreenhouseScene, GardenBackdrop, GardenCollectionRow y MonthNavigator.
Las ilustraciones y los recortes de rostros provienen de los recursos originales, guardados
en `src/assets/figma/components`; los iconos mantienen su silueta al heredar colores semánticos.

Los estados Pressed/Focused tienen referencias estáticas en las historias mediante
`referenceState`. Sus estilos están solo en `src/stories/figma-states.css`; la aplicación
usa los estados reales del navegador. Los interruptores usan los seis SVG originales,
incluyendo los estados deshabilitados, sin reducir la opacidad del control completo.

La entrega de onboarding añade InfoCard, Feedback, OnboardingProgress, Stepper y TimeRow,
compuestos en ocho pantallas bajo **Onboarding / Recorrido**. Hay pruebas de recorrido completo,
validación, edición desde resumen y almacenamiento no disponible. Ver [onboarding](onboarding.md).

Dominio: PlantStatus, HabitAction, DailyProgress, WeeklyGrid, AlertLevel, CameraResult,
SyncStatus y GardenPlant. Se cubren estados de salud, pendiente/completo, progreso vacío/parcial/
completo, días actuales/futuros, tonos, resultado incierto, permiso denegado y conexión/error.

Los componentes reciben datos y emiten acciones. No calculan salud semanal, no deciden
supervivencia, no verifican hábitos mediante imágenes y no guardan eventos.

## Tokens y estilo

`packages/design-tokens/tokens.json` conserva la instantánea completa de
`Docs/ux-ui/tokens-diseno.md` v1.0 del 18 de octubre de 2026: 234 variables, 137 alias,
14 estilos tipográficos y tres sombras. La colección Wireframe conserva su identidad;
no se usa como tema claro del producto.

`npm run tokens:build` genera el CSS manteniendo nombres WEB y referencias `var(...)` entre
alias. `npm run tokens:check` detecta alias circulares, ausentes, desactualizados o CSS sin regenerar.
No consulta Figma automáticamente: cambiar primero el registro de diseño acordado y luego la
instantánea del repositorio. No reemplazar alias por valores muestreados de una captura.

App y preview importan `src/shared/styles/index.css`, que carga Ionic, tokens, componentes y
los pesos 400/500/600/700 de Plus Jakarta Sans desde el paquete local. No depende de Google Fonts
ni de una conexión al cargar la fuente. Su licencia OFL se distribuye en `public/licenses`.

## Pruebas y revisión UX/QA

```sh
npm exec --workspace @honeyflower/mobile -- playwright install chromium
npm run test-storybook
```

El addon de Vitest 10.6 aplica las anotaciones del preview automáticamente. Cada historia tiene
una prueba de renderizado; las funciones `play` comprueban acciones y resultados visibles.
Accesibilidad usa `a11y.test: error`, de modo que un fallo automático hace fallar la prueba.

Interacciones cubiertas: botón deshabilitado, mostrar/ocultar contraseña, interruptor,
registro/completado de agua, cambio de tono, alternativa manual con permiso denegado,
confirmación explícita, reintento de sincronización y progreso de la composición Inicio.

Revisión manual pendiente del equipo:

- Cambiar entre los anchos 320, 360, 402 y 480 desde la barra de Storybook.
- Revisar teclado, foco, textos largos, cifras, zoom al 200 % y movimiento reducido.
- Revisar futuras modificaciones de Figma contra las historias de cada familia.
- Probar TalkBack, teclado, insets y permisos en Android real al incorporar la plataforma.

`CameraResult` y `SyncStatus` son presentaciones de resultados simulados. Ninguna historia
captura fotos, ejecuta YOLO, almacena imágenes, programa avisos o demuestra sincronización real.

## Verificación local · 18 de octubre de 2026

`npm run check`, `npm run build` y `npm run build-storybook` completados.
Vitest cubre renderizado, interacciones y accesibilidad de las historias; `npm test` incluye
también ocho pruebas del modelo de onboarding. La revisión en Chromium contrasta 15 medidas
de componentes contra Figma, las ocho pantallas y los recursos originales del onboarding,
la recuperación del borrador y los anchos 320/360/402/480 sin errores ni desbordamiento.

Vite mantiene una advertencia de tamaño de chunks en ambas compilaciones. La optimización del
paquete queda pendiente antes de evaluar rendimiento y distribución Android. CI remoto, APK,
TalkBack y permisos reales todavía no se han ejecutado.

## Referencias oficiales

- [React y Vite en Storybook](https://storybook.js.org/docs/get-started/frameworks/react-vite).
- [Pruebas de interacción](https://storybook.js.org/docs/writing-tests/interaction-testing).
- [Addon de Vitest](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon).
