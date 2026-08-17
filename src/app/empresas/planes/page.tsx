import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EmpresaPlanesContent from "@/components/EmpresaPlanesContent";

export const metadata: Metadata = {
  title: "Planes para empresas — Colombia Contrata",
  robots: { index: false, follow: false },
};

export default function EmpresaPlanesPage() {
  return (
    <>
      <Header />
      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center">
            Planes para empresas
          </h1>
          <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
            Elige el plan de consultas para tu empresa y paga mensual o
            anual.
          </p>

          <div className="mt-8">
            <EmpresaPlanesContent />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
