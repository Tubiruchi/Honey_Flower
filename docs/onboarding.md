# Onboarding · primera implementación

Implementado desde los mockups originales de [Figma](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=82-677).
El nodo enlazado es la guía; las pantallas reales son sus hermanas en la página Mockups.

## Pantallas y rutas

- P-O01 · Bienvenida · `86:683` · `/onboarding/bienvenida`.
- P-O02 · Los dos hábitos · `86:788` · `/onboarding/habitos`.
- P-O03 · Nombre · `86:892` · `/onboarding/nombre`.
- P-O04 · Agua · `86:998` · `/onboarding/agua`.
- P-O05 · Protector · `86:1101` · `/onboarding/protector`.
- P-O06 · Horarios · `86:1204` · `/onboarding/horarios`.
- P-O07 · Calma y avisos · `86:1360` · `/onboarding/avisos`.
- P-O08 · Resumen · `86:1550` · `/onboarding/resumen`.

`/` inicia en bienvenida o recupera el paso guardado. El onboarding no muestra las pestañas
de la demostración. Atrás usa rutas normales; el botón superior vuelve al paso anterior.
Desde Resumen se puede editar nombre, ambas metas, horarios y avisos y volver al resumen.

Los mockups 09–10 corresponden a activación **posterior a autenticar**. No se activa una planta
al terminar este recorrido. «Crear cuenta y empezar» y «Ya tengo cuenta» abren límites explícitos
de cuenta, con aviso de disponibilidad y acceso voluntario a la demostración. El registro,
inicio de sesión, recuperación y activación real requieren una entrega posterior.

## Implementación

`OnboardingFlow` controla el recorrido y emite preferencias validadas a `onCreateAccount`.
`OnboardingRoute` lo conecta con React Router; `OnboardingContent` compone cada pantalla.
`model.ts` contiene el borrador, su recuperación y las validaciones independientes de React.

Se reutilizan Button, Input, SettingRow y AlertLevel; Input admite icono inicial y SettingRow
los recursos de interruptor originales. InfoCard, Feedback, OnboardingProgress, Stepper y TimeRow
son piezas compartidas nuevas. App y Storybook consumen los mismos componentes y tokens.

Los SVG originales están en `src/assets/figma/onboarding`, con referencias locales en `index.ts`.
Se conserva su geometría original: planta de encabezado 112 × 91, planta pequeña 80 × 65,
iconos 24 × 24 e interruptores 48 × 48. No se usa una captura como fondo ni se redibuja la planta.
El recurso de estado del sistema es solo referencia visual en Storybook. La app usa los insets
del entorno mediante CSS; su verificación con Capacitor/Android real sigue pendiente.

El contenido largo tiene scroll propio y la acción principal queda visible. TimeRow presenta
HH:mm al descansar y usa el editor nativo al enfocar. El navegador puede usar su formato local
dentro del editor. Los campos conservan etiquetas, foco, estados deshabilitados y errores.

## Borrador y validación

El borrador se guarda por cambio y paso en `localStorage`, clave `honeyflower.onboarding.v1`.
Incluye solo el nombre preferido y la configuración. No contiene credenciales, sesión, cuenta,
planta, ciclo ni eventos de hábitos. Tiene versión y validación estructural al leerlo; datos
corruptos o de una versión desconocida se ignoran. No hay sincronización remota ni cifrado propio.
Si falla el almacenamiento se informa y el formulario sigue en memoria. La transición al límite
de registro conserva también las preferencias en el historial de navegación para poder volver.

Límites técnicos iniciales de formulario, **no recomendaciones sanitarias**:

- Nombre: 1–60 caracteres, sin exigir nombre completo.
- Agua: entero entre 250 y 10,000 mL; botones ±250 y entrada directa.
- Protector: una aplicación inicial y 0–12 reaplicaciones, con un horario por aplicación.
- Agua: 1–12 horarios, sin duplicados dentro del mismo hábito.
- Avisos: máximo configurable de 1–24; apagar avisos anula sonido y linterna en las preferencias entregadas.
- Calma: hasta cuatro periodos, incluyendo cruce de medianoche; se rechazan periodos vacíos o superpuestos.

Los valores iniciales de metas y horarios reproducen el ejemplo de Figma. La persona elige su
configuración. Añadir citas, editarlas, quitarlas, cambiar reaplicaciones, editar calma y tono
son interacciones locales; no programan avisos, solicitan permisos ni activan hardware.

«Consultar fuentes» abre referencias primarias verificadas de
[EFSA (2010)](https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2010.1459) y
[OMS (2022)](https://www.who.int/news-room/fact-sheets/detail/ultraviolet-radiation).
La pantalla no publica estadísticas clínicas ni calcula necesidades individuales.

## Verificación

```sh
npm run check
npm test
npm run build
npm run build-storybook
```

Storybook contiene ocho vistas y pruebas de recorrido completo, nombre vacío, horarios
duplicados, edición desde resumen, almacenamiento no disponible y acceso a cuenta existente.
Las pruebas de modelo cubren recuperación/corrupción, límites, cero reaplicaciones, horarios,
calma que cruza medianoche y señales desactivadas. La revisión de navegador comprueba las ocho
pantallas, recursos con dimensiones originales, recuperación tras recargar y ausencia de
desbordamiento horizontal en los cuatro anchos móviles. Permisos, TalkBack y APK quedan pendientes.
