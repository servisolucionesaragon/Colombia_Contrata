export default function AdminWarningBanner() {
  return (
    <div className="flex gap-x-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950 p-4 text-sm text-amber-800 dark:text-amber-300">
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
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
      <p>
        Esta pantalla ya está protegida — solo cuentas de administrador
        pueden verla. Los cambios en <strong>Planes de empresa</strong> y{" "}
        <strong>Precios de documentos</strong> se guardan de verdad. Los de{" "}
        <strong>Identidad del portal</strong> (nombre, logo, colores)
        todavía son solo vista previa — falta conectar ese guardado a un
        backend/almacenamiento real.
      </p>
    </div>
  );
}
