# Integración · Bloque 1: persistencia, operaciones y reloj

Fecha: **8 de noviembre de 2026**. Primer bloque del [plan de integración](plan-integracion-mockups-app-fase-3.md).

## Resultado

Inicio, Análisis, Perfil y la entrada comparten un estado local confirmado. Los totales, preferencias
y mensajes de éxito cambian después de guardar. Ante un error de lectura se bloquea la entrada con
Reintentar; no se envía al onboarding como si no existieran datos. Ante un error de escritura se
conserva el último estado confirmado y se ofrece reintentar o cerrar el intento.

«Ya tengo cuenta» mantiene el acceso directo a Inicio. Iniciar y terminar la configuración esperan
la confirmación antes de navegar. Recuperar un perfil existente no reinicia su activación, especie,
metas, eventos ni ciclos. Las cuentas y el inicio de sesión quedan para el final, según lo acordado.

## Datos y migración

- La nueva clave `honeyflower.local.v2` contiene modelo, revisiones por evento/preferencias y
  recibos de operación. Se guarda todo junto con una única escritura de localStorage.
- Si no existe v2, se valida y migra `honeyflower.local.v1`. La clave anterior queda intacta como
  origen de migración; no sigue recibiendo cambios. Se conservan fechas, volúmenes, zona horaria,
  preferencias, metas históricas, ciclos y especie inicial.
- Los eventos migrados tienen `legacy: true` en sus metadatos. Los protectores antiguos siguen
  contando con la política anterior; no se les inventan citas ni ventanas retrospectivas.
- Si v2 está dañada o no es legible se muestra recuperación. No se sustituye con v1, que podría
  estar atrasada. Una migración que no puede guardarse tampoco permite crear otro perfil encima.
- El modelo de cálculo interior conserva versión 1. La versión 2 corresponde a la envoltura de
  persistencia; no se han cambiado las reglas de hábitos en este bloque.

## Operaciones

`LocalRepository` recibe comandos con ID estable, fecha, tipo y datos. Una cola serializa las
mutaciones de su instancia. Devuelve `confirmed` con recibo, o `failed` con motivo y mensaje.
Antes de escribir vuelve a leer el estado persistido y comprueba revisiones y plazo.

Reenviar el mismo comando confirmado devuelve su recibo original sin repetir el cambio,
incluso si ya cerró el día. El mismo ID con otros datos se rechaza. Un intento no guardado
se revalida al reintentar: si cerró el día, no puede registrarse ni corregirse retrospectivamente.
El proveedor también evita envíos simultáneos del mismo intento y repeticiones del mismo registro
rápido durante 500 ms para absorber un doble toque.

Deshacer guarda una operación inversa del evento afectado. Conserva su ID e instante original;
no restaura una lista completa. Añadir otro hábito entre la operación y Deshacer conserva esa alta.
Una revisión posterior sobre el mismo evento impide deshacer una versión antigua. La revisión de
preferencias también impide guardar un formulario que se abrió antes de otro cambio confirmado.

El proveedor mantiene la acción del formulario pendiente durante un fallo recuperable. Reintentar
resuelve esa misma acción; cerrar el intento libera el formulario conservando su cantidad o borrador.
Si una escritura llegó al almacenamiento pero se perdió su respuesta, volver a leer reconoce el
recibo confirmado. Los controles de recuperación también aparecen dentro de los diálogos, donde
siguen siendo accesibles aunque el resto de la página esté inactivo.

## Tiempo y recuperación

Se comparte un reloj inyectable, actualizado al recuperar foco/visibilidad, cada 15 segundos mientras
la app está visible y antes de ejecutar cambios. Se mantienen días de 24 h desde la activación y
ciclos de 168 h. Una ausencia larga inicia un único ciclo al regreso; no genera ciclos ficticios.
Si no se puede persistir el cierre se bloquea la vista, evitando mezclar un reloj nuevo con un ciclo
que todavía no pudo confirmarse.

Los intentos sin confirmar están **solo en memoria**. La interfaz lo indica: mantener la app abierta
para reintentar. No existe una cola persistente de sincronización ni recuperación de esos intentos
tras terminar el proceso. Los recibos sí guardados permiten reconocer un comando confirmado al
reabrir. No se recorta todavía ese historial; si se agota la capacidad, la escritura falla y se conserva
el estado confirmado. La cola actual cubre el proveedor de la app; no ofrece transacciones entre
procesos, pestañas que escriban simultáneamente ni dispositivos.

## Comprobación

- 30 pruebas locales: diez del modelo y 20 del repositorio. Cubren migración, datos dañados,
  ausencia/denegación, fallos de escritura y de confirmación, reintentos concurrentes, reapertura,
  revisiones, preferencias, plazos, cierre de ciclo y las tres formas de deshacer.
- Ocho historias nuevas en **Pantallas / Persistencia local**, con las rutas y formularios de la app
  y almacenamiento aislado: registro rápido, doble toque, recuperación/cierre en diálogo, lectura,
  migración, Perfil y acceso directo. Se suman a las 306 historias existentes.
- Comandos: `npm run check`, `npm test`, `npm run build` y `npm run build-storybook`.
- Resultado: **352 pruebas aprobadas** (8 de onboarding, 30 locales y 314 historias), más las
  comprobaciones de código y las dos compilaciones. La revisión en navegador confirmó acceso sin
  cuenta, doble toque, edición, eliminación/deshacer, nombre, recarga y recuperación de datos dañados;
  sin errores de página ni desbordamiento horizontal a 320/360/402/480 px.

## Siguiente bloque

Continuar con navegación y Registros: rutas, retorno al origen, filtros y días, edición/eliminación
con confirmación y los componentes nuevos conectados al repositorio. Este bloque no modifica la
política de ventanas de protector ni incorpora cámara, notificaciones, servidor o autenticación.
La nueva APK corresponde a la verificación integrada del bloque 8; el binario anterior sigue siendo
la entrega 0.2.0 y no contiene estos cambios hasta reconstruirlo.
