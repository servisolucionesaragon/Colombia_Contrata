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
- **Supabase** — autenticación (`@supabase/supabase-js`, cliente en `src/lib/supabase.ts`) + Postgres (`profiles`, `planes_empresa`, `precios_documentos`, `configuracion_portal`, todas con RLS) + Storage (bucket `portal-assets` para logo/favicon).
- **Resend** — proveedor SMTP conectado a Supabase Auth, para que los correos salgan desde `noreply@colombiacontrata.com` en vez del dominio compartido de Supabase.
- Pendiente de definir: proveedor de pagos (Wompi / PayU), y la API del proveedor externo que genera los documentos.

### Variables de entorno

Copiar a `.env.local` (no se sube a git):

```
NEXT_PUBLIC_SUPABASE_URL=https://zjbijmieiyumpqwyqhfm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key del proyecto en Supabase>
SUPABASE_SERVICE_ROLE_KEY=<service_role key del proyecto en Supabase>
```

En Vercel están configuradas en **Project Settings → Environment Variables**. `SUPABASE_SERVICE_ROLE_KEY` **no** lleva `NEXT_PUBLIC_` a propósito — solo la usan los Route Handlers en el servidor (ej. `src/app/api/admin/roles/route.ts`), nunca debe llegar al navegador.

⚠️ **No marcar las `NEXT_PUBLIC_*` como "Sensitive"** en Vercel: esa opción oculta el valor incluso durante el build, y como necesitan estar disponibles justo en el build para insertarse en el bundle del navegador, marcarlas como sensibles rompe el build con `Error: supabaseKey is required.` (ya pasó una vez — ver commit `4658785` y el que le sigue). La anon key está diseñada para ser pública, así que no hay problema de seguridad en dejarla como variable normal.

