# Colombia Contrata

Portal web para obtener los documentos requeridos en procesos de contratación pública en Colombia (antecedentes judiciales, disciplinarios, fiscales, penales, medidas correctivas, entre otros) en un solo lugar, sin tener que consultar entidad por entidad.

Tiene dos perfiles de usuario:

- **Independientes / personas naturales**: se registran, seleccionan del checklist los documentos que necesitan, pagan, y reciben un comprimido con los PDFs por correo. La descarga queda disponible por **10 días**.
- **Empresas**: compran paquetes/planes de consultas (créditos) para validar antecedentes de candidatos antes de contratarlos. El candidato debe autorizar él mismo la consulta (ver sección de Habeas Data).

## Stack

- [Next.js](https://nextjs.org) 16 (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com) v4
- [Preline UI](https://preline.co) — librería de componentes
- Pendiente de definir: proveedor de pagos (Wompi / PayU), base de datos/auth/storage (Supabase propuesto), envío de correo (Resend / SendGrid), y la API del proveedor externo que genera los documentos.

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

Este repo se desarrolló originalmente sobre una carpeta montada por red (SMB). Ese escenario tiene dos problemas conocidos que ya están resueltos en la configuración del proyecto — pero si algo se vuelve a romper, esta es la causa:

1. **Turbopack falla con rutas UNC.** Turbopack (el bundler por defecto de `next dev`) compara la ruta UNC real (`\\servidor\carpeta\...`) contra la ruta de letra de unidad (`Z:\...`) y las considera "fuera del directorio raíz", rompiendo cualquier import desde `node_modules` (ej. Preline). Por eso el script `dev` fuerza `--webpack` en vez de Turbopack.
2. **El watcher de archivos falla en unidades de red** (`Watchpack Error: UNKNOWN`), porque Windows no propaga bien las notificaciones de cambios de archivos sobre SMB. Por eso `next.config.ts` configura `watchOptions.poll` y el script `dev` fuerza las variables `WATCHPACK_POLLING=true` / `CHOKIDAR_USEPOLLING=true` vía `cross-env`.

Si mueves el proyecto a un disco local, estas configuraciones no estorban, pero tampoco es necesario quitarlas.

## Estructura relevante

```
src/
  app/
    layout.tsx       # layout raíz, inicializa Preline (PrelineScript)
    page.tsx          # landing page
    globals.css       # Tailwind + @source hacia preline/dist
  components/
    Header.tsx
    Footer.tsx
    PrelineScript.tsx # inicializa los componentes JS de Preline en cada navegación
  types/
    preline.d.ts      # tipado de window.HSStaticMethods
.claude/
  launch.json         # config para levantar el server de desarrollo desde el asistente
  CLAUDE.md           # contexto del proyecto para el asistente de IA
```

## Cumplimiento legal — Habeas Data (Ley 1581 de 2012)

Los antecedentes penales, policiales y disciplinarios se consideran **dato sensible** en Colombia. Antes de habilitar cualquier consulta real hay que asegurar:

- Checkbox de autorización explícito y **separado** de los Términos y Condiciones (nunca premarcado).
- Registro de trazabilidad de cada consentimiento (usuario, fecha/hora, IP, versión de la política aceptada).
- En el flujo de empresas: la empresa invita al candidato, pero es **el candidato quien autoriza** su propia consulta — una empresa no puede consultar a un tercero sin su autorización directa.
- Evaluar el registro en el RNBD (Registro Nacional de Bases de Datos) ante la SIC si se supera el umbral de registros.

## Despliegue

Pendiente de definir el proveedor final (Vercel o Cloudflare Pages), conectado al dominio `colombiacontrata.com` (DNS ya gestionado en Cloudflare) y al repositorio [servisolucionesaragon/Colombia_Contrata](https://github.com/servisolucionesaragon/Colombia_Contrata).

## Roadmap / pendientes

- [ ] Integración con la API del proveedor de fuentes (contraloría, policía, procuraduría, etc.) — aún no contratada.
- [ ] Pasarela de pagos (Wompi / PayU).
- [ ] Auth + base de datos (Supabase propuesto).
- [ ] Flujo de registro con consentimiento de Habeas Data.
- [ ] Generación y empaquetado de PDFs + expiración de 10 días.
- [ ] Notificaciones por correo.
- [ ] Panel de empresa (créditos, invitación de candidatos, historial).
