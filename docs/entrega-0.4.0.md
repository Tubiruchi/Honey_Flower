# Entrega 0.4.0 · acceso y registro conectados

10 de noviembre de 2026. Aplicación `com.honeyflower.app`, `versionName 0.4.0-local`,
`versionCode 9`. Actualiza la APK anterior conservando firma y datos.

## Alcance

Inicio de sesión, registro, confirmación de correo, recuperación, nueva contraseña y salida
de la sesión. Formularios con validación, mostrar/ocultar contraseña, espera de reenvío,
tratamiento de fallos y avisos superiores. El aviso de privacidad se consulta sin perder la edición.

La conexión de Supabase está activa con el proyecto HoneyFlower de la cuenta Noemi. La APK mantiene
«Continuar sin cuenta» y no acepta cuentas ficticias. «Ya tengo cuenta» abre el acceso; Perfil
incluye el mismo acceso y muestra la versión instalada.

Se prepara el adaptador real del SDK, enlaces PKCE para web/Android, restauración de sesión,
almacenamiento separado por cuenta y retirada ordenada de su agenda al cambiar de usuario.
No se han creado tablas de producto. Hay una cuenta remota de prueba confirmada; hábitos y jardín
siguen guardándose localmente.
La guía [integración de Supabase](integracion-supabase.md) recoge las variables, retornos,
correo y próximos contratos de datos que necesita la persona encargada de conectar el backend.

## Comprobaciones

- **151 pruebas locales**, **8 pruebas de onboarding** y **431 historias en 79 archivos** correctas.
  Tras la última mejora de acceso sin cuenta, sus 24 historias de acceso/persistencia se repitieron
  correctamente. Lint, tipos, tokens y formato de los archivos modificados correctos.
- Compilación web y Android correctas. SDK Supabase probado contra el proyecto real: registro,
  envío de confirmación, confirmación e inicio de sesión. Ninguna contraseña persistida.
- Navegador a 320/360/402/480: formulario sin desbordamiento, privacidad, modo invitado,
  conservación de datos/recibos, errores de callback y ausencia de solicitudes accidentales.
- Emulador Android: instalación sobre 0.3.3 conservando registros y recibos; formularios,
  teclado, privacidad, continuación sin cuenta, enlace nativo y claves privadas por cuenta.
  Perfil original restaurado y comprobado después de reiniciar; emulador cerrado.
- Firma, versión y descarga por Wi-Fi comprobadas contra el archivo local.

Evidencias de desarrollo en `.qa/auth-*`. Queda pendiente repetir un registro nuevo desde la APK
en un teléfono físico para validar el retorno completo al mismo dispositivo.

## Archivo

- `artifacts/android/HoneyFlower-0.4.0-prueba.apk` · **22,938,203 bytes**.
- SHA-256: `472d3e52823e6b279419bdf5169688ca720be0b4c6d8e11684555fbf01f3e5b1`.
- `artifacts/android/HoneyFlower-0.4.0-prueba.apk.sha256`.

El servidor de descarga ofrece 0.4.0. Se conserva el binario anterior 0.3.3 como referencia.
No desinstalar la app antes de actualizar si se quieren conservar los registros del celular.
