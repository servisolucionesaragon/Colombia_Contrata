import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ResponderConsultaContent from "@/components/ResponderConsultaContent";

export const metadata: Metadata = {
  title: "Responder invitación — Colombia Contrata",
  robots: { index: false, follow: false },
};

export default function ResponderConsultaPage() {
  return (
    <>
      <Header />
      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8">
            <Suspense
              fallback={
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Cargando...
                </p>
              }
            >
              <ResponderConsultaContent />
            </Suspense>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
