# Storybook · Entrega de la fase 2

Fecha: **8 de noviembre de 2026**. Alcance: biblioteca compartida e historias de prueba.

## Resultado

El catálogo incorpora las **19 familias nuevas / 62 variantes**, los dos independientes de
detección y tres iconos. PlantCharacter pasa a doce variantes con los ocho estados adicionales;
CalendarDay y GardenCollectionRow aceptan cuidado para mantener coherentes sus rostros.
La navegación predeterminada es Inicio / Análisis / Perfil.

La biblioteca de producto queda cubierta por las familias existentes y esta ampliación:
41 conjuntos, siete independientes y 29 iconos en Figma. Los cinco estados auxiliares de cámara
se presentan aparte en Cámara / Prototipo. El [mapa de cobertura](storybook-fase-2-coverage.json)
enlaza cada variante migrada con el maestro y la historia; el
[inventario inicial](storybook-figma-inventory-2026-11-08.json) conserva el punto de partida.

Storybook pasa de **179 a 306 historias**, distribuidas en **71 archivos**. Las 127 incorporaciones
incluyen referencias visuales, escenarios de interacción y composiciones; no representan
127 nuevos componentes de Figma.

## Dónde revisarlo

Iniciar con `npm run storybook` y abrir [Storybook local](http://127.0.0.1:6006/).

- **Figma / Biblioteca / Vista general**: muestra ampliada de las familias compartidas.
- **Registros**: SwipeAction, RecordFilters, RecordDayNavigator, RecordItem, RecordEditor,
  RecordDelete y RecordFeedback.
- **Hábitos**: SunscreenScheduleRow, SunscreenWindowCard y SunscreenScheduleAgenda.
- **Cámara**: DetectionApprovalPlant, DetectionPlantMessage, DetectionApprovalStamp,
  DetectionApprovalBadge, DetectionResultActions, ConfirmationAmountField y RegistrationConfirmation.
- **Base / AsyncContentState**, **Planta / PlantCharacter** y **Hábitos / CalendarDay**:
  lectura/recuperación y cuidado.
- **Análisis**: CycleHabitChart, CycleProgressSummary y CycleProgressPanel.
- **Pantallas**: Registros, Protector por horarios, Agua con fotografía, Análisis actualizado
  y Perfil objetivo.

Los componentes viven en `apps/mobile/src/shared/components`, con historias junto a cada familia
y exportaciones desde su índice. Las composiciones y fixtures de esta fase están en
`apps/mobile/src/stories`; están aislados de los datos del usuario y del almacenamiento de la app.

## Comportamiento de las historias

- Registros permite filtrar, consultar días cerrados, revelar acciones por gesto u Opciones,
  editar/cancelar, confirmar eliminación y deshacer. Solo una fila queda abierta. Los campos validan
  enteros de 1 a 10,000 mL; guardar/eliminar bloquea las acciones incompatibles. El foco acompaña
  las acciones, la edición y la cancelación.
- Las operaciones simuladas muestran éxito después de su confirmación de prueba. El error conserva
  el evento original y una operación pendiente; reintentar no crea otra operación. El escenario
  de cierre del día durante un guardado rechaza el cambio y deja la lista en consulta.
- Protector usa estados recibidos y agendas de longitud variable. El recorrido de prueba pide
  confirmación personal, no utiliza cámara y no permite registrar en la variante cerrada.
  Los horarios y los 30 minutos mostrados siguen siendo ejemplos, sin política temporal de producción.
- Agua muestra captura estática, detección, revisión de cantidad y confirmación. Cuando se exige
  foto, denegar permiso no habilita un registro manual previo a la captura. El resultado inconcluso
  permite revisión después de la captura simulada. El error de guardado conserva cantidad e ID
  de operación; el reintento usa ambos sin duplicarlos. CameraResult mantiene compatibilidad
  y añade las condiciones explícitas de foto requerida/capturada.
- El panel de Análisis combina resumen y dos gráficos de siete días. Los fixtures reproducen
  88.1 % cerrado y 34.5 % en curso; los futuros son pendientes. Cambiar el mes de la colección
  no cambia el ciclo del progreso. Las densidades 0/1/2/4/5 reutilizan fondo y posiciones de Figma.
- Perfil objetivo separa sonido/linterna, permite apagar los avisos y muestra permiso denegado.
  Las horas de calma cruzan medianoche; el ejemplo que cubre todas las citas impide guardar.
  Fuentes y privacidad conservan el contenido de diseño y `privacyLegalReady: false`.

Los permisos, la fotografía, el reconocimiento y las confirmaciones de guardado de estas nuevas
composiciones son **fixtures**. No se solicitan permisos, capturan imágenes, programan avisos,
conservan fotografías ni envían datos. El Perfil local conserva su declaración de capacidades.

## Recursos y fidelidad

Se guardaron 18 recursos originales nuevos o específicos de composición: iconos, cuatro PNG de
cuidado, ilustración de aprobación, fotografía de prueba y auxiliares. El
[manifiesto de recursos](../apps/mobile/src/assets/figma/components/phase2-manifest.json)
registra contexto de origen, archivos y recortes de rostro. No hay URLs temporales en la aplicación.

El cotejo del registro v1.5 con la instantánea existente encontró **cero diferencias** en los
234 tokens visuales; se actualizó su procedencia, sin exportar los dos booleanos internos de Figma.
No se añadieron dependencias. Se corrigió también un espacio final de formato en `index.html`.

La revisión visual se concentró en las familias migradas. Las medidas verificadas a 402 px incluyen
editor 370 × 250, editor con error 370 × 274, eliminación 370 × 150, confirmación 370 × 324,
mensaje de detección 370 × 128 y panel de progreso 370 × 836. Los márgenes de las nuevas historias
permiten mostrar el componente de 370 px dentro del viewport de 402 px.

## Validación

- `npm run check`: tokens, lint, tipos y formato.
- `npm test`: ocho pruebas de onboarding, diez del modelo local y 306 historias de Storybook.
  Accesibilidad automática configurada como error.
- `npm run build` y `npm run build-storybook`: aplicación y catálogo estático.
- Auditoría de renderizado de 90 historias de componentes: recursos cargados y geometría no vacía.
  Cien comprobaciones de composiciones a 320/360/402/480 px, sin desbordamiento horizontal.
  Capturas y detalle de la revisión local en `.qa`, excluida de Git.

La compilación de la app mantiene el aviso de tamaño de algunos bloques JavaScript; no impide
la generación. Las comprobaciones de escritorio no acreditan teclado/insets reales, TalkBack,
permisos o texto ampliado en Android.

## Integración que sigue pendiente

La siguiente entrega se organiza en el [plan de integración de Mockups en la app](plan-integracion-mockups-app-fase-3.md),
con [mapa de referencias y rutas](mockups-app-fase-3.json).

Esta entrega implementa los bloques 0–5 del [plan](plan-storybook-fase-2.md).
Las pantallas nuevas de prueba viven en Storybook; la app local todavía conserva sus recorridos
anteriores de Inicio, Análisis y Perfil.

Antes de conectar las confirmaciones a la app hay que corregir el contrato de persistencia de
LocalProvider para distinguir memoria temporal de guardado confirmado. También siguen pendientes
la política definitiva de ventanas de protector, los adaptadores nativos de cámara/notificaciones,
el renderizado dinámico del jardín, los datos legales y las pruebas en dispositivo. Las posiciones
de las escenas y límites de los formularios de ejemplo no constituyen reglas nuevas de producto.
Una nueva APK se preparará al integrar y validar esos recorridos.
