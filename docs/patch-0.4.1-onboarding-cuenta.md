# Parche 0.4.1 · recorrido onboarding y cuenta

Fecha: **10 de noviembre de 2026**.

## Recorrido corregido

1. Una instalación nueva abre onboarding, no el formulario de acceso ni un perfil invitado.
2. «Ya tengo cuenta» está disponible desde la bienvenida y abre el inicio de sesión.
3. Una persona nueva configura nombre, metas, horarios y avisos antes de registrarse.
4. En el resumen puede crear su cuenta o continuar sin cuenta.
5. Al confirmar el correo —o iniciar sesión después de confirmarlo— HoneyFlower aplica la
   configuración ya terminada a esa cuenta y abre Inicio. El onboarding no vuelve a solicitarla.

Mientras se espera el correo, cerrar y reabrir la app recupera la pantalla de confirmación.
El traspaso temporal caduca a los 30 días, se vincula al correo normalizado y contiene únicamente
preferencias y fecha de creación. No guarda contraseña, token ni sesión. Se elimina después de
confirmar que el perfil local de la cuenta fue escrito correctamente.

Las rutas directas de registro o invitado sin un resumen válido regresan al onboarding. Crear
cuenta desde el formulario de acceso también regresa al onboarding, para evitar perfiles con
configuración predeterminada no revisada.

## Verificación

- 9 pruebas unitarias de cuenta y entrega de configuración.
- 26 historias de cuenta y persistencia ejecutadas en Chrome.
- TypeScript sin errores.
- APK firmada: `HoneyFlower-0.4.1-prueba.apk`, **22,938,911 bytes**.
- SHA-256: `6b725a7aa936b228a221d6e38cb8a39dcbc5583f6d92e4b3a44b721fb63a35f4`.

La autenticación es real mediante Supabase, pero hábitos, registros y jardín todavía se guardan
solo en el dispositivo y por separado para cada `user.id`.
