import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LegalDisclaimer from "@/components/LegalDisclaimer";

export const metadata: Metadata = {
  title: "Política de Tratamiento de Datos Personales — Colombia Contrata",
  description:
    "Política de tratamiento de datos personales de Colombia Contrata, conforme a la Ley 1581 de 2012.",
};

export default function PrivacidadPage() {
  return (
    <>
      <Header />
      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Política de Tratamiento de Datos Personales
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Última actualización: [fecha pendiente de publicación]
          </p>

          <LegalDisclaimer />

          <div className="mt-8 space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed">
            <Section title="1. Responsable del tratamiento">
              <p>
                [Razón social de la empresa], identificada con NIT [NIT
                pendiente], con domicilio en [ciudad, Colombia], es la
                responsable del tratamiento de los datos personales
                recolectados a través de la plataforma Colombia Contrata
                (colombiacontrata.com). Contacto:{" "}
                <a
                  href="mailto:contacto@colombiacontrata.com"
                  className="text-brand-blue hover:underline"
                >
                  contacto@colombiacontrata.com
                </a>
                .
              </p>
            </Section>

            <Section title="2. Marco normativo">
              <p>
                Esta política se rige por la Ley 1581 de 2012, el Decreto
                1377 de 2013 (compilado en el Decreto 1074 de 2015) y demás
                normas que los modifiquen, reglamenten o sustituyan.
              </p>
            </Section>

            <Section title="3. Definiciones">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Dato personal:</strong> cualquier información
                  vinculada o que pueda asociarse a una o varias personas
                  naturales determinadas o determinables.
                </li>
                <li>
                  <strong>Dato sensible:</strong> dato que afecta la
                  intimidad del titular o cuyo uso indebido puede generar
                  discriminación. En nuestro caso, incluye los antecedentes
                  penales, policiales, disciplinarios y judiciales que
                  consultamos por solicitud del titular.
                </li>
                <li>
                  <strong>Titular:</strong> persona natural cuyos datos son
                  objeto de tratamiento.
                </li>
                <li>
                  <strong>Tratamiento:</strong> cualquier operación sobre
                  datos personales, como recolección, almacenamiento, uso,
                  circulación o supresión.
                </li>
                <li>
                  <strong>Autorización:</strong> consentimiento previo,
                  expreso e informado del titular para el tratamiento de sus
                  datos personales.
                </li>
              </ul>
            </Section>

            <Section title="4. Datos que recolectamos">
              <p className="mb-2">
                <strong>Datos básicos de registro:</strong> nombres y
                apellidos (o razón social y NIT para empresas), tipo y
                número de documento, correo electrónico, teléfono, y
                credenciales de acceso.
              </p>
              <p>
                <strong>Datos sensibles:</strong> antecedentes judiciales,
                disciplinarios, fiscales, penales, medidas correctivas y
                demás información que las entidades oficiales consultadas
                entreguen como resultado de la solicitud del titular. Estos
                datos solo se consultan cuando el titular otorga su
                autorización expresa y separada durante el registro o al
                aceptar una solicitud de verificación.
              </p>
            </Section>

            <Section title="5. Finalidades del tratamiento">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Gestionar tu cuenta y autenticación en la Plataforma.
                </li>
                <li>
                  Tramitar la consulta de los documentos que selecciones ante
                  el proveedor externo de fuentes oficiales.
                </li>
                <li>Procesar el pago correspondiente.</li>
                <li>
                  Generar y entregar los documentos/PDFs solicitados, y
                  notificarte por correo electrónico cuando estén listos.
                </li>
                <li>
                  Para empresas: administrar el paquete de consultas
                  contratado y el historial de verificaciones realizadas,
                  siempre con la autorización previa del titular consultado.
                </li>
                <li>
                  Cumplir obligaciones legales y atender requerimientos de
                  autoridades competentes.
                </li>
                <li>
                  Mejorar la Plataforma y prevenir fraude o uso indebido del
                  servicio.
                </li>
              </ul>
            </Section>

            <Section title="6. Cómo obtenemos tu autorización">
              <p>
                Al registrarte, debes marcar de forma independiente: (i) la
                aceptación de los Términos y Condiciones, (ii) la
                autorización general de tratamiento de datos personales, y
                (iii) la autorización específica para el tratamiento de tus
                datos sensibles. Ninguna casilla queda marcada por defecto.
                Cuando una empresa solicita verificar a un candidato, es{" "}
                <strong>el candidato quien debe autorizar directamente</strong>{" "}
                la consulta desde su propia cuenta antes de que esta se
                realice.
              </p>
            </Section>

            <Section title="7. Terceros con quienes compartimos datos">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  El proveedor externo que ejecuta las consultas a las
                  fuentes oficiales del Estado colombiano.
                </li>
                <li>La pasarela de pagos utilizada para procesar tu compra.</li>
                <li>
                  Proveedores de infraestructura tecnológica (hosting, envío
                  de correo electrónico) necesarios para operar la
                  Plataforma.
                </li>
              </ul>
              <p className="mt-3">
                No vendemos ni compartimos tus datos con terceros para fines
                distintos a los aquí descritos.
              </p>
            </Section>

            <Section title="8. Tiempo de conservación">
              <p>
                Los documentos generados quedan disponibles para descarga
                durante 10 días calendario, después de los cuales se
                eliminan de nuestro almacenamiento. Los datos de tu cuenta se
                conservan mientras esta permanezca activa o mientras sea
                necesario para cumplir obligaciones legales o contractuales,
                y se eliminarán o anonimizarán cuando dejen de ser
                necesarios, salvo obligación legal de conservarlos por más
                tiempo.
              </p>
            </Section>

            <Section title="9. Derechos del titular">
              <p className="mb-2">Como titular de tus datos, tienes derecho a:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Conocer, actualizar y rectificar tus datos personales.</li>
                <li>
                  Solicitar prueba de la autorización otorgada para el
                  tratamiento de tus datos.
                </li>
                <li>
                  Ser informado sobre el uso que se ha dado a tus datos
                  personales.
                </li>
                <li>
                  Revocar la autorización y/o solicitar la supresión de tus
                  datos, cuando no exista un deber legal o contractual que
                  impida su eliminación.
                </li>
                <li>Acceder de forma gratuita a tus datos personales.</li>
                <li>
                  Presentar quejas ante la Superintendencia de Industria y
                  Comercio (SIC) por infracciones a la normativa de
                  protección de datos.
                </li>
              </ul>
            </Section>

            <Section title="10. Cómo ejercer tus derechos">
              <p>
                Puedes ejercer tus derechos escribiendo a{" "}
                <a
                  href="mailto:contacto@colombiacontrata.com"
                  className="text-brand-blue hover:underline"
                >
                  contacto@colombiacontrata.com
                </a>{" "}
                o desde la sección de tu perfil dentro de la Plataforma.
                Atenderemos tu solicitud dentro de los plazos establecidos
                por la ley.
              </p>
            </Section>

            <Section title="11. Seguridad de la información">
              <p>
                Implementamos medidas técnicas, humanas y administrativas
                razonables para proteger tus datos personales contra acceso
                no autorizado, pérdida o alteración.
              </p>
            </Section>

            <Section title="12. Vigencia">
              <p>
                Esta política rige a partir de su publicación y se
                actualizará cuando sea necesario. Los cambios sustanciales se
                comunicarán a los titulares y podrán requerir una nueva
                autorización.
              </p>
            </Section>
          </div>
        </div>
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
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h2>
      {children}
    </section>
  );
}
