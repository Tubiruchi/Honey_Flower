# Cuentas y futura conexión a Supabase · 0.4.0

Estado al 10 de noviembre de 2026: **autenticación conectada y comprobada** con el proyecto
`HoneyFlower` (`jkrlnelqsafkztsvnbrr`) de la conexión Noemi. El proyecto de evaluación no se usó.

Se verificó un registro real con confirmación por correo y un inicio de sesión real. La primera
confirmación completó la validación del correo; los intentos posteriores devolvieron el error
esperado de enlace de un solo uso. El retorno móvil solo abre la aplicación cuando el registro
se inicia desde la APK conectada, porque PKCE conserva el verificador en ese dispositivo.

## Qué incluye esta entrega

- Inicio de sesión por correo y contraseña, registro con confirmación, recuperación, nueva
  contraseña, reenvío con espera y cierre de la sesión de este dispositivo.
- Pantallas conectadas al contrato `features/auth/model.ts`. El adaptador real está en
  `features/auth/supabase.ts`, con `@supabase/supabase-js` fijado en **2.119.0** y lockfile.
- Restauración y actualización de sesión mediante el SDK. Flujos de correo con PKCE y retorno
  web/Android. Los errores no imprimen credenciales, claves o respuestas técnicas del servidor.
- «Ya tengo cuenta» abre el acceso. «Continuar sin cuenta» recupera la prueba local; terminar
  el onboarding ofrece crear cuenta o continuar sin cuenta. Perfil incluye el acceso a cuentas.
- Sin variables válidas, los formularios indican que las cuentas están pendientes y no envían
  solicitudes ni aceptan credenciales ficticias. Los adaptadores simulados solo viven en Storybook.
- Los hábitos siguen siendo locales. Cada `user.id` tiene su propio espacio de almacenamiento
  y conserva sus operaciones. No se importan automáticamente datos de invitados u otras cuentas.
  El cambio de cuenta invalida la agenda anterior y serializa su retirada antes de la nueva.

## Configuración activa de cuentas

1. Project URL: `https://jkrlnelqsafkztsvnbrr.supabase.co`.
2. La publishable key está en `apps/mobile/.env.local`, ignorado por Git. No se usa ninguna
   contraseña de base de datos, clave secreta ni `service_role` en el cliente.
3. Email/Password, registros y confirmación de correo están habilitados.
4. El envío real de confirmación respondió correctamente; revisar límites y configurar SMTP
   propio antes de abrir registros generales.
5. Los destinos de retorno web y Android están registrados; el aviso de privacidad aún debe
   finalizarse antes de una publicación para usuarios reales.

Copiar `apps/mobile/.env.example` a `apps/mobile/.env.local`, archivo ignorado:

```dotenv
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<clave_publica>
```

Reiniciar Vite o recompilar/sincronizar Android después de configurar estas variables. La APK
ya construida no cambia sus variables al editar el archivo. La factory rechaza claves privadas
y no usa el proyecto de evaluación como alternativa automática.

## Retornos de confirmación y recuperación

Registrar en Authentication → URL Configuration los destinos realmente utilizados:

- Desarrollo web: `http://127.0.0.1:5173/cuenta/callback` y el mismo con `?flow=recovery`.
- Si se usa `localhost`, registrar también ese origen exacto. La web desplegada requerirá su
  URL HTTPS definitiva; no inventar el dominio al configurar el proyecto.
- Android: `honeyflower://auth/callback` y `honeyflower://auth/callback?flow=recovery`.

Android ya declara el enlace de aplicación. `AuthProvider` procesa apertura en caliente y
arranque por enlace, y solo acepta los destinos conocidos. El código se intercambia una vez
con `exchangeCodeForSession`; no se aceptan tokens de un flujo implícito desde un fragmento.
El enlace PKCE debe abrirse en el dispositivo y almacenamiento desde los que se solicitó.
Los enlaces erróneos se limpian de la barra de dirección y permiten solicitar otro.

El SDK guarda la sesión en `honeyflower.auth.v1`; no guardamos la contraseña en borradores,
preferencias ni registros. No usar metadatos de nombre como autorización. Revisar almacenamiento
de tokens y requisitos de distribución al preparar la versión de producción.

## Conectar después hábitos, jardín y perfil

La autenticación no sustituye la sincronización. La siguiente fase debe acordar el contrato de
servidor antes de alterar `LocalRepository`:

- Perfiles y preferencias por `auth.users.id`, con zona horaria y revisiones explícitas.
- Registros por `(user_id, id)` conservando IDs locales, instante, tipo, cantidad, asignación
  de cita y revisión. Incluir operaciones idempotentes, eliminaciones y conflictos de edición.
- Metas y agendas versionadas, incluidos cambios `effectiveAt` del día abierto. Los días
  cerrados y asignaciones de protector no se reinterpretan según preferencias actuales.
- Colecciones derivadas de ciclos cerrados; no enviar métricas calculadas como prueba de
  cumplimiento. Las fotografías temporales siguen fuera de perfiles y registros.
- Cola sin conexión y confirmación de servidor separada de confirmación local. No marcar
  «sincronizado» hasta recibir la confirmación correspondiente.
- Importación voluntaria de datos de invitados, revisión de conflictos y destino al cerrar
  sesión. Esta versión conserva espacios separados y no decide una migración por el usuario.

Antes de exponer tablas: inspeccionar el esquema existente, habilitar RLS y limitar cada fila a
su propietario con `auth.uid()`. Revisar permisos y políticas SELECT/INSERT/UPDATE/DELETE; no
confiar solo en el rol `authenticated` ni introducir una clave privilegiada en la APK.
No se han creado tablas, migraciones ni políticas en un proyecto remoto durante esta entrega.

## Verificación y límites

Las historias de cuenta usan un proveedor de prueba explícito. La revisión en navegador también
ejercita el **SDK real** contra HTTP interceptado: alta pendiente, acceso, restauración, cambio
de contraseña, recuperación, intercambio PKCE, salida y rechazo de claves privadas. No genera
cuentas ni envía correos reales.

Queda pendiente, al elegir proyecto: comprobar cuentas reales, entrega de correo, apertura de
sus enlaces en el celular, errores de red y caducidad reales, configuración de privacidad y
políticas de datos. Los estados visuales y las pruebas locales no acreditan esos servicios.

Referencias consultadas: [contraseña y registro](https://supabase.com/docs/reference/javascript/auth-signup),
[intercambio PKCE](https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession),
[sesiones](https://supabase.com/docs/guides/auth/sessions),
[servidor de correo](https://supabase.com/docs/guides/auth/auth-smtp).
