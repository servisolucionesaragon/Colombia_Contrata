import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RegisterForm from "@/components/RegisterForm";

export const metadata: Metadata = {
  title: "Crear cuenta — Colombia Contrata",
  description:
    "Regístrate para solicitar tus documentos de contratación pública o gestionar verificaciones como empresa.",
};

export default function RegistroPage() {
  return (
    <>
      <Header />
      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            Crea tu cuenta
          </h1>
          <p className="mt-2 text-center text-gray-600">
            Regístrate para solicitar tus documentos o gestionar
            verificaciones como empresa.
          </p>

          <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-6 sm:p-8">
            <RegisterForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
