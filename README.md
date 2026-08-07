# Colombia Contrata

Portal web para obtener los documentos requeridos en procesos de contratación pública en Colombia (antecedentes judiciales, disciplinarios, fiscales, penales, medidas correctivas, entre otros) en un solo lugar, sin tener que consultar entidad por entidad.

Tiene dos perfiles de usuario:

- **Independientes / personas naturales**: se registran, seleccionan del checklist los documentos que necesitan, pagan, y reciben un comprimido con los PDFs por correo. La descarga queda disponible por **10 días**.
- **Empresas**: compran paquetes/planes de consultas (créditos) para validar antecedentes de candidatos antes de contratarlos. El candidato debe autorizar él mismo la consulta (ver sección de Habeas Data) — la empresa lo invita, pero no puede consultarlo sin su autorización directa.

**Sitio en producción:** https://colombia-contrata.vercel.app (dominio propio `colombiacontrata.com` pendiente de conectar — ver [Despliegue](#despliegue)).

## Stack

- [Next.js](https://nextjs.org) 16 (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com) v4
- [Preline UI](https://preline.co) — librería de componentes
- Tipografía: **Montserrat** (`next/font/google`)
- Pendiente de definir: proveedor de pagos (Wompi / PayU), base de datos/auth/storage (Supabase propuesto), envío de correo (Resend / SendGrid), y la API del proveedor externo que genera los documentos.

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
| `/registro` | Alta de cuenta, con toggle Persona natural / Empresa | Frontend + validación; **sin backend** |
| `/terminos` | Términos y Condiciones | Borrador, falta revisión legal |
| `/privacidad` | Política de Tratamiento de Datos Personales (Ley 1581) | Borrador, falta revisión legal |
| `/admin` | Back office: nombre, eslogan, logo, favicon, color primario | Vista previa; **sin autenticación ni persistencia** |

`/solicitar`, `/login` y `/empresas` están enlazadas desde la UI pero **todavía no existen** (darán 404 si se navega directo).

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
    terminos/page.tsx     # términos y condiciones
    privacidad/page.tsx   # política de datos personales
    admin/page.tsx        # back office (vista previa, sin auth)
  components/
    Header.tsx / Footer.tsx
    RegisterForm.tsx       # formulario de registro con consentimiento Habeas Data
    AdminSettingsForm.tsx  # formulario de configuración del portal
    LegalDisclaimer.tsx    # aviso de "falta revisión legal" en /terminos y /privacidad
    AdminWarningBanner.tsx # aviso de "sin autenticación" en /admin
    PrelineScript.tsx      # inicializa los componentes JS de Preline en cada navegación
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

Pendiente cuando haya backend: registrar trazabilidad de cada consentimiento (usuario, fecha/hora, IP, versión de la política aceptada) y evaluar el registro en el RNBD ante la SIC si se supera el umbral de registros.

`/terminos` y `/privacidad` son **borradores de plantilla** (con aviso visible en la propia página) — deben ser revisados por un abogado y completados con la razón social/NIT reales antes de producción.

## Despliegue

- **Hosting**: [Vercel](https://vercel.com), proyecto `servisoluciones-aragon/colombia-contrata`, conectado al repo de GitHub — cada push a `main` despliega automáticamente a producción.
- **Repo**: [servisolucionesaragon/Colombia_Contrata](https://github.com/servisolucionesaragon/Colombia_Contrata).
- **Dominio propio** `colombiacontrata.com`: comprado, DNS/CDN ya en Cloudflare, **todavía no conectado** al proyecto de Vercel (pendiente agregar el dominio en Vercel → Domains y apuntar el DNS).

## Roadmap / pendientes

- [ ] Definir y conectar backend real (Supabase propuesto: auth + Postgres + storage con URLs firmadas para la expiración de 10 días).
- [ ] Conectar `/registro` y `/admin` a ese backend (auth real, persistencia, y proteger `/admin` para que solo administradores puedan entrar).
- [ ] Construir `/solicitar` (checklist de documentos), `/login` y `/empresas` (actualmente enlazadas pero inexistentes).
- [ ] Integración con la API del proveedor de fuentes (contraloría, policía, procuraduría, etc.) — aún no contratada.
- [ ] Pasarela de pagos (Wompi / PayU).
- [ ] Generación y empaquetado de PDFs + expiración de 10 días.
- [ ] Notificaciones por correo (Resend / SendGrid).
- [ ] Panel de empresa (créditos, invitación de candidatos, historial).
- [ ] Revisión legal de `/terminos` y `/privacidad` + completar datos legales de la empresa.
- [ ] Conectar dominio `colombiacontrata.com` en Vercel.
