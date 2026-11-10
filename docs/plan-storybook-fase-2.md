# Fase 2 · Migración de Figma a Storybook

Fecha de revisión: **8 de noviembre de 2026**. Estado: **bloques 0–5 implementados en Storybook**.
Base del repositorio: commit `9e4e305`.

Resultado: [entrega y validación](storybook-fase-2.md) y [mapa de maestros a historias](storybook-fase-2-coverage.json).
La integración posterior del apartado 4 sigue pendiente. Las diferencias y cifras iniciales siguientes
describen el punto de partida del plan.

## Objetivo y alcance

Incorporar las nuevas familias de la biblioteca de Figma y actualizar las piezas existentes que las componen. La primera entrega es un catálogo fiel, accesible e interactivo con datos de prueba deterministas. Después se conectarán esas piezas a la prueba local de la app. La captura real, las notificaciones, el backend y otra APK pertenecen a una integración posterior.

La fuente visual es la página [Componentes de Figma](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=65-676), contrastada con el catálogo v1.19 y los documentos actualizados al 4 de noviembre. Se inspeccionaron todos los conjuntos y maestros de la página, el código existente y el contexto visual de ocho conjuntos representativos. El inventario no equivale a una comparación visual exhaustiva de cada maestro: esa revisión forma parte de la aceptación de cada bloque.

Fuentes de trabajo:

- [Catálogo y propiedades de componentes, v1.19](../../Docs/ux-ui/componentes-figma.md).
- [Especificación funcional, v1.5](../../Docs/producto/01-especificacion-funcional-mvp-jardin.md).
- [Flujos de agua y protector, v0.26](../../Docs/ux-ui/flujos-registro-agua-protector.md).
- [Plan de flujos y estados, v0.30](../../Docs/ux-ui/plan-flujos-estados-mvp.md).
- [Cierre UI de Análisis, continuidad y preferencias, v0.1](../../Docs/ux-ui/cierre-ui-analisis-estados.md).
- [Tokens, v1.5](../../Docs/ux-ui/tokens-diseno.md), y [sistema de diseño](../../Docs/ux-ui/sistema-de-diseno.md).
- [Inventario de esta revisión](storybook-figma-inventory-2026-11-08.json): IDs, enlaces y variantes de todos los maestros; separación entre producto y auxiliares.

## 1. Diferencias verificadas al iniciar la fase

Storybook contiene **41 archivos de historias y 179 historias exportadas**, contadas en el código. Su documentación de biblioteca conserva la referencia del 18 de octubre: 22 conjuntos, 105 variantes, 26 iconos y cinco independientes, equivalentes a 136 maestros de producto.

Figma tiene ahora **41 conjuntos de producto, 175 variantes, 29 iconos y siete independientes: 211 maestros**. La ampliación suma **75 maestros**:

- 19 familias nuevas con 62 variantes.
- Ocho variantes adicionales de `PlantCharacter`, que pasa de cuatro a doce.
- Tres iconos: `edit`, `delete` y `options`.
- Dos independientes: `DetectionApprovalPlant` y `DetectionPlantMessage`.

La página física contiene 216 maestros y 42 conjuntos porque incluye cinco estados auxiliares de cámara: dos variantes de `CameraPhoto`, `PlantPrompt`, `CameraFocus` y `CameraShutter`. Se documentarán aparte; su traslado a Componentes no los convierte en cinco novedades de producto.

Las variables siguen siendo **234 visuales**, más dos booleanos internos de prototipo: 236 en Figma. No hay una nueva base de tokens que justifique rehacer el tema. Antes de actualizar su procedencia se compararán nombres, valores y alias; los dos booleanos no se incorporarán como variables CSS.

### Diferencias relevantes del frontend

