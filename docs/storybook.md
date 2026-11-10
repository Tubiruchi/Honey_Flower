# Storybook

La [entrega de la fase 2](storybook-fase-2.md) incorpora las nuevas familias del
[plan de migración](plan-storybook-fase-2.md). El [mapa de cobertura](storybook-fase-2-coverage.json)
relaciona los maestros y variantes de Figma con sus historias.

## Iniciar y compilar

Desde la raíz del repositorio, `npm ci` y `npm run storybook`. El catálogo se abre en
`http://localhost:6006`. `npm run build-storybook` genera `apps/mobile/storybook-static`.
No hacen falta cuenta, credenciales, API ni servicios de pago.

Versiones instaladas: Storybook 10.6.2, React 19.3.1, Ionic 9.0.8, Vite 8.3.4 y TypeScript 5.9.3.
El lockfile fija el árbol completo. Vitest 4.1.12 usa Playwright para ejecutar Chromium.

## Convenciones

- Componente: `src/shared/components/Nombre.tsx`. Historia: `Nombre.stories.tsx` en la misma carpeta.
- Metadatos CSF 3 con `satisfies Meta<typeof Componente>` y `StoryObj<typeof meta>`.
- Categorías: Base, Hábitos, Registros, Planta, Recordatorios, Cámara, Sincronización, Jardín y Análisis.
- Textos de producto en español, props y tipos en inglés; nombres de archivos en PascalCase.
- Variantes por `args`; eventos por callbacks. Usar `fn()` de `storybook/test` para observarlos.
- Un ejemplo interactivo usa un componente contenedor con estado, separado del render de la historia.
- Fixtures deterministas en `src/stories/fixtures`; sin fechas aleatorias, consultas reales ni secretos.
- Fundamentos y composiciones viven en `src/stories`; nunca crear una segunda versión de la UI.

## Biblioteca de Figma

La base de octubre y la ampliación del 8 de noviembre cubren las **41 familias de producto,
siete independientes y 29 iconos** de [Componentes](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=65-676).
Los cinco estados auxiliares de cámara se conservan aparte en **Cámara / Prototipo**.
**Figma / Biblioteca / Vista general** reúne una muestra;
cada familia tiene sus historias, controles y documentación individual.

Base: Button, IconButton, Input, Switch, Segment, ToneSelector, SettingRow, Stepper, TimeRow,
Feedback, InfoCard, OnboardingProgress, AppBar, NavigationItem, BottomNavigation, ProfileStat
y SettingsLink. Se conservan los 20 estados de Button y las 15 combinaciones de Input.

Planta y hábitos: Plant, PlantCharacter, CalendarDay, WeeklyDay, HabitSummary y StreakBadge.
Jardín: GreenhouseScene, GardenBackdrop, GardenCollectionRow y MonthNavigator.
Las ilustraciones y los recortes de rostros provienen de los recursos originales, guardados
en `src/assets/figma/components`; los iconos mantienen su silueta al heredar colores semánticos.

Fase 2: siete familias de Registros, tres de protector por horarios, cinco de detección y
confirmación, tres de progreso por ciclo y AsyncContentState. PlantCharacter cubre doce
combinaciones de especie, cuidado y vista; CalendarDay mantiene sus ocho variantes de progreso
y acepta un rostro acorde al cuidado. Inicio / Análisis / Perfil es la navegación canónica.

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
`Docs/ux-ui/tokens-diseno.md` v1.5, cotejada el 8 de noviembre de 2026: 234 variables visuales, 137 alias,
14 estilos tipográficos y tres sombras. La colección Wireframe conserva su identidad;
no se usa como tema claro del producto.
Los dos booleanos de prototipo de Figma quedan fuera del paquete CSS. El cotejo no cambió valores ni alias.

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

## Integración de Registros · 8 de noviembre de 2026

**Pantallas / Registros conectados** incorpora 16 historias sobre las rutas y componentes reales
de la app, con almacenamiento aislado. Cubren edición, confirmación de eliminación, deshacer,
filtros/días, retorno, lectura, recuperación y entrada manual. El catálogo alcanza 330 historias.
Las demostraciones previas de **Pantallas / Registros** se conservan como referencias aisladas;
la aplicación usa `RecordsScreen`, no su controlador simulado.
Ver [entrega del bloque 2](fase-3-bloque-2-registros.md).

## Integración de Inicio · 8 de noviembre de 2026

