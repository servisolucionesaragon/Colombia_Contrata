"use client";

import { useEffect, useRef, useState, type SVGProps } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";

const navLinks = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#documentos", label: "Documentos" },
  { href: "#planes", label: "Planes" },
  { href: "#empresas", label: "Empresas" },
];

function IconHome(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function IconHistory(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function IconUser(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconLogout(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

const userMenuLinks = [
  { href: "/", label: "Inicio", icon: IconHome },
  { href: "/historial", label: "Historial", icon: IconHistory },
  { href: "/perfil", label: "Perfil", icon: IconUser },
];

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function Header() {
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [initials, setInitials] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("configuracion_portal")
      .select("logo_url")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data?.logo_url) setLogoUrl(data.logo_url);
      });
  }, []);

  useEffect(() => {
    let active = true;

    const loadDisplayName = async (
      userId: string | undefined,
      userEmail: string | undefined,
      accountType: string | undefined
    ) => {
      if (!userId) {
        if (active) {
          setIsSignedIn(false);
          setDisplayName(null);
          setInitials(null);
          setEmail(null);
        }
        return;
      }
      if (active) {
        setIsSignedIn(true);
        setEmail(userEmail ?? null);
      }

      // El nombre para mostrar vive en la tabla "profiles" (no en la
      // sesión de Auth), y puede no existir todavía si el usuario aún no
      // completó /perfil — en ese caso mostramos el correo como respaldo.
      const { data: profile } = await supabase
        .from("profiles")
        .select("primer_nombre, primer_apellido, razon_social")
        .eq("id", userId)
        .maybeSingle();
      if (!active) return;

      const name =
        accountType === "empresa"
          ? profile?.razon_social
          : [profile?.primer_nombre, profile?.primer_apellido]
              .filter(Boolean)
              .join(" ");
      setDisplayName(name || userEmail || null);

      if (accountType === "empresa") {
        setInitials(
          profile?.razon_social ? getInitials(profile.razon_social) : null
        );
      } else if (profile?.primer_nombre) {
        const apellidoLetter = profile?.primer_apellido?.[0] ?? "";
        setInitials(
          (profile.primer_nombre[0] + apellidoLetter).toUpperCase() || null
        );
      } else {
        setInitials(null);
      }
    };

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      loadDisplayName(
        user?.id,
        user?.email,
        user?.user_metadata?.account_type as string | undefined
      );
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        loadDisplayName(
          session?.user.id,
          session?.user.email,
          session?.user.user_metadata?.account_type as string | undefined
        );
      }
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 flex flex-wrap md:justify-start md:flex-nowrap w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-sm py-3">
      <nav className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link href="/" className="flex-none flex items-center gap-x-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Colombia Contrata" className="h-11 w-auto" />
          ) : (
            <Image
              src="/isotipo.png"
              alt="Colombia Contrata"
              width={44}
              height={44}
              className="size-11"
              priority
            />
          )}
          <span className="text-xl font-bold">
            <span className="text-brand-navy dark:text-white">Colombia</span>{" "}
            <span className="text-brand-blue">Contrata</span>
          </span>
        </Link>

        <div className="hidden md:flex md:items-center md:gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-medium text-gray-600 dark:text-gray-400 hover:text-brand-blue dark:hover:text-brand-blue"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-x-2">
          <ThemeToggle className="hidden sm:flex items-center justify-center size-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800" />

          {isSignedIn ? (
            <div className="hidden sm:block relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                className="inline-flex items-center gap-x-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 max-w-[16rem]"
              >
                {displayName && (
                  <span className="flex-none flex items-center justify-center size-7 rounded-full bg-brand-blue text-white text-xs font-bold">
                    {initials || getInitials(displayName)}
                  </span>
                )}
                <span className="truncate text-sm font-bold text-brand-blue">
                  {displayName}
                </span>
                <svg
                  className={`size-4 shrink-0 text-gray-400 dark:text-gray-500 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-1 w-60 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {displayName}
                    </p>
                    {email && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {email}
                      </p>
                    )}
                  </div>
                  <div className="py-1">
                    {userMenuLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-x-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <link.icon className="size-4 text-gray-400 dark:text-gray-500" />
                        {link.label}
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-800 py-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex items-center gap-x-2.5 w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <IconLogout className="size-4 text-gray-400 dark:text-gray-500" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent text-gray-700 dark:text-gray-300 hover:text-brand-blue dark:hover:text-brand-blue px-3 py-2"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="hidden sm:inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark px-4 py-2"
              >
                Crear cuenta
              </Link>
            </>
          )}

          <button
            type="button"
            className="hs-collapse-toggle md:hidden flex justify-center items-center size-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
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
              className="font-medium text-gray-600 dark:text-gray-400 hover:text-brand-blue"
            >
              {link.label}
            </a>
          ))}

          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
            <span className="text-sm text-gray-500 dark:text-gray-400">Tema</span>
            <ThemeToggle />
          </div>

          {isSignedIn ? (
            <>
              <div className="flex items-center gap-x-2.5 pt-2 border-t border-gray-200 dark:border-gray-800">
                {displayName && (
                  <span className="flex-none flex items-center justify-center size-8 rounded-full bg-brand-blue text-white text-xs font-bold">
                    {initials || getInitials(displayName)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-brand-blue">{displayName}</p>
                  {email && (
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{email}</p>
                  )}
                </div>
              </div>
              {userMenuLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-x-2.5 font-medium text-gray-600 dark:text-gray-400 hover:text-brand-blue"
                >
                  <link.icon className="size-4" />
                  {link.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center justify-center gap-x-2 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-4 py-2 mt-1"
              >
                <IconLogout className="size-4" />
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="font-medium text-gray-600 dark:text-gray-400 hover:text-brand-blue"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="inline-flex items-center justify-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark px-4 py-2 mt-1"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
