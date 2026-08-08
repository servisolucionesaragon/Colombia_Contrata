import type { Metadata } from "next";
import Link from "next/link";
import AdminGate from "@/components/AdminGate";
import AdminWarningBanner from "@/components/AdminWarningBanner";
import AdminSettingsForm from "@/components/AdminSettingsForm";

export const metadata: Metadata = {
  title: "Configuración del portal — Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="min-h-full flex flex-col bg-gray-50">
      <header className="bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-x-2">
            <span className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Admin
            </span>
            <span className="text-gray-600">/</span>
            <span className="font-medium">Configuración del portal</span>
          </div>
          <Link href="/" className="text-sm text-gray-300 hover:text-white">
            Volver al sitio
          </Link>
        </div>
      </header>

      <main className="flex-1 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <AdminGate>
            <AdminWarningBanner />

            <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8">
              <AdminSettingsForm />
            </div>
          </AdminGate>
        </div>
      </main>
    </div>
  );
}