- `PlantCharacter` solo acepta especie/vista y muestra las dos ilustraciones saludables. `CalendarDay` no permite que su rostro refleje el estado de cuidado.
- `BottomNavigation` conserva «Jardín» como etiqueta predeterminada; la app ya la sobrescribe con «Análisis». Hay que homologar componente y catálogo a Inicio / Análisis / Perfil.
- `HomeScreen` tiene edición/eliminación propias en modales. Faltan los nuevos componentes de Registros, su confirmación de borrado y los estados de recuperación.
- `CameraResult` ofrece registro manual incluso sin permiso. No sirve como controlador del nuevo flujo de agua cuando la fotografía es obligatoria.
- `AnalysisScreen` usa un gráfico propio por mes/todo el historial. El nuevo diseño requiere progreso por ciclo dentro de la misma pestaña, independiente del mes del jardín.
- `LocalProvider.commit` actualiza la memoria aunque falle `localStorage`; sus acciones no devuelven un resultado explícito de persistencia. Antes de integrar «Guardado», «Eliminado» o «Deshecho» deberá corregirse ese contrato.

## 2. Orden de implementación

Cada bloque termina con sus componentes, variantes, historias interactivas relevantes, revisión visual y documentación. Los bloques 1–5 requieren el bloque 0; Registros requiere los nuevos iconos y estados de lectura. La cámara completa requiere sus piezas de detección y confirmación. Las composiciones finales requieren las familias que muestran.

### Bloque 0 · Base y trazabilidad

1. Usar el inventario adjunto como lista de cobertura, con estado implementado/revisado pendiente por maestro. Conservar los IDs de las historias existentes cuando sea posible.
2. Obtener contexto actualizado de cada familia al implementarla y guardar los recursos originales en `src/assets/figma/components`, con su ID de origen. Exportar los tres SVG nuevos desde sus maestros: [edit](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=225-2829), [delete](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=225-2832) y [options](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=225-2835). Ampliar `Icon` y su galería.
3. Homologar `BottomNavigation` a «Análisis». La clave interna `garden` puede conservarse para mantener compatibilidad; siguen siendo tres destinos principales.
4. Comparar los tokens actuales con la instantánea del repositorio y actualizar su procedencia con los cambios comprobados. Mantener colores semánticos, Plus Jakarta Sans y tema Dark.
5. Ampliar la organización de Storybook con Registros y Análisis, conservando Base, Hábitos, Planta, Cámara y Pantallas. Actualizar la vista general y `Docs/storybook.md` conforme se entregue cada bloque.

Aceptación: iconos originales visibles en galería; navegación coherente; fuentes y recursos locales; ninguna URL temporal de Figma usada en ejecución.

### Bloque 1 · Plantas y estados compartidos

- [PlantCharacter](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=118-1864): **12 variantes** — Brote/Cactus × Saludable/Descuidada/Marchita × Completa/Rostro. Añadir `health?: PlantHealth` con valor predeterminado `healthy`, reutilizando el tipo existente de `@honeyflower/contracts`.
- [CalendarDay](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=118-1943): conservar sus ocho variantes de progreso y permitir un rostro acorde al cuidado. Progreso del día y salud son ejes distintos; no generar un catálogo multiplicado por todas las combinaciones.
- [AsyncContentState](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=343-4576): **3 variantes**, Cargando/Error/Vacío, con mensajes y acción de reintento controlados por props.

Recursos: obtener las cuatro ilustraciones originales nuevas de planta y aplicar los recortes de rostro definidos para cada especie/estado. Conservar los recursos saludables. No simular los nuevos estados recoloreando la misma imagen. La reacción «Desconfianza» pertenece al contexto de una pantalla, no a un cuarto estado de cuidado.

Aceptación: cuerpo y miniatura coinciden; lectura accesible de especie/estado cuando corresponde; ilustraciones decorativas ocultas al lector; error de lectura distinto de vacío y sin métricas ficticias en cero.

### Bloque 2 · Registros

Crear **7 familias / 26 variantes**:

- [SwipeAction](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=225-2870): Editar/Eliminar × Normal/Pressed/Disabled, **6**.
- [RecordFilters](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=225-2892): Todos/Agua/Protector, **3**.
- [RecordDayNavigator](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=225-2917): Actual/Cerrado, **2**.
- [RecordItem](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=226-2935): Agua/Protector × Normal/Acciones/Solo lectura, **6**.
- [RecordEditor](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=226-3064): Normal/Error/Guardando, **3**.
- [RecordDelete](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=226-3097): Confirmación/Eliminando, **2**.
- [RecordFeedback](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=226-3154): Actualizado/Eliminado/Deshecho/ErrorTemporal, **4**.

