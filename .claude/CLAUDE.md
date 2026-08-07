# Colombia Contrata — Contexto del proyecto

## Qué es
Portal web para obtener documentos requeridos en contratación pública en Colombia (contraloría, policía, procuraduría, antecedentes penales, registros de conductas sexuales, entre otros).

Dos perfiles de usuario:
- **Independientes/personas naturales**: se registran, pagan, seleccionan checklist de documentos. La plataforma consulta vía API a un proveedor de fuentes, genera los PDFs, notifica por email, y deja el comprimido disponible para descarga por 10 días.
- **Empresas**: compran paquetes/planes de consultas (créditos) para validar antecedentes de candidatos antes de contratarlos. El candidato debe autorizar él mismo (Habeas Data) — la empresa invita, el candidato entra a la plataforma y autoriza; no se puede consultar a un tercero sin su propio consentimiento.

Ver `README.md` en la raíz del proyecto para el detalle técnico completo (stack, estructura, páginas implementadas, roadmap). Este archivo se enfoca en contexto de colaboración y decisiones que no están en el README.

## Estado actual (resumen)
Sitio en producción: https://colombia-contrata.vercel.app — cada push a `main` despliega automático en Vercel.

Páginas construidas: `/` (landing), `/registro` (alta con consentimiento Habeas Data), `/terminos`, `/privacidad` (borradores legales), `/admin` (back office de marca, vista previa sin auth). Ninguna está conectada a un backend real todavía — todo es frontend con validación local y mensajes de "vista previa".

Identidad de marca ya aplicada: logo/ícono reales (`public/isotipo.png`, `public/icono.png`), paleta de colores (`brand-navy #0d1b3d`, `brand-blue #1d4ed8`, `brand-yellow #fcd116`, `brand-red #ce1126` como tokens Tailwind en `globals.css`), tipografía Montserrat.

## Cumplimiento legal (Habeas Data — Ley 1581 de 2012)
- Antecedentes penales/policiales/disciplinarios son **dato sensible** → requieren checkbox de autorización explícito y separado del checkbox de Términos y Condiciones. Nunca premarcado. Ya implementado en `/registro` (3 checkboxes independientes).
- Guardar trazabilidad de cada consentimiento: `user_id`, fecha/hora, IP, versión del documento de política aceptado. (Pendiente — requiere backend.)
- Evaluar registro en el RNBD (Registro Nacional de Bases de Datos) ante la SIC si se supera el umbral de registros.
- `/terminos` y `/privacidad` son plantillas base con aviso visible de que faltan revisión legal y datos reales de la empresa (razón social, NIT) — no están listas para producción tal cual.

## Stack
- **Frontend**: Next.js 16 (TypeScript, App Router, Tailwind CSS v4), Montserrat como tipografía
- **UI**: Preline UI (elegido por el usuario por su variedad de componentes)
- **Pagos (Colombia)**: Wompi o PayU — pendiente decidir
- **DB/Auth/Storage**: propuesto Supabase (Postgres + auth + storage con URLs firmadas, útil para la expiración de 10 días de los documentos) — el usuario aún no lo confirmó explícitamente; cuando se decida, hay que conectar `/registro` y `/admin` a autenticación real
- **Email**: Resend o SendGrid — pendiente decidir
- **API de consultas a fuentes**: aún no la tiene el usuario — se está construyendo el sitio en paralelo mientras la consigue

## Infraestructura y despliegue
- Dominio comprado: `colombiacontrata.com`, DNS/CDN ya conectado a Cloudflare. **Aún no conectado** al proyecto de Vercel.
- Repo remoto: https://github.com/servisolucionesaragon/Colombia_Contrata (público, main branch). Credenciales de git ya configuradas en esta máquina (Git Credential Manager, usuario `servisolucionesaragon`) — el push funciona sin pedir login.
- Hosting: Vercel (proyecto `servisoluciones-aragon/colombia-contrata`), tier gratuito, autodeploy en cada push a `main`.

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
