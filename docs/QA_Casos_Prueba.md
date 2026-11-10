# Matriz de Casos de Prueba - Honey Flower (HF-S02-QA01)

Documento oficial de control de calidad y casos de prueba funcionales para el proyecto *Honey Flower* . Centralizado y sincronizado en el espacio de trabajo del equipo en ClickUp.

---

## Módulo 1: Navegación e Interfaz Base

### Caso 1: Verificar navegación fluida entre pestañas
* **Test Type:** Test Case
* **Prioridad:** Media
* **Descripción:** Validar que la interfaz permite la navegación fluida y sin interrupciones entre las distintas vistas principales de la aplicación.
* **Expected Result:** Las tres pestañas son accesibles de forma fluida sin bloqueos.
* **Checklist (Pasos):**
  * [ ] 1. Abrir la aplicación.
  * [ ] 2. Pulsar secuencialmente la pestaña 1, la pestaña 2 y la pestaña 3.

---

## Módulo 2: Hábito de Agua

### Caso 2: Comprobar suma correcta de acciones rápidas en agua
* **Test Type:** Test Case
* **Prioridad:** Alta
* **Descripción:** Verificar que los botones de incremento rápido de mililitros suman de forma correcta y acumulativa en el contador general.
* **Expected Result:** El contador total acumula los valores exactos (ej. 750 mL).
* **Checklist (Pasos):**
  * [ ] 1. Entrar al módulo o hábito de agua.
  * [ ] 2. Pulsar el botón de +250 mL.
  * [ ] 3. Pulsar el botón de +500 mL y verificar la suma total.

### Caso 3: Rechazar entradas inválidas de agua
* **Test Type:** Test Case
* **Prioridad:** Media
* **Descripción:** Asegurar que el sistema no permita ingresar cantidades en cero o negativas en el registro de agua, conservando la unidad correcta.
* **Expected Result:** El sistema rechaza la entrada, muestra una validación y conserva la unidad en mL.
* **Checklist (Pasos):**
  * [ ] 1. Intentar ingresar un valor de 0 en el campo de agua.
  * [ ] 2. Intentar ingresar un valor negativo (ej. -100) y comprobar la respuesta del sistema.

### Caso 6: Antiduplicidad por doble toque rápido en agua
* **Test Type:** Test Case
* **Prioridad:** Alta
* **Descripción:** Comprobar que un doble toque accidental muy rápido sobre los botones de incremento no duplica indebidamente la operación de registro.
* **Expected Result:** El sistema registra la operación una sola vez e ignora el segundo toque inmediato.
* **Checklist (Pasos):**
  * [ ] 1. Ubicarse en el módulo de agua.
  * [ ] 2. Presionar dos veces de forma extremadamente rápida el botón de +250 mL.
  * [ ] 3. Verificar que el contador solo aumentó una sola vez los 250 mL.

---

## Módulo 3: Hábito de Protector Solar y Progreso

### Caso 4: Cambio de estado del protector solar (meta 1+N)
* **Test Type:** Test Case
* **Prioridad:** Alta
* **Descripción:** Comprobar que al registrar la aplicación inicial y cumplirse la condición de la meta ($1+N$), la interfaz actualiza dinámicamente el botón.
* **Expected Result:** El botón contextual cambia visualmente al estado de 'Reaplicación'.
* **Checklist (Pasos):**
  * [ ] 1. Registrar la aplicación inicial de protector solar.
  * [ ] 2. Cumplir con la condición establecida para la meta ($1+N$).
  * [ ] 3. Visualizar el cambio de texto/estado en el botón correspondiente.

### Caso 5: Tope de porcentaje al 100% en protector solar
* **Test Type:** Test Case
* **Prioridad:** Baja
* **Descripción:** Validar que el indicador gráfico y numérico de progreso no rebase el límite establecido aunque se registren eventos adicionales.
* **Expected Result:** El indicador de progreso se mantiene estático en el 100%.
* **Checklist (Pasos):**
  * [ ] 1. Llevar el indicador de protector solar al 100% de la meta.
  * [ ] 2. Intentar registrar un evento extra o aplicación adicional.
  * [ ] 3. Comprobar que el porcentaje no sobrepasa el límite máximo del 100%.

---

## Módulo 4: Citas y Ciclo Operativo

### Caso 7: Gestión de citas de hábitos (0-1 vs 2 citas)
* **Test Type:** Test Case
* **Prioridad:** Media
* **Descripción:** Evaluar el comportamiento del sistema ante diferentes escenarios de citas vencidas (0, 1 o 2 citas) y verificar la alternativa de registro manual.
* **Expected Result:** El sistema diferencia los escenarios y permite una alternativa manual sin bloquear al usuario.
* **Checklist (Pasos):**
  * [ ] 1. Simular un estado de 0 y 1 cita vencida.
  * [ ] 2. Simular un escenario con 2 citas vencidas.
  * [ ] 3. Comprobar la activación de la alternativa de registro manual.

### Caso 8: Validación de día operativo y límites de corrección
* **Test Type:** Test Case
* **Prioridad:** Alta
* **Descripción:** Validar los permisos de modificación según el estado del día operativo (en curso frente a día cerrado).
* **Expected Result:** El día en curso permite correcciones libres; el día cerrado aplica las restricciones de límites correspondientes.
* **Checklist (Pasos):**
  * [ ] 1. Verificar la edición de registros con el día operativo en curso.
  * [ ] 2. Simular el cierre del día operativo y reintentar modificar datos pasados.
  * [ ] 3. Comprobar que se respetan los límites de corrección establecidos.
