import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

const SLUG = "privacidad";
const DEFAULT_TITULO = "Política de Tratamiento de Datos Personales";
const DEFAULT_CONTENIDO = `
<h2>Responsable del tratamiento</h2>
<p>[Razón social de la empresa], identificada con NIT [NIT pendiente], con domicilio en [ciudad, Colombia], es la responsable del tratamiento de los datos personales recolectados a través de la plataforma Colombia Contrata (colombiacontrata.com). Contacto: <a href="mailto:contacto@colombiacontrata.com">contacto@colombiacontrata.com</a>.</p>

<h2>Marco normativo</h2>
<p>Esta política se rige por la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y demás normas que los modifiquen, reglamenten o sustituyan.</p>

<h2>Definiciones</h2>
<ul>
<li><strong>Dato personal:</strong> cualquier información vinculada o que pueda asociarse a una o varias personas naturales determinadas o determinables.</li>
<li><strong>Dato sensible:</strong> dato que afecta la intimidad del titular o cuyo uso indebido puede generar discriminación. En nuestro caso, incluye los antecedentes penales, policiales, disciplinarios y judiciales que consultamos por solicitud del titular.</li>
<li><strong>Titular:</strong> persona natural cuyos datos son objeto de tratamiento.</li>
<li><strong>Tratamiento:</strong> cualquier operación sobre datos personales, como recolección, almacenamiento, uso, circulación o supresión.</li>
<li><strong>Autorización:</strong> consentimiento previo, expreso e informado del titular para el tratamiento de sus datos personales.</li>
</ul>

<h2>Datos que recolectamos</h2>
<p><strong>Datos básicos de registro:</strong> nombres y apellidos (o razón social y NIT para empresas), tipo y número de documento, correo electrónico, teléfono, y credenciales de acceso.</p>
<p><strong>Datos sensibles:</strong> antecedentes judiciales, disciplinarios, fiscales, penales, medidas correctivas y demás información que las entidades oficiales consultadas entreguen como resultado de la solicitud del titular. Estos datos solo se consultan cuando el titular otorga su autorización expresa y separada durante el registro o al aceptar una solicitud de verificación.</p>

<h2>Finalidades del tratamiento</h2>
<ul>
<li>Gestionar tu cuenta y autenticación en la Plataforma.</li>
<li>Tramitar la consulta de los documentos que selecciones ante el proveedor externo de fuentes oficiales.</li>
<li>Procesar el pago correspondiente.</li>
<li>Generar y entregar los documentos/PDFs solicitados, y notificarte por correo electrónico cuando estén listos.</li>
<li>Para empresas: administrar el paquete de consultas contratado y el historial de verificaciones realizadas, siempre con la autorización previa del titular consultado.</li>
<li>Cumplir obligaciones legales y atender requerimientos de autoridades competentes.</li>
<li>Mejorar la Plataforma y prevenir fraude o uso indebido del servicio.</li>
</ul>

<h2>Cómo obtenemos tu autorización</h2>
<p>Al registrarte, debes marcar de forma independiente: (i) la aceptación de los Términos y Condiciones, (ii) la autorización general de tratamiento de datos personales, y (iii) la autorización específica para el tratamiento de tus datos sensibles. Ninguna casilla queda marcada por defecto. Cuando una empresa solicita verificar a un candidato, es <strong>el candidato quien debe autorizar directamente</strong> la consulta desde su propia cuenta antes de que esta se realice.</p>

<h2>Terceros con quienes compartimos datos</h2>
<ul>
<li>El proveedor externo que ejecuta las consultas a las fuentes oficiales del Estado colombiano.</li>
<li>La pasarela de pagos utilizada para procesar tu compra.</li>
<li>Proveedores de infraestructura tecnológica (hosting, envío de correo electrónico) necesarios para operar la Plataforma.</li>
</ul>
<p>No vendemos ni compartimos tus datos con terceros para fines distintos a los aquí descritos.</p>

<h2>Tiempo de conservación</h2>
<p>Los documentos generados quedan disponibles para descarga durante 10 días calendario, después de los cuales se eliminan de nuestro almacenamiento. Los datos de tu cuenta se conservan mientras esta permanezca activa o mientras sea necesario para cumplir obligaciones legales o contractuales, y se eliminarán o anonimizarán cuando dejen de ser necesarios, salvo obligación legal de conservarlos por más tiempo.</p>

<h2>Derechos del titular</h2>
<p>Como titular de tus datos, tienes derecho a:</p>
<ul>
<li>Conocer, actualizar y rectificar tus datos personales.</li>
<li>Solicitar prueba de la autorización otorgada para el tratamiento de tus datos.</li>
<li>Ser informado sobre el uso que se ha dado a tus datos personales.</li>
<li>Revocar la autorización y/o solicitar la supresión de tus datos, cuando no exista un deber legal o contractual que impida su eliminación.</li>
<li>Acceder de forma gratuita a tus datos personales.</li>
<li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la normativa de protección de datos.</li>
</ul>

<h2>Cómo ejercer tus derechos</h2>
<p>Puedes ejercer tus derechos escribiendo a <a href="mailto:contacto@colombiacontrata.com">contacto@colombiacontrata.com</a> o desde la sección de tu perfil dentro de la Plataforma. Atenderemos tu solicitud dentro de los plazos establecidos por la ley.</p>

<h2>Seguridad de la información</h2>
<p>Implementamos medidas técnicas, humanas y administrativas razonables para proteger tus datos personales contra acceso no autorizado, pérdida o alteración.</p>

<h2>Vigencia</h2>
<p>Esta política rige a partir de su publicación y se actualizará cuando sea necesario. Los cambios sustanciales se comunicarán a los titulares y podrán requerir una nueva autorización.</p>
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
      "Política de tratamiento de datos personales de Colombia Contrata, conforme a la Ley 1581 de 2012.",
  };
}

export default async function PrivacidadPage() {
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
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                <path d="m9 12 2 2 4-4" />
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
