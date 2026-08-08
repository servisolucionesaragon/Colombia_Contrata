"use client";

import { useState, type ReactNode } from "react";

const tabs = [
  { id: "identidad", label: "Identidad del portal" },
  { id: "personas", label: "Planes de personas" },
  { id: "planes", label: "Planes de empresa" },
  { id: "documentos", label: "Documentos disponibles" },
  { id: "admins", label: "Administradores" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function AdminTabs({
  identidad,
  personas,
  planes,
  documentos,
  admins,
}: {
  identidad: ReactNode;
  personas: ReactNode;
  planes: ReactNode;
  documentos: ReactNode;
  admins: ReactNode;
}) {
  const [active, setActive] = useState<TabId>("identidad");
  const content = { identidad, personas, planes, documentos, admins }[active];

  return (
    <div>
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex gap-x-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
                active === tab.id
                  ? "border-brand-blue text-brand-blue"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      {content}
    </div>
  );
}
