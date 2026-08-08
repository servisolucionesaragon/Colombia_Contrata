import { supabase } from "@/lib/supabase";
import { IconWhatsApp } from "@/components/SocialIcons";

export default async function WhatsAppButton() {
  const { data } = await supabase
    .from("configuracion_portal")
    .select("whatsapp_activo, whatsapp_numero, whatsapp_mensaje")
    .eq("id", 1)
    .single();

  if (!data?.whatsapp_activo || !data.whatsapp_numero) return null;

  const numero = data.whatsapp_numero.replace(/[^0-9]/g, "");
  const mensaje = data.whatsapp_mensaje || "Hola, quiero más información.";
  const href = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex items-center justify-center size-14 rounded-full bg-[#25D366] text-white shadow-lg hover:scale-105 transition-transform"
    >
      <IconWhatsApp className="size-7" />
    </a>
  );
}
