export default function AdminWarningBanner() {
  return (
    <div className="flex gap-x-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
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
        pueden verla. Los cambios que guardes aquí todavía son solo una
        vista previa de la interfaz, falta conectar el guardado real en un
        backend.
      </p>
    </div>
  );
}
