# Parche 0.4.2 · acceso y recuperación de cuenta

Fecha: **10 de noviembre de 2026**.

## Diagnóstico real

La cuenta de prueba está confirmada y no está bloqueada. El acceso por contraseña se comprobó
contra Supabase tanto desde el SDK como desde el formulario real de HoneyFlower. En una cuenta
antigua sin perfil local, el acceso abre la configuración de hábitos porque esos datos todavía
no se sincronizan con el backend; no es un rechazo de credenciales.

La recuperación encontró dos condiciones distintas:

- El proveedor de correo incluido de Supabase alcanzó el límite compartido del proyecto y devolvió
  `over_email_send_rate_limit` (HTTP 429). Para pruebas frecuentes y producción se necesita SMTP
  propio; reintentar repetidamente antes de que venza el límite no envía otro correo.
- El retorno móvil descartaba `sb_flow_id`. Desde 0.4.2 se valida, conserva y entrega ese identificador
  a `exchangeCodeForSession`, de modo que Supabase usa el verificador PKCE del correo correcto.

No se guardan códigos, verificadores ni contraseñas en el perfil. Los errores continúan mostrando
mensajes públicos sin detalles técnicos del servicio.

## Prueba recomendada

1. Instalar 0.4.2 conservando los datos de la app.
2. Esperar a que se libere el límite de correo o configurar SMTP propio.
3. Solicitar una sola recuperación y abrir el correo más reciente en el mismo teléfono.
4. Confirmar que HoneyFlower abre «Elige una nueva contraseña» y permite volver al acceso.

La protección contra contraseñas filtradas sigue marcada como recomendación de seguridad en el
proyecto; es independiente de este fallo de entrega y debe habilitarse antes de producción.

APK verificada: `HoneyFlower-0.4.2-prueba.apk`, **22,938,995 bytes**. SHA-256:
`a48e4b1026c63b1ad5fb240d935dacaca11b197748547c0a22908ba496d52861`.