Reutilizar `Input`, `Button`, `Feedback`, `Icon` y los selectores existentes cuando corresponda. Las filas reciben contenido/estado y emiten callbacks; un contenedor controla qué fila está abierta y qué operación está pendiente. El tipo inicial/reaplicación de protector se deriva de los eventos, fuera del componente visual.

Historias de recorrido: filtrar, consultar día cerrado, abrir acciones mediante Opciones o gesto, editar/cancelar, validar cantidad, confirmar/cancelar borrado, deshacer y reintentar tras error. Solo una fila de acciones puede estar abierta; el gesto por sí mismo no elimina. Agua ofrece edición y eliminación; protector, eliminación. El día cerrado es de solo lectura.

Datos reproducibles del diseño: total 1,250 mL; editar un evento de 250 a 400 produce 1,400; eliminar el original produce 1,000; deshacer vuelve a 1,250. Usar escenarios separados para edición y borrado, evitando encadenar cifras incompatibles.

Aceptación: enteros entre 1 y 10,000 mL; error impide guardar; guardando impide cambios/cancelación; reintentar conserva operación y cantidad; foco y Guardar/Cancelar accesibles con teclado. La integración revalida permisos del día al guardar, borrar y deshacer.

### Bloque 3 · Protector por ventanas horarias

Crear **3 familias / 11 variantes**:

- [SunscreenScheduleRow](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=326-4001): Registrada/Disponible/Próxima/Cerrada, **4**.
- [SunscreenWindowCard](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=326-4026): EnHorario/Desconfianza/Registrada/Cerrada, **4**.
- [SunscreenScheduleAgenda](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=326-4063): Activa/Registrada/Cerrada, **3**.

Reutilizar el estilo Sunscreen de `Button` y `Feedback`. Recibir estado, horas y filas desde datos de presentación; incluir agendas de distinto tamaño, sin fijar tres aplicaciones como requisito. `scheduledAt`, `contextAfterAt` y `windowClosesAt` son conceptos distintos del futuro controlador.

Aceptación: sin cámara; una ventana futura o cerrada no permite registrar; una aplicación posterior no completa otra ventana cerrada; «sin ventanas abiertas» no equivale a meta cumplida. Mantener los registros anteriores y adaptar altura a los textos/filas.

Dependencia de producto: apertura, duración y margen de las ventanas siguen pendientes. Los 30 minutos y horarios mostrados son ejemplos. Esto permite construir el catálogo con estados controlados; la implementación del motor horario esperará una política acordada. `AFProtectorScheduleRow`, del wireframe, no se porta como segunda familia de producto.

### Bloque 4 · Detección, cámara y confirmación de agua

Crear **5 familias / 14 variantes y 2 independientes**:

- [DetectionApprovalStamp](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=265-3551), **2**, y [DetectionApprovalBadge](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=265-3558), **2**: Fotografía/Superficie.
- [DetectionResultActions](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=265-3621): Normal/Loading/Disabled, **3**.
- [ConfirmationAmountField](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=290-4037): Normal/Error/Disabled, **3**.
- [RegistrationConfirmation](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=290-4135): Normal/Guardando/ErrorCantidad/ErrorGuardado, **4**.
- [DetectionApprovalPlant](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=265-3536) y [DetectionPlantMessage](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=265-3538): ilustración de aprobación y composición con mensaje.

Conservar dimensiones y recursos originales del sello/ilustración; el badge es decorativo. La excepción visual del botón secundario deshabilitado pertenece a esta composición y no debe alterar todos los `Button` del catálogo. `ConfirmationAmountField` debe componer o adaptar las primitivas existentes preservando la edición de cantidad/unidad del diseño.

Documentar los auxiliares `CameraPhoto` (Enfoque/Desenfoque), `PlantPrompt`, `CameraFocus` y `CameraShutter` en Cámara/Prototipo si se necesitan para mostrar el flujo completo. No contarlos como familias nuevas de producto. Fotografías de prueba estáticas; ninguna historia solicita permisos o enciende la cámara al cargarse.

