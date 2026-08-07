export default function AdminWarningBanner() {
  return (
    <div className="flex gap-x-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
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
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <p>
        Esta pantalla todavía <strong>no está protegida por autenticación</strong>{" "}
        ni guarda cambios de verdad — es una vista previa de la interfaz.
        Cualquiera que conozca la URL puede verla. No debe publicarse en
        producción tal cual hasta conectar un sistema de login real y
        restringir el acceso solo a administradores.
      </p>
    </div>
  );
}
