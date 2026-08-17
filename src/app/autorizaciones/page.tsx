import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AutorizacionesContent from "@/components/AutorizacionesContent";

export const metadata: Metadata = {
  title: "Autorizaciones — Colombia Contrata",
  robots: { index: false, follow: false },
};

export default function AutorizacionesPage() {
  return (
    <>
      <Header />
      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center">
            Autorizaciones
          </h1>
          <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
            Empresas que solicitaron verificar tus antecedentes.
          </p>

          <div className="mt-8">
            <AutorizacionesContent />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
