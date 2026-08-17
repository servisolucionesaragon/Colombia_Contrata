import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CargaMasivaContent from "@/components/CargaMasivaContent";
import ConsultasTabs from "@/components/ConsultasTabs";

export const metadata: Metadata = {
  title: "Carga masiva de candidatos — Colombia Contrata",
  robots: { index: false, follow: false },
};

export default function CargaMasivaPage() {
  return (
    <>
      <Header />
      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center">
            Carga masiva de candidatos
          </h1>
          <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
            Invita a varios candidatos a la vez desde un archivo CSV.
          </p>

          <div className="mt-6">
            <ConsultasTabs active="masiva" />
          </div>

          <div className="mt-8">
            <CargaMasivaContent />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
