import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SolicitarContent from "@/components/SolicitarContent";

export const metadata: Metadata = {
  title: "Solicitar documentos — Colombia Contrata",
  robots: { index: false, follow: false },
};

export default function SolicitarPage() {
  return (
    <>
      <Header />
      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center">
            Solicitar documentos
          </h1>
          <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
            Selecciona los documentos que necesitas para tu proceso de
            contratación.
          </p>

          <div className="mt-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8">
            <SolicitarContent />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
