"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Categoria = { label: string; valor: number; estado?: string };

type Estadisticas = {
  usuarios: {
    total: number;
    pendientesVerificar: number;
    desactivados: number;
    perfilesSinCompletar: number;
    porTipo: Categoria[];
    porMes: number[];
  };
  consultas: {
    total: number;
    creditosConsumidos: number;
    porEstado: Categoria[];
    porRiesgo: Categoria[];
    porMes: number[];
  };
  pagos: {
    ingresosTotales: number;
    ingresosPersonas: number;
    ingresosEmpresas: number;
    transaccionesPagadas: number;
    transaccionesPendientes: number;
    documentosGenerados: number;
    ingresosPorMes: { personas: number[]; empresas: number[] };
  };
  meses: string[];
};

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const formatoMoneda = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const formatoNumero = new Intl.NumberFormat("es-CO");

function etiquetaMes(clave: string) {
  const [, mes] = clave.split("-");
  return MESES_CORTOS[Number(mes) - 1] ?? clave;
}

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}` };
}

export default function TableroAdmin() {
  const [datos, setDatos] = useState<Estadisticas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/estadisticas", { headers: await authHeader() });
        if (!res.ok) {
          setError("No pudimos cargar las estadísticas.");
          return;
        }
        setDatos(await res.json());
      } catch {
        setError("No pudimos conectar con el servidor.");
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  if (cargando) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando estadísticas...</p>;
  }
  if (error || !datos) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error ?? "Sin datos."}</p>;
  }

  const etiquetasMeses = datos.meses.map(etiquetaMes);

  return (
    <div className="viz space-y-8">
      {/* Los colores de datos viven como variables CSS para que el modo oscuro
          se resuelva en un solo lugar. Son los pasos validados de la paleta
          (contraste, banda de luminosidad y separación para daltonismo
          verificados contra las superficies reales de esta pantalla). */}
      <style>{`
        .viz {
          --serie-1: #2a78d6;
          --serie-2: #eb6834;
          --estado-good: #0ca30c;
          --estado-warning: #fab219;
          --estado-critical: #d03b3b;
          --estado-neutral: #898781;
          --viz-grid: #e1e0d9;
        }
        :root.dark .viz {
          --serie-1: #3987e5;
          --serie-2: #d95926;
          --viz-grid: #2c2c2a;
        }
      `}</style>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tablero</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Resumen de la actividad de la plataforma. Las gráficas de tendencia
          muestran los últimos 12 meses.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          etiqueta="Usuarios registrados"
          valor={formatoNumero.format(datos.usuarios.total)}
          detalle={`${datos.usuarios.desactivados} desactivados`}
        />
        <Kpi
          etiqueta="Pendientes por verificar"
          valor={formatoNumero.format(datos.usuarios.pendientesVerificar)}
          detalle="Correo sin confirmar"
          alerta={datos.usuarios.pendientesVerificar > 0}
        />
        <Kpi
          etiqueta="Consultas realizadas"
          valor={formatoNumero.format(datos.consultas.total)}
          detalle={`${datos.consultas.creditosConsumidos} con crédito descontado`}
        />
        <Kpi
          etiqueta="Ingresos recaudados"
          valor={formatoMoneda.format(datos.pagos.ingresosTotales)}
          detalle={`${datos.pagos.transaccionesPagadas} pagos aprobados`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Tarjeta titulo="Usuarios registrados por mes">
          <GraficaColumnas
            etiquetas={etiquetasMeses}
            series={[{ nombre: "Usuarios", valores: datos.usuarios.porMes, color: "var(--serie-1)" }]}
            formatear={(v) => formatoNumero.format(v)}
          />
        </Tarjeta>

        <Tarjeta titulo="Consultas de antecedentes por mes">
          <GraficaColumnas
            etiquetas={etiquetasMeses}
            series={[{ nombre: "Consultas", valores: datos.consultas.porMes, color: "var(--serie-1)" }]}
            formatear={(v) => formatoNumero.format(v)}
          />
        </Tarjeta>
      </div>

      <Tarjeta titulo="Ingresos por mes">
        <GraficaColumnas
          etiquetas={etiquetasMeses}
          series={[
            { nombre: "Personas", valores: datos.pagos.ingresosPorMes.personas, color: "var(--serie-1)" },
            { nombre: "Empresas", valores: datos.pagos.ingresosPorMes.empresas, color: "var(--serie-2)" },
          ]}
          formatear={(v) => formatoMoneda.format(v)}
        />
      </Tarjeta>

      <div className="grid lg:grid-cols-3 gap-6">
        <Tarjeta titulo="Usuarios por tipo de cuenta">
          <GraficaBarras datos={datos.usuarios.porTipo} />
          {datos.usuarios.perfilesSinCompletar > 0 && (
            <p className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
              {datos.usuarios.perfilesSinCompletar}{" "}
              {datos.usuarios.perfilesSinCompletar === 1
                ? "usuario eligió su tipo de cuenta al registrarse pero todavía no completa su perfil."
                : "usuarios eligieron su tipo de cuenta al registrarse pero todavía no completan su perfil."}
            </p>
          )}
        </Tarjeta>
        <Tarjeta titulo="Consultas por estado">
          <GraficaBarras datos={datos.consultas.porEstado} />
        </Tarjeta>
        <Tarjeta titulo="Nivel de riesgo de las consultas">
          <GraficaBarras datos={datos.consultas.porRiesgo} />
        </Tarjeta>
      </div>
    </div>
  );
}

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{titulo}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Kpi({
  etiqueta,
  valor,
  detalle,
  alerta,
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {etiqueta}
      </p>
      <p
        className={`mt-2 text-3xl font-bold tracking-tight ${
          alerta ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {valor}
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{detalle}</p>
    </div>
  );
}

