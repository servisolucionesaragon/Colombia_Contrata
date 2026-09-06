import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  if (data.user.app_metadata?.role !== "admin") return null;
  return data.user;
}

// Las cinco tablas del tablero son chicas (cientos de filas como mucho), así
// que se agregan en JS en vez de crear funciones/vistas en Postgres — evita
// una migración y deja toda la lógica del tablero en un solo archivo.
const MESES_MOSTRADOS = 12;

function clavesDeMeses(): string[] {
  const claves: string[] = [];
  const hoy = new Date();
  for (let i = MESES_MOSTRADOS - 1; i >= 0; i--) {
    const fecha = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1));
    claves.push(`${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return claves;
}

function claveMes(fechaIso: string | null | undefined): string | null {
  if (!fechaIso) return null;
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return null;
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
}

type FilaConFecha = { created_at?: string | null };

function contarPorMes(filas: FilaConFecha[], meses: string[]): number[] {
  const acumulado = new Map(meses.map((m) => [m, 0]));
  for (const fila of filas) {
    const clave = claveMes(fila.created_at);
    if (clave && acumulado.has(clave)) acumulado.set(clave, acumulado.get(clave)! + 1);
  }
  return meses.map((m) => acumulado.get(m) ?? 0);
}

function sumarPorMes(
  filas: { created_at?: string | null; monto?: number | null; estado?: string | null }[],
  meses: string[]
): number[] {
  const acumulado = new Map(meses.map((m) => [m, 0]));
  for (const fila of filas) {
    if (fila.estado !== "pagado") continue;
    const clave = claveMes(fila.created_at);
    if (clave && acumulado.has(clave)) {
      acumulado.set(clave, acumulado.get(clave)! + Number(fila.monto ?? 0));
    }
  }
  return meses.map((m) => acumulado.get(m) ?? 0);
}

export async function GET(request: NextRequest) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const db = adminClient();

  const [
    { data: authData, error: authError },
    { data: perfiles },
    { data: solicitudes },
    { data: pagosEmpresa },
    { data: consultas },
  ] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from("profiles").select("id, account_type"),
    db.from("solicitudes").select("estado, monto, created_at, resultado_obtenido_at"),
    db.from("pagos_empresa").select("estado, monto, created_at"),
    db.from("consultas").select("estado, nivel_riesgo, credito_descontado, created_at"),
  ]);

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const meses = clavesDeMeses();
  const usuarios = authData?.users ?? [];
  const tipoPorId = new Map((perfiles ?? []).map((p) => [p.id, p.account_type as string | null]));

  const ahora = new Date();
  const pendientesVerificar = usuarios.filter((u) => !u.email_confirmed_at).length;
  const desactivados = usuarios.filter(
    (u) => u.banned_until && new Date(u.banned_until) > ahora
  ).length;

  // El tipo de cuenta se elige al registrarse y queda en user_metadata, pero
  // la fila en "profiles" solo nace cuando la persona guarda su perfil por
  // primera vez. Por eso el tipo se lee de profiles y, si todavía no existe,
  // del metadato del registro — si no, quien se registró y nunca completó su
  // perfil aparecería "sin tipo" aunque sí eligió uno.
  const conteoTipos = { persona: 0, empresa: 0, empresa_miembro: 0, sin_definir: 0 };
  let perfilesSinCompletar = 0;

  for (const usuario of usuarios) {
    if (!tipoPorId.has(usuario.id)) perfilesSinCompletar++;

    const tipo =
      tipoPorId.get(usuario.id) ??
      (usuario.user_metadata?.account_type as string | undefined) ??
      null;

    if (tipo === "persona") conteoTipos.persona++;
    else if (tipo === "empresa") conteoTipos.empresa++;
    else if (tipo === "empresa_miembro") conteoTipos.empresa_miembro++;
    else conteoTipos.sin_definir++;
  }

  const listaSolicitudes = solicitudes ?? [];
  const listaPagosEmpresa = pagosEmpresa ?? [];
  const listaConsultas = consultas ?? [];

  const ingresosPersonas = listaSolicitudes
    .filter((s) => s.estado === "pagado")
    .reduce((suma, s) => suma + Number(s.monto ?? 0), 0);
  const ingresosEmpresas = listaPagosEmpresa
    .filter((p) => p.estado === "pagado")
    .reduce((suma, p) => suma + Number(p.monto ?? 0), 0);

  const contarEstado = (filas: { estado?: string | null }[], estado: string) =>
    filas.filter((f) => f.estado === estado).length;

  const contarRiesgo = (nivel: string | null) =>
    listaConsultas.filter((c) => (c.nivel_riesgo ?? null) === nivel).length;

  return NextResponse.json({
    usuarios: {
      total: usuarios.length,
      pendientesVerificar,
      desactivados,
      perfilesSinCompletar,
      porTipo: [
        { label: "Personas", valor: conteoTipos.persona },
        { label: "Empresas", valor: conteoTipos.empresa },
        { label: "Miembros de empresa", valor: conteoTipos.empresa_miembro },
        ...(conteoTipos.sin_definir > 0
          ? [{ label: "Sin definir", valor: conteoTipos.sin_definir }]
          : []),
      ],
      porMes: contarPorMes(
        usuarios.map((u) => ({ created_at: u.created_at })),
        meses
      ),
    },
    consultas: {
      total: listaConsultas.length,
      creditosConsumidos: listaConsultas.filter((c) => c.credito_descontado).length,
      porEstado: [
        { label: "Pendientes", valor: contarEstado(listaConsultas, "pendiente"), estado: "warning" },
        { label: "Autorizadas", valor: contarEstado(listaConsultas, "autorizada"), estado: "good" },
        { label: "Rechazadas", valor: contarEstado(listaConsultas, "rechazada"), estado: "critical" },
      ],
      porRiesgo: [
        { label: "Riesgo bajo", valor: contarRiesgo("bajo"), estado: "good" },
        { label: "Riesgo medio", valor: contarRiesgo("medio"), estado: "warning" },
        { label: "Riesgo alto", valor: contarRiesgo("alto"), estado: "critical" },
        { label: "Sin clasificar", valor: contarRiesgo(null), estado: "neutral" },
      ],
      porMes: contarPorMes(listaConsultas, meses),
    },
    pagos: {
      ingresosTotales: ingresosPersonas + ingresosEmpresas,
      ingresosPersonas,
      ingresosEmpresas,
      transaccionesPagadas:
        contarEstado(listaSolicitudes, "pagado") + contarEstado(listaPagosEmpresa, "pagado"),
      transaccionesPendientes:
        contarEstado(listaSolicitudes, "pendiente") + contarEstado(listaPagosEmpresa, "pendiente"),
      documentosGenerados: listaSolicitudes.filter((s) => s.resultado_obtenido_at).length,
      ingresosPorMes: {
        personas: sumarPorMes(listaSolicitudes, meses),
        empresas: sumarPorMes(listaPagosEmpresa, meses),
      },
    },
    meses,
  });
}
