# Avanza Digital

SPA institucional estática conectada a Supabase con HTML, CSS y JavaScript vanilla.

## Archivos

- `index.html`: estructura de la landing, secciones, modal e iconos SVG inline.
- `styles.css`: diseño responsive, animaciones, estados hover y estilos de impresión.
- `script.js`: navegación, modal, formularios y conexión a Supabase por `fetch`.
- `schema.sql`: reset completo de la base pública de Avanza Digital, con tablas, enums, funciones, RLS, permisos y datos iniciales.
- `README.md`: guía de configuración.

## Configurar Supabase

1. Haz backup si ya tienes datos reales.
2. Ejecuta `schema.sql` completo en el SQL Editor de Supabase. Este script borra y recrea las tablas de Avanza Digital.
3. Abre `script.js`.
4. Pega tu Project URL y tu `anon public key` en:

```js
const SUPABASE_CONFIG = Object.freeze({
  url: "https://tu-proyecto.supabase.co",
  anonKey: "tu-anon-public-key"
});
```

No pegues la `service_role key` en el frontend.

## Qué consulta la app

- Programas: tabla `programas`, solo registros `activo = true`.
- Configuración pública: tabla `configuracion`.
- Certificados: RPC `verificar_certificado_publico(codigo_input)`.
- Contacto: RPC `registrar_contacto_web(...)`, que guarda en `auditoria`.
- Login: Supabase Auth con `/auth/v1/token?grant_type=password`, y luego perfil en `usuarios`.

## Requisito para login

Para que el login funcione de forma segura, los usuarios deben existir en Supabase Auth. Además, `usuarios.id` debe coincidir con `auth.users.id`, o debes ajustar la política RLS de `usuarios` para permitir leer el perfil autenticado.

## Uso local

Abre `index.html` en el navegador. Supabase permite consultar la API desde una página estática siempre que la URL y la anon key estén configuradas y las políticas/permisos sean correctos.

## Despliegue

Puedes subir estos cinco archivos a Vercel como proyecto estático. No requiere build ni dependencias externas, excepto Google Fonts.
