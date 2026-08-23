"use client";

// Barra de filtros reutilizada por las tablas de "Consultas enviadas"
// (/empresas/consultas) e historial (persona y empresa) — cada tabla
// sigue calculando su propio arreglo filtrado con un simple .filter(),
// esto solo evita repetir cinco veces el markup de los controles.
export default function FiltrosBar({
  estado,
  onEstadoChange,
  opcionesEstado,
  texto,
  onTextoChange,
  textoPlaceholder,
  desde,
  onDesdeChange,
  hasta,
  onHastaChange,
}: {
  estado: string;
  onEstadoChange: (v: string) => void;
  opcionesEstado: { value: string; label: string }[];
  texto?: string;
  onTextoChange?: (v: string) => void;
  textoPlaceholder?: string;
  desde: string;
  onDesdeChange: (v: string) => void;
  hasta: string;
  onHastaChange: (v: string) => void;
}) {
  const inputClass =
    "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none";

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <select value={estado} onChange={(e) => onEstadoChange(e.target.value)} className={inputClass}>
        <option value="">Todos los estados</option>
        {opcionesEstado.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {onTextoChange && (
        <input
          type="text"
          value={texto}
          onChange={(e) => onTextoChange(e.target.value)}
          placeholder={textoPlaceholder ?? "Buscar..."}
          className={`${inputClass} w-40`}
        />
      )}

      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-400 dark:text-gray-500">Desde</label>
        <input
          type="date"
          value={desde}
          onChange={(e) => onDesdeChange(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-400 dark:text-gray-500">Hasta</label>
        <input
          type="date"
          value={hasta}
          onChange={(e) => onHastaChange(e.target.value)}
          className={inputClass}
        />
      </div>

      {(estado || texto || desde || hasta) && (
        <button
          type="button"
          onClick={() => {
            onEstadoChange("");
            onTextoChange?.("");
            onDesdeChange("");
            onHastaChange("");
          }}
          className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
