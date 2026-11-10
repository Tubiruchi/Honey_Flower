# Fase 3 · Integrar los mockups en la aplicación

Fecha: **8 de noviembre de 2026**, actualizado el **9 de noviembre**. Estado: **bloques 1–8 implementados; APK 0.3.3 disponible; aceptación en teléfono físico pendiente**.

## Objetivo

Llevar las pantallas y estados nuevos de Mockups a la app Ionic/React, reutilizando la biblioteca
compartida que ya está en Storybook. El resultado será una prueba local con datos persistentes,
navegación completa y una nueva APK verificable. Se conserva el funcionamiento sin backend y el
acceso directo a Inicio mediante «Ya tengo cuenta» durante esta fase.

Se ejecuta por bloques. El registro de cuenta y el inicio de sesión quedan para el final,
después de los recorridos locales; «Ya tengo cuenta» conserva el acceso directo para probar.
La [entrega del bloque 1](fase-3-bloque-1-persistencia.md) documenta el código y sus comprobaciones.
La [entrega del bloque 2](fase-3-bloque-2-registros.md) incorpora navegación y Registros conectados.
La [entrega del bloque 3](fase-3-bloque-3-inicio.md) conecta Inicio y los seis estados de la planta.
La [entrega del bloque 4](fase-3-bloque-4-agua.md) conecta la cámara real y la confirmación de agua.
La [entrega del bloque 5](fase-3-bloque-5-protector.md) integra protector por ventanas horarias.
La [entrega del bloque 6](fase-3-bloque-6-analisis.md) conecta el jardín mensual y el progreso de cada ciclo.
La [entrega del bloque 7](fase-3-bloque-7-perfil.md) conecta Perfil, preferencias, contenido público y avisos locales Android.
La [entrega del bloque 8](fase-3-bloque-8-apk.md) incorpora revisión integrada, cámara temporal y APK descargable.
El [parche 0.3.1](patch-0.3.1-camara.md) sustituye la cámara externa por captura dentro de la aplicación.
El [parche 0.3.2](patch-0.3.2-navegacion.md) elimina la franja de fondo alrededor de la navegación.

## 1. Alcance y referencias

La inspección de [Mockups](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=82-676)
identifica 71 teléfonos de referencia: **52 relacionados con la aplicación local**, diez de
onboarding y nueve de acceso/cuenta. Las 52 referencias incluyen variantes de una misma vista,
ejemplos de densidad y pantallas anteriores; no son 52 rutas que deban crearse.

El [mapa de mockups y rutas propuestas](mockups-app-fase-3.json) conserva todos los IDs y separa
el alcance local, el onboarding existente y los flujos futuros con cuenta.

- **Inicio:** seis referencias, incluyendo las dos especies y sus tres estados de cuidado.
- **Registros:** diez referencias de lista, acciones, edición, guardado, eliminación, recuperación,
  lectura, vacío y teclado. Referencia actual: [continuidad y edición](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=346-6677).
- **Agua con cámara:** ocho referencias. La [confirmación integrada P-C05](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=295-5290)
  es la composición objetivo; el resultado anterior P-C04 queda como referencia histórica.
- **Protector:** cuatro estados de ventanas horarias, desde disponible hasta horario terminado.
  Referencia: [protector por horarios](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=337-5740).
- **Análisis:** ocho referencias de jardín, densidades, progreso, carga y recuperación.
  [Jardín y progreso](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=144-3075) comparten pestaña.
- **Perfil y contenido:** dos referencias de Perfil, doce de notificaciones/ajustes y dos destinos
  de fuentes/privacidad. El [Perfil objetivo](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=347-7390)
  debe adaptarse a las capacidades reales de la prueba local.

Los nueve mockups de cuenta se registran como alcance posterior: no se simularán autenticación,
recuperación de contraseña ni sincronización como si existiera un servicio real. El onboarding
actual se conserva y se conectan sus enlaces a fuentes y privacidad.

