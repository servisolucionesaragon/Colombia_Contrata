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

Las llaves de Wompi **no** son variables de entorno — se configuran desde `/admin` → **Pagos (Wompi)** y se guardan en la tabla `configuracion_wompi`, precisamente para poder activarlas sin pasar por Vercel ni hacer un redeploy. Ver [Solicitud de documentos y pago con Wompi](#solicitud-de-documentos-y-pago-con-wompi).

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
| `/solicitar` | Checklist de documentos para personas naturales + pago | **Conectado de verdad** — crea una fila en `solicitudes` y redirige al checkout de Wompi (ver [Solicitud de documentos y pago con Wompi](#solicitud-de-documentos-y-pago-con-wompi)); solo para cuentas `account_type = "persona"` con perfil completo |
| `/solicitar/confirmacion` | Página de retorno tras el pago en Wompi | Lee el estado de la `solicitud` por su referencia y lo muestra (pagado/pendiente/fallido) |
| `/terminos` | Términos y Condiciones | Borrador, falta revisión legal — **editable desde `/admin` → Páginas** (ver [Términos y Privacidad como páginas editables](#términos-y-privacidad-como-páginas-editables)) |
| `/privacidad` | Política de Tratamiento de Datos Personales (Ley 1581) | Borrador, falta revisión legal — **editable desde `/admin` → Páginas** (mismo mecanismo que `/terminos`) |
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
    historial/page.tsx     # placeholder de historial de solicitudes (protegido por sesión) — pendiente conectar a la tabla solicitudes, ver Roadmap
    terminos/page.tsx     # términos y condiciones — lee titulo/contenido de la tabla paginas (slug "terminos"), con fallback hardcodeado si no hay fila
    privacidad/page.tsx   # política de datos personales — mismo mecanismo, slug "privacidad"
    solicitar/page.tsx           # checklist de documentos (personas) + creación de la solicitud
    solicitar/confirmacion/page.tsx # página de retorno tras el pago en Wompi
    admin/page.tsx        # back office (protegido por AdminGate)
    api/admin/roles/route.ts # Route Handler: dar/quitar admin por correo, usa la Service Role Key (solo servidor)
    api/solicitudes/crear/route.ts # Route Handler: valida perfil/documentos, crea la solicitud, arma la URL del checkout de Wompi (o devuelve pagoDisponible:false si faltan las llaves)
    api/webhooks/wompi/route.ts    # Route Handler: recibe la confirmación de pago de Wompi y actualiza el estado de la solicitud
    api/admin/wompi-config/route.ts # Route Handler: guarda/consulta las llaves de Wompi en configuracion_wompi (admin-only, nunca devuelve los secretos ya guardados)
  components/
    Header.tsx / Footer.tsx # Header es client component: lee sesión + tabla profiles, muestra menú de usuario (avatar, Inicio/Historial/Perfil/Cerrar sesión) y el ThemeToggle. Footer es server component async: lee configuracion_portal y muestra íconos de redes sociales configuradas
    SocialIcons.tsx         # íconos SVG de Facebook/Instagram/X/LinkedIn/TikTok/WhatsApp, usados por Footer.tsx y WhatsAppButton.tsx
    WhatsAppButton.tsx      # server component async, botón flotante fijo (agregado en layout.tsx, aparece en todo el sitio); solo se renderiza si whatsapp_activo=true y hay whatsapp_numero
    ThemeToggle.tsx         # botón sol/luna, toggle de clase "dark" en <html>, persiste en localStorage
    RegisterForm.tsx       # registro real vía Supabase Auth (signUp + metadata de consentimiento)
    LoginForm.tsx           # login real vía Supabase Auth (signInWithPassword)
    ProfileForm.tsx        # lee y guarda (upsert) en la tabla profiles según persona/empresa
    AccountSecurityForm.tsx # cambio de contraseña/correo vía supabase.auth.updateUser, en /perfil
    HistorialContent.tsx    # contenido de /historial (gate de sesión + estado vacío)
    SolicitarContent.tsx    # checklist de documentos + total + llamada a /api/solicitudes/crear + redirección al checkout de Wompi
    ConfirmacionContent.tsx # lee el estado de la solicitud por su referencia (?reference=) y lo muestra tras volver de Wompi
    WompiConfigManager.tsx  # admin: guarda las llaves de Wompi (formulario "write-only" para los secretos, ver Solicitud de documentos y pago con Wompi)
    AdminGate.tsx           # bloquea /admin a menos que la sesión tenga app_metadata.role === "admin"
    AdminTabs.tsx            # menú lateral agrupado del panel admin (Identidad / grupo Página principal / grupo Planes y documentos / Administradores)
    AdminSettingsForm.tsx  # identidad del portal — lee/guarda en configuracion_portal, sube logo/favicon a Storage
    LandingConfigManager.tsx # admin: textos y mostrar/ocultar secciones de la página principal (configuracion_landing)
    BloquesLandingManager.tsx # admin: agregar/editar/eliminar/reordenar bloques libres de texto+imagen+botón (bloques_landing)
    PaginasManager.tsx      # admin: crear/editar/eliminar páginas propias con URL propia (paginas)
    RichTextEditor.tsx      # editor tipo Word (contentEditable + execCommand, sin dependencias npm) usado por PaginasManager.tsx
    ConfiguracionPersonaManager.tsx # admin: edita la tarjeta "Persona independiente" (configuracion_persona)
    PlanesEmpresaManager.tsx    # CRUD admin de planes_empresa (incluye planes privados por empresa)
    PreciosDocumentosManager.tsx # CRUD admin de documentos disponibles (precios_documentos, sin precio)
    AdminRolesManager.tsx        # admin: dar/quitar acceso de administrador por correo (llama /api/admin/roles)
    PlanPersonaCard.tsx          # tarjeta pública "Persona independiente" en "/", lee configuracion_persona
    PlanesEmpresaPricing.tsx    # tarjetas de precios públicas en "/" (toggle mensual/anual)
    PreciosDocumentosPricing.tsx # lista pública de documentos disponibles en "/" (sin precio)
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

`/terminos` y `/privacidad` son **borradores de plantilla** — deben ser revisados por un abogado y completados con la razón social/NIT reales antes de producción. El aviso visible de "falta revisión legal" que tenían en pantalla se quitó a pedido del usuario (2026-08-09, componente `LegalDisclaimer.tsx` eliminado); esta advertencia queda solo aquí y en `.claude/CLAUDE.md`, no en el sitio público.

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

### `planes_empresa`, `precios_documentos`, `configuracion_portal`, `configuracion_persona` y `configuracion_landing`

Estas tablas tienen **lectura pública** (`using (true)`, salvo `planes_empresa` que además filtra planes privados — ver abajo) y **escritura solo para administradores** (`(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`):

- **`planes_empresa`**: planes de créditos/consultas para empresas. Columnas: `nombre`, `descripcion`, `creditos`, `precio_mensual`, `precio_anual` (opcional), `destacado` (insignia "Recomendado"), `features` (`text[]`, una línea por característica en el formulario admin), `cta_label` (texto del botón, opcional), `mostrar_precio_desde` (para planes tipo cotización, ej. "Enterprise"), y **`empresa_id`** (opcional, referencia a `profiles.id`) — si tiene valor, es un **plan privado** visible solo para esa empresa y para admins, no aparece en la grilla pública de `/`. La política de `select` filtra por `empresa_id is null or empresa_id = auth.uid() or ...admin`. Planes actuales: **Lite, Standard, Advanced, Professional, Business, Enterprise** — precios/créditos son valores de ejemplo puestos por el asistente, no confirmados por el usuario, editables desde `/admin` → Planes de empresa.
- **`precios_documentos`** (pestaña "Documentos disponibles" en el admin, a pesar del nombre de la tabla): estos documentos **no tienen precio individual** — la columna `precio` sigue existiendo mismo pero es nullable y no se usa en la UI (se dejó por si se retoma más adelante). Solo `documento` y `activo`.
- **`configuracion_persona`**: fila única (`id` fijo en `1`) para la tarjeta "Persona independiente" que se muestra en `/` — `titulo`, `descripcion`, `cta_label`, `precio_desde` (opcional) y `activo` (si está en `false`, la tarjeta no se muestra).
- **`configuracion_portal`**: fila única (`id` fijo en `1`, con `check (id = 1)`) para nombre del portal, eslogan, color primario y URLs de logo/favicon. Las imágenes se suben al bucket de Storage **`portal-assets`** (público para lectura, admin-only para escribir) vía `supabase.storage.from("portal-assets").upload(...)`. También tiene las **redes sociales** (`facebook_url`, `instagram_url`, `twitter_url`, `linkedin_url`, `tiktok_url` — todas opcionales, se agregaron 2026-08-08), el **botón flotante de WhatsApp** (`whatsapp_numero`, `whatsapp_mensaje`, `whatsapp_activo`), el **correo de contacto** (`correo_contacto`) y el **texto legal del pie de página** (`footer_texto` — el copyright completo se arma en `Footer.tsx` como `© {año actual} {nombre_portal}. {footer_texto}`, el año siempre es automático).
- **`configuracion_landing`**: fila única (`id` fijo en `1`) con los textos de la página de inicio (`/`) y un interruptor de mostrar/ocultar por sección. Columnas: `hero_titulo_prefijo` / `hero_titulo_destacado` (el título del encabezado se parte en dos para poder resaltar la segunda parte en azul), `hero_subtitulo`, `hero_cta_primario_label`, `hero_cta_secundario_label` (el encabezado principal siempre se muestra, sin interruptor); `como_funciona_activo` + `como_funciona_titulo` + `paso1_titulo`/`paso1_descripcion`/`paso2_*`/`paso3_*`; `documentos_activo` + `documentos_titulo` + `documentos_subtitulo` (la lista de documentos en sí sigue viniendo de `precios_documentos`); `planes_activo` + `planes_titulo` + `planes_empresa_titulo` + `planes_empresa_subtitulo` (la tarjeta de persona y los planes de empresa en sí siguen viniendo de `configuracion_persona`/`planes_empresa`). Se administra desde `/admin` → pestaña **Página principal** (`LandingConfigManager.tsx`).
- **`bloques_landing`**: a diferencia de las anteriores, **no** es fila única — cada fila es un bloque libre de contenido (texto + imagen opcional + botón opcional) que se muestra en `/`, en orden, al final de la página antes del pie de página. Columnas: `orden` (entero, controla la posición — se reasigna al usar las flechas ▲▼ en el admin, intercambiando el `orden` con el bloque vecino), `activo`, `titulo` (opcional), `descripcion` (opcional, admite saltos de línea — se renderiza con `whitespace-pre-line`), `imagen_url` (opcional, sube a Storage `portal-assets`), `imagen_posicion` (`'izquierda'` o `'derecha'`, solo aplica si hay imagen — controla si el texto queda a la izquierda o derecha de la imagen en pantallas ≥ `sm`, en mobile siempre se apilan), `imagen_ancho` (entero en px, opcional — ver gotcha abajo), `fondo_color` (hex, opcional — si se deja vacío, el fondo alterna claro/gris automáticamente según la posición en la lista; si se define, ese color gana sobre el alternado), `boton_label` + `boton_href` (opcionales, deben venir los dos juntos para que se muestre el botón). Si un bloque no tiene imagen, el texto se centra como un bloque de texto simple. El fondo alterna claro/gris automáticamente según la posición del bloque en la lista (no es un campo editable). Se administra desde `/admin` → pestaña **Bloques de contenido** (`BloquesLandingManager.tsx`), con soporte para agregar, editar, eliminar y reordenar.

⚠️ **Gotcha de tamaño de imagen**: la primera versión forzaba la imagen a `w-full sm:w-1/2 object-cover` (mitad del ancho de la fila, recortada) — con eso, cualquier imagen se veía artificialmente enorme sin importar su tamaño real, y el usuario lo reportó ("quedan de un tamaño muy grande y no del tamaño original"). Se corrigió quitando el forzado de ancho: ahora el `<img>` no lleva `width` fijo (así respeta su tamaño natural/intrínseco) y solo lleva `style={{ maxWidth: "min(Npx, 100%)" }}` con `object-contain`, donde `N` es `imagen_ancho` (por defecto 400 si el campo queda vacío). El `min(...)` evita que se desborde en pantallas angostas sin necesitar una media query aparte. Verificado con `getBoundingClientRect()` + `naturalWidth`/`naturalHeight` por JS: coinciden exactamente cuando la imagen real es más chica que el tope configurado.

⚠️ **Gotcha del botón "Eliminar" en el navegador automatizado de Claude Code**: `BloquesLandingManager.tsx` (igual que `PlanesEmpresaManager.tsx`) usa `window.confirm(...)` antes de borrar. En un navegador normal esto muestra el diálogo nativo de confirmación sin problema. En el navegador automatizado que usa el asistente dentro de Claude Code, ese diálogo nativo no se puede aceptar (el clic en "Eliminar" no tiene efecto visible) — para borrar una fila de prueba durante una sesión de verificación hay que hacerlo por SQL directo en Supabase en vez de por la UI. Esto es una limitación de la herramienta de automatización, no un bug del sitio.

Todas se administran desde `/admin` (ver [Panel de administración](#panel-de-administración)) y se reflejan en vivo en el sitio: `configuracion_persona` y los planes/documentos de inmediato (lectura client-side); `configuracion_portal` (logo, favicon y color primario) y `configuracion_landing` (textos e interruptores de la página de inicio) con hasta 60s de retraso — `Header.tsx` lee `logo_url`/`color_primario` client-side; `layout.tsx` (favicon) y `page.tsx` (textos de la landing) usan `export const revalidate = 60`, así no hace falta un redeploy para ver el cambio, solo esperar hasta un minuto y recargar. El nombre del portal y el eslogan de `configuracion_portal` siguen sin conectarse al front — solo se guardan en la tabla, pendiente en el roadmap.

⚠️ **Gotcha de JSX con comillas dentro de un atributo**: en `LandingConfigManager.tsx` un `label="Título \"Planes para empresas\""` rompió el build (`Parsing ecmascript source code failed`) — dentro de un atributo JSX con comillas dobles, `\"` **no** es un escape válido como en un string de JS normal. Si un texto necesita comillas visibles dentro de un atributo, usar comillas tipográficas (`“ ”`) como en el resto del archivo, o cambiar las comillas delimitadoras del atributo a simples.

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
  facebook_url text,
  instagram_url text,
  twitter_url text,
  linkedin_url text,
  tiktok_url text,
  whatsapp_numero text,
  whatsapp_mensaje text default 'Hola, quiero más información.',
  whatsapp_activo boolean not null default false,
  correo_contacto text not null default 'contacto@colombiacontrata.com',
  footer_texto text not null default 'Todos los derechos reservados.',
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


create table public.configuracion_landing (
  id int primary key default 1,
  hero_titulo_prefijo text not null default 'Todos tus documentos de contratación pública,',
  hero_titulo_destacado text not null default 'en un solo lugar',
  hero_subtitulo text not null default 'Olvídate de visitar una a una las entidades. Selecciona los certificados que necesitas, paga una sola vez y recíbelos listos para presentar.',
  hero_cta_primario_label text not null default 'Solicitar mis documentos',
  hero_cta_secundario_label text not null default 'Soy empresa',
  como_funciona_activo boolean not null default true,
  como_funciona_titulo text not null default 'Cómo funciona',
  paso1_titulo text not null default 'Selecciona tus documentos',
  paso1_descripcion text not null default 'Marca en el checklist los documentos que necesitas para tu proceso de contratación.',
  paso2_titulo text not null default 'Autoriza y paga',
  paso2_descripcion text not null default 'Autoriza el tratamiento de tus datos y realiza el pago de forma segura.',
  paso3_titulo text not null default 'Recibe tus documentos',
  paso3_descripcion text not null default 'Te notificamos por correo cuando estén listos. Descárgalos en un solo comprimido, disponible por 10 días.',
  documentos_activo boolean not null default true,
  documentos_titulo text not null default 'Documentos disponibles',
  documentos_subtitulo text not null default 'Los certificados más solicitados para procesos de contratación pública.',
  planes_activo boolean not null default true,
  planes_titulo text not null default 'Planes',
  planes_empresa_titulo text not null default 'Planes para empresas',
  planes_empresa_subtitulo text not null default 'Paquetes de consultas para validar antecedentes de tus candidatos antes de contratar, con su autorización.',
  updated_at timestamptz not null default now(),
  constraint configuracion_landing_singleton check (id = 1)
);

insert into public.configuracion_landing (id) values (1);

alter table public.configuracion_landing enable row level security;

create policy "Anyone can view configuracion_landing"
  on public.configuracion_landing for select
  using (true);

create policy "Admins can update configuracion_landing"
  on public.configuracion_landing for update
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');


create table public.bloques_landing (
  id uuid primary key default gen_random_uuid(),
  orden integer not null default 0,
  activo boolean not null default true,
  titulo text,
  descripcion text,
  imagen_url text,
  imagen_posicion text not null default 'derecha' check (imagen_posicion in ('izquierda','derecha')),
  boton_label text,
  boton_href text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bloques_landing enable row level security;

create policy "Anyone can view bloques_landing"
  on public.bloques_landing for select
  using (true);

create policy "Admins can insert bloques_landing"
  on public.bloques_landing for insert
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can update bloques_landing"
  on public.bloques_landing for update
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can delete bloques_landing"
  on public.bloques_landing for delete
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');


create table public.paginas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null,
  contenido text,
  activo boolean not null default true,
  mostrar_en_menu boolean not null default false,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.paginas enable row level security;

create policy "Anyone can view paginas"
  on public.paginas for select
  using (true);

create policy "Admins can insert paginas"
  on public.paginas for insert
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can update paginas"
  on public.paginas for update
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can delete paginas"
  on public.paginas for delete
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can delete portal-assets"
  on storage.objects for delete
  using (bucket_id = 'portal-assets' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Solicitudes de documentos (personas) + pago con Wompi, ver
-- "Solicitud de documentos y pago con Wompi" más abajo.
create table public.solicitudes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  documentos jsonb not null,
  monto numeric not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado', 'fallido')),
  wompi_referencia text not null unique,
  wompi_transaction_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.solicitudes enable row level security;

create policy "Users can view own solicitudes"
  on public.solicitudes for select
  using (auth.uid() = user_id);

create policy "Users can insert own solicitudes"
  on public.solicitudes for insert
  with check (auth.uid() = user_id);

-- No hay policy de "update" pública a propósito: el estado solo lo cambia
-- el webhook de Wompi (src/app/api/webhooks/wompi/route.ts), que usa la
-- Service Role Key y por lo tanto ignora RLS.

-- Llaves de Wompi, editables desde /admin -> Pagos (Wompi), con Sandbox y
-- Producción guardados por separado (Colombia Contrata no tiene un sitio
-- de pruebas aparte) y "ambiente_activo" decidiendo cuál usan
-- /api/solicitudes/crear y /api/webhooks/wompi. Sin ninguna policy de
-- select/insert/update: con RLS activado y sin policies, Postgres
-- deniega todo por defecto para anon/authenticated. Solo la Service Role
-- Key (server-side) puede leerla o escribirla, siempre a través de
-- /api/admin/wompi-config (verifica que quien llama sea admin).
create table public.configuracion_wompi (
  id int primary key default 1,
  ambiente_activo text not null default 'sandbox' check (ambiente_activo in ('sandbox', 'produccion')),
  sandbox_base_url text not null default 'https://sandbox.wompi.co/v1',
  sandbox_public_key text,
  sandbox_integrity_secret text,
  sandbox_events_secret text,
  produccion_base_url text not null default 'https://production.wompi.co/v1',
  produccion_public_key text,
  produccion_integrity_secret text,
  produccion_events_secret text,
  updated_at timestamptz not null default now(),
  constraint configuracion_wompi_singleton check (id = 1)
);

insert into public.configuracion_wompi (id) values (1);

alter table public.configuracion_wompi enable row level security;
```

</details>

## Panel de administración

`/admin` está protegido por `AdminGate.tsx` (client component): revisa que la sesión tenga `user.app_metadata.role === "admin"`. Se usa `app_metadata` y no `user_metadata` a propósito — `user_metadata` lo puede editar el propio usuario desde el cliente (`supabase.auth.updateUser`), así que no sirve para permisos; `app_metadata` solo se puede modificar desde el backend de Supabase.

`AdminTabs.tsx` organiza el panel como un **menú lateral agrupado** (no pestañas horizontales — con siete secciones ya no cabían sin scroll, ver gotcha abajo), todas con guardado real:

- **Identidad del portal** (`AdminSettingsForm.tsx`) — nombre, eslogan, color primario, logo y favicon (`configuracion_portal` + Storage).
- Grupo **Página principal**:
  - **Textos y secciones** (`LandingConfigManager.tsx`) — textos del encabezado, de la sección "Cómo funciona" (título + 3 pasos) y de los títulos/subtítulos de "Documentos disponibles" y "Planes", más un interruptor mostrar/ocultar por sección (`configuracion_landing`).
  - **Bloques de contenido** (`BloquesLandingManager.tsx`) — agregar/editar/eliminar/reordenar bloques libres de texto + imagen opcional + botón opcional, que se muestran al final de `/` antes del pie de página (`bloques_landing`). Ver detalle abajo.
  - **Páginas** (`PaginasManager.tsx`) — páginas propias con su propia URL (ej. "Nosotros"), con editor de texto enriquecido. Ver detalle abajo.
- Grupo **Planes y documentos**:
  - **Planes de personas** (`ConfiguracionPersonaManager.tsx`) — título/descripción/precio-desde/CTA de la tarjeta "Persona independiente" en `/`.
  - **Planes de empresa** (`PlanesEmpresaManager.tsx`) — crear/editar/eliminar planes; incluye la opción de asignar un plan a una sola empresa (privado).
  - **Documentos disponibles** (`PreciosDocumentosManager.tsx`) — lista de documentos para personas naturales (sin precio).
- **Pagos (Wompi)** (`WompiConfigManager.tsx`) — llave pública y secretos de integridad/eventos de Wompi (`configuracion_wompi`). Ver [Solicitud de documentos y pago con Wompi](#solicitud-de-documentos-y-pago-con-wompi).
- **Administradores** (`AdminRolesManager.tsx`) — dar/quitar acceso de administrador escribiendo el correo de una cuenta ya registrada.

⚠️ **Gotcha de UI**: con 7 secciones, las pestañas horizontales (aunque el contenedor ya se había agrandado de `max-w-4xl` a `max-w-6xl` en una sesión anterior) volvieron a necesitar scroll horizontal. Se resolvió cambiando a un menú lateral (`sm:w-60`, sticky) agrupado por categoría, y ensanchando el contenedor a `max-w-7xl`. Si se agregan más secciones en el futuro, agruparlas dentro de un grupo existente o crear uno nuevo en el array `nav` de `AdminTabs.tsx` — el menú lateral crece verticalmente sin límite práctico, a diferencia de las pestañas horizontales.

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

## Enlaces de navegación (anclas a la página principal)

`navLinks` en `Header.tsx` (Cómo funciona / Documentos / Planes / Empresas) y los enlaces de la columna "Plataforma" en `Footer.tsx` apuntan a secciones de `/` por ancla — **`/#planes`, no `#planes`**. El `/` inicial es obligatorio: como el Header y el Footer se muestran en todas las páginas del sitio (no solo en `/`), un `href="#planes"` sin el `/` solo cambiaría el fragmento de la URL de la página en la que ya estás — en `/paginas/nosotros`, por ejemplo, el enlace no llevaría a ningún lado porque ahí no existe ningún elemento con `id="planes"`. Con `/#planes` el navegador siempre vuelve primero a la página principal y después salta a la sección. (El botón "Soy empresa" del propio hero en `page.tsx` sí puede usar `#empresas` sin barra, porque ese botón solo existe dentro de `/`.)

## Menú de usuario

Cuando hay sesión activa, `Header.tsx` reemplaza los botones "Iniciar sesión"/"Crear cuenta" por un menú desplegable: círculo con iniciales (calculadas del nombre/razón social) en azul, nombre en azul negrilla, y al abrirlo muestra nombre + correo arriba y cuatro opciones con ícono — **Inicio**, **Historial**, **Perfil** y **Cerrar sesión**. El nombre viene de la tabla `profiles` — para persona es `primer_nombre` + `primer_apellido` (no solo el primer nombre), para empresa es `razon_social` — con el correo como respaldo si el usuario aún no la completó. Las iniciales del círculo: persona → primera letra de `primer_nombre` + primera letra de `primer_apellido`; empresa → iniciales de las dos primeras palabras de `razon_social`.

**Tamaños de logo/avatar** (ajustados 2026-08-08 a pedido del usuario): el isotipo del Header mide 44px (`size-11`/`h-11`, antes 32px). El círculo de iniciales del menú desplegable de escritorio mide 28px (`size-7`); el del panel de menú móvil (el que se abre con el ícono de hamburguesa) mide 40px (`size-10`, antes 32px) para que se vea proporcional al logo agrandado.

## Estilo visual de la página principal (2026-08-08)

Después de aplicar un diseño personalizado completo a la página "Nosotros" (ver más abajo), al usuario le gustó tanto el estilo que pidió adoptarlo también en `/` — **incluyendo la franja de colores de marca arriba**. A diferencia de "Nosotros" (HTML/CSS estático pegado tal cual), en `/` el mismo lenguaje visual se **tradujo a clases de Tailwind** aplicadas directamente en `src/app/page.tsx` (y en `PreciosDocumentosPricing.tsx`, `PlanPersonaCard.tsx`, `PlanesEmpresaPricing.tsx`) — a propósito, para no perder nada de lo dinámico (textos de `configuracion_landing`, planes y documentos en vivo desde Supabase, interruptores mostrar/ocultar) ni el soporte de modo oscuro, que un bloque de CSS suelto no habría tenido.

Cambios de estilo aplicados: fondo degradado + badge + título más grande en el hero; tarjetas redondeadas con sombra al pasar el mouse en "Cómo funciona", "Documentos disponibles" y los planes; botones con efecto de elevación (`hover:-translate-y-0.5` + sombra de color) en vez de solo cambiar de color; encabezados de sección más grandes y consistentes en todas las secciones, incluidos los Bloques de contenido.

**Franja de colores de marca** (amarillo/azul/rojo, 5px de alto): se agregó originalmente como elemento propio en `page.tsx`, justo debajo del `<Header />` y fuera de él a propósito — el usuario pidió explícitamente que "se oculte cuando haga scroll hacia abajo". Como `Header.tsx` es `sticky top-0`, si la franja viviera *dentro* del Header se quedaría pegada arriba para siempre; al vivir *después*, en el flujo normal de la página, desaparece apenas se hace scroll mientras el menú se mantiene fijo. **Actualización 2026-08-09**: el usuario pidió que la franja estuviera "siempre en todas las páginas", no solo en `/` — se movió de `page.tsx` a `Header.tsx` mismo, que ahora devuelve un fragment con el `<header>` sticky y la franja como **hermana** (no dentro del sticky, mismo cuidado que antes para que se siga ocultando al hacer scroll). Como `Header.tsx` se usa en todas las páginas del sitio, la franja ahora aparece automáticamente en cualquier página nueva sin tener que agregarla a mano — verificado en `/`, `/terminos`, `/privacidad` y `/login`.

**Insignia del hero quitada** (2026-08-08): el hero tenía una insignia pequeña ("● Colombia Contrata") encima del título — el usuario pidió quitarla ("quita el texto 'Colombia Contrata' que está por encima de 'Todos tus documentos de contratación...'"). Se eliminó el `<span>` completo (el punto + el texto), no solo el texto, para no dejar una píldora vacía; el `<h1>` pasó a ser el primer elemento dentro del hero.

## Términos y Privacidad como páginas editables

`/terminos` y `/privacidad` (2026-08-09, a pedido del usuario "ponle diseño también" y luego "conviértelo en páginas editables desde admin") pasaron por dos cambios seguidos:

1. **Rediseño visual** con el mismo lenguaje que el resto del sitio: encabezado tipo hero con degradado e ícono (documento para Términos, escudo para Privacidad), y el contenido dentro de una tarjeta redondeada (`rounded-2xl`) sobre fondo gris claro — mismo tratamiento que las tarjetas de precios. Cada sección (antes un `<h2>` simple con "1. Objeto" escrito a mano) ahora numera automáticamente con un círculo azul de marca vía **CSS counter** (`.legal-content` en `globals.css`): `counter-reset`/`counter-increment` en cada `<h2>`, con el número dibujado en un `::before` — así el admin escribe `<h2>Objeto</h2>` sin número y el círculo "1" aparece solo, igual que los pasos de "Cómo funciona" en `/`.
2. **Contenido editable desde `/admin`**: ambas páginas ahora leen `titulo`/`contenido` de la misma tabla `paginas` que usa "Nosotros" (`.eq("slug", "terminos")` / `"privacidad")`, con un `DEFAULT_CONTENIDO`/`DEFAULT_TITULO` hardcodeado en cada `page.tsx` como respaldo si la fila no existe o `activo=false` — así el sitio nunca se queda sin contenido legal aunque alguien borre la fila por error. Las dos filas se cargaron por SQL directo (no por el textarea del admin) para transcribir el HTML exacto sin pelear con la automatización de teclado.

Como `terminos` y `privacidad` son ahora filas de `paginas` pero con **ruta propia fija** (no genérica `/paginas/<slug>`), se agregaron tres salvaguardas para que no queden accesibles ni enlazadas por duplicado en `/paginas/terminos`:
   - `src/app/paginas/[slug]/page.tsx` hace `notFound()` si el slug es `"terminos"` o `"privacidad"` (constante `SLUGS_RESERVADOS`).
   - `Header.tsx` excluye esos dos slugs de la consulta que arma el menú automático de páginas (`.not("slug", "in", "(terminos,privacidad)")`).
   - `PaginasManager.tsx` detecta estos dos slugs (`SLUGS_ESPECIALES`) y en el listado de `/admin` muestra su URL real (`/terminos`, `/privacidad`) en vez de `/paginas/<slug>`, con el campo de URL en modo solo-lectura y un aviso de que no se debe cambiar — si alguien le cambiara el slug, la página en `/terminos` simplemente caería de vuelta al `DEFAULT_CONTENIDO` hardcodeado (no se rompe, pero deja de reflejar lo que el admin haya editado).

**Aviso de "plantilla base" quitado**: el recuadro amarillo que decía "Este documento es una plantilla base... aún no ha sido revisada por un abogado" (componente `LegalDisclaimer.tsx`) se eliminó por completo a pedido del usuario. La advertencia de que faltan revisión legal y datos reales de la empresa sigue viva en este README y en `.claude/CLAUDE.md`, pero ya no se muestra en el sitio público.

**Ancho igual a "Nosotros"**: el usuario pidió que ambas páginas tuvieran "el mismo ancho que la página de Nosotros". Al medir el `.container` de Nosotros en vivo (`getBoundingClientRect()` con la ventana en 1600px), el ancho real resultó ser `min(1180px, 92%)` → **1180px**, no los 1440px que la documentación anterior decía (ver gotcha abajo). Se ajustaron los contenedores de `/terminos` y `/privacidad` a `max-w-[1180px]` para que coincidan de verdad.

⚠️ **Gotcha — un `UPDATE ... replace()` "exitoso" en Supabase no garantiza que el valor cambió**: la entrada anterior de este README decía que el `.container` de "Nosotros" se había ensanchado de `min(1180px, 92%)` a `min(1440px, 95%)` con un `UPDATE ... SET contenido = replace(...)`. Al medir en vivo el 2026-08-09 para igualar el ancho de Términos/Privacidad, el valor real seguía siendo `min(1180px, 92%)` — el `replace()` no tomó efecto (causa no diagnosticada; posiblemente el patrón buscado no coincidía exactamente con el string guardado) y nadie lo verificó con una medición real en su momento, solo con el mensaje de éxito de Supabase. **Lección**: después de un `UPDATE` que depende de que un patrón de texto coincida exactamente (`replace()`, no un valor fijo), confirmar el resultado leyendo el dato de vuelta o midiendo en el navegador — el "Success" de Supabase solo confirma que la sentencia SQL corrió, no que el `replace()` encontró y cambió algo.

**Insignia del hero quitada** (2026-08-08): el hero tenía una insignia pequeña ("● Colombia Contrata") encima del título — el usuario pidió quitarla ("quita el texto 'Colombia Contrata' que está por encima de 'Todos tus documentos de contratación...'"). Se eliminó el `<span>` completo (el punto + el texto), no solo el texto, para no dejar una píldora vacía; el `<h1>` pasó a ser el primer elemento dentro del hero.

## Páginas propias

Desde `/admin` → **Páginas** se pueden crear páginas con su propia URL — pensado para cosas como "Nosotros", "Visión y misión", "Servicios", etc. — sin tocar código.

- Tabla `paginas`: `slug` (único, define la URL — `/paginas/<slug>`), `titulo`, `contenido` (HTML, escrito con el editor de texto enriquecido), `activo`, `mostrar_en_menu`, `orden`.
- **Excepción**: las filas con slug `terminos` y `privacidad` no se sirven en `/paginas/<slug>` sino en sus rutas fijas `/terminos` y `/privacidad` (con su propio diseño) — ver [Términos y Privacidad como páginas editables](#términos-y-privacidad-como-páginas-editables).
- **El slug se autogenera del título** (minúsculas, sin tildes, espacios → guiones) la primera vez, pero es editable a mano; debe ser único (si se repite, Postgres devuelve un error de constraint `unique` que `PaginasManager.tsx` traduce a un mensaje legible).
- **`mostrar_en_menu`**: si está activo, la página aparece automáticamente como un enlace más en el menú de navegación de `Header.tsx` (desktop y móvil), después de los enlaces fijos (Cómo funciona / Documentos / Planes / Empresas). Si está desactivado, la página existe y es accesible por su URL, pero hay que enlazarla a mano — por ejemplo desde el botón de un bloque de `bloques_landing` (pestaña "Bloques de contenido") apuntando a `/paginas/<slug>`, o desde cualquier otro lugar del sitio.
- La ruta pública es `src/app/paginas/[slug]/page.tsx` — un server component async con `export const revalidate = 60` que hace `notFound()` (404 real de Next.js) si el slug no existe o la página está `activo = false`.
- **Diseño de la plantilla — se probó y se revirtió** (2026-08-08): se intentó un diseño "más profesional" (encabezado tipo hero con fondo `bg-brand-navy`, divisores entre secciones `<h2>`, listas con check ✓), pero el usuario no lo quiso ("no me gusta este diseño") — específicamente el encabezado navy y los divisores, y en general prefirió "algo más simple". Se revirtió a la plantilla original (solo `<h1>` + contenido con estilos básicos `[&_h2]`/`[&_h3]`/listas normales, sin fondo de color ni separadores). **No reintentar un rediseño visual de esta plantilla sin confirmar antes con el usuario qué tan minimalista lo quiere.**
- **`RichTextEditor.tsx`**: editor tipo Word (negrita, cursiva, subrayado, H2/H3, listas, enlaces, quitar formato) hecho con `contentEditable` + `document.execCommand` — **sin ninguna librería npm nueva**, a propósito, para no arriesgar una instalación lenta/inestable en la unidad de red (ver [Entorno de desarrollo local](#entorno-de-desarrollo-local--importante)). El HTML resultante se guarda tal cual en `contenido` y se renderiza con `dangerouslySetInnerHTML` tanto en el propio editor (para mostrar el valor ya guardado) como en la página pública — es seguro porque ese HTML lo escribe el propio administrador desde `/admin`, no un visitante del sitio, el mismo modelo de confianza que cualquier CMS.
- **Modo código HTML** (2026-08-08, a pedido del usuario "me gustaría que en estas páginas también se pudiera editar el texto en formato HTML"): botón `</>` en la esquina derecha de la barra de herramientas de `RichTextEditor.tsx` que alterna entre la vista visual (contentEditable) y un `<textarea>` con el HTML crudo. Útil, por ejemplo, para limpiar el HTML "sucio" que queda al pegar contenido copiado de Word/Google Docs (`class="MsoNormal"`, `mso-bidi-font-size`, etc.). El estado `htmlValue` es la fuente de verdad al cambiar de modo: al pasar a código se lee `editorRef.current.innerHTML`; al volver a visual, el `contentEditable` se vuelve a montar con `dangerouslySetInnerHTML={{ __html: htmlValue }}` — mientras se escribe en modo visual, el HTML **no** se sincroniza a ese estado en cada tecla (solo al cambiar de modo), para no perder la posición del cursor.
- **Páginas con diseño personalizado completo** (2026-08-08, mismo día): el usuario pegó un HTML/CSS completo tipo landing page (hero, tarjetas, secciones con gradientes, etc.) y pidió que la página "Nosotros" se viera así. `page.tsx` detecta esto con una heurística simple — `pagina.contenido?.includes("<style")` — y si es cierto, renderiza el contenido a **ancho completo**, sin el `<h1>` automático ni el contenedor angosto (`max-w-3xl`), porque el HTML pegado ya trae su propio encabezado y maquetación. Si no hay `<style>`, sigue el comportamiento simple de siempre. El HTML se cargó directo por SQL (`update public.paginas set contenido = '...' where slug = 'nosotros'`), no a través del textarea del admin, por el tamaño (~24.000 caracteres) — pegar algo así por la UI del admin sería igual de válido, solo más lento de hacer por automatización. Todas las clases CSS del diseño se prefijaron con `.nosotros-page` (agregando un `<div class="nosotros-page">` envolvente) para que los estilos no se filtren a otras páginas del sitio si el usuario navega entre ellas sin recargar. Se corrigieron 3 enlaces `href="#"` de ejemplo a rutas reales (`/registro`, `/#empresas`). El usuario pidió ensanchar el contenido (`.container`) con "quiero que ocupe más ancho de la página"; se intentó ampliarlo de `min(1180px, 92%)` a `min(1440px, 95%)` vía un `UPDATE ... replace(...)`, pero al revisar la BD en una sesión posterior (2026-08-09) el valor guardado seguía siendo `min(1180px, 92%)` — el `replace()` no tomó efecto por alguna razón no diagnosticada. **El ancho real de "Nosotros" en producción hoy es `min(1180px, 92%)`** (verificado midiendo `.container` en vivo); si se quiere el ancho más grande que el usuario pidió, hay que reintentar el `UPDATE` y confirmar con una medición en vivo, no solo con el mensaje de éxito de Supabase.

**Página "Nosotros" ya creada** (`/paginas/nosotros`, `mostrar_en_menu = true`) con el contenido oficial del Manual de Identidad Visual del usuario: Introducción, Filosofía, Propósito, Misión, Visión, Valores, Personalidad de marca y Promesa de marca. La fuente es el capítulo 1 del brand book, disponible en `\\NAS-YORBIS\personal_folder\SSA\Proyectos SSA\Colombia Contrata\Brand Book\Capitulo_01_ADN_Marca_Colombia_Contrata.md` (esa carpeta de red también tiene los capítulos 2 a 4: logotipo, construcción del logotipo y sistema visual — útiles si se retoma trabajo de identidad de marca más adelante). El contenido de esa página se puede seguir editando normalmente desde `/admin` → Páginas con el editor de texto enriquecido.

## Redes sociales y botón de WhatsApp

Ambos configurables desde `/admin` → **Identidad del portal** (mismo formulario que nombre/logo/color, mismas columnas de `configuracion_portal`):

- **Redes sociales**: `Footer.tsx` (ahora un **server component async**, ya no estático) lee `facebook_url`, `instagram_url`, `twitter_url`, `linkedin_url`, `tiktok_url` y muestra un ícono circular por cada una que tenga un enlace configurado, en la columna "Contacto" del pie de página. Si ninguna tiene enlace, no se muestra la fila de íconos. Los íconos SVG viven en `SocialIcons.tsx`.
- **Botón flotante de WhatsApp**: `WhatsAppButton.tsx` (server component async) se agrega en `layout.tsx`, por lo que aparece en **todas** las páginas del sitio (fijo, esquina inferior derecha). Solo se renderiza si `whatsapp_activo = true` **y** hay un `whatsapp_numero` guardado — si cualquiera de las dos condiciones falta, el componente devuelve `null`. El enlace usa el formato `https://wa.me/<numero>?text=<mensaje codificado>`; `whatsapp_numero` debe ser solo dígitos con código de país (ej. `573001234567`, sin `+` ni espacios) y el componente igual limpia cualquier carácter no numérico por seguridad (`replace(/[^0-9]/g, "")`).

⚠️ **Gotcha de esta máquina — inputs de texto no responden a `triple_click` + `Delete`/`Backspace` ni a `Ctrl+A` + `Backspace`**: al limpiar campos de prueba (URLs de redes sociales, número de WhatsApp) en el navegador automatizado de Claude Code, seleccionar el texto y borrarlo con el teclado no tuvo ningún efecto sobre el valor real del input controlado por React — el campo seguía mostrando el valor viejo aunque visualmente pareciera seleccionado. Confirmado leyendo `input.value` por JS antes y después. Solución que funcionó: actualizar el valor directamente por SQL en Supabase en vez de por el formulario. (Ya se conocía un problema similar con `window.confirm()` no confirmable en este entorno — ver gotcha de `bloques_landing`; parece ser una limitación más amplia de este navegador automatizado con la interacción de teclado sobre inputs controlados.)

## Modo oscuro

El sitio soporta tema claro/oscuro con un toggle (ícono sol/luna) en el Header, visible con o sin sesión:

- **Mecanismo**: Tailwind v4 no trae modo oscuro por clase por defecto (solo por `prefers-color-scheme`), así que `globals.css` declara `@custom-variant dark (&:where(.dark, .dark *));` para que las utilidades `dark:` respondan a una clase `.dark` en `<html>` en vez del sistema operativo.
- **Sin parpadeo (FOUC)**: `layout.tsx` inyecta un `<Script strategy="beforeInteractive">` que lee `localStorage.getItem("theme")` (o `prefers-color-scheme` si no hay preferencia guardada) y aplica la clase `dark` **antes** de que React hidrate — por eso `<html>` lleva `suppressHydrationWarning`.
- **Toggle**: `ThemeToggle.tsx` alterna la clase `dark` en `document.documentElement` y guarda la elección en `localStorage` (`theme: "light" | "dark"`).
- **Cobertura**: se agregaron variantes `dark:` en todas las páginas y componentes existentes (landing, registro, login, perfil, seguridad de cuenta, términos, privacidad, admin, historial).

## Metadatos y vista previa al compartir (Open Graph)

`src/app/layout.tsx` → `generateMetadata()` incluye `metadataBase` (`https://colombiacontrata.com`, necesario para que las rutas relativas de `openGraph.images`/`twitter.images` se resuelvan a URLs absolutas) y bloques `openGraph` + `twitter` (`card: "summary_large_image"`) con título, descripción e imagen fijos en código (no vienen de `configuracion_portal` todavía).

- **Imagen**: `public/og-image.png` (1200×630, tamaño estándar recomendado por Facebook/LinkedIn/WhatsApp/Twitter). Viene del Manual/Brand Book del usuario, copiada desde `\\NAS-YORBIS\personal_folder\SSA\Proyectos SSA\Colombia Contrata\Imagenes\og-image.png` — no se generó en el sitio, es un archivo fijo que el usuario diseñó aparte.
- Verificado en vivo (2026-08-08) leyendo `document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]')` en producción: `og:image` resuelve a `https://colombiacontrata.com/og-image.png` con `width`/`height`/`alt` correctos.
- **Si se cambia el diseño de la imagen**: basta con reemplazar `public/og-image.png` por un archivo del mismo nombre (idealmente mismas dimensiones) y hacer commit/push — no requiere tocar `layout.tsx`.
- **Pendiente**: título/descripción/imagen de Open Graph están fijos en código, no editables desde `/admin` — si se quiere que el admin los pueda cambiar (por ejemplo subir otra imagen de campaña), habría que agregar columnas a `configuracion_portal` y leerlas en `generateMetadata()`, similar a como ya se hace con `favicon_url`.

## Solicitud de documentos y pago con Wompi

Primer flujo de compra real del sitio (2026-08-09), para personas naturales. El usuario eligió **Wompi** sobre PayU/Bold por tarifas (2,99% + IVA + $600 en tarjeta, la más baja de las tres comparadas) e integración más directa por API; decidió empezar a construirlo aunque **su cuenta de Wompi todavía está en proceso de validación y no tiene llaves ni de sandbox** — por eso todo el flujo se armó con un *fallback* explícito para cuando las llaves no existen, en vez de esperar a tenerlas.

**Modelo de precio**: confirmado con el usuario — es un **precio fijo por solicitud** (`configuracion_persona.precio_desde`), sin importar cuántos ni cuáles documentos se elijan en el checklist. Por eso `precios_documentos.precio` sigue sin usarse (ver nota en la sección de Base de datos): el checklist es solo para que el usuario indique qué necesita, no para calcular el total.

**Llaves configurables desde `/admin` → Pagos (Wompi)** (agregado el mismo día, a pedido del usuario "agreguemos un módulo en admin para la integración de Wompi"): en vez de vivir como variables de entorno en Vercel, las llaves se guardan en una tabla `configuracion_wompi` (fila única) editable desde `WompiConfigManager.tsx`. Esto evita depender de Vercel (y del bug de copiar/pegar de esta máquina, ver gotcha de `SUPABASE_SERVICE_ROLE_KEY`) y permite activar los pagos **sin redeploy** en cuanto el usuario tenga sus llaves reales:
- La tabla tiene RLS activado **sin ninguna policy** de select/insert/update para `anon`/`authenticated` — con RLS así, Postgres deniega todo por defecto, así que solo la Service Role Key (usada server-side) puede leerla o escribirla. El propio admin nunca la lee directo desde el navegador con `supabase-js`.
- `GET /api/admin/wompi-config` y `POST /api/admin/wompi-config` son los únicos puntos de acceso, protegidos con el mismo patrón `requireAdmin` de `/api/admin/roles.ts` (token Bearer verificado contra Supabase + `app_metadata.role === "admin"`).
- La llave pública y la URL base de cada ambiente **sí se devuelven completas** al formulario (no son secretas). Los dos secretos de cada ambiente **nunca se devuelven** — el `GET` solo informa si están configurados o no, y el formulario los muestra como campos de contraseña vacíos con la pista "ya hay uno guardado, déjalo en blanco para no cambiarlo". Dejar un campo vacío al guardar significa "no tocar ese valor", no "borrarlo".
- Un banner verde/ámbar por sección indica si las tres llaves de ese ambiente están completas o falta alguna.

**Sandbox y Producción por separado, con interruptor** (mismo día, a pedido del usuario "en admin debería estar mapeado los 2 ambientes... ya que no existe una sesión de pruebas de la plataforma"): como Colombia Contrata no tiene un despliegue de staging aparte — es un solo sitio en producción —, la tabla `configuracion_wompi` guarda **las 4 credenciales de cada ambiente por separado** (`sandbox_base_url`/`sandbox_public_key`/`sandbox_integrity_secret`/`sandbox_events_secret` y su equivalente `produccion_*`), más una columna `ambiente_activo` (`"sandbox"` o `"produccion"`) que decide cuál usan `/api/solicitudes/crear` y `/api/webhooks/wompi`. Así se pueden guardar y conservar las llaves de los dos ambientes a la vez, y cambiar cuál está "en vivo" con un interruptor en `/admin` sin perder la configuración del otro. Las URLs base (`https://sandbox.wompi.co/v1` y `https://production.wompi.co/v1`, confirmadas contra [docs.wompi.co/docs/colombia/ambientes-y-llaves](https://docs.wompi.co/docs/colombia/ambientes-y-llaves/)) vienen precargadas por defecto — hoy el código no las usa todavía (no se llama la API REST de Wompi directamente, solo el checkout hospedado y el webhook), pero quedan guardadas y editables para cuando haga falta consultar el estado de una transacción por API. El interruptor pide confirmación (`window.confirm`) antes de pasar a Producción, porque desde ese momento los pagos son reales.

**Flujo**:
1. `/solicitar` (`SolicitarContent.tsx`, client component) exige sesión y `account_type = "persona"`; si el perfil no tiene nombre/apellido/tipo y número de documento completos, el botón de pago falla con un mensaje que enlaza a `/perfil` para completarlos (Wompi necesita esos datos para el `legal-id`/`legal-id-type` del comprador).
2. Al confirmar, el cliente llama `POST /api/solicitudes/crear` con los IDs de documentos elegidos y el token de sesión (`Authorization: Bearer <access_token>`, mismo patrón de autenticación que `/api/admin/roles`).
3. El endpoint valida todo server-side (perfil completo, documentos activos, precio configurado), **inserta la fila en `solicitudes` con `estado = "pendiente"` antes de saber si el pago va a poder iniciarse** — así el pedido del usuario nunca se pierde, incluso sin llaves de Wompi.
4. Lee `configuracion_wompi` con la Service Role Key. Si `public_key` e `integrity_secret` están configurados, calcula la firma de integridad (`SHA-256(referencia + monto_en_centavos + "COP" + secreto)`) y arma la URL del checkout hospedado de Wompi (`https://checkout.wompi.co/p/?public-key=...&reference=...&signature:integrity=...&redirect-url=...`); el cliente redirige ahí con `window.location.href`.
5. Si las llaves no están configuradas, el endpoint devuelve `{ pagoDisponible: false }` y la UI muestra "Tu solicitud quedó registrada. Los pagos en línea estarán disponibles muy pronto..." en vez de romperse.
6. `POST /api/webhooks/wompi` es el endpoint que Wompi debe llamar cuando cambie el estado de una transacción (URL a configurar en el dashboard de Wompi: `https://colombiacontrata.com/api/webhooks/wompi`, visible también como nota al pie del formulario en `/admin`). Verifica el checksum del evento con `events_secret` (leído de `configuracion_wompi`) y actualiza `solicitudes.estado` a `"pagado"` o `"fallido"` buscando por `wompi_referencia`.
7. `/solicitar/confirmacion?reference=<ref>` (adonde Wompi redirige al comprador) lee el estado de esa solicitud directamente de Supabase (protegido por RLS: cada usuario solo ve las suyas) y muestra pagado/pendiente/fallido.

Todo el flujo (checklist → registro de la solicitud → redirección → fallback sin llaves → guardado de llaves desde `/admin`) se verificó end-to-end en producción el 2026-08-09, incluyendo **una prueba real contra el checkout de Wompi**: se guardaron llaves de prueba inventadas (`pub_test_...`) desde el nuevo formulario de admin, y `/solicitar` sí redirigió a `checkout.wompi.co` mostrando el banner "MODO DE PRUEBAS" — Wompi llegó a procesar la URL (rechazó la llave por no ser una cuenta real, con el error esperado "No se pudo cargar la información del undefined"), lo que confirma que **el formato de los parámetros del checkout (`public-key`, `currency`, `amount-in-cents`, `reference`, `signature:integrity`, `redirect-url`) es correcto**. Los datos de prueba (solicitud + llaves falsas) se borraron después de verificar.

⚠️ **Lo que sigue sin probarse**: la firma de integridad nunca se validó contra una cuenta Wompi real (la prueba de arriba solo confirmó el formato de la URL, no que el checksum sea válido), y el checksum del webhook tampoco se ha probado contra un evento real de Wompi — ambos se escribieron siguiendo la documentación pública de docs.wompi.co de memoria. **En cuanto el usuario tenga llaves de sandbox reales** (guardándolas desde `/admin` → Pagos (Wompi), sin tocar código), lo primero es hacer una transacción de prueba de punta a punta y confirmar que el pago se aprueba y que el webhook actualiza el estado correctamente.

**Lo que falta para que esto genere un documento de verdad**: hoy, aunque el pago se apruebe, no pasa nada más — no existe todavía la integración con el proveedor de fuentes (contraloría, policía, procuraduría, etc.) que generaría los PDFs. El webhook tiene un comentario `TODO` marcando dónde debería dispararse esa generación una vez exista esa pieza. `/historial` tampoco se conectó todavía a `solicitudes` (sigue mostrando el placeholder "Aún no tienes solicitudes") — es un cambio pequeño y natural de hacer ahora que la tabla ya tiene datos reales, pero se dejó fuera de esta sesión para no ampliar el alcance.

Los botones "Solicitar mis documentos" del hero y de la tarjeta "Persona independiente" en `/` ahora apuntan a `/solicitar` en vez de `/registro` — si el visitante no tiene sesión, `/solicitar` lo manda a `/login` (no se perdió ningún caso, antes iban directo a crear cuenta).

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

- [x] Construir `/solicitar` (checklist de documentos para personas) — ver [Solicitud de documentos y pago con Wompi](#solicitud-de-documentos-y-pago-con-wompi). Falta `/empresas`.
- [ ] **Activar el pago real de Wompi**: guardar las tres llaves reales desde `/admin` → Pagos (Wompi) en cuanto el usuario termine la validación de su cuenta, y probar una transacción de sandbox de punta a punta — se confirmó que el formato del checkout es correcto (ver [Solicitud de documentos y pago con Wompi](#solicitud-de-documentos-y-pago-con-wompi)), pero la firma de integridad y el checksum del webhook siguen sin validarse contra una cuenta real.
- [ ] Terminar de conectar `nombre_portal` y `eslogan` de `configuracion_portal` al resto del front — `nombre_portal` ya se usa en el copyright del footer, pero el `<title>` de las páginas, el texto "Colombia Contrata" del Header/Footer y el `eslogan` siguen fijos en el código (logo, favicon, color primario, correo de contacto y texto legal del footer ya están conectados — ver sección de tablas).
- [ ] Registrar la IP en la trazabilidad de consentimiento de Habeas Data (requiere un endpoint de servidor/Route Handler, ya que `supabase.auth.signUp` corre en el cliente).
- [ ] Flujo de compra/consumo de créditos de `planes_empresa` (checkout, descuento de créditos al consultar, invitación de candidatos, historial real en `/historial`) — hoy los planes solo se muestran y administran, no se pueden comprar ni consumir todavía. El flujo de `/solicitar` para personas puede servir de plantilla (misma estructura: crear registro pendiente → checkout Wompi → webhook actualiza estado).
- [ ] Crear cuentas de persona/empresa desde `/admin` (el usuario decidió dejar esto fuera de alcance por ahora — solo se construyó "asignar administradores", que ya está listo).
- [ ] Storage con URLs firmadas para la expiración de 10 días de los documentos de personas.
- [ ] Integración con la API del proveedor de fuentes (contraloría, policía, procuraduría, etc.) — aún no contratada. Es el paso que falta para que una `solicitud` en estado "pagado" realmente genere los documentos.
- [ ] Generación y empaquetado de PDFs + expiración de 10 días.
- [ ] Conectar `/historial` a la tabla `solicitudes` real (hoy sigue siendo el placeholder "Aún no tienes solicitudes" aunque la tabla ya existe y ya se están creando filas reales desde `/solicitar`).
- [ ] Revisión legal de `/terminos` y `/privacidad` + completar datos legales de la empresa.
- [ ] Traducir y activar el resto de plantillas de "Security" en Supabase si se llegan a necesitar (MFA, cambio de contraseña, cambio de teléfono — "Change Email Address" ya está lista).