⚠️ **`SUPABASE_SERVICE_ROLE_KEY` tampoco se marcó como "Sensitive"**, pero por una razón distinta: en esta máquina el copiar/pegar entre pestañas del navegador automatizado no funciona de forma confiable (el portapapeles del SO queda bloqueado para el navegador embebido), así que hay que **escribir el valor directamente** (no pegarlo) al crear la variable. Una vez guardada como "Sensitive", Vercel no permite volver a copiar/ver el valor para reintentar si algo salió mal — por eso se dejó como variable normal (sigue siendo server-only, nunca se expone al cliente; "Sensitive" es una capa extra de ocultamiento en el dashboard, no la única protección). Si se necesita rotar la clave, hay que borrar la variable y crearla de nuevo con el valor tecleado directamente.

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
| `/` | Landing page (hero, cómo funciona, documentos, planes) | Completa; la sección "Planes para empresas" (`PlanesEmpresaPricing.tsx`) lee los planes públicos reales desde `planes_empresa`, con toggle mensual/anual |
| `/registro` | Alta de cuenta (correo + contraseña + toggle Persona natural / Empresa + consentimiento Habeas Data) | **Conectado a Supabase Auth real** — crea la cuenta y envía correo de verificación |
| `/login` | Inicio de sesión (correo + contraseña) | **Conectado a Supabase Auth real** vía `supabase.auth.signInWithPassword` |
| `/perfil` | Datos ampliados post-confirmación (persona: nombre/documento/fechas/género/ubicación; empresa: razón social/NIT/representante/sector/ubicación) + sección "Seguridad de la cuenta" (cambiar contraseña y correo) | **Conectado de verdad** — lee y guarda (`upsert`) en la tabla `profiles` de Supabase, precarga los datos si ya existían; cambio de contraseña/correo vía `supabase.auth.updateUser` |
| `/terminos` | Términos y Condiciones | Borrador, falta revisión legal |
| `/privacidad` | Política de Tratamiento de Datos Personales (Ley 1581) | Borrador, falta revisión legal |
| `/admin` | Back office con pestañas: Identidad del portal, Planes de personas, Planes de empresa, Documentos disponibles, Administradores | **Protegido con autenticación real** (solo cuentas con `app_metadata.role = "admin"`, ver [Panel de administración](#panel-de-administración)) — **todo se guarda de verdad**, incluyendo subida de logo/favicon a Storage y dar/quitar acceso admin por correo |
| `/historial` | Historial de solicitudes/verificaciones del usuario | Placeholder protegido por sesión ("Aún no tienes solicitudes") — falta el flujo real de solicitud de documentos para tener datos que mostrar |

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
    layout.tsx          # layout raíz, fuente Montserrat, inicializa Preline, script de tema sin parpadeo
    page.tsx             # landing page
    globals.css          # Tailwind v4 (@theme con colores de marca, @custom-variant dark) + @source hacia preline/dist
    icon.png              # favicon (Next.js lo detecta automáticamente)
    registro/page.tsx     # alta de cuenta
    login/page.tsx         # inicio de sesión
    perfil/page.tsx        # completar datos post-registro
    historial/page.tsx     # placeholder de historial de solicitudes (protegido por sesión)
    terminos/page.tsx     # términos y condiciones
    privacidad/page.tsx   # política de datos personales
    admin/page.tsx        # back office (protegido por AdminGate)
    api/admin/roles/route.ts # Route Handler: dar/quitar admin por correo, usa la Service Role Key (solo servidor)
  components/
    Header.tsx / Footer.tsx # Header es client component: lee sesión + tabla profiles, muestra menú de usuario (avatar, Inicio/Historial/Perfil/Cerrar sesión) y el ThemeToggle
    ThemeToggle.tsx         # botón sol/luna, toggle de clase "dark" en <html>, persiste en localStorage
    RegisterForm.tsx       # registro real vía Supabase Auth (signUp + metadata de consentimiento)
    LoginForm.tsx           # login real vía Supabase Auth (signInWithPassword)
    ProfileForm.tsx        # lee y guarda (upsert) en la tabla profiles según persona/empresa
    AccountSecurityForm.tsx # cambio de contraseña/correo vía supabase.auth.updateUser, en /perfil
    HistorialContent.tsx    # contenido de /historial (gate de sesión + estado vacío)
    AdminGate.tsx           # bloquea /admin a menos que la sesión tenga app_metadata.role === "admin"
    AdminTabs.tsx            # pestañas del panel admin (Identidad / Planes de personas / Planes de empresa / Documentos / Administradores)
    AdminSettingsForm.tsx  # identidad del portal — lee/guarda en configuracion_portal, sube logo/favicon a Storage
    ConfiguracionPersonaManager.tsx # admin: edita la tarjeta "Persona independiente" (configuracion_persona)
    PlanesEmpresaManager.tsx    # CRUD admin de planes_empresa (incluye planes privados por empresa)
    PreciosDocumentosManager.tsx # CRUD admin de documentos disponibles (precios_documentos, sin precio)
    AdminRolesManager.tsx        # admin: dar/quitar acceso de administrador por correo (llama /api/admin/roles)
    PlanPersonaCard.tsx          # tarjeta pública "Persona independiente" en "/", lee configuracion_persona
    PlanesEmpresaPricing.tsx    # tarjetas de precios públicas en "/" (toggle mensual/anual)
    PreciosDocumentosPricing.tsx # lista pública de documentos disponibles en "/" (sin precio)
    LegalDisclaimer.tsx    # aviso de "falta revisión legal" en /terminos y /privacidad
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

`ProfileForm.tsx` mapea cada campo del formulario 1:1 a una columna (vía el atributo `name` de cada input) y hace `supabase.from("profiles").upsert(...)` al guardar.

### `planes_empresa`, `precios_documentos`, `configuracion_portal` y `configuracion_persona`

Estas tablas tienen **lectura pública** (`using (true)`, salvo `planes_empresa` que además filtra planes privados — ver abajo) y **escritura solo para administradores** (`(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`):

- **`planes_empresa`**: planes de créditos/consultas para empresas. Columnas: `nombre`, `descripcion`, `creditos`, `precio_mensual`, `precio_anual` (opcional), `destacado` (insignia "Recomendado"), `features` (`text[]`, una línea por característica en el formulario admin), `cta_label` (texto del botón, opcional), `mostrar_precio_desde` (para planes tipo cotización, ej. "Enterprise"), y **`empresa_id`** (opcional, referencia a `profiles.id`) — si tiene valor, es un **plan privado** visible solo para esa empresa y para admins, no aparece en la grilla pública de `/`. La política de `select` filtra por `empresa_id is null or empresa_id = auth.uid() or ...admin`. Planes actuales: **Lite, Standard, Advanced, Professional, Business, Enterprise** — precios/créditos son valores de ejemplo puestos por el asistente, no confirmados por el usuario, editables desde `/admin` → Planes de empresa.
- **`precios_documentos`** (pestaña "Documentos disponibles" en el admin, a pesar del nombre de la tabla): estos documentos **no tienen precio individual** — la columna `precio` sigue existiendo mismo pero es nullable y no se usa en la UI (se dejó por si se retoma más adelante). Solo `documento` y `activo`.
- **`configuracion_persona`**: fila única (`id` fijo en `1`) para la tarjeta "Persona independiente" que se muestra en `/` — `titulo`, `descripcion`, `cta_label`, `precio_desde` (opcional) y `activo` (si está en `false`, la tarjeta no se muestra).
- **`configuracion_portal`**: fila única (`id` fijo en `1`, con `check (id = 1)`) para nombre del portal, eslogan, color primario y URLs de logo/favicon. Las imágenes se suben al bucket de Storage **`portal-assets`** (público para lectura, admin-only para escribir) vía `supabase.storage.from("portal-assets").upload(...)`.

Todas se administran desde `/admin` (ver [Panel de administración](#panel-de-administración)) y se reflejan en vivo en el sitio: `configuracion_persona` y los planes/documentos de inmediato (lectura client-side); `configuracion_portal` (logo, favicon y color primario) con hasta 60s de retraso (`Header.tsx` lee `logo_url`/`color_primario` client-side; `layout.tsx` usa `generateMetadata` con `export const revalidate = 60` para `favicon_url`, así no hace falta un redeploy para ver el cambio). El nombre del portal y el eslogan siguen sin conectarse al front — solo se guardan en la tabla, pendiente en el roadmap.

⚠️ **Gotcha del color primario**: la paleta de marca (`--color-brand-blue`, etc.) vivía dentro de un bloque `@theme inline` en `globals.css`. En Tailwind v4, `inline` hace que el valor se "hornee" literal dentro de cada clase generada (ej. `.bg-brand-blue{background-color:#1d4ed8}`), lo que hacía **imposible** cambiarlo en tiempo real sin un rebuild — por eso guardar un color nuevo en `/admin` no se veía reflejado. Se movió la paleta de marca a un bloque `@theme` normal (sin `inline`), que sí genera `var(--color-brand-blue)` en las clases. `Header.tsx` lee `color_primario` de `configuracion_portal` y llama `document.documentElement.style.setProperty("--color-brand-blue", ...)` (con una versión oscurecida calculada para `--color-brand-blue-dark`, el estado hover). El bloque `@theme inline` solo se dejó para `--color-background`/`--color-foreground`/`--font-sans`, que sí necesitan ese modo por cómo se integran con `next/font` y el modo oscuro.

⚠️ **Gotcha del favicon**: Next.js detecta automáticamente `src/app/icon.png` (convención de archivo) y ese archivo estático **siempre gana** sobre cualquier `metadata.icons` dinámico — por eso el favicon de `/admin` no se veía reflejado. Se eliminó ese archivo; el favicon ahora sale exclusivamente de `configuracion_portal.favicon_url` (con `/icono.png` como respaldo si no hay ninguno configurado). No volver a agregar un `src/app/icon.*` mientras el favicon deba ser configurable.

<details>
<summary>Ver el SQL completo</summary>

```sql
create table public.planes_empresa (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  creditos integer not null,
  precio_mensual numeric not null,
  precio_anual numeric,
  destacado boolean not null default false,
  features text[] not null default '{}',
  cta_label text,
  mostrar_precio_desde boolean not null default false,
  empresa_id uuid references public.profiles(id) on delete cascade,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.planes_empresa enable row level security;

create policy "View public or own custom plans"
  on public.planes_empresa for select
  using (
    empresa_id is null
    or empresa_id = auth.uid()
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "Admins can insert planes_empresa"
  on public.planes_empresa for insert
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can update planes_empresa"
  on public.planes_empresa for update
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can delete planes_empresa"
  on public.planes_empresa for delete
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');


create table public.precios_documentos (
  id uuid primary key default gen_random_uuid(),
  documento text not null,
  precio numeric, -- nullable, no se usa en la UI (estos documentos no tienen precio individual)
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.precios_documentos enable row level security;

create policy "Anyone can view precios_documentos"
  on public.precios_documentos for select
  using (true);

create policy "Admins can insert precios_documentos"
  on public.precios_documentos for insert
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can update precios_documentos"
  on public.precios_documentos for update
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can delete precios_documentos"
  on public.precios_documentos for delete
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');


create table public.configuracion_persona (
  id int primary key default 1,
  titulo text not null default 'Persona independiente',
  descripcion text not null default 'Paga solo por los documentos que necesitas para tu próximo contrato.',
  cta_label text not null default 'Solicitar documentos',
  precio_desde numeric,
  activo boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint configuracion_persona_singleton check (id = 1)
);

insert into public.configuracion_persona (id) values (1);

alter table public.configuracion_persona enable row level security;

create policy "Anyone can view configuracion_persona"
  on public.configuracion_persona for select
  using (true);

create policy "Admins can update configuracion_persona"
  on public.configuracion_persona for update
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');


create table public.configuracion_portal (
  id int primary key default 1,
  nombre_portal text not null default 'Colombia Contrata',
  eslogan text not null default 'Todos tus documentos de contratación pública, en un solo lugar',
  color_primario text not null default '#1d4ed8',
  logo_url text,
  favicon_url text,
  updated_at timestamptz not null default now(),
  constraint configuracion_portal_singleton check (id = 1)
);

insert into public.configuracion_portal (id) values (1);

alter table public.configuracion_portal enable row level security;

create policy "Anyone can view configuracion_portal"
  on public.configuracion_portal for select
  using (true);

create policy "Admins can update configuracion_portal"
  on public.configuracion_portal for update
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');


insert into storage.buckets (id, name, public)
values ('portal-assets', 'portal-assets', true)
on conflict (id) do nothing;

create policy "Public read portal-assets"
  on storage.objects for select
  using (bucket_id = 'portal-assets');

create policy "Admins can upload portal-assets"
  on storage.objects for insert
  with check (bucket_id = 'portal-assets' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can update portal-assets"
  on storage.objects for update
  using (bucket_id = 'portal-assets' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can delete portal-assets"
  on storage.objects for delete
  using (bucket_id = 'portal-assets' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
```

</details>

## Panel de administración

`/admin` está protegido por `AdminGate.tsx` (client component): revisa que la sesión tenga `user.app_metadata.role === "admin"`. Se usa `app_metadata` y no `user_metadata` a propósito — `user_metadata` lo puede editar el propio usuario desde el cliente (`supabase.auth.updateUser`), así que no sirve para permisos; `app_metadata` solo se puede modificar desde el backend de Supabase.

`AdminTabs.tsx` organiza el panel en cinco pestañas, todas con guardado real:

- **Identidad del portal** (`AdminSettingsForm.tsx`) — nombre, eslogan, color primario, logo y favicon (`configuracion_portal` + Storage).
- **Planes de personas** (`ConfiguracionPersonaManager.tsx`) — título/descripción/precio-desde/CTA de la tarjeta "Persona independiente" en `/`.
- **Planes de empresa** (`PlanesEmpresaManager.tsx`) — crear/editar/eliminar planes; incluye la opción de asignar un plan a una sola empresa (privado).
- **Documentos disponibles** (`PreciosDocumentosManager.tsx`) — lista de documentos para personas naturales (sin precio).
- **Administradores** (`AdminRolesManager.tsx`) — dar/quitar acceso de administrador escribiendo el correo de una cuenta ya registrada.

### Dar/quitar acceso de administrador

Desde la pestaña **Administradores** en `/admin` (recomendado): escribe el correo de una cuenta ya registrada y pulsa "Dar acceso de administrador"; cada admin listado tiene un botón "Quitar acceso" (un admin no puede quitarse su propio acceso, por seguridad).

Por dentro, esto llama a `POST /api/admin/roles` (`src/app/api/admin/roles/route.ts`), un Route Handler que:
1. Verifica que quien llama esté autenticado **y** ya sea admin, validando su access token contra Supabase (`supabase.auth.getUser(token)`) — nunca confía en nada que mande el cliente sin verificar.
2. Usa la **Service Role Key** (`SUPABASE_SERVICE_ROLE_KEY`, ver [Variables de entorno](#variables-de-entorno)) para buscar al usuario objetivo por correo (`auth.admin.listUsers`) y llamar `auth.admin.updateUserById(id, { app_metadata: { role: "admin" | null } })`.

⚠️ **Gotcha importante**: `updateUserById` hace *merge* del `app_metadata` que ya existía, no lo reemplaza. Omitir la clave `role` del objeto enviado (ej. con `delete obj.role`) **no la borra** — el merge conserva el valor anterior. Para quitar el rol hay que mandar `role: null` explícitamente, que sí sobreescribe.

También se puede hacer a mano desde el SQL Editor de Supabase si hace falta:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', 'admin')
where email = 'correo@ejemplo.com';
```

Cuenta con acceso de administrador actualmente: `yorbis10@gmail.com`.

## Menú de usuario

Cuando hay sesión activa, `Header.tsx` reemplaza los botones "Iniciar sesión"/"Crear cuenta" por un menú desplegable: círculo con iniciales (calculadas del nombre/razón social) en azul, nombre en azul negrilla, y al abrirlo muestra nombre + correo arriba y cuatro opciones con ícono — **Inicio**, **Historial**, **Perfil** y **Cerrar sesión**. El nombre viene de la tabla `profiles` — para persona es `primer_nombre` + `primer_apellido` (no solo el primer nombre), para empresa es `razon_social` — con el correo como respaldo si el usuario aún no la completó. Las iniciales del círculo: persona → primera letra de `primer_nombre` + primera letra de `primer_apellido`; empresa → iniciales de las dos primeras palabras de `razon_social`.

**Tamaños de logo/avatar** (ajustados 2026-08-08 a pedido del usuario): el isotipo del Header mide 44px (`size-11`/`h-11`, antes 32px). El círculo de iniciales del menú desplegable de escritorio mide 28px (`size-7`); el del panel de menú móvil (el que se abre con el ícono de hamburguesa) mide 40px (`size-10`, antes 32px) para que se vea proporcional al logo agrandado.

## Modo oscuro

El sitio soporta tema claro/oscuro con un toggle (ícono sol/luna) en el Header, visible con o sin sesión:

- **Mecanismo**: Tailwind v4 no trae modo oscuro por clase por defecto (solo por `prefers-color-scheme`), así que `globals.css` declara `@custom-variant dark (&:where(.dark, .dark *));` para que las utilidades `dark:` respondan a una clase `.dark` en `<html>` en vez del sistema operativo.
- **Sin parpadeo (FOUC)**: `layout.tsx` inyecta un `<Script strategy="beforeInteractive">` que lee `localStorage.getItem("theme")` (o `prefers-color-scheme` si no hay preferencia guardada) y aplica la clase `dark` **antes** de que React hidrate — por eso `<html>` lleva `suppressHydrationWarning`.
- **Toggle**: `ThemeToggle.tsx` alterna la clase `dark` en `document.documentElement` y guarda la elección en `localStorage` (`theme: "light" | "dark"`).
- **Cobertura**: se agregaron variantes `dark:` en todas las páginas y componentes existentes (landing, registro, login, perfil, seguridad de cuenta, términos, privacidad, admin, historial).

## Despliegue

- **Hosting**: [Vercel](https://vercel.com), proyecto `servisoluciones-aragon/colombia-contrata`, conectado al repo de GitHub — cada push a `main` despliega automáticamente a producción.
- **Repo**: [servisolucionesaragon/Colombia_Contrata](https://github.com/servisolucionesaragon/Colombia_Contrata).
- **Backend**: [Supabase](https://supabase.com) (proyecto `colombia-contrata`, ref `zjbijmieiyumpqwyqhfm`, región São Paulo) — Auth + Postgres (`profiles`, `planes_empresa`, `precios_documentos`, `configuracion_portal`, ver [Base de datos](#base-de-datos-postgres)) + Storage (bucket `portal-assets`).
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
- [ ] Conectar `nombre_portal` y `eslogan` de `configuracion_portal` al front (logo, favicon y color primario ya están conectados — ver sección de tablas).
- [ ] Registrar la IP en la trazabilidad de consentimiento de Habeas Data (requiere un endpoint de servidor/Route Handler, ya que `supabase.auth.signUp` corre en el cliente).
- [ ] Flujo de compra/consumo de créditos de `planes_empresa` (checkout, descuento de créditos al consultar, invitación de candidatos, historial real en `/historial`) — hoy los planes solo se muestran y administran, no se pueden comprar ni consumir todavía.
- [ ] Crear cuentas de persona/empresa desde `/admin` (el usuario decidió dejar esto fuera de alcance por ahora — solo se construyó "asignar administradores", que ya está listo).
- [ ] Storage con URLs firmadas para la expiración de 10 días de los documentos de personas.
- [ ] Integración con la API del proveedor de fuentes (contraloría, policía, procuraduría, etc.) — aún no contratada.
- [ ] Pasarela de pagos (Wompi / PayU).
- [ ] Generación y empaquetado de PDFs + expiración de 10 días.
- [ ] Revisión legal de `/terminos` y `/privacidad` + completar datos legales de la empresa.
- [ ] Traducir y activar el resto de plantillas de "Security" en Supabase si se llegan a necesitar (MFA, cambio de contraseña, cambio de teléfono — "Change Email Address" ya está lista).
