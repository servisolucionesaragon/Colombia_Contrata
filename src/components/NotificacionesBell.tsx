"use client";

import { useEffect, useRef, useState, type SVGProps } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Notificacion = {
  id: string;
  candidato_nombre: string | null;
  mensaje: string;
  tipo: "autorizada" | "rechazada";
  leida: boolean;
  created_at: string;
};

// Campanita de notificaciones en la plataforma (no por correo) para que
// la empresa se entere cuando un candidato autoriza o rechaza, sin
// tener que entrar manualmente a revisar /empresas/consultas. Se
// resuelve sola (empresa dueña o miembro de equipo vía profiles), igual
// que HistorialContent.tsx/DashboardContent.tsx, en vez de recibir la
// empresa efectiva por props desde Header.tsx.
export default function NotificacionesBell() {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const cargar = async (id: string) => {
    const { data } = await supabase
      .from("notificaciones")
      .select("id, candidato_nombre, mensaje, tipo, leida, created_at")
      .eq("empresa_id", id)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotificaciones(data ?? []);
  };

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type, empresa_id_padre")
        .eq("id", user.id)
        .maybeSingle();

      const id =
        profile?.account_type === "empresa"
          ? user.id
          : profile?.account_type === "empresa_miembro"
          ? profile.empresa_id_padre
          : null;

      if (!id) return;
      setEmpresaId(id);
      await cargar(id);
    })();
  }, []);

  // Refresca cada minuto para que el contador se actualice sin recargar
  // la página — sin depender de Realtime de Supabase para mantenerlo simple.
  useEffect(() => {
    if (!empresaId) return;
    const interval = setInterval(() => cargar(empresaId), 60000);
    return () => clearInterval(interval);
  }, [empresaId]);

  useEffect(() => {
    if (!abierto) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [abierto]);

  if (!empresaId) return null;

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  const marcarLeida = async (id: string) => {
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    await supabase.from("notificaciones").update({ leida: true }).eq("id", id);
  };

  const marcarTodas = async () => {
    const idsNoLeidas = notificaciones.filter((n) => !n.leida).map((n) => n.id);
    if (idsNoLeidas.length === 0) return;
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    await supabase.from("notificaciones").update({ leida: true }).in("id", idsNoLeidas);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label="Notificaciones"
        className="relative inline-flex items-center justify-center size-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <IconBell className="size-5" />
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[10px] font-bold px-1">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-1 w-80 max-w-[90vw] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-50">
          <div className="flex items-center justify-between gap-x-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notificaciones</p>
            {noLeidas > 0 && (
              <button
                type="button"
                onClick={marcarTodas}
                className="text-xs font-semibold text-brand-blue hover:text-brand-blue-dark shrink-0"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                No tienes notificaciones.
              </p>
            ) : (
              notificaciones.map((n) => (
                <Link
                  key={n.id}
                  href="/empresas/consultas"
                  onClick={() => {
                    setAbierto(false);
                    if (!n.leida) marcarLeida(n.id);
                  }}
                  className="flex items-start gap-x-2 px-4 py-3 text-sm border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {!n.leida && <span className="mt-1.5 size-1.5 rounded-full bg-brand-blue shrink-0" />}
                  <div className={n.leida ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-gray-100"}>
                    <p>
                      {n.candidato_nombre && (
                        <span className="font-semibold">{n.candidato_nombre} </span>
                      )}
                      {n.mensaje}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                      {new Date(n.created_at).toLocaleString("es-CO")}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function IconBell(props: SVGProps<SVGSVGElement>) {
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
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
