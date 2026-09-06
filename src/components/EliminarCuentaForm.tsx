"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Resumen = {
  tipoCuenta: string | null;
  solicitudes: number;
  consultas: number;
  pagos: number;
  miembrosEquipo: number;
  bloqueada: boolean;
  esAdmin: boolean;
  motivoBloqueo: string | null;
};

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}` };
}

// Lista de lo que se pierde al borrar, armada con los conteos reales de la
// cuenta: es más honesto que una advertencia genérica, y deja ver el caso
// grave (una empresa arrastra las cuentas de su equipo).
function consecuencias(resumen: Resumen): string[] {
  const items: string[] = ["Tus datos de perfil y el acceso al portal."];
  if (resumen.solicitudes > 0) {
    items.push(
      `${resumen.solicitudes} solicitud(es) de documentos y los archivos que se generaron.`
    );
  }
  if (resumen.consultas > 0) {
    items.push(`${resumen.consultas} consulta(s) de antecedentes que enviaste, con sus resultados.`);
  }
  if (resumen.pagos > 0) {
    items.push(`${resumen.pagos} compra(s) de créditos y los créditos que te queden sin usar.`);
  }
  if (resumen.miembrosEquipo > 0) {
    items.push(
      `Las cuentas de ${resumen.miembrosEquipo} miembro(s) de tu equipo, que también se eliminarán.`
    );
  }
  return items;
}

export default function EliminarCuentaForm() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/cuenta/eliminar", { headers: await authHeader() });
      if (res.ok) setResumen(await res.json());
    })();
  }, []);

  const eliminar = async () => {
    setEliminando(true);
    setError(null);
    const res = await fetch("/api/cuenta/eliminar", {
      method: "POST",
      headers: await authHeader(),
    });

    if (!res.ok) {
      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        /* respuesta sin cuerpo */
      }
      setEliminando(false);
      setError(data.error ?? "No pudimos eliminar la cuenta.");
      return;
    }

    // La sesión queda apuntando a un usuario que ya no existe: se cierra
    // localmente antes de salir para no dejar el navegador en un estado raro.
    await supabase.auth.signOut();
    window.location.href = "/?cuenta=eliminada";
  };

  if (!resumen) return null;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
      <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Eliminar mi cuenta</h3>

      {resumen.motivoBloqueo ? (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{resumen.motivoBloqueo}</p>
      ) : !confirmando ? (
        <>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Se eliminarán tu cuenta y toda tu información. Esta acción no se
            puede deshacer.
          </p>
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="mt-3 text-sm font-semibold rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-4 py-2"
          >
            Eliminar mi cuenta
          </button>
        </>
      ) : (
        <div className="mt-3 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            ¿Seguro que quieres eliminar tu cuenta?
          </p>
          <p className="mt-2 text-sm text-red-800 dark:text-red-300">
            Esto es permanente. Se eliminará:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-red-800 dark:text-red-300 list-disc list-inside">
            {consecuencias(resumen).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-red-800 dark:text-red-300">
            Si tienes documentos que necesites, descárgalos antes desde tu
            historial: no podremos recuperarlos después.
          </p>

          {error && (
            <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={eliminando}
              onClick={eliminar}
              className="text-sm font-semibold rounded-lg border border-transparent bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 px-4 py-2"
            >
              {eliminando ? "Eliminando..." : "Sí, eliminar mi cuenta"}
            </button>
            <button
              type="button"
              disabled={eliminando}
              onClick={() => {
                setConfirmando(false);
                setError(null);
              }}
              className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
