"use client";

import { useEffect, useState, type ReactNode, type SVGProps } from "react";
import { supabase } from "@/lib/supabase";

const tabs = [
  { id: "tablero", label: "Tablero" },
  { id: "identidad", label: "Identidad del portal" },
  { id: "landing", label: "Textos y secciones" },
  { id: "bloques", label: "Bloques de contenido" },
  { id: "paginas", label: "Páginas" },
  { id: "personas", label: "Planes de personas" },
  { id: "planes", label: "Planes de empresa" },
  { id: "documentos", label: "Documentos disponibles" },
  { id: "usuarios", label: "Usuarios" },
  { id: "actividad", label: "Actividad por usuario" },
  { id: "solicitudesDatos", label: "Solicitudes de datos" },
  { id: "pagosClientes", label: "Pagos" },
  { id: "riesgo", label: "Riesgo de consultas" },
  { id: "pagos", label: "Pagos (Wompi)" },
  { id: "fuentes", label: "Fuentes" },
  { id: "admins", label: "Administradores" },
] as const;

type TabId = (typeof tabs)[number]["id"];

type NavEntry =
  | { type: "item"; id: TabId; label: string }
  | { type: "group"; label: string; items: { id: TabId; label: string }[] };

const nav: NavEntry[] = [
  { type: "item", id: "tablero", label: "Tablero" },
  { type: "item", id: "identidad", label: "Identidad del portal" },
  {
    type: "group",
    label: "Página principal",
    items: [
      { id: "landing", label: "Textos y secciones" },
      { id: "bloques", label: "Bloques de contenido" },
      { id: "paginas", label: "Páginas" },
    ],
  },
  {
    type: "group",
    label: "Planes y documentos",
    items: [
      { id: "personas", label: "Planes de personas" },
      { id: "planes", label: "Planes de empresa" },
      { id: "documentos", label: "Documentos disponibles" },
    ],
  },
  {
    type: "group",
    label: "Usuarios y pagos",
    items: [
      { id: "usuarios", label: "Usuarios" },
      { id: "actividad", label: "Actividad por usuario" },
      { id: "solicitudesDatos", label: "Solicitudes de datos" },
      { id: "pagosClientes", label: "Pagos" },
      { id: "riesgo", label: "Riesgo de consultas" },
    ],
  },
  { type: "item", id: "pagos", label: "Pagos (Wompi)" },
  { type: "item", id: "fuentes", label: "Fuentes" },
  { type: "item", id: "admins", label: "Administradores" },
];

export default function AdminTabs({
  tablero,
  identidad,
  landing,
  bloques,
  paginas,
  personas,
  planes,
  documentos,
  usuarios,
  actividad,
  solicitudesDatos,
  pagosClientes,
  riesgo,
  pagos,
  fuentes,
  admins,
}: {
  tablero: ReactNode;
  identidad: ReactNode;
  landing: ReactNode;
  bloques: ReactNode;
  paginas: ReactNode;
  personas: ReactNode;
  planes: ReactNode;
  documentos: ReactNode;
  usuarios: ReactNode;
  actividad: ReactNode;
  solicitudesDatos: ReactNode;
  pagosClientes: ReactNode;
  riesgo: ReactNode;
  pagos: ReactNode;
  fuentes: ReactNode;
  admins: ReactNode;
}) {
  const [active, setActive] = useState<TabId>("tablero");
  const [menuAbierto, setMenuAbierto] = useState(false);
  // Las solicitudes de habeas data tienen plazo legal, así que su conteo
  // vive en el menú y no solo dentro de su pestaña: es lo primero que se
  // ve al entrar a /admin, sin importar en qué sección se esté.
  const [pendientesDatos, setPendientesDatos] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/admin/solicitudes-datos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const cuerpo = await res.json();
      setPendientesDatos(cuerpo.pendientes ?? 0);
    })();
  }, [active]);
  const content = {
    tablero,
    identidad,
    landing,
    bloques,
    paginas,
    personas,
    planes,
    documentos,
    usuarios,
    actividad,
    solicitudesDatos,
    pagosClientes,
    riesgo,
    pagos,
    fuentes,
    admins,
  }[active];

  const activeLabel = tabs.find((tab) => tab.id === active)?.label ?? "Menú";

  const elegir = (id: TabId) => {
    setActive(id);
    setMenuAbierto(false);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
      <button
        type="button"
        onClick={() => setMenuAbierto((prev) => !prev)}
        className="sm:hidden flex items-center justify-between gap-x-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100"
      >
        <span className="flex items-center gap-x-2">
          <IconMenu className="size-5" />
          {activeLabel}
        </span>
        <IconChevron className={`size-4 transition-transform ${menuAbierto ? "rotate-180" : ""}`} />
      </button>

      <nav
        className={`${
          menuAbierto ? "block" : "hidden"
        } sm:block sm:w-60 shrink-0 space-y-5 sm:sticky sm:top-6`}
      >
        {nav.map((entry, index) =>
          entry.type === "item" ? (
            <NavButton
              key={entry.id}
              active={active === entry.id}
              onClick={() => elegir(entry.id)}
              badge={entry.id === "solicitudesDatos" ? pendientesDatos : 0}
            >
              {entry.label}
            </NavButton>
          ) : (
            <div key={`${entry.label}-${index}`}>
              <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {entry.label}
              </p>
              <div className="space-y-0.5">
                {entry.items.map((item) => (
                  <NavButton
                    key={item.id}
                    active={active === item.id}
                    onClick={() => elegir(item.id)}
                    badge={item.id === "solicitudesDatos" ? pendientesDatos : 0}
                  >
                    {item.label}
                  </NavButton>
                ))}
              </div>
            </div>
          )
        )}
      </nav>
      <div className="flex-1 min-w-0">{content}</div>
    </div>
  );
}

function IconMenu(props: SVGProps<SVGSVGElement>) {
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
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

function IconChevron(props: SVGProps<SVGSVGElement>) {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function NavButton({
  active,
  onClick,
  badge = 0,
  children,
}: {
  active: boolean;
  onClick: () => void;
  badge?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left ${
        active
          ? "bg-brand-blue/10 text-brand-blue"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
      }`}
    >
      <span>{children}</span>
      {badge > 0 && (
        <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}
