# Colombia Contrata — Contexto del proyecto

> Este archivo es la memoria portátil del proyecto: vive dentro del repo (a diferencia de la memoria propia del asistente, que queda atada a esta máquina), así que viaja con `git clone` a cualquier otra computadora o sesión. Mantenlo actualizado en vez de depender solo de memoria externa.

## Qué es
Portal web para obtener documentos requeridos en contratación pública en Colombia (contraloría, policía, procuraduría, antecedentes penales, registros de conductas sexuales, entre otros).

Dos perfiles de usuario:
- **Independientes/personas naturales**: se registran, pagan, seleccionan checklist de documentos. La plataforma consulta vía API a un proveedor de fuentes, genera los PDFs, notifica por email, y deja el comprimido disponible para descarga por 10 días.
- **Empresas**: compran paquetes/planes de consultas (créditos) para validar antecedentes de candidatos antes de contratarlos. El candidato debe autorizar él mismo (Habeas Data) — la empresa invita, el candidato entra a la plataforma y autoriza; no se puede consultar a un tercero sin su propio consentimiento.

Ver `README.md` en la raíz del proyecto para el detalle técnico completo (stack, estructura, páginas implementadas, roadmap). Este archivo se enfoca en contexto de colaboración y decisiones que no están en el README.

## Estado actual (resumen)
Sitio en producción: https://colombiacontrata.com (dominio propio ya conectado; también responde en https://colombia-contrata.vercel.app) — cada push a `main` despliega automático en Vercel.

Páginas construidas: `/` (landing — "Planes para empresas" lee `planes_empresa` en vivo con toggle mensual/anual, "Documentos disponibles" lee `precios_documentos` sin precio, la tarjeta "Persona independiente" lee `configuracion_persona`), `/registro` y `/login` (**ambos conectados a Supabase Auth real** — signUp/signInWithPassword), `/perfil` (**conectado de verdad** — lee y guarda en la tabla `profiles` de Supabase según persona/empresa, más una sección "Seguridad de la cuenta" con `AccountSecurityForm.tsx` para cambiar contraseña/correo vía `supabase.auth.updateUser`), `/historial` (placeholder protegido por sesión, "Aún no tienes solicitudes" — falta el flujo real de documentos), `/terminos`, `/privacidad` (borradores legales), `/admin` (**protegido con autenticación real** vía `AdminGate.tsx`, solo cuentas con `app_metadata.role = "admin"`; organizado en **5 pestañas** — Identidad del portal / Planes de personas / Planes de empresa / Documentos disponibles / Administradores — todas guardan de verdad).

`Header.tsx` es client component: con sesión activa muestra un menú desplegable (círculo con iniciales, nombre en azul negrilla leído de `profiles.primer_nombre`/`razon_social` con el correo como respaldo, y dentro del menú nombre+correo arriba y accesos con ícono a Inicio/Historial/Perfil/Cerrar sesión). Las iniciales del círculo: para personas es primera letra de `primer_nombre` + primera letra de `primer_apellido` (no las primeras dos letras del nombre); para empresas sigue siendo las iniciales de las dos primeras palabras de `razon_social`. También trae el `ThemeToggle` (modo claro/oscuro, ver más abajo), visible con o sin sesión.

**Modo oscuro**: todo el sitio lo soporta. Mecanismo: `globals.css` declara `@custom-variant dark (&:where(.dark, .dark *));` (Tailwind v4 no trae dark-por-clase de fábrica) para que `dark:` responda a una clase `.dark` en `<html>`, no a `prefers-color-scheme`. `layout.tsx` inyecta un script `beforeInteractive` que aplica esa clase antes de hidratar (evita parpadeo; por eso `<html suppressHydrationWarning>`). `ThemeToggle.tsx` alterna la clase y persiste en `localStorage` (`theme: "light"|"dark"`). Si se agrega una página/componente nuevo, hay que acordarse de sumarle variantes `dark:` — no es automático.

