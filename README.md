# Colombia Contrata

Portal web para obtener los documentos requeridos en procesos de contratación pública en Colombia (antecedentes judiciales, disciplinarios, fiscales, penales, medidas correctivas, entre otros) en un solo lugar, sin tener que consultar entidad por entidad.

Tiene dos perfiles de usuario:

- **Independientes / personas naturales**: se registran, seleccionan del checklist los documentos que necesitan, pagan, y reciben un comprimido con los PDFs por correo. La descarga queda disponible por **10 días**.
- **Empresas**: compran paquetes/planes de consultas (créditos) para validar antecedentes de candidatos antes de contratarlos. El candidato debe autorizar él mismo la consulta (ver sección de Habeas Data) — la empresa lo invita, pero no puede consultarlo sin su autorización directa.

**Sitio en producción:** https://colombiacontrata.com (dominio propio ya conectado; también disponible en https://colombia-contrata.vercel.app — ver [Despliegue](#despliegue)).

## Stack

- [Next.js](https://nextjs.org) 16 (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com) v4
- [Preline UI](https://preline.co) — librería de componentes
- Tipografía: **Montserrat** (`next/font/google`)
- **Supabase** — autenticación (`@supabase/supabase-js`, cliente en `src/lib/supabase.ts`) + tabla `profiles` en Postgres (con RLS) para los datos ampliados de `/perfil`. Storage aún no se usa.
- **Resend** — proveedor SMTP conectado a Supabase Auth, para que los correos salgan desde `noreply@colombiacontrata.com` en vez del dominio compartido de Supabase.
- Pendiente de definir: proveedor de pagos (Wompi / PayU), y la API del proveedor externo que genera los documentos.

### Variables de entorno

Copiar a `.env.local` (no se sube a git):

```
NEXT_PUBLIC_SUPABASE_URL=https://zjbijmieiyumpqwyqhfm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key del proyecto en Supabase>
```

En Vercel están configuradas en **Project Settings → Environment Variables**.

⚠️ **No marcarlas como "Sensitive"** en Vercel: esa opción oculta el valor incluso durante el build, y como son variables `NEXT_PUBLIC_*` necesitan estar disponibles justo en el build para insertarse en el bundle del navegador. Marcarlas como sensibles rompe el build con `Error: supabaseKey is required.` (ya nos pasó una vez — ver commit `4658785` y el que le sigue). La anon key está diseñada para ser pública, así que no hay problema de seguridad en dejarla como variable normal.

## Identidad de marca

Basada en `Manual_Identidad_Visual_Colombia_Contrata` (carpeta `Colombia Contrata/Imagenes`, fuera de este repo):

- **Logo/ícono**: isotipo de nube + carpeta + documento + check, en colores de la bandera de Colombia. Assets en `public/isotipo.png` (junto al nombre, en Header/Footer) y `public/icono.png` / `src/app/icon.png` (favicon). `public/logo.png` es el lockup completo con eslogan, aún sin usar en el sitio.
- **Colores de marca** definidos como tokens de Tailwind en `src/app/globals.css` (`@theme`):
  - `brand-navy` `#0d1b3d`
  - `brand-blue` `#1d4ed8` (ajustado por el usuario; el manual original proponía `#0033a0`)
  - `brand-blue-dark` `#1e40af` (hover)
  - `brand-yellow` `#fcd116`, `brand-red` `#ce1126` (definidos, aún no aplicados en UI)
- El wordmark "Colombia Contrata" se pinta en dos tonos: **Colombia** en `brand-navy`, **Contrata** en `brand-blue`.

## Páginas implementadas

| Ruta | Qué es | Estado |
|---|---|---|
| `/` | Landing page (hero, cómo funciona, documentos, planes) | Completa (frontend) |
| `/registro` | Alta de cuenta (correo + contraseña + toggle Persona natural / Empresa + consentimiento Habeas Data) | **Conectado a Supabase Auth real** — crea la cuenta y envía correo de verificación |
| `/login` | Inicio de sesión (correo + contraseña) | **Conectado a Supabase Auth real** vía `supabase.auth.signInWithPassword` |
| `/perfil` | Datos ampliados post-confirmación (persona: nombre/documento/fechas/género/ubicación; empresa: razón social/NIT/representante/sector/ubicación) | **Conectado de verdad** — lee y guarda (`upsert`) en la tabla `profiles` de Supabase, precarga los datos si ya existían |
| `/terminos` | Términos y Condiciones | Borrador, falta revisión legal |
| `/privacidad` | Política de Tratamiento de Datos Personales (Ley 1581) | Borrador, falta revisión legal |
| `/admin` | Back office: nombre, eslogan, logo, favicon, color primario | **Protegido con autenticación real** (solo cuentas con `app_metadata.role = "admin"`, ver [Panel de administración](#panel-de-administración)); el guardado de los cambios sigue siendo solo vista previa |

`/solicitar` y `/empresas` están enlazadas desde la UI pero **todavía no existen** (darán 404 si se navega directo).

## Requisitos

- Node.js 20+
- npm

## Cómo correr el proyecto en desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### ⚠️ Nota importante si el proyecto vive en una unidad de red (drive mapeado tipo `Z:\`)

Este repo se desarrolló originalmente sobre una carpeta montada por red (SMB), lo cual lo hace **muy lento** para desarrollo local (instalaciones de varios minutos, primeras compilaciones de hasta 18 minutos). Hay tres problemas conocidos, ya mitigados en la configuración del proyecto:

1. **Turbopack falla con rutas UNC.** Turbopack (el bundler por defecto de `next dev`) compara la ruta UNC real (`\\servidor\carpeta\...`) contra la ruta de letra de unidad (`Z:\...`) y las considera "fuera del directorio raíz", rompiendo cualquier import desde `node_modules` (ej. Preline). Por eso el script `dev` fuerza `--webpack` en vez de Turbopack. **`next build` sigue usando Turbopack** (el default), por lo que `next.config.ts` declara `turbopack: {}` junto al `webpack()` custom — sin eso, el build de producción falla con "This build is using Turbopack, with a webpack config and no turbopack config".
2. **El watcher de archivos falla en unidades de red** (`Watchpack Error: UNKNOWN`), porque Windows no propaga bien las notificaciones de cambios sobre SMB. Sin mitigar, esto hace que Next.js crea que se borró `.next` y reinicie el servidor en bucle, perdiendo cualquier compilación en curso. Por eso `next.config.ts` configura `watchOptions.poll` y el script `dev` fuerza `WATCHPACK_POLLING=true` / `CHOKIDAR_USEPOLLING=true` vía `cross-env`.
3. **Instalaciones de npm pueden fallar a mitad de camino** (`ENOTEMPTY`, `EPERM` en `rmdir`) por la latencia de la unidad de red. Si pasa, borra `node_modules` (con PowerShell `Remove-Item -Recurse -Force` si `rm -rf` falla) y corre `npm install` de nuevo.

Dado lo lento que es esto, **el flujo de trabajo real de esta sesión fue: editar código → push a `main` → verificar en el deploy de Vercel** (que compila en segundos, sin estos problemas), en vez de depender del servidor local. Si mueves el proyecto a un disco local, estas configuraciones no estorban, pero tampoco es necesario quitarlas.

## Estructura relevante

```
src/
  app/
    layout.tsx          # layout raíz, fuente Montserrat, inicializa Preline
    page.tsx             # landing page
    globals.css          # Tailwind v4 (@theme con colores de marca) + @source hacia preline/dist
    icon.png              # favicon (Next.js lo detecta automáticamente)
    registro/page.tsx     # alta de cuenta
    login/page.tsx         # inicio de sesión
    perfil/page.tsx        # completar datos post-registro
    terminos/page.tsx     # términos y condiciones
    privacidad/page.tsx   # política de datos personales
    admin/page.tsx        # back office (protegido por AdminGate)
  components/
    Header.tsx / Footer.tsx # Header es client component: lee sesión + tabla profiles para mostrar nombre/razón social y botón de cerrar sesión
    RegisterForm.tsx       # registro real vía Supabase Auth (signUp + metadata de consentimiento)
    LoginForm.tsx           # login real vía Supabase Auth (signInWithPassword)
    ProfileForm.tsx        # lee y guarda (upsert) en la tabla profiles según persona/empresa
    AdminGate.tsx           # bloquea /admin a menos que la sesión tenga app_metadata.role === "admin"
    AdminSettingsForm.tsx  # formulario de configuración del portal (guardado aún es vista previa)
    LegalDisclaimer.tsx    # aviso de "falta revisión legal" en /terminos y /privacidad
    AdminWarningBanner.tsx # aviso de "guardado aún es vista previa" en /admin
    PrelineScript.tsx      # inicializa los componentes JS de Preline en cada navegación
  lib/
    supabase.ts            # cliente de Supabase (createClient con las env vars NEXT_PUBLIC_*)
    colombia.ts             # departamentos + ciudades por departamento (para /perfil)
  types/
    preline.d.ts          # tipado de window.HSStaticMethods
public/
  isotipo.png / icono.png / logo.png   # assets de marca
.claude/
  launch.json              # config para levantar el server de desarrollo desde el asistente
  CLAUDE.md                # contexto del proyecto para el asistente de IA
```

## Cumplimiento legal — Habeas Data (Ley 1581 de 2012)

Los antecedentes penales, policiales y disciplinarios se consideran **dato sensible** en Colombia. El registro (`/registro`) ya implementa el patrón correcto:

- Tres checkboxes **independientes** y ninguno premarcado: Términos y Condiciones, Política de Tratamiento de Datos, y autorización específica para datos sensibles.
- En el flujo de empresas: la empresa invita al candidato, pero es **el candidato quien autoriza** su propia consulta — una empresa no puede consultar a un tercero sin su autorización directa (documentado también en `/privacidad`).

El registro ya guarda trazabilidad básica del consentimiento en `user_metadata` de Supabase (booleans de cada checkbox + `policy_version` + `accepted_at`, ver `POLICY_VERSION` en `RegisterForm.tsx`). Falta registrar la **IP** (requiere un endpoint de servidor, `signUp` corre en el cliente y no tiene acceso a ella) y evaluar el registro en el RNBD ante la SIC si se supera el umbral de registros.

`/terminos` y `/privacidad` son **borradores de plantilla** (con aviso visible en la propia página) — deben ser revisados por un abogado y completados con la razón social/NIT reales antes de producción.

## Base de datos (Postgres)

Tabla `profiles` en Supabase (creada a mano vía SQL Editor — no hay migraciones versionadas en el repo todavía): una fila por usuario, `id` es el mismo `uuid` que `auth.users.id`. Tiene columnas separadas y nulas según el tipo de cuenta (persona vs. empresa, definido por `account_type`), para no necesitar dos tablas. RLS habilitado con 3 políticas (`select`/`insert`/`update`, todas con `auth.uid() = id`, así cada usuario solo ve/edita su propia fila).

<details>
<summary>Ver el SQL completo</summary>

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  account_type text not null check (account_type in ('persona', 'empresa')),

  -- Persona natural
  primer_nombre text,
  segundo_nombre text,
  primer_apellido text,
  segundo_apellido text,
  tipo_documento text,
  documento text,
  fecha_nacimiento date,
  fecha_expedicion date,
  genero text,
  profesion text,
  telefono text,
  direccion text,
  departamento text,
  ciudad text,

  -- Empresa
  razon_social text,
  nit text,
  tipo_sociedad text,
  fecha_constitucion date,
  sector_economico text,
  sitio_web text,
  telefono_empresa text,
  direccion_empresa text,
  departamento_empresa text,
  ciudad_empresa text,
  representante_legal text,
  documento_representante text,
  nombre_contacto text,
  telefono_contacto text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
```

</details>

`ProfileForm.tsx` mapea cada campo del formulario 1:1 a una columna (vía el atributo `name` de cada input) y hace `supabase.from("profiles").upsert(...)` al guardar. Cuando empresas necesiten planes/paquetes/créditos para consultar candidatos, eso se modelará como tablas nuevas aparte de `profiles` — no como columnas adicionales aquí.

## Panel de administración

`/admin` está protegido por `AdminGate.tsx` (client component): revisa que la sesión tenga `user.app_metadata.role === "admin"`. Se usa `app_metadata` y no `user_metadata` a propósito — `user_metadata` lo puede editar el propio usuario desde el cliente (`supabase.auth.updateUser`), así que no sirve para permisos; `app_metadata` solo se puede modificar desde el backend de Supabase.

Para dar acceso de administrador a una cuenta (ya registrada) desde el SQL Editor de Supabase:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', 'admin')
where email = 'correo@ejemplo.com';
```

Cuenta con acceso de administrador actualmente: `yorbis10@gmail.com`.

## Despliegue

- **Hosting**: [Vercel](https://vercel.com), proyecto `servisoluciones-aragon/colombia-contrata`, conectado al repo de GitHub — cada push a `main` despliega automáticamente a producción.
- **Repo**: [servisolucionesaragon/Colombia_Contrata](https://github.com/servisolucionesaragon/Colombia_Contrata).
- **Backend**: [Supabase](https://supabase.com) (proyecto `colombia-contrata`, ref `zjbijmieiyumpqwyqhfm`, región São Paulo) — Auth + tabla `profiles` en Postgres (ver [Base de datos](#base-de-datos-postgres)). Storage aún no se usa.
- **Email**: Supabase Auth usa SMTP personalizado vía [Resend](https://resend.com) (`smtp.resend.com`, remitente `noreply@colombiacontrata.com`). Configurado en Supabase → Authentication → Emails → SMTP Settings. Las 6 plantillas de "Authentication" (Confirm signup, Invite, Magic Link, Change email, Reset password, Reauthentication) están traducidas al español. De las 7 de "Security", **"Change Email Address" ya está activada y traducida** (necesaria para poder cambiar el correo desde `/perfil`); el resto (password/phone changed, MFA, etc.) siguen desactivadas por defecto y sin traducir porque no se usan todavía.
- **Auth → URL Configuration**: el **Site URL** y los **Redirect URLs** están configurados en `https://colombiacontrata.com` / `https://www.colombiacontrata.com` (se mantiene también `https://colombia-contrata.vercel.app/**` por si se sigue usando para pruebas). El enlace de los correos de confirmación (`{{ .ConfirmationURL }}`) usa el `redirect_to` que manda el cliente (`emailRedirectTo: window.location.origin + "/perfil"` en `RegisterForm.tsx`) **solo si ese dominio está en la lista de Redirect URLs** — si no, Supabase cae de vuelta al Site URL. Si se agrega otro dominio/subdominio desde el que la gente se registre, hay que agregarlo ahí también.
- **Dominio propio** `colombiacontrata.com`: comprado, DNS/CDN en Cloudflare, **ya conectado a Vercel** (2026-08-07). `colombiacontrata.com` y `www.colombiacontrata.com` están agregados en Vercel → Domains (Production), con "Redirect apex domains to www" activado (colombiacontrata.com hace 308 a www). En Cloudflare → DNS → Registros existen los dos CNAME requeridos, ambos "DNS only" (proxy desactivado, nube gris):

    | Type | Name | Value | Proxy |
    |---|---|---|---|
    | CNAME | `@` | `1b7885c77d62091c.vercel-dns-017.com.` | Disabled (DNS only) |
    | CNAME | `www` | `1b7885c77d62091c.vercel-dns-017.com.` | Disabled (DNS only) |

  Vercel muestra "Valid Configuration" en los tres dominios (apex, www y el `.vercel.app`) y el sitio carga con certificado SSL válido en https://colombiacontrata.com.

## Roadmap / pendientes

- [ ] Construir `/solicitar` (checklist de documentos) y `/empresas`.
- [ ] Sección de "cuenta" en `/perfil` para cambiar contraseña y correo (el teléfono ya se edita ahí). Ambos usan `supabase.auth.updateUser` — la plantilla "Change Email Address" ya está activada y traducida en Supabase, solo falta construir la UI.
- [ ] Registrar la IP en la trazabilidad de consentimiento de Habeas Data (requiere un endpoint de servidor/Route Handler, ya que `supabase.auth.signUp` corre en el cliente).
- [ ] Conectar el guardado de `AdminSettingsForm.tsx` a un backend real (hoy `/admin` ya está protegido por autenticación, pero los cambios que se guardan ahí siguen siendo solo vista previa).
- [ ] Postgres + storage con URLs firmadas para la expiración de 10 días de los documentos.
- [ ] Tablas de planes/paquetes/créditos para el flujo de empresas (compra de créditos, invitación de candidatos, historial) — separadas de `profiles`.
- [ ] Integración con la API del proveedor de fuentes (contraloría, policía, procuraduría, etc.) — aún no contratada.
- [ ] Pasarela de pagos (Wompi / PayU).
- [ ] Generación y empaquetado de PDFs + expiración de 10 días.
- [ ] Revisión legal de `/terminos` y `/privacidad` + completar datos legales de la empresa.
- [ ] Traducir y activar el resto de plantillas de "Security" en Supabase si se llegan a necesitar (MFA, cambio de contraseña, cambio de teléfono — "Change Email Address" ya está lista).
