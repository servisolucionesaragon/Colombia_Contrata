import type { Metadata } from "next";
import Link from "next/link";
import AdminGate from "@/components/AdminGate";
import AdminSettingsForm from "@/components/AdminSettingsForm";
import LandingConfigManager from "@/components/LandingConfigManager";
import BloquesLandingManager from "@/components/BloquesLandingManager";
import PaginasManager from "@/components/PaginasManager";
import ConfiguracionPersonaManager from "@/components/ConfiguracionPersonaManager";
import PlanesEmpresaManager from "@/components/PlanesEmpresaManager";
import PreciosDocumentosManager from "@/components/PreciosDocumentosManager";
import AdminRolesManager from "@/components/AdminRolesManager";
import WompiConfigManager from "@/components/WompiConfigManager";
import UsuariosManager from "@/components/UsuariosManager";
import PagosManager from "@/components/PagosManager";
import AdminTabs from "@/components/AdminTabs";

export const metadata: Metadata = {
  title: "Configuración del portal — Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <header className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <AdminGate>
            <AdminTabs
              identidad={
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8">
                  <AdminSettingsForm />
                </div>
              }
              landing={
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8">
                  <LandingConfigManager />
                </div>
              }
              bloques={
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8">
                  <BloquesLandingManager />
                </div>
              }
              paginas={
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8">
                  <PaginasManager />
                </div>
              }
              personas={
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8">
                  <ConfiguracionPersonaManager />
                </div>
              }
              planes={
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8">
                  <PlanesEmpresaManager />
                </div>
              }
              documentos={
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8">
                  <PreciosDocumentosManager />
                </div>
              }
              usuarios={
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8">
                  <UsuariosManager />
                </div>
              }
              pagosClientes={
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8">
                  <PagosManager />
                </div>
              }
              pagos={
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8">
                  <WompiConfigManager />
                </div>
              }
              admins={
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8">
                  <AdminRolesManager />
                </div>
              }
            />
          </AdminGate>
        </div>
      </main>
    </div>
  );
}