Backend: **Supabase confirmado y conectado** (Auth + Postgres + Storage). Proyecto `colombia-contrata`, ref `zjbijmieiyumpqwyqhfm`, región São Paulo. Cliente en `src/lib/supabase.ts`, usa `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Tablas: `profiles` (RLS por dueño), `planes_empresa` (lectura pública/escritura admin; soporta planes privados por empresa vía `empresa_id`), `precios_documentos` (lectura pública/escritura admin, **sin precio** — el campo `precio` quedó nullable y sin usar), `configuracion_persona` (fila única, tarjeta "Persona independiente"), `configuracion_portal` (fila única, lectura pública/escritura admin). Bucket de Storage `portal-assets` (público para leer, admin-only para escribir) para logo/favicon. SQL completo de todas en el README → "Base de datos (Postgres)".

`configuracion_portal`: el **logo y el favicon** ya se leen en vivo (`Header.tsx` hace un `select` client-side de `logo_url`; `layout.tsx` usa `generateMetadata` + `export const revalidate = 60` para `favicon_url`, así el cambio se ve en máximo 60s sin redeploy). **Nombre del portal, eslogan y color primario todavía no** — siguen fijos en el código, pendiente en el roadmap.

⚠️ **Gotcha del favicon**: Next.js detecta automáticamente un archivo `src/app/icon.png` (convención de archivo) y ese **siempre gana** sobre cualquier `metadata.icons` dinámico puesto en `generateMetadata` — por eso el favicon de `/admin` no se reflejaba (había un `icon.png` estático ahí). Se borró ese archivo; si algún día el favicon vuelve a "no cambiar" pese a estar bien guardado en la base de datos, lo primero que hay que revisar es que no haya reaparecido un `src/app/icon.*`.

Planes de empresa actuales (6, nombres definidos por el usuario): **Lite, Standard, Advanced, Professional, Business, Enterprise** (créditos 10/25/50/100/250/500, "Professional" marcado como destacado, "Enterprise" como cotización — `mostrar_precio_desde: true`, sin precio anual). Los precios y créditos exactos son **valores de ejemplo** que puse yo mismo (el usuario no dio cifras) — no asumir que son los precios reales sin confirmarlo; el usuario los puede editar él mismo desde `/admin` → Planes de empresa.

**Dar/quitar acceso admin ya tiene UI real**: pestaña "Administradores" en `/admin` → `AdminRolesManager.tsx` → `POST /api/admin/roles` (Route Handler que usa la Service Role Key server-side, verifica que quien llama ya sea admin antes de hacer nada). Ya no hace falta la vía manual por SQL, aunque sigue funcionando: `update auth.users set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role','admin') where email = '...';` (usa `app_metadata`, no `user_metadata`, porque el usuario no puede modificarse ese campo a sí mismo). Cuenta admin actual: `yorbis10@gmail.com`.

⚠️ **Gotcha de Supabase**: `auth.admin.updateUserById(id, { app_metadata })` hace *merge*, no reemplaza — omitir una clave (`delete obj.role`) no la borra, hay que mandar `role: null` explícitamente para quitarla. Ya costó un bug real (revoke no quitaba el acceso) — cuidado si se toca ese endpoint.

⚠️ **Gotcha de esta sesión con `SUPABASE_SERVICE_ROLE_KEY`**: el copiar/pegar (Ctrl+V) entre pestañas del navegador automatizado de Claude Code **no funciona de forma confiable** en esta máquina — el paste se "registra" pero el campo queda vacío, sin error visible. Causó horas de debugging (error "supabaseKey is required" en producción) hasta notar que el textarea de Vercel tenía `length: 0`. Solución que funcionó: leer el valor del campo origen vía JS (`element.value`), y **escribirlo directamente** con la acción de teclado (`type`), no pegarlo. Además, una vez guardada una env var como "Sensitive" en Vercel, no se puede volver a copiar/ver el valor — si algo sale mal hay que borrarla y crearla de nuevo. Por eso `SUPABASE_SERVICE_ROLE_KEY` quedó como variable normal (no Sensitive) en Vercel; sigue siendo server-only y nunca se expone al navegador, "Sensitive" es solo una capa extra de ocultamiento en el dashboard.

