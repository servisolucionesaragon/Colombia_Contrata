import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

const SLUG = "terminos";
const DEFAULT_TITULO = "Términos y Condiciones";
const DEFAULT_CONTENIDO = `
<h2>Objeto</h2>
<p>Estos Términos y Condiciones regulan el acceso y uso de la plataforma <strong>Colombia Contrata</strong> (en adelante, "la Plataforma"), operada por [Razón social de la empresa], identificada con NIT [NIT pendiente] (en adelante, "nosotros" o "la empresa"), a través del sitio web colombiacontrata.com. Al registrarte o usar la Plataforma aceptas estos términos en su totalidad.</p>

<h2>Descripción del servicio</h2>
<p>La Plataforma permite a personas naturales y empresas solicitar la consulta y generación de documentos requeridos para procesos de contratación pública en Colombia (antecedentes judiciales, disciplinarios, fiscales, penales, medidas correctivas, y otros que se habiliten en el futuro), a través de un proveedor externo que consulta las fuentes oficiales correspondientes.</p>
<p>Para empresas, la Plataforma ofrece adicionalmente paquetes de consultas para verificar antecedentes de candidatos antes de su contratación, sujeto siempre a la autorización previa del titular de los datos (ver Política de Tratamiento de Datos Personales).</p>

<h2>Registro y cuenta de usuario</h2>
<p>Para usar la Plataforma debes registrarte proporcionando datos veraces, completos y actualizados. Eres responsable de la confidencialidad de tu contraseña y de toda actividad realizada desde tu cuenta. Debes notificarnos de inmediato ante cualquier uso no autorizado de tu cuenta.</p>

<h2>Proceso de solicitud, pago y entrega</h2>
<ul>
<li>Seleccionas del catálogo los documentos que deseas obtener.</li>
<li>Realizas el pago correspondiente a través de la pasarela de pagos habilitada en la Plataforma.</li>
<li>Una vez validado el pago, se envía la solicitud al proveedor externo de consultas, que verifica las fuentes oficiales correspondientes.</li>
<li>Te notificamos por correo electrónico cuando los documentos estén listos para descargar.</li>
<li>Los documentos quedan disponibles para descarga durante <strong>10 días calendario</strong> desde la notificación. Pasado ese plazo, deberán solicitarse nuevamente y podrá aplicar un nuevo cobro.</li>
</ul>

<h2>Precios y reembolsos</h2>
<p>Los precios de cada documento o paquete se muestran antes de confirmar el pago. Dado que la generación de los documentos implica una consulta efectiva a fuentes oficiales, una vez iniciado el proceso de consulta <strong>no procederán reembolsos</strong>, salvo que la Plataforma no logre entregar el documento solicitado por una falla atribuible a nosotros o a nuestro proveedor.</p>

<h2>Exactitud de la información</h2>
<p>Los documentos entregados reflejan la información publicada por las entidades oficiales consultadas (Policía Nacional, Procuraduría, Contraloría, Rama Judicial, entre otras) en el momento de la consulta. No somos responsables por inexactitudes, retrasos o indisponibilidad de dichas fuentes, ni por las decisiones que terceros tomen con base en los documentos entregados.</p>

<h2>Obligaciones del usuario</h2>
<ul>
<li>Usar la Plataforma conforme a la ley y estos términos.</li>
<li>Contar con la autorización correspondiente cuando solicite documentos o verificaciones de un tercero (ver módulo de empresas).</li>
<li>No usar los documentos obtenidos para fines distintos a los permitidos por la ley (por ejemplo, discriminación laboral no permitida).</li>
</ul>

<h2>Propiedad intelectual</h2>
<p>El software, diseño, marca y contenidos de la Plataforma son propiedad de [Razón social de la empresa] o de sus licenciantes. No se permite su reproducción o uso no autorizado.</p>

<h2>Protección de datos personales</h2>
<p>El tratamiento de tus datos personales, incluidos los datos sensibles necesarios para generar los documentos solicitados, se rige por nuestra <a href="/privacidad">Política de Tratamiento de Datos Personales</a>, la cual forma parte integral de estos Términos.</p>

<h2>Modificaciones</h2>
<p>Podemos actualizar estos Términos en cualquier momento. Publicaremos la versión vigente en esta página e indicaremos la fecha de la última actualización. El uso continuado de la Plataforma después de una actualización implica la aceptación de los nuevos términos.</p>

<h2>Legislación aplicable</h2>
<p>Estos Términos se rigen por las leyes de la República de Colombia. Cualquier controversia se someterá a los jueces competentes de Colombia.</p>

<h2>Contacto</h2>
<p>Para dudas sobre estos Términos, escríbenos a <a href="mailto:contacto@colombiacontrata.com">contacto@colombiacontrata.com</a>.</p>
`;

async function getPagina() {
  const { data } = await supabase
    .from("paginas")
    .select("titulo, contenido")
    .eq("slug", SLUG)
    .eq("activo", true)
    .maybeSingle();
  return data;
}

export async function generateMetadata(): Promise<Metadata> {
  const pagina = await getPagina();
  return {
    title: `${pagina?.titulo || DEFAULT_TITULO} — Colombia Contrata`,
    description:
      "Términos y condiciones de uso de la plataforma Colombia Contrata.",
  };
}

export default async function TerminosPage() {
  const pagina = await getPagina();
  const titulo = pagina?.titulo || DEFAULT_TITULO;
  const contenido = pagina?.contenido || DEFAULT_CONTENIDO;

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-950">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14 sm:pt-20 sm:pb-16 text-center">
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
              {titulo}
            </h1>
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              Última actualización: [fecha pendiente de publicación]
            </p>
          </div>
        </section>

        {/* Contenido */}
        <section className="bg-gray-50 dark:bg-gray-900/50 py-16 sm:py-20">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="legal-content rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-10 text-gray-700 dark:text-gray-300 leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:dark:text-gray-100 [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:first:mt-0 [&_p]:my-3 [&_ul]:list-disc [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:my-3 [&_a]:text-brand-blue [&_a]:hover:underline [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{ __html: contenido }}
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
