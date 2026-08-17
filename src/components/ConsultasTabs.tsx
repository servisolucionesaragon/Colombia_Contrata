import Link from "next/link";

export default function ConsultasTabs({ active }: { active: "individual" | "masiva" }) {
  const tabs = [
    { id: "individual" as const, href: "/empresas/consultas", label: "Individual" },
    { id: "masiva" as const, href: "/empresas/consultas/masiva", label: "Carga masiva" },
  ];

  return (
    <div className="flex justify-center">
      <div
        role="tablist"
        aria-label="Tipo de consulta"
        className="inline-flex p-1 gap-1 rounded-lg bg-gray-100 dark:bg-gray-800"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            role="tab"
            aria-selected={active === tab.id}
            className={`text-sm font-medium rounded-md px-4 py-2 transition-colors ${
              active === tab.id
                ? "bg-white dark:bg-gray-700 text-brand-blue shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
