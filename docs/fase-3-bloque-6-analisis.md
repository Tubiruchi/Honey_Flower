# Fase 3 · Bloque 6: jardín mensual y progreso conectado

Implementado el **9 de noviembre de 2026**, conservando el modo local sin cuenta ni backend.
La periodicidad confirmada por el usuario es **una planta por semana**, normalmente cuatro o cinco
cierres por mes. Una instalación nueva tiene cero eventos y cero plantas ganadas.

## Composición y recursos

Se reemplaza el antiguo Análisis de cuadrícula y gráficos propios por la composición real de
`features/local/AnalysisScreen.tsx`: jardín, selector Vivas/Marchitas, navegación mensual, colección
y `CycleProgressPanel`. Jardín y progreso permanecen en la misma pestaña. Las acciones desplazan
y enfocan el panel; el jardín vuelve a verse desplazando la pantalla hacia arriba, conservando
el mes y la colección. Por petición del usuario se retiró el enlace inferior de retorno. Cambiar de ciclo
vuelve al inicio del panel para mostrar el nuevo resumen. Las otras pestañas conservan la selección.

Referencias de Figma comprobadas: [jardín principal](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=144-3075),
[vacío](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=144-3204),
[una planta](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=345-6003),
[dos](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=345-6120),
[cinco](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=345-6237),
[progreso](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=345-6649),
carga `345:6844` y recuperación `345:6886`.

El fondo existente `backdrop-imgIlustracionDeEntornoSinUiNiPersonajes.png` es el patio limpio
original de Figma, 1316 × 1195. No se usa una captura del teléfono como recurso ni se generan
personajes dentro de la imagen. `GardenScene` sitúa los personajes originales y sus apoyos en
los cinco anclajes de la referencia 370 × 336, escalados junto con el entorno.

Los anclajes se reservan por todos los cierres del mes en orden cronológico, incluidos los
archivados. La identidad usa el instante de inicio del ciclo; el orden inverso de la lista no
cambia las posiciones. Una corrección de resultado tampoco desplaza las otras plantas.
Marchitas tiene su archivo y sus filas con el personaje correspondiente; no se coloca en el patio
de Vivas. La lista conserva todas las entradas si se supera la capacidad visual de cinco.
Ese desbordamiento se prueba como resistencia de presentación: la regla semanal vigente no
produce seis cierres en un mes.

## Mes, zona y conservación

Se aplica la propuesta del plan: mes del **cierre programado**, `inicio + 7 × 24 horas`, en una
zona fija de colección. `LocalState.garden` conserva versión 1, `groupBy: cycle-end` y `timeZone`.
La fecha en que la persona vuelve a abrir la app no modifica el mes de una planta.

Los perfiles nuevos fijan la zona al activar el modo local. Los anteriores se actualizan mediante
el repositorio: se conserva la primera zona documentada en su historial de protector, o la
preferencia existente si no hay historial. No se intenta reconstruir una zona que nunca se guardó
ni se consulta la zona actual del equipo para reorganizar plantas. Guardar otras preferencias
no cambia esta configuración. La actualización conserva eventos, metas, verificaciones, agenda
y recibos de operaciones; solo se publica tras confirmar la escritura. Los errores permiten
reintentar sin sustituir los datos por una colección vacía.

Los meses disponibles van desde la activación hasta el mes actual de esa zona. Hay flechas con
límites y gesto horizontal sobre el patio, independiente del desplazamiento vertical. Los puntos
representan meses disponibles, con un máximo de siete indicadores cercanos al seleccionado.
El cambio de mes es independiente del ciclo elegido para el progreso. Tras una ausencia larga,
se cierra solo el ciclo pendiente y comienza uno al regresar, sin inventar ciclos intermedios.

## Progreso verificable

Cada día usa sus metas históricas. Agua y protector pesan igual; cada contribución diaria se
limita a 100 % y se promedia sobre siete días. Los totales brutos se muestran sin convertirlos
en un cociente engañoso cuando hay excedentes o metas variables. La meta histórica de cada
columna también está en su etiqueta accesible; cuando cambia, se muestra junto a la fecha.

El día actual se identifica como parcial y los futuros usan un guion y valor pendiente.
El 88.1 % cerrado y el 34.5 % provisional de las historias proceden de eventos controlados.
No se copian porcentajes, fechas o plantas de ejemplo al perfil de la persona. El resultado
cerrado bajo el 80 % conserva el resumen con tratamiento neutro y explica su archivo en Marchitas.
La comparación usa el resultado sin redondear; una suma compensada evita que un 80 % exacto
quede por debajo por error numérico. No se atribuye confirmación a un servidor.

## Comprobaciones

- `npm run check`: tokens, lint, tipos y formato.
- Ocho pruebas de onboarding y **101 pruebas de lógica local**, incluidas 18 nuevas sobre
  progreso, umbral, excedentes, metas variables, mes/zona, cambio estacional, ausencia y migración.
- **385 historias en 77 archivos** con interacciones y accesibilidad automática. Las doce nuevas
  de **Pantallas / Análisis conectado** usan los componentes y rutas reales, almacenamiento
  aislado, lectura pendiente, recuperación y desbordamiento de presentación.
- Android Pixel_7: actualización con un registro guardado desde la app, jardín vacío y con cinco plantas, selección del ciclo correcto, retorno desde Perfil, cierre forzado y reapertura con el historial conservado. Se restauró el estado previo y se cerró el emulador al terminar.
- Compilaciones web, catálogo y Android debug. Se conserva la advertencia anterior de tamaño
  del paquete. No se reemplaza aún la APK distribuida: la entrega final corresponde al bloque 8.
- Navegador aislado: 320/360/402/480, densidades 0/1/2/4/5, fondo y personajes cargados, proporción
  370 × 336, selección de planta/ciclo, gesto de mes, foco, retorno desde Perfil y recarga.
  Sin errores de página ni desbordamiento horizontal de la pantalla.

Evidencias locales excluidas del repositorio: `.qa/phase6-browser.json`, `.qa/phase6-native.json`, capturas y registros
de pruebas/compilación. Teléfono físico, TalkBack y la revisión integral de la APK permanecen
en el bloque 8. El bloque 7 incorpora Perfil, preferencias y contenido; el acceso con cuenta
sigue después de los recorridos locales acordados.
