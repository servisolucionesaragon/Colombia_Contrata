"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Usuario = {
  id: string;
  email: string | null;
  nombre: string | null;
  tipoCuenta: "persona" | "empresa" | "empresa_miembro" | null;
  esAdmin: boolean;
  activo: boolean;
  verificado: boolean;
  perfilCompleto: boolean;
  creadoEn: string;
  relacionados: {
    consultas: number;
    solicitudes: number;
    pagosEmpresa: number;
    miembrosEquipo: number;
    respondioConsultas: number;
  };
};

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}` };
}

const ETIQUETA_TIPO: Record<string, string> = {
  persona: "Persona",
  empresa: "Empresa",
  empresa_miembro: "Miembro de empresa",
};

// Resumen de lo que se borraría junto con la cuenta. Todo lo que aparece acá
// cae por cascada al eliminar el usuario en auth.users; se muestra antes de
// confirmar para que el admin sepa el alcance real del borrado.
function resumenArrastre(u: Usuario): string[] {
  const partes: string[] = [];
  const { consultas, solicitudes, pagosEmpresa, miembrosEquipo } = u.relacionados;
  if (consultas) partes.push(`${consultas} consulta(s)`);
  if (solicitudes) partes.push(`${solicitudes} solicitud(es)`);
  if (pagosEmpresa) partes.push(`${pagosEmpresa} pago(s)`);
  if (miembrosEquipo) partes.push(`${miembrosEquipo} miembro(s) del equipo`);
  return partes;
}

export default function UsuariosManager() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [soloSinVerificar, setSoloSinVerificar] = useState(false);
  const [cambiandoId, setCambiandoId] = useState<string | null>(null);
  // Confirmación en dos pasos dentro de la propia fila: el confirm() nativo
  // no se puede aceptar en el navegador automatizado de esta máquina.
  const [confirmandoBorrado, setConfirmandoBorrado] = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/usuarios", { headers: await authHeader() });
    if (res.ok) {
      const data = await res.json();
      setUsuarios(data.usuarios);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const enviarAccion = async (
    body: Record<string, unknown>,
    userId: string,
    mensajeExito?: string
  ) => {
    setCambiandoId(userId);
    setError(null);
    setAviso(null);
    const res = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(body),
    });
    setCambiandoId(null);

    let data: { error?: string } = {};
    try {
      data = await res.json();
    } catch {
      /* respuesta sin cuerpo */
    }

    if (!res.ok) {
      setError(data.error ?? "No pudimos completar la acción.");
      return false;
    }
    if (mensajeExito) setAviso(mensajeExito);
    return true;
  };

  const toggleActivo = async (usuario: Usuario) => {
    const ok = await enviarAccion({ userId: usuario.id, activo: !usuario.activo }, usuario.id);
    if (ok) await cargar();
  };

  const reenviarVerificacion = async (usuario: Usuario) => {
    await enviarAccion(
      { userId: usuario.id, accion: "reenviar-verificacion" },
      usuario.id,
      `Correo de verificación reenviado a ${usuario.email}.`
    );
  };

  const eliminar = async (usuario: Usuario) => {
    const ok = await enviarAccion(
      { userId: usuario.id, accion: "eliminar" },
      usuario.id,
      `Cuenta de ${usuario.email} eliminada.`
    );
    setConfirmandoBorrado(null);
    if (ok) await cargar();
  };

  const sinVerificar = usuarios.filter((u) => !u.verificado).length;

  const filtrados = usuarios.filter((u) => {
    if (soloSinVerificar && u.verificado) return false;
    const texto = `${u.nombre ?? ""} ${u.email ?? ""}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-4 gap-x-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Usuarios</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Cuentas registradas de personas y empresas. Desactivar una cuenta le
            impide iniciar sesión; eliminarla borra también sus registros.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre o correo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
        />
        <label className="flex items-center gap-x-2 text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={soloSinVerificar}
            onChange={(e) => setSoloSinVerificar(e.target.checked)}
            className="size-4 rounded border-gray-300 dark:border-gray-600 text-brand-blue focus:ring-brand-blue"
          />
          Solo pendientes por verificar ({sinVerificar})
        </label>
      </div>

      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {aviso && <p className="mb-3 text-sm text-green-700 dark:text-green-400">{aviso}</p>}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Correo</th>
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Registro</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => {
                const arrastre = resumenArrastre(u);
                const bloqueado = u.relacionados.respondioConsultas > 0;

                return (
                  <tr
                    key={u.id}
                    className="border-b border-gray-100 dark:border-gray-800 last:border-0 align-top"
                  >
                    <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">
                      {u.nombre || <span className="text-gray-400">—</span>}
                      {u.esAdmin && (
                        <span className="ml-2 text-xs rounded-full bg-brand-blue/10 text-brand-blue px-2 py-0.5">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{u.email}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {u.tipoCuenta ? ETIQUETA_TIPO[u.tipoCuenta] ?? u.tipoCuenta : "—"}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {new Date(u.creadoEn).toLocaleDateString("es-CO")}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col gap-y-1 items-start">
                        <span
                          className={`text-xs font-medium rounded-full px-2.5 py-1 ${
                            u.activo
                              ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                        {!u.verificado && (
                          <span className="text-xs font-medium rounded-full px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                            Sin verificar
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      {confirmandoBorrado === u.id ? (
                        <div className="inline-flex flex-col items-end gap-y-1">
                          <p className="text-xs text-gray-600 dark:text-gray-400 max-w-[16rem] text-right">
                            {arrastre.length > 0
                              ? `Se borrará también: ${arrastre.join(", ")}.`
                              : "Esta acción no se puede deshacer."}
                          </p>
                          <div className="flex items-center gap-x-3">
                            <button
                              type="button"
                              disabled={cambiandoId === u.id}
                              onClick={() => eliminar(u)}
                              className="text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-700 disabled:opacity-50"
                            >
                              {cambiandoId === u.id ? "Eliminando..." : "Sí, eliminar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmandoBorrado(null)}
                              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-y-1">
                          {!u.verificado && (
                            <button
                              type="button"
                              disabled={cambiandoId === u.id}
                              onClick={() => reenviarVerificacion(u)}
                              className="text-sm font-medium text-brand-blue hover:text-brand-blue-dark disabled:opacity-50"
                            >
                              Reenviar verificación
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={cambiandoId === u.id}
                            onClick={() => toggleActivo(u)}
                            className={`text-sm font-medium disabled:opacity-50 ${
                              u.activo
                                ? "text-amber-600 dark:text-amber-400 hover:text-amber-700"
                                : "text-brand-blue hover:text-brand-blue-dark"
                            }`}
                          >
                            {u.activo ? "Desactivar" : "Activar"}
                          </button>
                          <button
                            type="button"
                            disabled={cambiandoId === u.id || bloqueado}
                            title={
                              bloqueado
                                ? "No se puede eliminar: ya respondió consultas de antecedentes."
                                : undefined
                            }
                            onClick={() => {
                              setError(null);
                              setAviso(null);
                              setConfirmandoBorrado(u.id);
                            }}
                            className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500 dark:text-gray-400">
                    No hay usuarios que coincidan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