**Pantallas / Inicio conectado** mantiene 12 historias de las rutas reales: dos especies por tres
estados calculados, primera entrada, consulta de días cerrados/futuros, retorno, registros rápidos,
excedentes y nombre largo. **Hábitos / HabitSummary** añade dos composiciones métricas,
compartidas por Inicio y Registros. El catálogo alcanza **344 historias** tras retirar el formulario
personalizado de Inicio según la propuesta aprobada; sus casos de persistencia usan la ruta manual.
Ver [entrega del bloque 3](fase-3-bloque-3-inicio.md).

## Integración de Agua · 8 de noviembre de 2026

**Pantallas / Agua conectada** añade once historias: solicitud, revisión personal
integrada, confirmar, permiso denegado, cancelación, salida/continuación, repetir, rechazo,
fallo de análisis, reintento de guardado y aprobación de ejemplo para un futuro analizador.
El catálogo alcanza **355 historias en 75 archivos**, con sus interacciones verificadas.

Estas historias inyectan una cámara y almacenamiento aislados. La imagen de demostración solo
pertenece al puerto de prueba; la app pasa una captura real explícita a CameraPhoto. El analizador
predeterminado no muestra sellos de aprobación. Ver [entrega del bloque 4](fase-3-bloque-4-agua.md).

## Integración de Protector · 8 de noviembre de 2026

**Pantallas / Protector conectado** añade 17 historias con las rutas reales y almacenamiento aislado:
ordinario, contexto, guardado, deshacer, cancelación, cerrado, próximo horario, cero reaplicaciones,
reintento, vencimiento, cambio de día, lectura, legado, Perfil, historial filtrado y agenda extensa.
**Hábitos / SunscreenWindowCard** añade Próximo horario para distinguir espera y horario terminado.
El catálogo alcanza **373 historias en 76 archivos**.

El usuario eligió para esta prueba ventanas de 60 minutos y contexto al pasar su mitad. Las historias
inyectan un reloj controlable; no cambian el reloj del dispositivo ni envían avisos del teléfono.
Las demostraciones históricas **Protector por horarios** se conservan separadas de las rutas
conectadas. Ver [entrega del bloque 5](fase-3-bloque-5-protector.md).

## Referencias oficiales

- [React y Vite en Storybook](https://storybook.js.org/docs/get-started/frameworks/react-vite).
- [Pruebas de interacción](https://storybook.js.org/docs/writing-tests/interaction-testing).
- [Addon de Vitest](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon).

## Integración de Análisis · 9 de noviembre de 2026

**Pantallas / Análisis conectado** incorpora doce historias: jardín vacío, una/dos/cuatro/cinco
plantas, progreso de registros reales, selección independiente, archivo de Marchitas, lectura,
recuperación, metas históricas y desbordamiento. El catálogo alcanza **385 historias en 77 archivos**.
Las historias usan la misma composición que la aplicación y datos aislados; no se añaden plantas
ni registros al navegador del usuario. Ver [entrega del bloque 6](fase-3-bloque-6-analisis.md).

## Integración de Perfil y preferencias · 9 de noviembre de 2026

**Pantallas / Perfil y preferencias conectados** añade 26 historias sobre la composición y rutas
reales: estadísticas, nombre/especie, las cuatro combinaciones de señales, apagado sin perderlas,
guardar/cancelar, calma incompatible, horarios, máximo, permiso explícito/denegado, aceptación de
linterna, aviso visible sin registro automático, fallos y recuperación, web sin soporte, fuentes,
privacidad y retorno al onboarding. El catálogo alcanza **411 historias en 78 archivos**.

Se inyectan almacenamiento y dispositivo aislados; estas historias nunca solicitan permisos ni
programan avisos reales. El receptor nativo se comprueba por separado en Android.
`TimeRow` incorpora error accesible sin cambiar sus variantes anteriores.
Ver [entrega del bloque 7](fase-3-bloque-7-perfil.md).

## Revisión de APK · 9 de noviembre de 2026

**Pantallas / Agua conectada** añade tres historias del acceso temporal desde Perfil: captura
y repetición sin escrituras persistentes, salida/continuación y permiso denegado. Usan la misma
composición de Agua con puertos aislados; sus comprobaciones garantizan que no cambian perfil,
recibos o intento normal. Deben retirarse al eliminar esa función temporal, según
[conexiones futuras](conexiones-futuras.md).
El catálogo alcanza **414 historias en 78 archivos**. Ver [bloque 8](fase-3-bloque-8-apk.md).
