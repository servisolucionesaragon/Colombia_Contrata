import Link from "next/link";

const navLinks = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#documentos", label: "Documentos" },
  { href: "#planes", label: "Planes" },
  { href: "#empresas", label: "Empresas" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 flex flex-wrap md:justify-start md:flex-nowrap w-full bg-white border-b border-gray-200 text-sm py-3">
      <nav className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link
          href="/"
          className="flex-none text-xl font-semibold text-blue-700"
        >
          Colombia Contrata
        </Link>

        <div className="hidden md:flex md:items-center md:gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-medium text-gray-600 hover:text-blue-700"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-x-2">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent text-gray-700 hover:text-blue-700 px-3 py-2"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/solicitar"
            className="hidden sm:inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-700 text-white hover:bg-blue-800 px-4 py-2"
          >
            Solicitar documentos
          </Link>

          <button
            type="button"
            className="hs-collapse-toggle md:hidden flex justify-center items-center size-9 rounded-lg border border-gray-200 text-gray-500"
            data-hs-collapse="#mobile-menu"
            aria-controls="mobile-menu"
            aria-label="Abrir menú"
          >
            <svg
              className="size-5"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" x2="21" y1="6" y2="6" />
              <line x1="3" x2="21" y1="12" y2="12" />
              <line x1="3" x2="21" y1="18" y2="18" />
            </svg>
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        className="hs-collapse hidden w-full md:hidden overflow-hidden transition-all duration-300 basis-full grow"
      >
        <div className="flex flex-col gap-3 px-4 pt-3 pb-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-medium text-gray-600 hover:text-blue-700"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            className="font-medium text-gray-600 hover:text-blue-700"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/solicitar"
            className="sm:hidden inline-flex items-center justify-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-700 text-white hover:bg-blue-800 px-4 py-2 mt-1"
          >
            Solicitar documentos
          </Link>
        </div>
      </div>
    </header>
  );
}
