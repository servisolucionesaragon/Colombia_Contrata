import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

// Compartido entre el manifest principal (/) y el de /admin: el ícono de
// instalación usa la misma imagen configurable desde /admin -> Identidad
// del portal -> Ícono/Favicon ("favicon_url"), así que si el usuario la
// cambia, el ícono de "instalar app" cambia con ella en los dos. Si nunca
// configuró uno, cae a los archivos generados en public/ a partir del
// isotipo de marca.
export async function getPwaIcons(): Promise<NonNullable<MetadataRoute.Manifest["icons"]>> {
  const { data } = await supabase
    .from("configuracion_portal")
    .select("favicon_url")
    .eq("id", 1)
    .single();

  const icon = data?.favicon_url;

  if (icon) {
    return [
      { src: icon, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icon, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: icon, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ];
  }

  return [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ];
}