Fuentes funcionales: [especificación v1.5](../../Docs/producto/01-especificacion-funcional-mvp-jardin.md),
[flujos v0.26](../../Docs/ux-ui/flujos-registro-agua-protector.md),
[cierre UI](../../Docs/ux-ui/cierre-ui-analisis-estados.md) y
[jardín mensual v0.5](../../Docs/arquitectura/04-jardin-mensual-y-renderizado.md).
Base visual disponible: [entrega Storybook fase 2](storybook-fase-2.md), con 306 historias.

## 2. Diferencias que hay que resolver

La app sigue usando HomeScreen, AnalysisScreen y ProfileScreen de la primera prueba local.
Las composiciones nuevas viven en Storybook y usan fechas, resultados, permisos y guardados
simulados. Sus controladores de demostración no deben trasladarse directamente a producción.

Las diferencias iniciales y su avance son:

- **Resuelto en bloque 1:** LocalProvider confirma después de escribir, distingue estado confirmado
  de intento pendiente y reconoce operaciones repetidas.
- Los eventos actuales solo conservan ID, hábito, cantidad, fecha y edición. Faltan asociación
  a cita de protector, metadatos de verificación de agua y revisiones para deshacer con seguridad.
- **Resuelto en bloque 2:** el historial completo usa una ruta secundaria; Inicio conserva una
  vista breve del día. Análisis todavía conserva el gráfico propio por períodos y no la colección
  mensual con el panel de ciclo del nuevo diseño.
- **Resuelto en bloque 2:** las subpantallas ocultan la barra inferior, conservan el origen y
  protegen el botón Atrás durante edición o guardado.
- No están instalados los adaptadores de captura y avisos. Una fotografía de fixture o un booleano
  de Storybook no acredita una captura real ni un permiso del sistema.

## 3. Decisiones necesarias y trabajo que puede empezar

Se puede comenzar con persistencia, navegación, Registros, Inicio y contenido público. Antes de
activar los siguientes comportamientos hay que cerrar estas decisiones concretas:

1. **Protector · cerrado para esta prueba el 8 de noviembre:** el usuario eligió 60 minutos desde
   la hora programada, con cierre anterior al llegar la siguiente cita o terminar el día de planta,
   y contexto al pasar la mitad de la ventana efectiva. Los cambios de horario/meta entran al
   siguiente día operativo; no se habilitan anotaciones nuevas para una cita cerrada. La entrega
   del bloque 5 documenta el versionado, migración, primera activación y cambios de hora del reloj.
   Los 30 minutos de Figma siguen siendo un ejemplo visual, no la política de esta prueba.
2. **Colección mensual · aplicada en el bloque 6 el 9 de noviembre:** el usuario confirmó una
   planta por semana, cuatro o cinco cierres por mes. Se aplica la propuesta documentada de agrupar
   por cierre programado del ciclo y zona fija de colección, persistida como política versión 1.
   Una ausencia puede producir menos plantas; no se fabrican semanas ni se usa la fecha de regreso.
