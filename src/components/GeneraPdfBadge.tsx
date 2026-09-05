// Marca compartida para indicar qué documentos del catálogo generan un
// PDF descargable al consultarse (precios_documentos.genera_pdf) — se
// usa en los tres checklists (persona, empresa individual, carga
// masiva) y en /admin → Documentos disponibles. Basado en observación
// real de respuestas de Vericol, no en documentación oficial.
export default function GeneraPdfBadge() {
  return (
    <span
      title="Este documento genera un PDF descargable"
      className="inline-flex items-center gap-x-0.5 text-brand-blue shrink-0"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="size-3.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75h6M9 15.75h4.5M9 9.75h1.5M6.75 4.5h6.879a1.5 1.5 0 011.06.44l3.622 3.62a1.5 1.5 0 01.44 1.061V19.5a1.5 1.5 0 01-1.5 1.5H6.75a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5z"
        />
      </svg>
    </span>
  );
}
