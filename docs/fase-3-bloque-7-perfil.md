# Fase 3 · Bloque 7: Perfil, preferencias y avisos locales

Implementado el **9 de noviembre de 2026**, sin backend ni cuentas. Se conserva el acceso de
prueba mediante «Ya tengo cuenta» y el jardín sin enlace inferior de retorno solicitado por el usuario.

## Pantallas y navegación

`ProfileScreen` usa nombre, especie, cuidado, mejor racha y plantas reales del estado confirmado.
La composición sigue el [Perfil de Figma](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=347-7390):
identidad sin caja, personaje original, tres estadísticas y cuatro destinos principales. Las ediciones
de nombre, metas, horarios y tono permanecen disponibles bajo «Más opciones».

`features/preferences` conecta `/perfil/notificaciones` con `/calma`, `/horarios`, `/limite` y
`/permiso`. Las subpantallas tienen Atrás, foco y pie de guardado; ocultan la navegación inferior.
Se contrastaron también los mockups de notificaciones `347:7494`, permiso denegado `347:7624`,
máximo `347:7982`, calma `347:8037`, error `347:8103`, permiso `347:8191`, guardado `347:8245`
y horarios `347:8396`. Los controles de organización amplían la referencia para conservar la
edición real de varias franjas y citas que ya permite la prueba.

`/fuentes` y `/privacidad` son públicas, incluso antes de crear un perfil o ante un error al leerlo.
Se abren desde Perfil y onboarding y regresan al origen conservando el borrador. Reutilizan las
tarjetas de `347:8288` y `347:8346`, enlaces oficiales de CDC/AAD y las reglas locales del juego.
Privacidad describe la prueba actual, la foto temporal y la ausencia de sincronización; mantiene
`privacyLegalReady = false` y el aviso de borrador. No se presenta como aviso legal definitivo.

## Preferencias confirmadas

- Guardar confirma una operación del repositorio; cancelar conserva la versión anterior. Un error
  permite recuperar el intento sin sustituir datos confirmados.
- El máximo acepta enteros de **1 a 24**, compartidos entre ambos hábitos por **día de planta**.
  Seis es el ejemplo visual y valor inicial, no un límite nuevo.
- Calma permite hasta cuatro franjas, también cruzando medianoche. La validación compartida con
  onboarding impide guardar franjas inválidas, solapadas o que cubran todas las citas con avisos activos.
- Agua y protector conservan sus horarios históricos; los cambios comienzan el siguiente día de
  planta. La agenda versionada de agua se añade a perfiles anteriores sin inventar horarios pasados.
- Apagar avisos es efectivo al confirmar y conserva las selecciones independientes de sonido y
  linterna. No cambia registros, metas, salud, colección ni resultados cerrados.

## Avisos reales en Android

`ReminderProvider` y `ReminderCoordinator` separan intención, permiso y capacidad. Consultar el
permiso no lo solicita. Solo «Continuar» en la explicación de permiso abre la petición de Android.
El navegador permite guardar ajustes y explica que no programa avisos ni usa la linterna.

Se incorpora `@capacitor/local-notifications` 8.3.1 para el permiso. El adaptador nativo
`GuardedRemindersPlugin` agenda alarmas **inexactas** y `ReminderReceiver` publica los avisos.
No se solicita `SCHEDULE_EXACT_ALARM`, ni acceso especial a alarmas exactas o a No molestar.
La puntualidad final depende de Android y de sus restricciones de energía.

La agenda incluye solo los días del ciclo existente. No crea ciclos ni plantas en segundo plano.
Agua avisa a su hora y deja de avisar al completar la meta; protector usa apertura y mitad de su
ventana vigente de 60 minutos, acortada por la siguiente cita o el cierre del día. Registrar la cita
cancela sus avisos restantes. La intensidad depende de citas anteriores sin registro y se reinicia
por hábito y día; llegar a mitad de una ventana no fuerza el nivel reforzado.

