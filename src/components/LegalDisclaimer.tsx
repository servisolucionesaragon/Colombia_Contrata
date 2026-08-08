export default function LegalDisclaimer() {
  return (
    <div className="mt-6 flex gap-x-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950 p-4 text-sm text-amber-800 dark:text-amber-300">
      <svg
        className="size-5 shrink-0 mt-0.5"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <line x1="12" x2="12" y1="9" y2="13" />
        <line x1="12" x2="12.01" y1="17" y2="17" />
      </svg>
      <p>
        Este documento es una <strong>plantilla base</strong> preparada como
        punto de partida y aún no ha sido revisada por un abogado. Antes de
        publicarlo en producción —especialmente por tratarse de datos
        sensibles y pagos en línea— debe ser validado por un profesional
        especializado en protección de datos y derecho del consumo en
        Colombia, y completarse con los datos legales reales de la empresa
        (razón social, NIT, domicilio).
      </p>
    </div>
  );
}
