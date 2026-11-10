# Integración · Bloque 5: protector por ventanas horarias

Fecha: **8 de noviembre de 2026**. Quinto bloque del [plan de integración](plan-integracion-mockups-app-fase-3.md).

## Decisión para esta prueba

El usuario eligió explícitamente:

- **60 minutos** desde cada hora programada, cerrando antes si llega la siguiente cita o termina
  el día operativo de planta.
- Mostrar el contexto de la flor desconfiada **al pasar la mitad de esa ventana efectiva**.

La política local se identifica como v1 y se conserva en cada versión de agenda. Los 30 minutos
de Figma siguen siendo datos ilustrativos. Esta política determina cuándo se puede anotar una
aplicación; no determina una frecuencia de uso del producto.

## Pantallas y comportamiento

Inicio abre `/inicio/protector` por acción de la persona. El botón conserva el registro ordinario
cuando hay ventana abierta; si no la hay, permite revisar horarios. Se preserva el Inicio aprobado,
con un único enlace morado subrayado al historial debajo de la planta y sin nuevas cajas.

La pantalla compone PlantPrompt, PlantCharacter, SunscreenWindowCard, SunscreenScheduleAgenda,
SunscreenScheduleRow, Button y Feedback. Reproduce los cuatro estados de los mockups con datos
reales: en horario, contexto, registrada y horario terminado. Se añade próximo horario como
estado complementario para no presentar una cita futura como cerrada. La desconfianza es un
mensaje contextual, sin modificar el estado de salud calculado por días cerrados.

Referencias revisadas en Figma con contexto de diseño y capturas:

- [Ordinario](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=337-5749).
- [Contexto](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=337-5852).
- [Registrado](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=337-5932).
- [Terminado](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=337-6035).

Registrar abre una confirmación personal de la cita seleccionada. Cancelar o Atrás antes de
guardar no crea eventos. No hay cámara, foto ni detección para protector. El historial se abre
filtrado por protector y conserva el retorno a la agenda. Revisar horarios abre una sola vez el
editor existente de Perfil; guardar o cerrar no lo vuelve a abrir.

La confirmación se bloquea si cierra la cita o cambia el día. El repositorio vuelve a comprobar
la versión, el día, la apertura/cierre, el instante del intento, el cupo y la ausencia de otro
evento en la misma cita. El límite de cierre es exclusivo. No hay altas nuevas para una cita
pasada, ni traslado silencioso de un intento vencido a la siguiente cita.

## Agenda y conservación de datos

Cada cita se identifica por revisión de agenda, inicio UTC del día y hora elegida. La agenda
mantiene zona horaria, horas y política por versiones con vigencia desde un día operativo.
Los cambios de meta y horas se aplican al siguiente día; el día en curso y el historial conservan
sus versiones. Cambiar nombre o tono no genera por sí solo una nueva agenda.

Los días siguen durando 24 horas desde la activación. Cada hora seleccionada se asigna a su
primera ocurrencia real dentro de ese intervalo. Una hora ya iniciada antes de activar la planta
no se retrocede: su siguiente ocurrencia puede quedar hacia el final del primer día. La última
ventana se recorta al cierre, incluso si queda menos de una hora. Los solapamientos se recortan
en la siguiente cita; nunca se inventan citas para compensar una omitida.

En zonas con cambio estacional, una hora repetida tiene una sola cita y una hora inexistente no
genera un instante artificial. La meta permanece igual; no se altera el denominador para aparentar
que se completó. El intervalo sigue siendo de 24 horas y no se ajusta a medianoche ni a puesta de sol.

La actualización de perfiles previos conserva sus eventos y cantidades sin asignar citas
retrospectivas. Los registros de protector sin asociación cuentan como antes y se identifican
como anteriores. Si una meta ya configurada para mañana tiene otra cantidad de citas y no se
conocen las horas anteriores, la agenda nueva empieza mañana: no se inventa la agenda faltante.
Un fallo al persistir esta actualización bloquea la entrada y permite recuperar sin reemplazar
los bytes anteriores. Se conserva la migración desde v1 y su copia de origen.

El progreso continúa siendo `min(1, aplicaciones / (1 + reaplicaciones))`. Cero reaplicaciones
requiere una inicial: 1/1. La primera aplicación restante por instante/ID es inicial y las
siguientes reaplicaciones. Eliminar la primera reclasifica las demás sin recuperar su cita.
No tener ventanas abiertas no implica meta completa.

## Guardado, deshacer y avisos

Cada alta guarda una sola aplicación vinculada a su cita. Los reintentos conservan identificadores
y asociación. El éxito aparece tras la escritura confirmada. Un error mantiene la confirmación
pendiente en memoria con reintentar/cerrar; no se promete conservar un intento sin guardar después
de terminar el proceso. Los eventos confirmados, las versiones y sus recibos sí persisten.

Un recibo ya guardado sigue confirmado aunque su respuesta se pierda o el plazo cierre. Un intento
que no llegó a guardarse vence. Eliminar o deshacer un alta no reabre una cita cerrada. Deshacer
una eliminación restaura el mismo evento, con su hora/asociación original; no puede pisar una
nueva aplicación que haya ocupado esa cita.

El selector de ventanas accionables retira las registradas/cerradas y deja de ofrecer más altas
cuando la meta está completa. **Esta fase no envía notificaciones del teléfono**: todavía no existe
un adaptador instalado de avisos. El selector prepara su reconciliación posterior sin afirmar
que se hayan programado o cancelado alarmas nativas.

## Comprobaciones

- `npm run check`: tokens, lint, tipos y formato.
- `npm test`: **464 pruebas**: ocho de onboarding, 83 de lógica local y 373 historias de Storybook.
- Compilación web, catálogo y Android debug completas. Continúa la advertencia previa de tamaño
  de paquete; no se sustituyó la APK distribuida de la entrega anterior.
- Navegador: anchos 320/360/402/480, geometría de tarjeta 370 × 160 y agenda 370 × 200 a 402 px,
  ordinario/contexto/confirmado/cerrado, cancelación, deshacer, fallo y reintento, editor de Perfil,
  vigencia al día siguiente, recarga y cierre durante confirmación. Sin errores de página.
- Accesibilidad automática de las 373 historias, incluida agenda de 13 citas desplazable mediante
  teclado. Se conservan los insets nativos, sin dibujar las barras del sistema de Figma.
- Android en emulador Pixel_7: actualización con registro previo sin cita, entrada desde Inicio,
  confirmación personal, Atrás para cancelar, alta asociada, deshacer, cierre de ventana durante
  confirmación y recarga. No se invocó cámara. Se restauró el perfil previo al terminar.

Evidencias locales excluidas del repositorio: `.qa/phase5-browser.json`, capturas de las cuatro
pantallas, `.qa/phase5-native.json` y registros de comprobación/compilación. Los datos de las
historias y de estas pruebas están aislados de los del navegador del usuario. La comprobación
en teléfono físico y TalkBack forma parte de la revisión Android final del bloque 8.
