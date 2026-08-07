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

Páginas construidas: `/` (landing), `/registro` (**conectado a Supabase Auth real** — crea cuenta y envía correo de verificación), `/perfil` (lee el tipo de cuenta persona/empresa real desde la sesión de Supabase; el guardado de los datos ampliados aún es solo vista previa, falta tabla `profiles`), `/terminos`, `/privacidad` (borradores legales), `/admin` (back office de marca, vista previa sin auth). `/login` todavía no existe — es un hueco activo porque `/perfil` ya redirige ahí sin sesión.

Backend: **Supabase confirmado y parcialmente conectado** (solo Auth por ahora, Postgres/storage no). Proyecto `colombia-contrata`, ref `zjbijmieiyumpqwyqhfm`, región São Paulo. Cliente en `src/lib/supabase.ts`, usa `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Email: **Resend conectado como SMTP de Supabase Auth** — correos salen de `noreply@colombiacontrata.com`. Las 6 plantillas de "Authentication" están traducidas al español; las 7 de "Security" (MFA, cambios de password/email/phone) siguen desactivadas y sin traducir porque no se usan.

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
- **Auth**: **Supabase confirmado y conectado** (proyecto `colombia-contrata`, ref `zjbijmieiyumpqwyqhfm`, región São Paulo). Postgres/storage aún no se usan — falta crear la tabla `profiles` para que `/perfil` persista de verdad, y storage con URLs firmadas para la expiración de 10 días de los documentos.
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

## Preferencias de colaboración
- El usuario no tiene conocimiento técnico profundo (ej. pidió explicación simple de qué es Vercel) — explicar conceptos de forma accesible, sin asumir jerga previa.
- Prefiere avanzar construyendo el sitio mientras resuelve piezas externas (como el API del proveedor de documentos) en paralelo.
- Antes de construir un feature que dependa de backend/auth real (ej. el back office de admin), preguntar si se quiere comprometer con Supabase ahora o seguir construyendo solo la interfaz como vista previa — el usuario ha elegido "interfaz primero" cuando se le preguntó.
- El usuario tiene assets de marca reales (logo, ícono, manual de identidad visual) en `Z:\SSA\Proyectos SSA\Colombia Contrata\Imagenes` (fuera de este repo) — revisar esa carpeta antes de asumir placeholders quedan definitivos.
