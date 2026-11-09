# Family Security

Prototipo local para un negocio de pulseras de goma con codigo QR.

## Que hace

- El padre, madre o tutor crea una cuenta con Gmail.
- Luego crea el perfil del niño.
- La app genera un QR unico para imprimir en la pulsera.
- El padre puede editar o borrar el perfil si se equivoca.
- Al crear el perfil, se prepara una ficha segura en Gmail para enviar a `familysecurityoficial@gmail.com`.
- El administrador puede ver cuentas, controlar mensualidades y desactivar perfiles.
- Si una cuenta queda sin pago, el QR queda bloqueado.
- La vista publica del QR muestra contactos de emergencia solo si el perfil esta activo.

## Panel administrador

En este prototipo, entra con:

```text
62052802
```

Este codigo solo sirve para pruebas locales. En una version real debe existir un login administrativo con servidor, roles y auditoria.

## Gmail del negocio

El correo configurado para reportes es:

```text
familysecurityoficial@gmail.com
```

La app puede preparar un mensaje hacia ese Gmail usando `mailto:`, pero un sitio estatico no puede enviar correos automaticamente de forma segura.

Cuando el tutor crea un perfil del niño, la app abre Gmail con una ficha lista para enviar. El tutor debe revisar y enviar el mensaje.

Por seguridad, este prototipo no envia contrasenas ni datos sensibles completos por correo. Para produccion se necesita una base de datos segura, cifrado, politicas de privacidad y notificaciones desde backend.
