# Integración · Bloque 3: Inicio y estados de la planta

Fecha: **8 de noviembre de 2026**. Tercer bloque del [plan de integración](plan-integracion-mockups-app-fase-3.md).

## Entrega

Inicio usa el ciclo, calendario, progreso y racha reales del dispositivo. El cuerpo y el rostro
seleccionado reciben la misma especie y salud calculada. Se conservan el registro rápido de
250 mL, protector y el acceso al historial conectado del bloque 2.

**Ajuste aprobado tras la vista previa:** se eliminan de Inicio «Otra cantidad de agua», sus
botones y ayuda, «Un registro a la vez», la caja «Tus registros», la vista breve del historial
y los accesos adicionales. Debajo de la planta queda únicamente «Ver todos los registros» como
enlace morado subrayado, sin superficie de botón ni contenedor. El enlace conserva el día consultado,
el origen y el foco al regresar. Las confirmaciones y Deshacer aparecen cuando se realiza una acción.

Referencias revisadas en Figma:

- [Brote saludable](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=132-2962)
  y [Cactus saludable](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=132-3153).
- [Brote descuidada](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=305-5060)
  y [Brote marchita](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=305-5268).
- [Cactus descuidada](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=305-5476)
  y [Cactus marchita](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=305-5684).

Se reutilizan PlantCharacter, CalendarDay, GreenhouseScene, HabitSummary, StreakBadge, Button y los
recursos originales locales. HabitSummary añade la variante `metric` de 112 px, usada también en
Registros. La variante anterior de la biblioteca conserva su presentación. El escenario mantiene
338 × 200 y el personaje 246.154 × 200 a 402 px; los botones rápidos tienen la envoltura de 68 px
del mockup, con superficie de 52 px. Los insets del sistema sustituyen las barras de referencia.

En las referencias de Brote que conservaban un rostro anterior se aplica el mismo estado de cuidado
a ambas vistas, siguiendo el contrato de PlantCharacter y el plan. El archivo de Figma no se modifica.

## Datos y comportamiento

- La salud usa solo días cerrados: saludable desde 80 %, descuidada desde 40 % y marchita por
  debajo. Se compara el valor real, sin redondearlo para decidir. Sin cierres empieza saludable.
- Los casos descuidada/marchita muestran porcentaje y cantidad de días cerrados. Completar una
  meta durante el día modifica progreso, pero no adelanta la actualización de salud. La marchitez
  puede recuperarse en cierres posteriores.
- El calendario distingue selección y ventana operativa actual. Consultar el pasado o futuro
  deshabilita las altas. Volver al día en curso recupera sus totales y controles. Las siete cápsulas
  mantienen 48 × 108; en anchos pequeños el calendario se desplaza horizontalmente.
- Las barras se limitan a 100 %, conservando el volumen real incluso por encima de la meta.
  Guardar y deshacer siguen pasando por el repositorio y esperan confirmación.
- Las cantidades manuales siguen en su ruta existente; Inicio no presenta otro formulario de alta.
  La recuperación de errores y las revisiones del repositorio se conservan.
- Al cerrar 168 h se alterna la especie y se consulta el nuevo ciclo sin borrar el anterior.
  Una ausencia larga inicia un solo ciclo al regreso. Las fechas y metas históricas se conservan.

La primera instalación sigue vacía y «Ya tengo cuenta» mantiene el acceso directo a Inicio.
No se añaden datos de muestra al almacenamiento real ni se modifica el formato v2 del bloque 1.

## Preparación de la captura de agua

`waterPhotoTrigger` identifica un día operativo completo con agua por debajo de su meta, incluido
progreso parcial o cero. No lo originan dos citas omitidas, la meta de protector ni el 80 % semanal.
Un registro manual posterior no borra ese cierre. El selector puede reconstruirse desde la historia
guardada al recargar; no inventa una fotografía o una verificación confirmada.

La activación de la obligación de foto se conecta cuando exista el adaptador real del **bloque 4**,
según el plan. Este bloque conserva el registro manual de la prueba y no solicita permisos, abre
la cámara ni usa la foto de Storybook como si hubiera sido capturada. El cumplimiento de la solicitud,
sus metadatos y la recuperación del intento forman parte del siguiente bloque.

## Comprobaciones

- **396 pruebas:** ocho de onboarding, 44 locales y 344 historias de Storybook. Se conservan diez
  pruebas de selectores/reglas, 12 historias de Inicio conectado y dos métricas de HabitSummary.
- Las seis combinaciones se generan con eventos y salud calculada. Las pruebas comprueban que
  cuerpo y rostro usan el mismo recurso y estado, consulta de otros días, registros, deshacer,
  límites y conservación de cantidades.
- Revisión visual en navegador de los seis estados y sus recursos cargados, con medidas de
  calendario, tarjetas, personaje, escenario y botones. Se comprobaron 320/360/402/480 y un nombre
  largo, sin desbordamiento de página.
- Recarga con datos guardados, volumen excedente, cambio de ciclo y ausencia prolongada, sin errores
  de página. El ajuste visual comprueba el enlace, retorno, foco, día seleccionado y registro/deshacer.
- `npm run check`, `npm test`, `npm run build` y `npm run build-storybook` verifican código y entrega.

La nueva APK, TalkBack y el teclado físico siguen en la verificación integrada del bloque 8.
El binario anterior conserva su alcance anterior hasta reconstruirlo.

## Siguiente bloque

Continuar con **agua: captura real y confirmación integrada**, conservando cantidad, día y origen
del intento. El registro de cuenta y el inicio de sesión siguen para el final.
