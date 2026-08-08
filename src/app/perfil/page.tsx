import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProfileForm from "@/components/ProfileForm";
import AccountSecurityForm from "@/components/AccountSecurityForm";

export const metadata: Metadata = {
  title: "Completar perfil — Colombia Contrata",
  robots: { index: false, follow: false },
};

export default function PerfilPage() {
  return (
    <>
      <Header />
      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            Completa tu perfil
          </h1>
          <p className="mt-2 text-center text-gray-600">
            Con tu cuenta ya confirmada, completa estos datos para poder
            solicitar tus documentos.
          </p>

          <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-6 sm:p-8">
            <ProfileForm />
          </div>

          <AccountSecurityForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
