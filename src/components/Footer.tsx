import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto w-full bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8">
        <div className="col-span-2 sm:col-span-1">
          <div className="flex items-center gap-x-2">
            <Image
              src="/icono.png"
              alt="Colombia Contrata"
              width={28}
              height={28}
              className="size-7"
            />
            <span className="text-lg font-bold">
              <span className="text-brand-navy">Colombia</span>{" "}
              <span className="text-brand-blue">Contrata</span>
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Documentos para contratación pública en un solo lugar.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900">Plataforma</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-500">
            <li>
              <a href="#como-funciona" className="hover:text-brand-blue">
                Cómo funciona
              </a>
            </li>
            <li>
              <a href="#documentos" className="hover:text-brand-blue">
                Documentos
              </a>
            </li>
            <li>
              <a href="#planes" className="hover:text-brand-blue">
                Planes
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900">Legal</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-500">
            <li>
              <Link href="/privacidad" className="hover:text-brand-blue">
                Política de tratamiento de datos
              </Link>
            </li>
            <li>
              <Link href="/terminos" className="hover:text-brand-blue">
                Términos y condiciones
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900">Contacto</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-500">
            <li>contacto@colombiacontrata.com</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-200 py-4">
        <p className="text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Colombia Contrata. Todos los derechos
          reservados.
        </p>
      </div>
    </footer>
  );
}
