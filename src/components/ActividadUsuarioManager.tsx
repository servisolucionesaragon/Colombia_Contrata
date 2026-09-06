"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type UsuarioListado = {
  id: string;
  email: string | null;
  nombre: string | null;
  tipoCuenta: string | null;
  verificado: boolean;
  activo: boolean;
};

type Solicitud = {
  id: string;
  estado: string;
  monto: number;
  referencia: string | null;
  creadaEn: string;
  fuentesPedidas: string[];
  documentosGenerados: number;
  nivelRiesgo: string | null;
  error: string | null;
  resultadoEn: string | null;
};

type ConsultaEnviada = {
  id: string;
  candidato: string;
  candidatoEmail: string | null;
  candidatoDocumento: string | null;
  estado: string;
  creditoDescontado: boolean;
  nivelRiesgo: string | null;
  fuentesPedidas: string[];
  documentosGenerados: number;
  error: string | null;
  resultadoEn: string | null;
  respondidaEn: string | null;
  creadaEn: string;
};

type ConsultaRecibida = {
  id: string;
  empresa: string;
  estado: string;
  creditoDescontado: boolean;
  nivelRiesgo: string | null;
  respondidaEn: string | null;
  creadaEn: string;
};

type PagoEmpresa = {
  id: string;
  plan: string | null;
  creditos: number | null;
  periodo: string | null;
  monto: number;
  estado: string;
  vigenteHasta: string | null;
  creadoEn: string;
};

type Actividad = {
  cuenta: {
    id: string;
    email: string | null;
    verificado: boolean;
    activo: boolean;
    creadoEn: string;
    ultimoAcceso: string | null;
    tipoCuenta: string | null;
    nombre: string | null;
    documento: string | null;
    telefono: string | null;
    rolEmpresa: string | null;
    perteneceAEmpresa: string | null;
  };
  solicitudes: Solicitud[];
  consultasEnviadas: ConsultaEnviada[];
  consultasRecibidas: ConsultaRecibida[];
  pagosEmpresa: PagoEmpresa[];
};

const formatCOP = (valor: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);

const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }) : "—";

const soloFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-CO") : "—";

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}` };
}

const ESTILO_ESTADO: Record<string, string> = {
  pagado: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400",
  autorizada: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400",
  pendiente: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
  fallido: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400",
  rechazada: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400",
};

function Estado({ valor }: { valor: string }) {
  return (
    <span
      className={`text-xs font-medium rounded-full px-2.5 py-1 ${
        ESTILO_ESTADO[valor] ?? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
      }`}
    >
      {valor}
    </span>
  );
}

export default function ActividadUsuarioManager() {
  const [usuarios, setUsuarios] = useState<UsuarioListado[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [actividad, setActividad] = useState<Actividad | null>(null);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/usuarios", { headers: await authHeader() });
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data.usuarios);
      } else {
        setError("No pudimos cargar la lista de usuarios.");
      }
      setCargandoLista(false);
    })();
  }, []);

  const abrir = async (id: string) => {
    setSeleccionado(id);
    setActividad(null);
    setError(null);
    setCargandoDetalle(true);
    const res = await fetch(`/api/admin/actividad?userId=${id}`, { headers: await authHeader() });
    setCargandoDetalle(false);
    if (!res.ok) {
      setError("No pudimos cargar la actividad de esta cuenta.");
      return;
    }
    setActividad(await res.json());
  };

  const filtrados = usuarios.filter((u) => {
    const texto = `${u.nombre ?? ""} ${u.email ?? ""}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Actividad por usuario
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Todo lo que hizo una cuenta en un solo lugar, para dar soporte: qué
          pidió, qué se le cobró, qué devolvió el proveedor y qué falló. No
          muestra el contenido de los documentos — esos solo los abre su dueño.
        </p>
      </div>

      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="grid lg:grid-cols-[18rem_1fr] gap-6">
        <div>
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="mb-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
          />

          {cargandoLista ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
          ) : (
            <ul className="max-h-[32rem] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
              {filtrados.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => abrir(u.id)}
                    className={`w-full text-left px-3 py-2.5 ${
                      seleccionado === u.id
                        ? "bg-brand-blue/10"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                      {u.nombre || u.email || "Sin nombre"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                  </button>
                </li>
              ))}
              {filtrados.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  Sin coincidencias.
                </li>
              )}
            </ul>
          )}
        </div>

        <div>
          {cargandoDetalle && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Cargando actividad...</p>
          )}

          {!cargandoDetalle && !actividad && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Elige una cuenta de la lista para ver su actividad.
            </p>
          )}

          {actividad && <DetalleActividad actividad={actividad} />}
        </div>
      </div>
    </section>
  );
}

function DetalleActividad({ actividad }: { actividad: Actividad }) {
  const { cuenta } = actividad;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {cuenta.nombre || "Sin nombre en el perfil"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{cuenta.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Estado valor={cuenta.activo ? "activo" : "inactivo"} />
            {!cuenta.verificado && <Estado valor="sin verificar" />}
          </div>
        </div>

        <dl className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3 text-sm">
          <Dato etiqueta="Tipo de cuenta" valor={cuenta.tipoCuenta ?? "—"} />
          <Dato etiqueta="Documento" valor={cuenta.documento ?? "—"} />
          <Dato etiqueta="Teléfono" valor={cuenta.telefono ?? "—"} />
          <Dato etiqueta="Registro" valor={soloFecha(cuenta.creadoEn)} />
          <Dato etiqueta="Último acceso" valor={fecha(cuenta.ultimoAcceso)} />
          {cuenta.rolEmpresa && <Dato etiqueta="Rol en la empresa" valor={cuenta.rolEmpresa} />}
        </dl>
      </div>

      <Bloque
        titulo="Solicitudes de documentos"
        vacio="Esta cuenta no ha pedido documentos."
        cantidad={actividad.solicitudes.length}
      >
        {actividad.solicitudes.map((s) => (
          <div key={s.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {formatCOP(s.monto)} · {s.fuentesPedidas.length} fuente(s) pedida(s)
              </span>
              <div className="flex items-center gap-x-2">
                <Estado valor={s.estado} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {soloFecha(s.creadaEn)}
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {s.resultadoEn
                ? `${s.documentosGenerados} documento(s) generado(s) el ${fecha(s.resultadoEn)}.`
                : s.estado === "pagado"
                  ? "Pagada, pero todavía sin resultado del proveedor."
                  : "Sin verificación (el pago no se aprobó)."}
              {s.referencia ? ` Referencia ${s.referencia}.` : ""}
            </p>
            {s.error && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">Error: {s.error}</p>
            )}
            {s.fuentesPedidas.length > 0 && <Fuentes claves={s.fuentesPedidas} />}
          </div>
        ))}
      </Bloque>

      <Bloque
        titulo="Consultas enviadas a candidatos"
        vacio="Esta cuenta no ha invitado candidatos."
        cantidad={actividad.consultasEnviadas.length}
      >
        {actividad.consultasEnviadas.map((c) => (
          <div key={c.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {c.candidato}
                {c.candidatoDocumento && (
                  <span className="text-gray-500 dark:text-gray-400"> · {c.candidatoDocumento}</span>
                )}
              </span>
              <div className="flex items-center gap-x-2">
                {c.nivelRiesgo && <Estado valor={`riesgo ${c.nivelRiesgo}`} />}
                <Estado valor={c.estado} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {soloFecha(c.creadaEn)}
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {c.candidatoEmail ? `${c.candidatoEmail} · ` : ""}
              {c.respondidaEn ? `Respondió el ${fecha(c.respondidaEn)}. ` : "Sin respuesta aún. "}
              {c.creditoDescontado ? "Consumió 1 crédito. " : "Sin crédito descontado. "}
              {c.resultadoEn ? `${c.documentosGenerados} documento(s) generado(s).` : ""}
            </p>
            {c.error && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">Error: {c.error}</p>
            )}
            {c.fuentesPedidas.length > 0 && <Fuentes claves={c.fuentesPedidas} />}
          </div>
        ))}
      </Bloque>

      <Bloque
        titulo="Consultas recibidas como candidato"
        vacio="Ninguna empresa ha consultado a esta persona."
        cantidad={actividad.consultasRecibidas.length}
      >
        {actividad.consultasRecibidas.map((c) => (
          <div key={c.id} className="py-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div>
              <p className="text-sm text-gray-900 dark:text-gray-100">{c.empresa}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Invitada el {soloFecha(c.creadaEn)}
                {c.respondidaEn ? ` · respondida el ${fecha(c.respondidaEn)}` : ""}
              </p>
            </div>
            <Estado valor={c.estado} />
          </div>
        ))}
      </Bloque>

      <Bloque
        titulo="Compras de créditos"
        vacio="Esta cuenta no ha comprado planes."
        cantidad={actividad.pagosEmpresa.length}
      >
        {actividad.pagosEmpresa.map((p) => (
          <div key={p.id} className="py-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {p.plan ?? "Plan"} · {p.creditos ?? 0} créditos · {formatCOP(p.monto)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {p.periodo ?? "—"} · comprado el {soloFecha(p.creadoEn)}
                {p.vigenteHasta ? ` · vigente hasta ${soloFecha(p.vigenteHasta)}` : ""}
              </p>
            </div>
            <Estado valor={p.estado} />
          </div>
        ))}
      </Bloque>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {etiqueta}
      </dt>
      <dd className="mt-0.5 text-gray-900 dark:text-gray-100 break-words">{valor}</dd>
    </div>
  );
}

function Fuentes({ claves }: { claves: string[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {claves.map((clave) => (
        <span
          key={clave}
          className="text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5"
        >
          {clave}
        </span>
      ))}
    </div>
  );
}

function Bloque({
  titulo,
  vacio,
  cantidad,
  children,
}: {
  titulo: string;
  vacio: string;
  cantidad: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {titulo}
        <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
          {cantidad}
        </span>
      </h3>
      {cantidad === 0 ? (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{vacio}</p>
      ) : (
        <div className="mt-1 divide-y divide-gray-100 dark:divide-gray-800">{children}</div>
      )}
    </section>
  );
}