Las reservas persistentes evitan reutilizar el presupuesto al reabrir o cambiar horarios. El receptor
comprueba otra vez calma, vencimiento, permiso, duplicados y máximo real compartido al entregar:
una alarma retrasada no puede mostrar una cita cerrada o interrumpir una franja de calma. Tras reiniciar
el equipo o actualizar la aplicación se recuperan solo alarmas futuras. Un fallo de agenda muestra
reintento y conserva el perfil; no se anuncia éxito de notificaciones al guardar una preferencia.

Los avisos ordinarios usan un canal silencioso. Solo un aviso reforzado con la opción de sonido
activada usa el canal con sonido, sujeto a los ajustes de Android y No molestar. Abrir un aviso
lleva a Agua o Protector; no registra un hábito ni concede un permiso.

La linterna exige aceptación explícita, compatibilidad, permiso propio y aviso reforzado. Solo
puede emitir un pulso de hasta 200 ms con la app visible y enfocada, sin movimiento reducido ni
No molestar. Se apaga al salir, pausar o cerrar; si falla, el recordatorio sigue visible. La opción
guardada y su disponibilidad efectiva se muestran por separado.

Referencias técnicas: [Local Notifications v8](https://capacitorjs.com/docs/apis/local-notifications)
y [CameraManager](https://developer.android.com/reference/android/hardware/camera2/CameraManager).

## Guardado durable y migración

La prueba de cierre forzado detectó que una confirmación de `localStorage` en WebView podía
preceder a su escritura en disco. Android ahora guarda el perfil v2, la agenda y el intento de agua
mediante `SharedPreferences.commit()` privado antes de confirmar. `durableStorage` mantiene el
contrato del repositorio y una copia compatible en WebView; el navegador conserva su adaptador anterior.

La primera lectura migra únicamente datos válidos del almacenamiento previo y conserva eventos,
metas, verificaciones y recibos. Un perfil dañado sigue siendo un error recuperable, sin reemplazo
por datos vacíos ni por una copia antigua. Una copia WebView desactualizada no prevalece sobre el
guardado nativo. Los archivos e imágenes temporales no forman parte de este almacén.

## Comprobaciones

- `npm run check`, ocho pruebas de onboarding y **132 pruebas de lógica local**: 31 nuevas de
  calma, agenda, máximos, escalada, cancelación, migración, guardado durable y recuperación.
- **411 historias en 78 archivos**, con interacciones y accesibilidad automática. Las 26 nuevas
  de **Pantallas / Perfil y preferencias conectados** usan las rutas reales y puertos aislados:
  cuatro combinaciones de señales, cancelar/guardar, permiso denegado, linterna con aceptación,
  avisos sin alta automática, errores/reintentos, web sin soporte y contenido público con retorno.
- Navegador a 320/360/402/480: recursos cargados, composición, enlaces, validaciones, cambios
  persistidos, vigencia mañana y ausencia de desbordamiento o errores de página. A 402 px se
  verificaron identidad de 112 px, estadísticas en y=200 y primer enlace en y=304.
- Pixel_7: actualización conservando registros y recibos, permiso real denegado/autorizado,
  registro sin permiso, 42 alarmas futuras de prueba, opciones independientes, apagado con agenda
  vacía y cierre forzado/reapertura conservando datos y preferencias. Se restaura el perfil previo.
- Instrumentación sobre el receptor real y el servicio de notificaciones de Android: calma en
  zona con desfase, vencimiento, apagado, publicación efectiva, duplicados y máximo compartido.
- Compilaciones web, Storybook y Android debug con su APK de pruebas. Se conserva la advertencia
  previa de tamaño del paquete; no se reemplaza todavía la APK distribuida.

Evidencias locales excluidas del repositorio: `.qa/phase7-browser.json`, `.qa/phase7-native.json`,
`.qa/phase7-native-policy.txt`, capturas y registros de comprobación. La denegación del permiso de
linterna y su estado inactivo se probaron en emulador; el pulso físico, TalkBack y la revisión integral
en teléfono pertenecen al **bloque 8**, junto con la nueva APK descargable. Registro e inicio de
sesión con cuenta permanecen después de los recorridos locales.