const COLOR_ESTADO: Record<string, string> = {
  good: "var(--estado-good)",
  warning: "var(--estado-warning)",
  critical: "var(--estado-critical)",
  neutral: "var(--estado-neutral)",
};

// Barras horizontales en HTML (no SVG): el texto no se deforma al escalar y
// cada barra lleva su valor como etiqueta directa, así el color nunca es el
// único portador del dato.
function GraficaBarras({ datos }: { datos: Categoria[] }) {
  const maximo = Math.max(...datos.map((d) => d.valor), 0);

  if (maximo === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">Todavía no hay datos.</p>;
  }

  return (
    <div className="space-y-3">
      {datos.map((dato) => (
        <div key={dato.label}>
          <div className="flex items-baseline justify-between gap-x-3">
            <span className="text-sm text-gray-700 dark:text-gray-300">{dato.label}</span>
            <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              {formatoNumero.format(dato.valor)}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-2 rounded-r-full rounded-l-sm"
              style={{
                width: `${Math.max((dato.valor / maximo) * 100, dato.valor > 0 ? 2 : 0)}%`,
                backgroundColor: dato.estado
                  ? COLOR_ESTADO[dato.estado] ?? "var(--serie-1)"
                  : "var(--serie-1)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

type Serie = { nombre: string; valores: number[]; color: string };

const ANCHO = 460;
const ALTO = 170;
const MARGEN = { arriba: 10, derecha: 4, abajo: 22, izquierda: 44 };

// Columnas apiladas en SVG. Una sola serie no lleva leyenda (el título la
// nombra); con dos, la leyenda es obligatoria. Los valores no se etiquetan
// uno por uno — se leen al pasar el mouse.
function GraficaColumnas({
  etiquetas,
  series,
  formatear,
}: {
  etiquetas: string[];
  series: Serie[];
  formatear: (valor: number) => string;
}) {
  const [activo, setActivo] = useState<number | null>(null);
  const [verTabla, setVerTabla] = useState(false);

  const totalesPorColumna = etiquetas.map((_, i) =>
    series.reduce((suma, serie) => suma + (serie.valores[i] ?? 0), 0)
  );
  const maximo = Math.max(...totalesPorColumna, 0);
  const hayDatos = maximo > 0;

  const anchoPlot = ANCHO - MARGEN.izquierda - MARGEN.derecha;
  const altoPlot = ALTO - MARGEN.arriba - MARGEN.abajo;
  const paso = anchoPlot / etiquetas.length;
  const anchoBarra = Math.max(paso - 6, 3);
  const escala = (valor: number) => (hayDatos ? (valor / maximo) * altoPlot : 0);

  const lineasGuia = hayDatos ? [0, 0.5, 1] : [0];

  return (
    <div>
      {series.length > 1 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
          {series.map((serie) => (
            <span
              key={serie.nombre}
              className="inline-flex items-center gap-x-1.5 text-xs text-gray-600 dark:text-gray-400"
            >
              <span
                className="size-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: serie.color }}
                aria-hidden="true"
              />
              {serie.nombre}
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <svg
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Gráfica de ${series.map((s) => s.nombre).join(" y ")} por mes`}
        >
          {lineasGuia.map((fraccion) => {
            const y = MARGEN.arriba + altoPlot - fraccion * altoPlot;
            return (
              <g key={fraccion}>
                <line
                  x1={MARGEN.izquierda}
                  x2={ANCHO - MARGEN.derecha}
                  y1={y}
                  y2={y}
                  stroke="var(--viz-grid)"
                  strokeWidth={1}
                />
                <text
                  x={MARGEN.izquierda - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-gray-400 dark:fill-gray-500"
                  style={{ fontSize: 9 }}
                >
                  {abreviar(maximo * fraccion)}
                </text>
              </g>
            );
          })}

          {etiquetas.map((etiqueta, i) => {
            const xColumna = MARGEN.izquierda + i * paso + (paso - anchoBarra) / 2;
            let acumulado = 0;

            return (
              <g key={etiqueta + i}>
                {series.map((serie, indiceSerie) => {
                  const valor = serie.valores[i] ?? 0;
                  if (valor <= 0) return null;
                  // Piso de 2px para que un mes con poco movimiento no
                  // desaparezca contra la línea base.
                  const alto = Math.max(escala(valor), 2);
                  const esSuperior =
                    indiceSerie ===
                    series.map((s) => s.valores[i] ?? 0).reduce((ultimo, v, idx) => (v > 0 ? idx : ultimo), 0);
                  const y = MARGEN.arriba + altoPlot - acumulado - alto;
                  acumulado += alto + 2; // 2px de separación entre segmentos apilados

                  return (
                    <path
                      key={serie.nombre}
                      d={
                        esSuperior
                          ? columnaRedondeada(xColumna, y, anchoBarra, alto)
                          : `M ${xColumna} ${y} h ${anchoBarra} v ${alto} h ${-anchoBarra} Z`
                      }
                      fill={serie.color}
                      opacity={activo === null || activo === i ? 1 : 0.35}
                    />
                  );
                })}

                <text
                  x={MARGEN.izquierda + i * paso + paso / 2}
                  y={ALTO - 6}
                  textAnchor="middle"
                  className="fill-gray-400 dark:fill-gray-500"
                  style={{ fontSize: 9 }}
                >
                  {etiqueta}
                </text>

                {/* Zona de impacto más ancha que la barra, para que el hover
                    sea cómodo aunque la columna sea delgada o valga cero. */}
                <rect
                  x={MARGEN.izquierda + i * paso}
                  y={MARGEN.arriba}
                  width={paso}
                  height={altoPlot}
                  fill="transparent"
                  onMouseEnter={() => setActivo(i)}
                  onMouseLeave={() => setActivo(null)}
                />
              </g>
            );
          })}
        </svg>

        {activo !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 shadow-lg"
            style={{
              left: `${((MARGEN.izquierda + activo * paso + paso / 2) / ANCHO) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              {etiquetas[activo]}
            </p>
            {series.map((serie) => (
              <p
                key={serie.nombre}
                className="mt-0.5 flex items-center gap-x-1.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap"
              >
                <span
                  className="size-2 rounded-sm shrink-0"
                  style={{ backgroundColor: serie.color }}
                  aria-hidden="true"
                />
                {series.length > 1 && `${serie.nombre}: `}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatear(serie.valores[activo] ?? 0)}
                </span>
              </p>
            ))}
          </div>
        )}
      </div>

      {!hayDatos && (
        <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
          Todavía no hay datos en este periodo.
        </p>
      )}

      <button
        type="button"
        onClick={() => setVerTabla((v) => !v)}
        className="mt-3 text-xs font-medium text-brand-blue hover:text-brand-blue-dark"
      >
        {verTabla ? "Ocultar tabla" : "Ver como tabla"}
      </button>

      {verTabla && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <th className="py-1.5 pr-3 font-medium">Mes</th>
                {series.map((serie) => (
                  <th key={serie.nombre} className="py-1.5 pr-3 font-medium">
                    {serie.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {etiquetas.map((etiqueta, i) => (
                <tr key={etiqueta + i} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="py-1.5 pr-3 text-gray-600 dark:text-gray-400">{etiqueta}</td>
                  {series.map((serie) => (
                    <td
                      key={serie.nombre}
                      className="py-1.5 pr-3 tabular-nums text-gray-900 dark:text-gray-100"
                    >
                      {formatear(serie.valores[i] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Columna con las dos esquinas superiores redondeadas (4px) y la base recta,
// anclada a la línea cero.
function columnaRedondeada(x: number, y: number, ancho: number, alto: number) {
  const r = Math.min(4, ancho / 2, alto);
  return `M ${x} ${y + alto} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} L ${x + ancho - r} ${y} Q ${x + ancho} ${y} ${x + ancho} ${y + r} L ${x + ancho} ${y + alto} Z`;
}

function abreviar(valor: number) {
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(valor % 1_000_000 === 0 ? 0 : 1)}M`;
  if (valor >= 1_000) return `${(valor / 1_000).toFixed(valor % 1_000 === 0 ? 0 : 1)}k`;
  return String(Math.round(valor));
}
