import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LegalDisclaimer from "@/components/LegalDisclaimer";

export const metadata: Metadata = {
  title: "Términos y Condiciones — Colombia Contrata",
  description:
    "Términos y condiciones de uso de la plataforma Colombia Contrata.",
};

export default function TerminosPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-950">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14 sm:pt-20 sm:pb-16 text-center">
            <span className="inline-flex items-center justify-center size-14 rounded-2xl bg-brand-blue/10 text-brand-blue">
              <svg
                className="size-7"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
                <path d="M9 13h6" />
                <path d="M9 17h6" />
              </svg>
            </span>
            <h1 className="mt-6 text-3xl sm:text-5xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Términos y Condiciones
            </h1>
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              Última actualización: [fecha pendiente de publicación]
            </p>
          </div>
        </section>

        {/* Contenido */}
        <section className="bg-gray-50 dark:bg-gray-900/50 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <LegalDisclaimer />

            <div className="mt-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-10 space-y-10 text-gray-700 dark:text-gray-300 leading-relaxed">
              <Section title="1. Objeto">
              <p>
                Estos Términos y Condiciones regulan el acceso y uso de la
                plataforma <strong>Colombia Contrata</strong> (en adelante,
                &quot;la Plataforma&quot;), operada por [Razón social de la
                empresa], identificada con NIT [NIT pendiente] (en adelante,
                &quot;nosotros&quot; o &quot;la empresa&quot;), a través del sitio
                web colombiacontrata.com. Al registrarte o usar la Plataforma
                aceptas estos términos en su totalidad.
              </p>
            </Section>

            <Section title="2. Descripción del servicio">
              <p>
                La Plataforma permite a personas naturales y empresas
                solicitar la consulta y generación de documentos requeridos
                para procesos de contratación pública en Colombia
                (antecedentes judiciales, disciplinarios, fiscales, penales,
                medidas correctivas, y otros que se habiliten en el futuro),
                a través de un proveedor externo que consulta las fuentes
                oficiales correspondientes.
              </p>
              <p className="mt-3">
                Para empresas, la Plataforma ofrece adicionalmente paquetes de
                consultas para verificar antecedentes de candidatos antes de
                su contratación, sujeto siempre a la autorización previa del
                titular de los datos (ver Política de Tratamiento de Datos
                Personales).
              </p>
            </Section>

            <Section title="3. Registro y cuenta de usuario">
              <p>
                Para usar la Plataforma debes registrarte proporcionando datos
                veraces, completos y actualizados. Eres responsable de la
                confidencialidad de tu contraseña y de toda actividad
                realizada desde tu cuenta. Debes notificarnos de inmediato
                ante cualquier uso no autorizado de tu cuenta.
              </p>
            </Section>

            <Section title="4. Proceso de solicitud, pago y entrega">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Seleccionas del catálogo los documentos que deseas obtener.
                </li>
                <li>
                  Realizas el pago correspondiente a través de la pasarela de
                  pagos habilitada en la Plataforma.
                </li>
                <li>
                  Una vez validado el pago, se envía la solicitud al
                  proveedor externo de consultas, que verifica las fuentes
                  oficiales correspondientes.
                </li>
                <li>
                  Te notificamos por correo electrónico cuando los documentos
                  estén listos para descargar.
                </li>
                <li>
                  Los documentos quedan disponibles para descarga durante{" "}
                  <strong>10 días calendario</strong> desde la notificación.
                  Pasado ese plazo, deberán solicitarse nuevamente y podrá
                  aplicar un nuevo cobro.
                </li>
              </ul>
            </Section>

            <Section title="5. Precios y reembolsos">
              <p>
                Los precios de cada documento o paquete se muestran antes de
                confirmar el pago. Dado que la generación de los documentos
                implica una consulta efectiva a fuentes oficiales, una vez
                iniciado el proceso de consulta{" "}
                <strong>no procederán reembolsos</strong>, salvo que la
                Plataforma no logre entregar el documento solicitado por una
                falla atribuible a nosotros o a nuestro proveedor.
              </p>
            </Section>

            <Section title="6. Exactitud de la información">
              <p>
                Los documentos entregados reflejan la información publicada
                por las entidades oficiales consultadas (Policía Nacional,
                Procuraduría, Contraloría, Rama Judicial, entre otras) en el
                momento de la consulta. No somos responsables por
                inexactitudes, retrasos o indisponibilidad de dichas fuentes,
                ni por las decisiones que terceros tomen con base en los
                documentos entregados.
              </p>
            </Section>

            <Section title="7. Obligaciones del usuario">
              <ul className="list-disc pl-5 space-y-2">
                <li>Usar la Plataforma conforme a la ley y estos términos.</li>
                <li>
                  Contar con la autorización correspondiente cuando solicite
                  documentos o verificaciones de un tercero (ver módulo de
                  empresas).
                </li>
                <li>
                  No usar los documentos obtenidos para fines distintos a los
                  permitidos por la ley (por ejemplo, discriminación laboral
                  no permitida).
                </li>
              </ul>
            </Section>

            <Section title="8. Propiedad intelectual">
              <p>
                El software, diseño, marca y contenidos de la Plataforma son
                propiedad de [Razón social de la empresa] o de sus
                licenciantes. No se permite su reproducción o uso no
                autorizado.
              </p>
            </Section>

            <Section title="9. Protección de datos personales">
              <p>
                El tratamiento de tus datos personales, incluidos los datos
                sensibles necesarios para generar los documentos
                solicitados, se rige por nuestra{" "}
                <a href="/privacidad" className="text-brand-blue hover:underline">
                  Política de Tratamiento de Datos Personales
                </a>
                , la cual forma parte integral de estos Términos.
              </p>
            </Section>

            <Section title="10. Modificaciones">
              <p>
                Podemos actualizar estos Términos en cualquier momento.
                Publicaremos la versión vigente en esta página e
                indicaremos la fecha de la última actualización. El uso
                continuado de la Plataforma después de una actualización
                implica la aceptación de los nuevos términos.
              </p>
            </Section>

            <Section title="11. Legislación aplicable">
              <p>
                Estos Términos se rigen por las leyes de la República de
                Colombia. Cualquier controversia se someterá a los jueces
                competentes de Colombia.
              </p>
            </Section>

            <Section title="12. Contacto">
              <p>
                Para dudas sobre estos Términos, escríbenos a{" "}
                <a
                  href="mailto:contacto@colombiacontrata.com"
                  className="text-brand-blue hover:underline"
                >
                  contacto@colombiacontrata.com
                </a>
                .
              </p>
            </Section>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const match = title.match(/^(\d+)\.\s*(.*)$/);
  const numero = match?.[1];
  const texto = match?.[2] ?? title;

  return (
    <section id={numero ? `seccion-${numero}` : undefined} className="scroll-mt-24">
      <div className="flex items-center gap-x-3 mb-3">
        {numero && (
          <span className="flex items-center justify-center size-8 shrink-0 rounded-full bg-brand-blue text-white text-sm font-bold">
            {numero}
          </span>
        )}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{texto}</h2>
      </div>
      <div className="sm:pl-11">{children}</div>
    </section>
  );
}