3. **Cámara:** probar en Android si se usará una previsualización propia o la captura del sistema.
   La API oficial de cámara abre una Activity separada y requiere contemplar restauración si Android
   termina la app durante ella. Por tanto, instalar el plugin no basta para reproducir la pantalla
   de captura personalizada; esto debe resolverse en una prueba técnica. [Documentación de Camera v8](https://capacitorjs.com/docs/apis/camera).
4. **Diseños complementarios:** precisar las vistas sin referencia final, como detalle de ciclo,
   resultado cerrado bajo el umbral y ciertos errores/permisos. Conservar las acciones vigentes
   de editar nombre, metas y tono hasta definir su ubicación en el Perfil actualizado.

Registrar las decisiones con su fecha y versión de política. Las pendientes no impiden componer
las pantallas con estados controlados; sí condicionan activar sus reglas en la APK final.

## 4. Bloques de implementación

### Bloque 1 · Persistencia, operaciones y reloj comunes

**Implementado el 8 de noviembre de 2026.** La nueva navegación y Registros se abordan en el bloque 2.

**Primero:** establecer un único estado confirmado para Inicio, Registros, Análisis y Perfil.

- Encapsular el almacenamiento actual en un repositorio local. Mantener localStorage inicialmente
  si cubre las pruebas; no introducir otra base de datos solo para cambiar pantallas.
- Separar lectura ausente, lectura correcta y error. Un fallo de lectura no debe redirigir al
  onboarding y permitir sobrescribir los datos como si fuera una instalación nueva.
- Hacer que alta, edición, eliminación, deshacer y preferencias devuelvan un resultado explícito.
  Actualizar totales y mostrar éxito después de confirmar la escritura. Conservar por separado
  un intento fallido; no prometer recuperarlo tras cerrar el proceso si solo existe en memoria.
- Serializar las mutaciones y usar ID estable de operación, ID de evento y revisión. Un reintento
  ya confirmado devuelve el resultado original; uno pendiente revalida el plazo y no crea otro evento.
- Implementar Deshacer como operación inversa sobre el evento afectado. No restaurar un snapshot
  completo de la lista: borraría registros o cambios posteriores de otros hábitos.
- Versionar los datos y preparar migración desde honeyflower.local.v1. Conservar fechas, cantidades,
  preferencias, metas históricas, especies y ciclos. Los registros antiguos de protector sin cita
  necesitan tratamiento legado explícito; no asignarles ventanas retrospectivamente ni invalidarlos.
- Compartir el reloj, día operativo, cierre de ciclo y selectores. Recalcular al volver a la app
  y antes de confirmar operaciones. Mantener ventanas de 24 h desde la activación, no medianoche.
- Adaptar también la entrada y el final del onboarding: esperar el resultado de iniciar/actualizar
  el perfil antes de navegar y recuperar el perfil existente sin activar otro ciclo.

**Cierre:** actualizar desde la versión anterior conserva los datos; fallar al leer/escribir muestra
recuperación; repetir una acción no duplica; un día que se cierra no acepta una corrección nueva.

### Bloque 2 · Navegación y Registros como primera entrega funcional

**Implementado el 8 de noviembre de 2026.** [Entrega y comprobaciones](fase-3-bloque-2-registros.md).
Las rutas de agua/protector conservan un registro manual funcional hasta sus bloques específicos.

- Mantener /inicio, /analisis y /perfil, con /jardin como redirección compatible.
- Añadir /perfil/registros, /inicio/agua y /inicio/protector. Los distintos estados de un intento
  se controlan dentro de su flujo; no se crea una ruta por cada variante de Figma.
- Separar el layout de las tres pestañas de las subpantallas con Volver y los flujos de cámara.
  Mostrar u ocultar la barra inferior según el mockup, sin introducir una cuarta pestaña.
- Conservar el origen al abrir Registros desde Inicio o Perfil. Volver recupera la vista anterior,
  su selección y su desplazamiento; una entrada directa tiene un destino seguro definido.
- Extraer el historial de HomeScreen y componerlo con RecordFilters, RecordDayNavigator, RecordItem,
  RecordEditor, RecordDelete, RecordFeedback y AsyncContentState.
- Conectar filtros y días a datos reales. Una sola fila de acciones abierta; gesto u Opciones;
  editar solo agua; eliminar con confirmación; cancelar sin modificar; guardar y deshacer con el
  protocolo del bloque 1. Mantener los días cerrados en consulta.
- Gestionar foco, teclado numérico y zona inferior visible para Guardar/Cancelar. El teclado
  dibujado de Figma no se incorpora como imagen de interfaz.

**Cierre:** los ejemplos 1,250 → 1,400 mL y 1,250 → 1,000 → 1,250 se reproducen con eventos
reales de prueba, se conservan al reabrir y se reflejan en todas las pantallas.

### Bloque 3 · Inicio y estados de la planta

**Implementado el 8 de noviembre de 2026.** [Entrega y comprobaciones](fase-3-bloque-3-inicio.md).
El disparador diario de fotografía queda activo con el adaptador real del bloque 4. La entrada
manual de prueba sigue disponible cuando no hay requisito de foto; el repositorio impide eludirlo.

- Reutilizar PlantCharacter, CalendarDay, HabitSummary, StreakBadge y Button para componer los
  mockups de Brote/Cactus con datos del ciclo activo. Compartir el estado de cuidado entre cuerpo
  y rostro; no cambiar únicamente la etiqueta mientras la ilustración sigue saludable.
- Ajuste aprobado después de la vista previa: Inicio conserva +250 mL y protector. Se retiran
  las secciones adicionales y queda solo «Ver todos los registros» en morado subrayado bajo la
  planta, sin botón ni tarjeta. Las operaciones siguen usando el mismo servicio de registro.
  Los eventos conservan el volumen real; las barras se limitan al 100 %.
- Separar selección de día y día actual: consultar un día cerrado no habilita sus botones de alta.
- Aplicar las reglas existentes de salud por días cerrados: saludable desde 80 %, descuidada desde
  40 % y marchita por debajo; sin días cerrados, saludable. El día abierto cambia progreso y mensajes,
  no la clasificación de cuidado antes de su cierre.
- Resolver el requisito de fotografía al intentar registrar agua: un cierre diario con agua bajo
  100 % lo puede originar; no dos citas vencidas ni el umbral semanal del 80 %. La solicitud no
  enciende la cámara automáticamente ni afecta a la edición del historial o al protector.

**Cierre:** seis combinaciones de personaje correctas, calendario coherente, cierre diario/semanal
sin reinicios y retorno tras ausencia sin crear ciclos ficticios. El flujo de foto se activa cuando
su adaptador del bloque 4 está disponible; no se sustituye por una simulación dentro de la app.

### Bloque 4 · Agua: captura y confirmación integrada

**Implementado el 8 de noviembre de 2026.** [Entrega y comprobaciones](fase-3-bloque-4-agua.md).
Android usa su cámara del sistema y recupera la captura si su proceso se cierra; web usa video y
canvas. El resultado predeterminado es revisión personal tras una foto real: el detector automático
permanece pendiente, sin fabricar aprobaciones. Se conserva el Inicio simplificado aprobado.

- Crear un controlador de intento que conserve cantidad, día y origen, sin crear todavía un evento.
  Estados: captura, procesamiento, rechazo/reintento, revisión tras resultado incierto, confirmación,
  guardado, error y salida. Mantener identificador estable hasta completar o descartar el intento.
- Conectar un adaptador real de captura. Usar la imagen capturada en el slot de CameraPhoto;
  nunca su imagen predeterminada de Storybook ni una foto de galería como sustituto de la captura requerida.
- Resolver permisos/capacidad desde el adaptador elegido. Antes de una captura completada, cancelar,
  denegar o fallar solo permite reintentar o salir sin registrar. Volver/Atrás abre la confirmación
  de descarte de P-C03; continuar conserva el borrador y salir descarta solo ese intento.
- Componer P-C05 con fotografía, mensaje/sello/badge de detección y RegistrationConfirmation en
  una misma vista. No añadir el paso obligatorio «Revisar registro» del resultado histórico P-C04.
- Integrar el análisis orientativo previsto cuando exista modelo/adaptador verificable. Ante
  resultado incierto o error posterior a una captura real, ofrecer revisión personal identificada;
  no fabricar una detección positiva. La cantidad procede de la persona, no de una estimación visual.
- Guardar una sola vez tras la confirmación personal. En error, conservar cantidad y operación;
  reintentar la misma. Revalidar día/plazo antes del alta y resolver la solicitud pendiente según
  la política acordada. Si ya no es válido, conservar los datos confirmados y explicar el cierre.
- Conservar solo los metadatos necesarios de verificación. La imagen es temporal: sin galería,
  envío ni persistencia en el estado local; liberar los recursos al finalizar o descartar. Probar
  segundo plano, rotación, retorno de la cámara y terminación/restauración del proceso.

**Cierre:** una captura real llega a confirmación; permiso denegado no permite saltársela; confirmar
añade un evento, repetir no lo duplica y cancelar no cambia progreso. El sello de aprobación solo
se muestra para el resultado que representa, nunca como prueba de consumo.

### Bloque 5 · Protector por ventanas horarias

**Implementado el 8 de noviembre de 2026.** [Entrega y comprobaciones](fase-3-bloque-5-protector.md).
Política local v1: 60 minutos, recorte por siguiente cita/fin de día y contexto a mitad. Se usan
confirmación personal, asociación única a cita y revalidación del plazo al guardar/reintentar.
Los avisos del teléfono siguen pendientes; el selector de ventanas accionables excluye las
registradas, cerradas o sin necesidad de más altas.

- Implementar el motor con la política cerrada en el apartado 3, separando hora programada,
  inicio del contexto y cierre. Versionar la agenda por día operativo y conservar su relación con
  la meta de una inicial más N reaplicaciones.
- Asociar cada alta a una cita elegible y admitir como máximo un evento activo por cita.
  Revalidar día, ventana y duplicados al confirmar y reintentar, no solo al abrir la pantalla.
- Componer los cuatro mockups con SunscreenWindowCard, SunscreenScheduleAgenda y Button.
  El acceso ordinario conserva confirmación personal; el contexto aparece por acción de la persona,
  sin cámara ni navegación forzada al recibir un aviso.
- Al cerrar una cita, impedir recuperarla mediante otra aplicación posterior. «Sin ventanas
  abiertas» no implica meta cumplida. Eliminar o deshacer un alta no reabre una cita cerrada;
  deshacer una eliminación restaura el mismo evento válido, sin fabricar otro.
- Recalcular inicial/reaplicación desde los eventos restantes por fecha ascendente y desempate
  estable, y retirar/reprogramar sus avisos
  cuando corresponda. Definir la vigencia de cambios de horarios sin reescribir el pasado.

**Cierre:** probar una inicial sin reaplicaciones, agendas variables, antes de apertura, disponible,
contexto, registrada y cerrada, incluyendo cierre
durante confirmación, cambio de día, cambio de horario y reintentos. La política para esta prueba
queda definida arriba; los 30 minutos ilustrativos no se incorporan como plazo normativo.

### Bloque 6 · Análisis: colección mensual y progreso real

**Implementado el 9 de noviembre de 2026.** [Entrega, política y comprobaciones](fase-3-bloque-6-analisis.md).
El patio original se reutiliza sin personajes incorporados. La instalación nueva empieza vacía;
las plantas se dibujan aparte y únicamente representan ciclos cerrados.

- Sustituir el gráfico propio por CycleProgressPanel y sus selectores de datos. Mantener jardín
  y progreso en la misma pestaña; los enlaces desplazan la vista, no abren otra pestaña principal.
- Separar mes/colección del ciclo seleccionado y conservarlos al volver. Limitar navegación al
  período disponible y al mes actual; incluir flechas como alternativa al gesto horizontal.
- Agrupar por la política de mes/zona que se confirme. Derivar plantas únicamente de ciclos
  cerrados; los resultados locales se identifican como locales, sin atribuir confirmación del servidor.
- Reutilizar el fondo y anclajes de Figma con IDs estables por ciclo. Separar orden cronológico
  de la lista y posición espacial. Cubrir 0/1/2/4/5 y desbordamiento en lista sin descartar entradas.
  No copiar fechas, nombres o las cinco plantas fijas del showcase como datos de una instalación nueva.
- Mantener Marchitas como archivo separado; no llenar el patio de Vivas con plantas marchitas
  sustituyendo sus sprites, como permite hacer una demostración de componentes.
- Usar la meta histórica de cada día y limitar cada contribución diaria al 100 % antes de promediar
  sobre siete días. Los totales brutos no compensan días vacíos ni sustituyen esa fórmula cuando
  hay excedentes o cambios de meta. Ajustar ayudas/etiquetas para que los porcentajes sean veraces.
- Mostrar futuros como pendientes y separar día actual parcial de días cerrados. Carga/error no
  equivalen a colección vacía ni permiten inventar métricas en cero. No recrear los selectores
  Semanal/Mensual/Todo de la versión anterior si contradicen la composición nueva.
- Vincular la selección de una planta al ciclo correcto. Reutilizar el panel para su progreso;
  cualquier detalle adicional sin mockup final se cierra como decisión de composición.

**Cierre:** reproducir 88.1 % cerrado y 34.5 % en curso con datos controlados; probar metas variables,
excedentes, límite de mes/zona, cero plantas, retorno al mes previo y ausencia prolongada.

### Bloque 7 · Perfil, preferencias, fuentes y privacidad

**Implementado:** [entrega y comprobaciones](fase-3-bloque-7-perfil.md). Horarios efectivos al siguiente
día de planta; apagado inmediato tras guardar; máximo compartido de 1–24 por día de planta. Android
confirma el guardado nativo antes de publicar cambios. El pulso físico queda para la revisión móvil.

- Adaptar Perfil con nombre, especie y estadísticas reales. Conectar Ver mis registros y los
  ajustes; conservar las ediciones vigentes mientras se resuelve su ubicación en el diseño objetivo.
- Añadir /perfil/notificaciones y subpantallas de calma, horarios y máximo. Compartir validación
  con onboarding y mantener metas históricas. Acordar la vigencia de horarios; apagar avisos es
  inmediato y no altera hábitos, metas ni registros.
- Separar intención de recibir avisos, autorización del sistema y capacidad del dispositivo.
  Sonido y linterna conservan preferencias independientes; ocultar ajustes al apagar avisos no
  debe confundir la intención guardada con su estado efectivo.
- Validar calma cruzando medianoche y bloquear guardar cuando todas las citas quedan cubiertas.
  El máximo de seis avisos de los mockups es un ejemplo, no un nuevo límite normativo.
- Integrar avisos locales mediante un adaptador comprobado. En Android 13+ hay que consultar y
  solicitar autorización; la puntualidad y las alarmas exactas tienen restricciones adicionales.
  No prometerlas ni pedir accesos extra solo para reproducir el prototipo. [Local Notifications v8](https://capacitorjs.com/docs/apis/local-notifications).
- Reprogramar/cancelar avisos tras cambios de preferencias y eventos, respetando calma, máximo
  compartido y sistema/No molestar. La linterna requiere aceptación, compatibilidad y app visible.
  Abrir un aviso no registra el hábito ni concede un permiso.
- Mientras una capacidad no esté activa, conservar el mensaje del Perfil local que lo explica.
  Guardar una preferencia no debe anunciar que ya se están enviando notificaciones.
- Crear /fuentes y /privacidad fuera de la guarda que exige perfil local: también se abren desde
  onboarding/registro. Volver y Entendido regresan al origen. Reutilizar contenido, tarjetas y enlaces
  de los mockups; mantener privacyLegalReady en false y el aviso como borrador informativo.

**Cierre:** guardar/cancelar/reabrir preferencias; cuatro combinaciones de señales; permiso denegado
y continuación; calma incompatible; enlaces de contenido antes y después de crear el perfil.

### Bloque 8 · Verificación integrada y nueva APK

**Entregado:** [APK 0.3.0 y comprobaciones](fase-3-bloque-8-apk.md). Se añade el acceso temporal
de cámara solicitado y la [guía para conexiones futuras](conexiones-futuras.md). Navegador y
emulador comprobados; la aceptación física y TalkBack se verifican con el teléfono del usuario.

- Retirar los controladores duplicados de las pantallas antiguas cuando sus sustitutos estén
  aceptados. Las historias de pantallas deben renderizar las composiciones reales mediante
  adaptadores de prueba; no mantener dos versiones visuales que evolucionen por separado.
- Ejecutar check, pruebas de modelo/operaciones/rutas, las 306 historias existentes ampliadas
  con los nuevos casos, compilación de app y compilación de Storybook.
- Comparar con Figma a 402 × 874 y comprobar 320/360/480, textos largos, lector de pantalla,
  foco, movimiento reducido y teclado real. Probar Atrás, segundo plano, permisos, cierre forzado,
  reinicio y actualización de la APK previa conservando los datos.
- Probar una sesión completa: saltar onboarding → Inicio → registrar → corregir/deshacer →
  Análisis → preferencias → cerrar/reabrir. Instalar desde cero debe empezar sin eventos ni plantas ganadas.
- Usar el flujo apk:build existente con una versión de prueba coherente entre Android, documentación
  y nombre del artefacto. Verificar firma y SHA-256; entregar enlace/archivo de descarga y notas
  de funciones activas. Mantener com.honeyflower.app y comprobar la actualización con la firma existente.

**Cierre:** APK instalable en teléfono, datos conservados tras actualización/reinicio, recorridos
aceptados y capacidades reales claramente indicadas. Una compilación web correcta no sustituye esta prueba.

## 5. Organización propuesta del código

Se conserva el stack y el repositorio. `features/local` y `shared/data` ya contienen la base del
bloque 1; los módulos restantes son destinos propuestos:

- features/local: LocalProvider y modelo durante la transición; un único estado confirmado.
- shared/data: repositorio, lectura/migración y ejecución de operaciones.
- shared/native: captura, análisis de imagen y avisos, cada uno con un adaptador real y otro de prueba.
- features/records: lista, edición y control de operación pendiente.
- features/water y features/sunscreen: intentos de registro y estados de cada flujo.
- features/analysis: selectores de ciclo/colección y escena mensual.
- features/preferences y features/content: formularios y páginas públicas reutilizables.
- shared/components: biblioteca existente; solo ampliar contratos cuando los datos reales lo exijan.
- stories: fixtures deterministas para esos mismos controladores/vistas, sin persistencia real ni hardware.

La navegación coordina pantalla y origen; los controladores coordinan intentos; el modelo determina
reglas; el repositorio confirma operaciones. Las tarjetas, campos y personajes reciben datos y callbacks.
No se introduce un store global adicional ni otra biblioteca visual por defecto.

## 6. Primera entrega recomendada y dependencias

La primera entrega revisable debe ser **persistencia/migración + Registros conectado desde Inicio y
Perfil**, con guardar, cancelar, eliminar, deshacer, error y reintento reales. Aporta valor inmediato
y establece el contrato que necesitan las confirmaciones de agua y protector.

Después: Inicio → agua/captura y protector → Análisis → Perfil/preferencias → validación móvil y APK.
La prueba técnica de cámara y las decisiones de ventanas/mes deben iniciarse al principio para
resolverlas antes de sus bloques. Los componentes visuales ya disponibles no eliminan esas dependencias.

Los cambios se revisan por bloque; la APK final integra solo recorridos comprobados. No se fija una
fecha con las estimaciones históricas de octubre: el esfuerzo de captura y avisos se concreta con la
prueba técnica, y el de protector con su política acordada. Este plan permite comenzar el trabajo
independiente sin inventar los parámetros pendientes.

La [correcci�n 0.3.3](patch-0.3.3-inicio.md) inicia la revisi�n de UX por pantalla con Inicio.