Email: **Resend conectado como SMTP de Supabase Auth** — correos salen de `noreply@colombiacontrata.com`. Las 6 plantillas de "Authentication" están traducidas al español. De las 7 de "Security", **"Change Email Address" ya está activada y traducida** (la usa `AccountSecurityForm.tsx` al cambiar de correo); el resto (MFA, cambios de password/phone) siguen desactivadas y sin traducir porque no se usan. En Supabase → Authentication → URL Configuration, el **Site URL** y los **Redirect URLs** están en `colombiacontrata.com`/`www.colombiacontrata.com` (además de `colombia-contrata.vercel.app/**`) — importante si se agrega otro dominio desde el que la gente pueda registrarse, porque si el `redirect_to` dinámico (`window.location.origin` en `RegisterForm.tsx`) no está en esa lista, Supabase lo ignora y usa el Site URL de respaldo (ya pasó una vez con el dominio de Vercel).

Dominio: `colombiacontrata.com` **ya conectado a Vercel** (2026-08-07). En Vercel → Domains están `colombiacontrata.com` + `www.colombiacontrata.com` (redirect apex→www, 308), ambos "Valid Configuration". En Cloudflare DNS existen los dos registros CNAME (`@` y `www`) apuntando a `1b7885c77d62091c.vercel-dns-017.com.`, con el proxy de Cloudflare desactivado (DNS only / nube gris) en ambos.

Identidad de marca ya aplicada: logo/ícono reales (`public/isotipo.png`, `public/icono.png`), paleta de colores (`brand-navy #0d1b3d`, `brand-blue #1d4ed8`, `brand-yellow #fcd116`, `brand-red #ce1126` como tokens Tailwind en `globals.css`), tipografía Montserrat. El azul es una decisión explícita del usuario: el Manual de Identidad Visual original proponía `#0033a0` (azul bandera de Colombia), pero el usuario pidió cambiarlo a `#1d4ed8` — no revertir sin confirmar con él primero.

## Cumplimiento legal (Habeas Data — Ley 1581 de 2012)
- Antecedentes penales/policiales/disciplinarios son **dato sensible** → requieren checkbox de autorización explícito y separado del checkbox de Términos y Condiciones. Nunca premarcado. Ya implementado en `/registro` (3 checkboxes independientes).
- La trazabilidad del consentimiento **ya se guarda** en `user_metadata` de Supabase al hacer `signUp` (booleans de cada checkbox + `policy_version` + `accepted_at`, ver `POLICY_VERSION` en `RegisterForm.tsx`). Falta la **IP** — `signUp` corre client-side y no tiene acceso a ella, necesitaría un Route Handler.
- Evaluar registro en el RNBD (Registro Nacional de Bases de Datos) ante la SIC si se supera el umbral de registros.
- `/terminos` y `/privacidad` son plantillas base con aviso visible de que faltan revisión legal y datos reales de la empresa (razón social, NIT) — no están listas para producción tal cual.

## Stack
- **Frontend**: Next.js 16 (TypeScript, App Router, Tailwind CSS v4), Montserrat como tipografía
- **UI**: Preline UI (elegido por el usuario por su variedad de componentes)
- **Pagos (Colombia)**: Wompi o PayU — pendiente decidir
- **Auth + DB + Storage**: **Supabase confirmado y conectado** (proyecto `colombia-contrata`, ref `zjbijmieiyumpqwyqhfm`, región São Paulo). Falta storage con URLs firmadas para la expiración de 10 días de los documentos de personas (el bucket `portal-assets` que ya existe es solo para logo/favicon del admin, no para eso).
- **Email**: **Resend confirmado y conectado** como SMTP de Supabase Auth (`smtp.resend.com`, remitente `noreply@colombiacontrata.com`). Plantillas de "Authentication" traducidas al español.
- **API de consultas a fuentes**: aún no la tiene el usuario — se está construyendo el sitio en paralelo mientras la consigue

