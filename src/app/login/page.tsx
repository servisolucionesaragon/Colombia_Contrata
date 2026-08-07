import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión — Colombia Contrata",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            Inicia sesión
          </h1>
          <p className="mt-2 text-center text-gray-600">
            Ingresa con tu correo y contraseña para continuar.
          </p>

          <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-6 sm:p-8">
            <LoginForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
