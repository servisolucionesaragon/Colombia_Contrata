"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const navLinks = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#documentos", label: "Documentos" },
  { href: "#planes", label: "Planes" },
  { href: "#empresas", label: "Empresas" },
];

export default function Header() {
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadDisplayName = async (
      userId: string | undefined,
      email: string | undefined,
      accountType: string | undefined
    ) => {
      if (!userId) {
        if (active) {
          setIsSignedIn(false);
          setDisplayName(null);
        }
        return;
      }
      if (active) setIsSignedIn(true);

      // El nombre para mostrar vive en la tabla "profiles" (no en la
      // sesión de Auth), y puede no existir todavía si el usuario aún no
      // completó /perfil — en ese caso mostramos el correo como respaldo.
      const { data: profile } = await supabase
        .from("profiles")
        .select("primer_nombre, razon_social")
        .eq("id", userId)
        .maybeSingle();
      if (!active) return;

      const name =
        accountType === "empresa" ? profile?.razon_social : profile?.primer_nombre;
      setDisplayName(name || email || null);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 flex flex-wrap md:justify-start md:flex-nowrap w-full bg-white border-b border-gray-200 text-sm py-3">
      <nav className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link href="/" className="flex-none flex items-center gap-x-2">
          <Image
            src="/isotipo.png"
            alt="Colombia Contrata"
            width={32}
            height={32}
            className="size-8"
            priority
          />
          <span className="text-xl font-bold">
            <span className="text-brand-navy">Colombia</span>{" "}
            <span className="text-brand-blue">Contrata</span>
          </span>
        </Link>

        <div className="hidden md:flex md:items-center md:gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-medium text-gray-600 hover:text-brand-blue"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-x-2">
          {isSignedIn ? (
            <>
              <Link
                href="/perfil"
                className="hidden sm:inline-flex items-center gap-x-2 text-sm font-medium text-gray-700 hover:text-brand-blue px-3 py-2 truncate max-w-[14rem]"
              >
                {displayName}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="hidden sm:inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent text-gray-700 hover:text-brand-blue px-3 py-2"
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
              className="font-medium text-gray-600 hover:text-brand-blue"
            >
              {link.label}
            </a>
          ))}
          {isSignedIn ? (
            <>
              <Link
                href="/perfil"
                className="font-medium text-gray-600 hover:text-brand-blue truncate"
              >
                {displayName}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="sm:hidden inline-flex items-center justify-center gap-x-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 mt-1"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="font-medium text-gray-600 hover:text-brand-blue"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="sm:hidden inline-flex items-center justify-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark px-4 py-2 mt-1"
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