Antes de reutilizar `CameraResult`, separar su comportamiento heredado del controlador nuevo. La regla vigente exige cámara solo para agua cuando el día operativo anterior cerrado quedó por debajo del 100 %. Si se exige fotografía, denegar permiso, cancelar o no capturar conduce a reintentar o salir sin registro. Tras una captura real inconclusa puede ofrecerse revisión y confirmación personal conforme al flujo; nunca atribuir a la imagen prueba de consumo.

Aceptación: confirmar exige una cantidad válida; el error de guardado conserva la cantidad bloqueada y reintenta la misma operación, sin duplicarla; loading no acredita guardado; volver a tomar restaura el paso correspondiente. Composición adaptable al teclado y al espacio inferior del móvil. Historias específicas de permiso denegado/salida sin registro y resultado inconcluso tras captura.

### Bloque 5 · Progreso de Análisis y composiciones actualizadas

Crear **3 familias / 8 variantes**, reutilizando `AsyncContentState` del bloque 1:

- [CycleHabitChart](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=343-4240): Agua/Protector × Cerrado/EnCurso, **4**.
- [CycleProgressSummary](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=343-4387): Cerrado/EnCurso, **2**.
- [CycleProgressPanel](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=343-4396): Cerrado/EnCurso, **2**, compuesto con los anteriores.

Representar siete días, valores proporcionales, etiquetas día/fecha en dos líneas y futuros con «—». Recibir series y resultados calculados por un adaptador; el componente no redefine las reglas de ciclo. Incluir texto/resumen accesible de los datos del gráfico.

Fixtures de referencia:

- Ciclo cerrado: agua `[2000,1500,2000,1000,2000,2000,1500]`, protector `[3,3,2,3,3,3,2]`; 85.7 % y 90.5 %, resultado **88.1 %**.
- Ciclo en curso: agua `[2000,2000,1000]`, protector `[3,3,1]`, cuatro días futuros pendientes; 35.7 % y 33.3 %, resultado **34.5 %**. El denominador es la meta de siete días; no promediar solo los días transcurridos ni decidir el umbral a partir del porcentaje redondeado.

Composiciones de Pantallas/Análisis: jardín con 0/1/2/4/5 plantas, carga/error/reintento y panel en curso/cerrado en la misma vista. Reutilizar `GardenBackdrop`, `GardenCollectionRow`, `MonthNavigator` y personajes; no generar otro fondo. Mes del jardín y ciclo del gráfico tienen selecciones independientes. Las muestras de densidad no definen por sí solas un algoritmo de distribución para la app.

Añadir historias de preferencias y fuentes/privacidad de la versión objetivo usando `SettingRow`, `TimeRow`, `Stepper`, `Input` y `SettingsLink`. Distinguirlas del Perfil local, que todavía no envía avisos. Cubrir las cuatro combinaciones independientes de sonido/linterna, permiso denegado y horas de calma cruzando medianoche; el ejemplo que bloquea todas las citas impide guardar. Privacidad mantiene `privacyLegalReady: false`, sin inventar responsable ni contacto legal.

Aceptación: desplazamiento vertical y navegación inferior fija; los accesos al progreso desplazan la misma pantalla; no aparece una cuarta pestaña; cargar/error no elimina plantas ni muestra datos vacíos como resultado confirmado.

## 3. Estructura técnica propuesta

Conservar las convenciones actuales: React/TypeScript, CSS con tokens y componentes compartidos. No hacen falta un segundo sistema visual ni nuevas dependencias para este alcance.

- `apps/mobile/src/shared/components/Nombre.tsx` y `Nombre.stories.tsx`: componentes y variantes. Exportar desde `shared/components/index.ts`.
- `apps/mobile/src/shared/styles/`: estilos por área cuando el volumen lo justifique, importados por el índice existente. Estados estáticos Pressed/Focused de referencia siguen en `stories/figma-states.css`; la app usa interacción real.
- `apps/mobile/src/assets/figma/components/`: SVG/PNG originales y manifiesto de procedencia; recursos compartidos, sin capturas rasterizadas de formularios o tarjetas.
- `apps/mobile/src/stories/fixtures/`: registros, agenda, resultados y ciclos con reloj/fechas fijos, errores inducibles y operaciones identificables. Cada historia debe poder abrirse sola sin depender de otra.
- `apps/mobile/src/stories/`: composiciones de pantallas y recorridos que no encajan en una única familia.
- `apps/mobile/src/features/local/`: adaptadores e integración posterior. Las familias compartidas no acceden directamente a `localStorage`, permisos, cámara o notificaciones.

