# Colombia Contrata — Contexto del proyecto

## Qué es
Portal web para obtener documentos requeridos en contratación pública en Colombia (contraloría, policía, procuraduría, antecedentes penales, registros de conductas sexuales, entre otros).

Dos perfiles de usuario:
- **Independientes/personas naturales**: se registran, pagan, seleccionan checklist de documentos. La plataforma consulta vía API a un proveedor de fuentes, genera los PDFs, notifica por email, y deja el comprimido disponible para descarga por 10 días.
- **Empresas**: compran paquetes/planes de consultas (créditos) para validar antecedentes de candidatos antes de contratarlos. El candidato debe autorizar él mismo (Habeas Data) — la empresa invita, el candidato entra a la plataforma y autoriza; no se puede consultar a un tercero sin su propio consentimiento.

## Cumplimiento legal (Habeas Data — Ley 1581 de 2012)
- Antecedentes penales/policiales/disciplinarios son **dato sensible** → requieren checkbox de autorización explícito y separado del checkbox de Términos y Condiciones. Nunca premarcado.
- Guardar trazabilidad de cada consentimiento: `user_id`, fecha/hora, IP, versión del documento de política aceptado.
- Evaluar registro en el RNBD (Registro Nacional de Bases de Datos) ante la SIC si se supera el umbral de registros.
- Habilitar en el perfil del usuario la opción de conocer, actualizar, rectificar y revocar la autorización.

## Stack
- **Frontend**: Next.js (TypeScript, App Router, Tailwind CSS)
- **UI**: Preline UI (elegido por el usuario por su variedad de componentes)
- **Pagos (Colombia)**: Wompi o PayU — pendiente decidir
- **DB/Auth/Storage**: propuesto Supabase (Postgres + auth + storage con URLs firmadas, útil para la expiración de 10 días de los documentos)
- **Email**: Resend o SendGrid — pendiente decidir
- **API de consultas a fuentes**: aún no la tiene el usuario — se está construyendo el sitio en paralelo mientras la consigue; esa integración queda stubbeada/mockeada por ahora.

## Infraestructura y despliegue
- Dominio comprado: `colombiacontrata.com`, DNS/CDN ya conectado a Cloudflare.
- Repo remoto para publicar/desplegar: https://github.com/servisolucionesaragon/Colombia_Contrata (público).
- Decisión de hosting: para el MVP, sin VPS — usar Vercel (o Cloudflare Pages) en tier gratuito conectado al repo de GitHub. VPS se evalúa más adelante si el volumen/costo lo justifica.
- El usuario no tiene experiencia con Vercel — explicar el despliegue paso a paso cuando se llegue a esa etapa.

## Preferencias de colaboración
- El usuario no tiene conocimiento técnico profundo (ej. pidió explicación simple de qué es Vercel) — explicar conceptos de forma accesible, sin asumir jerga previa.
- Prefiere avanzar construyendo el sitio mientras resuelve piezas externas (como el API del proveedor de documentos) en paralelo.
