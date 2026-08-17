import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EquipoEmpresaContent from "@/components/EquipoEmpresaContent";

export const metadata: Metadata = {
  title: "Equipo — Colombia Contrata",
  robots: { index: false, follow: false },
};

export default function EquipoEmpresaPage() {
  return (
    <>
      <Header />
      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center">
            Equipo
          </h1>
          <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
            Da acceso a tu equipo para invitar y revisar consultas, sin
            compartir tu propia cuenta.
          </p>

          <div className="mt-8">
            <EquipoEmpresaContent />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