Contratos que deben quedar explícitos al empezar cada área: estado de lectura `loading/error/empty/ready`; estado de operación pendiente/guardada/fallida; identificador estable para reintento/deshacer; estado de la ventana recibido del controlador; fechas y permisos de edición del día. Props y tipos en inglés; contenido e historias en español.

## 4. Integración posterior en la prueba local

Este trabajo se prepara después de aceptar las familias visuales, sin impedir sus historias:

1. Hacer que las operaciones de `LocalProvider` distingan fallo de persistencia y guardado confirmado. Mantener un comando pendiente con ID estable; reintentar no debe crear otro evento. Si se conserva una edición temporal, identificarla como tal y no presentarla como éxito duradero.
2. Extraer la composición de Registros de `HomeScreen` y reutilizarla desde Inicio/Perfil según el recorrido documentado. Verificar de nuevo el día operativo antes de editar, borrar o deshacer.
3. Conectar la agenda de protector cuando exista política horaria. Aplicar el nuevo flujo de agua mediante un adaptador de captura; las historias simuladas no acreditan integración nativa.
4. Sustituir el gráfico propio de `AnalysisScreen` por el panel de ciclo y la colección mensual, manteniendo selecciones independientes. Incorporar preferencias objetivo solo a medida que sus capacidades estén disponibles.

Las pruebas de esta integración deben cubrir error de almacenamiento, reintento sin duplicados, cierre de día durante una operación y cambio de ciclo. La generación y validación de otra APK será una entrega posterior con pruebas en dispositivo.

## 5. Criterios de cierre y validación

Cobertura mínima nueva de producto: **72 historias de referencia** = 62 variantes de familias nuevas + ocho ampliaciones de planta + dos independientes. Los tres iconos amplían su galería. Los cinco estados auxiliares, las interacciones y las composiciones se contabilizan aparte; no se usa un total fijo de historias como único criterio de calidad.

Por bloque:

- Enlace al maestro de Figma, props/estados documentados y cada variante cubierta.
- Comparación de color, tipografía, radios, iconos, medidas y espaciado con su maestro. Referencia móvil 402 × 874; componentes de 370 px donde corresponda. Adaptación a 320, 360 y 480 px sin desbordar.
- Pruebas `play` para decisiones relevantes: abrir/cerrar, validación, bloqueo, cancelación, reintento y recuperación de foco. Los tests de reglas se reservan a adaptadores/modelo; no duplicar el render con pruebas que solo copien la implementación.
- Accesibilidad automática de Storybook, más revisión de teclado, nombres accesibles, estados anunciados, texto ampliado y movimiento reducido. El gesto tiene alternativa visible.
- `npm run check`, `npm run test-storybook` y `npm run build-storybook`. Al cambiar código compartido o integrar pantallas, añadir `npm test` y `npm run build` para cubrir regresiones de onboarding y prueba local.
- Registrar evidencia y límites: las pruebas de escritorio no acreditan permisos nativos, TalkBack, teclado/insets reales ni persistencia en Android; estos se comprueban en la integración móvil.

Al elaborar el plan solo se hizo revisión documental y estructural. Su ejecución amplía el catálogo
a 306 historias y añade pruebas de los recorridos; los resultados se registran en la entrega de fase 2.

## 6. Secuencia aplicada

Se completaron los bloques **0 y 1**: tres iconos, navegación homologada, doce estados de planta,
rostros coherentes en calendario y `AsyncContentState`. Después se incorporaron las 26 variantes
de Registros y sus recorridos, protector por horarios, detección/confirmación y progreso de Análisis.

Esta secuencia deja una base reutilizable antes de abordar ventanas horarias, captura y paneles de progreso. No se reutiliza la estimación del sprint histórico de octubre como plazo de esta ampliación; cada bloque se estima tras confirmar sus recursos y contratos, sin condicionar el catálogo a las decisiones pendientes de integración nativa.
