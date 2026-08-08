import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  IconFacebook,
  IconInstagram,
  IconTwitterX,
  IconLinkedIn,
  IconTikTok,
} from "@/components/SocialIcons";

const socialLinks = [
  { key: "facebook_url", label: "Facebook", Icon: IconFacebook },
  { key: "instagram_url", label: "Instagram", Icon: IconInstagram },
  { key: "twitter_url", label: "X (Twitter)", Icon: IconTwitterX },
  { key: "linkedin_url", label: "LinkedIn", Icon: IconLinkedIn },
  { key: "tiktok_url", label: "TikTok", Icon: IconTikTok },
] as const;

export default async function Footer() {
  const { data } = await supabase
    .from("configuracion_portal")
    .select(
      "facebook_url, instagram_url, twitter_url, linkedin_url, tiktok_url, correo_contacto, nombre_portal, footer_texto"
    )
    .eq("id", 1)
    .single();

  const activeSocialLinks = socialLinks.filter((link) => data?.[link.key]);

  return (
    <footer className="mt-auto w-full bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8">
        <div className="col-span-2 sm:col-span-1">
          <div className="flex items-center gap-x-2">
            <Image
              src="/isotipo.png"
              alt="Colombia Contrata"
              width={28}
              height={28}
              className="size-7"
            />
            <span className="text-lg font-bold">
              <span className="text-brand-navy dark:text-white">Colombia</span>{" "}
              <span className="text-brand-blue">Contrata</span>
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Documentos para contratación pública en un solo lugar.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Plataforma</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <li>
              <a href="/#como-funciona" className="hover:text-brand-blue">
                Cómo funciona
              </a>
            </li>
            <li>
              <a href="/#documentos" className="hover:text-brand-blue">
                Documentos
              </a>
            </li>
            <li>
              <a href="/#planes" className="hover:text-brand-blue">
                Planes
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Legal</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-500 dark:text-gray-400">
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
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Contacto</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <li>{data?.correo_contacto || "contacto@colombiacontrata.com"}</li>
          </ul>

          {activeSocialLinks.length > 0 && (
            <div className="mt-4 flex items-center gap-x-3">
              {activeSocialLinks.map(({ key, label, Icon }) => (
                <a
                  key={key}
                  href={data?.[key] ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex items-center justify-center size-8 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-brand-blue hover:text-white transition-colors"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800 py-4">
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          © {new Date().getFullYear()} {data?.nombre_portal || "Colombia Contrata"}.{" "}
          {data?.footer_texto || "Todos los derechos reservados."}
        </p>
      </div>
    </footer>
  );
}