## Infraestructura y despliegue
- Dominio comprado: `colombiacontrata.com`, DNS/CDN en Cloudflare, **ya conectado a Vercel** (ver detalle en README → Despliegue).
- Repo remoto: https://github.com/servisolucionesaragon/Colombia_Contrata (público, main branch). Credenciales de git ya configuradas en esta máquina (Git Credential Manager, usuario `servisolucionesaragon`) — el push funciona sin pedir login.
- Hosting: Vercel (proyecto `servisoluciones-aragon/colombia-contrata`), tier gratuito, autodeploy en cada push a `main`.
- ⚠️ **Nunca marcar las env vars `NEXT_PUBLIC_*` como "Sensitive" en Vercel** — esa opción las oculta durante el build, y como necesitan insertarse en el bundle del navegador en build-time, el build falla con `supabaseKey is required`. Ya pasó una vez (commits alrededor de `4658785`). La anon key de Supabase está diseñada para ser pública.
- La sesión del navegador (Vercel/Supabase/Cloudflare) que uso para tareas de panel **no persiste entre sesiones de Claude Code** — si hace falta re-loguearse, hay que pedírselo al usuario (nunca ingresar sus credenciales).

## Entorno de desarrollo local — importante
El proyecto vive en una unidad de red mapeada (`Z:\`, SMB sobre lo que parece ser una VPN Tailscale). Esto causa:
- Instalaciones de npm lentas y a veces fallidas a mitad de camino (`ENOTEMPTY`/`EPERM`) — solución: borrar `node_modules` (usar PowerShell `Remove-Item -Recurse -Force` si `rm -rf` de Git Bash falla) y reinstalar.
- Turbopack (default de `next dev` y `next build` en Next 16) falla con las rutas UNC de la unidad de red — el script `dev` fuerza `--webpack`, y `next.config.ts` declara `turbopack: {}` para que `next build` (usado por Vercel) no falle por tener un `webpack()` custom sin config de turbopack.
- El watcher de archivos nativo falla en la unidad de red y hace que Next.js reinicie el servidor en bucle — mitigado con `WATCHPACK_POLLING=true`/`CHOKIDAR_USEPOLLING=true` (vía `cross-env` en el script `dev`) y `watchOptions.poll` en `next.config.ts`.
- Aun con todo esto, la primera compilación local puede tardar **hasta 18 minutos**. El servidor local a veces sigue cayéndose solo.

**Por esto, el flujo de trabajo establecido en esta sesión es: editar → commit → push a `main` → verificar en el deploy de Vercel** (tarda ~15-30s en compilar y no tiene ninguno de estos problemas), en vez de depender de `npm run dev` local para verificar cambios. Ver detalle completo en el README.

## Correo corporativo (buzones)
El usuario quiere buzones completos (no solo redirección) para direcciones como `contacto@colombiacontrata.com` — se le recomendó **Google Workspace** (~$7 USD/usuario/mes) por ser lo más confiable y familiar (Gmail). Pendiente que el usuario cree la cuenta de Workspace (implica pago, no lo hago yo); cuando la tenga, Google le va a pedir agregar un TXT de verificación y cambiar los registros MX del dominio en Cloudflare — hay que revisar que el cambio de MX no rompa el envío de correos transaccionales de Supabase/Resend (que usa Resend como SMTP, no depende del MX del dominio para *enviar*, pero conviene verificarlo igual al hacer el cambio).

## Preferencias de colaboración
- El usuario no tiene conocimiento técnico profundo (ej. pidió explicación simple de qué es Vercel) — explicar conceptos de forma accesible, sin asumir jerga previa.
- Prefiere avanzar construyendo el sitio mientras resuelve piezas externas (como el API del proveedor de documentos) en paralelo.
- El usuario ya decidió comprometerse con backend real para los flujos principales (registro, login, perfil, admin) — ya no hace falta preguntar "interfaz primero vs. backend real" para estos. Sigue siendo válido preguntar para features nuevos que toquen infraestructura externa (pagos, API del proveedor de documentos, storage).
- El usuario tiene assets de marca reales (logo, ícono, manual de identidad visual) en `Z:\SSA\Proyectos SSA\Colombia Contrata\Imagenes` (fuera de este repo) — revisar esa carpeta antes de asumir placeholders quedan definitivos.
