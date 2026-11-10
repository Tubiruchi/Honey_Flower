# Integración · Bloque 2: navegación y Registros

Fecha: **8 de noviembre de 2026**. Segundo bloque del [plan de integración](plan-integracion-mockups-app-fase-3.md).

## Entrega

La pantalla **Mis registros**, en `/perfil/registros`, consulta el historial real del dispositivo.
Se abre desde **Ver todos los registros** en Inicio, desde Opciones de un registro de su vista
breve y desde **Ver mis registros** en Perfil. Comparte eventos, totales y preferencias con el
resto de la app mediante el repositorio del bloque 1. Las cifras de ejemplo solo se inyectan en pruebas.

La composición sigue las referencias [lista](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=346-6686),
[edición](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=346-6752) y
[eliminación](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=346-6819).
Reutiliza IconButton, RecordDayNavigator, RecordFilters, RecordItem, RecordEditor, RecordDelete,
RecordFeedback y AsyncContentState, junto al resumen diario extraído de Inicio y los iconos locales
originales. La barra de estado y el indicador del sistema de Figma son referencias; la app usa
los insets reales y no los dibuja como imágenes.

## Navegación

- Se conservan `/inicio`, `/analisis`, `/perfil` y la redirección `/jardin` → `/analisis`.
- Las tres pestañas conservan su estado al entrar en una subpantalla. Volver desde Registros
  recupera la selección, desplazamiento y foco del origen. Una entrada directa vuelve a Perfil.
- Registros y `/inicio/agua`, `/inicio/protector` ocultan la barra inferior; no existe una cuarta pestaña.
- Las rutas de agua/protector tienen entradas manuales funcionales con confirmación, guardado,
  recuperación y deshacer. Mantienen las reglas locales anteriores, incluida la meta de protector.
  La captura y las ventanas horarias se implementarán en sus bloques; estas vistas no simulan sensores.
- Atrás en Registros cancela primero la edición o confirmación de borrado. Una salida mediante
  el historial de navegador también cancela esa edición. Durante un guardado sin confirmar se
  bloquea la salida para permitir recuperar o cerrar el intento. Se registra también el evento
  de Atrás de Ionic; su recorrido físico se verificará con la APK integrada.

## Historial y operaciones

Los filtros Todos/Agua/Protector muestran los eventos del día seleccionado. Las flechas recorren
días operativos existentes, desde la activación hasta el actual; no habilitan fechas futuras ni
fabrican días durante una ausencia. `dia` y `filtro` en la URL conservan una consulta al recargar.

Opciones o un gesto horizontal revela acciones en una sola fila. Agua permite editar cantidad
y eliminar; protector permite eliminar. La categoría inicial/reaplicación se deriva del orden de
los eventos restantes y se actualiza al eliminar o deshacer. No se edita fecha, hora ni categoría.

Editar se abre en la fila, enfoca el campo y muestra el total que resultaría sin cambiar el total
confirmado. Una cantidad inválida deshabilita Guardar. Cancelar conserva el original. Eliminar
presenta una confirmación del evento y su efecto; solo entonces ejecuta la operación.

Las operaciones usan IDs y revisiones del bloque 1. Guardar, eliminar y deshacer esperan la
confirmación real del almacenamiento. Un fallo conserva el borrador, bloquea nuevos envíos y
ofrece Reintentar o Cerrar intento. Reintentar reutiliza la operación; cerrar el intento devuelve
el control al formulario. El intento pendiente sigue siendo solo de memoria, como indica la interfaz.
El resultado muestra volumen de agua o recuento de protector según el evento afectado.

Deshacer actúa solo sobre el evento y no elimina altas posteriores de otros hábitos. Si el día
termina con un editor abierto, la pantalla pasa a consulta conservando el dato original. Los días
cerrados no presentan controles de modificación. El error o reintento de una lectura usa la
recuperación común, sin crear un perfil nuevo.

## Foco y tamaño

Se devuelve el foco a la fila después de cancelar/guardar/deshacer, o al encabezado si se elimina.
Los campos solicitan teclado numérico. La lista tiene desplazamiento propio y las acciones del
editor permanecen dentro de su zona visible. Se adapta la altura al viewport visual y se reduce
el encabezado cuando el teclado ocupa espacio. No se incorpora la imagen del teclado de Figma.

## Comprobaciones

- **372 pruebas:** ocho de onboarding, 34 locales y 330 historias de Storybook. Las nuevas son
  cuatro pruebas de selectores y 16 historias conectadas, incluyendo los ejemplos reales
  **1,250 → 1,400 mL** y **1,250 → 1,000 → 1,250 mL**.
- Prueba de navegador sobre la app: día y desplazamiento del origen, Atrás cancelando edición,
  edición y recarga, eliminación/deshacer, fallo de escritura, salida bloqueada, reintento de la
  misma operación y cierre diario durante un formulario. Sin errores de página.
- Comparación visual de lista y editor con las referencias y revisión a **320/360/402/480 px**,
  sin desbordamiento horizontal. Una ventana de 360 × 450 comprueba que Guardar puede verse y
  accionarse; es una simulación de espacio reducido, no una prueba de teclado físico Android.
- `npm run check`, `npm test`, `npm run build` y `npm run build-storybook` verifican la entrega.

El binario Android anterior no se sustituye en este bloque. La instalación, teclado físico,
TalkBack y Atrás del teléfono se verificarán al generar la APK integrada del bloque 8.

## Siguiente bloque

Actualizar **Inicio y los estados de la planta** con las composiciones nuevas y los mismos datos.
Se conserva «Ya tengo cuenta» para probar sin cuenta; registro e inicio de sesión quedan al final.
