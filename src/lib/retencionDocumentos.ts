// Cuánto tiempo se conservan los documentos y hallazgos de una
// verificación antes de borrarse. Este número es una promesa escrita en
// los Términos, en la Política de Privacidad y en la página de inicio —
// si cambia acá, hay que cambiarlo también en esos tres textos (los dos
// legales y el de la landing viven en la base de datos, no en el código:
// tabla `paginas` y `configuracion_landing`).
export const DIAS_RETENCION_DOCUMENTOS = 30;

export function fechaLimiteRetencion(desde: Date = new Date()): Date {
  const limite = new Date(desde);
  limite.setDate(limite.getDate() - DIAS_RETENCION_DOCUMENTOS);
  return limite;
}

export type EstadoRetencion =
  | { estado: "sin_resultado" }
  | { estado: "vigente"; diasRestantes: number; borraEl: Date }
  | { estado: "eliminado" };

// Se calcula a partir de la fecha en que se obtuvo el resultado, sin
// guardar ninguna columna extra: si ya hubo resultado pero el detalle
// quedó vacío, es porque la limpieza automática ya pasó por ahí.
export function estadoRetencion(
  resultadoObtenidoAt: string | null | undefined,
  tieneContenido: boolean,
  ahora: Date = new Date()
): EstadoRetencion {
  if (!resultadoObtenidoAt) return { estado: "sin_resultado" };
  if (!tieneContenido) return { estado: "eliminado" };

  const obtenido = new Date(resultadoObtenidoAt);
  if (Number.isNaN(obtenido.getTime())) return { estado: "sin_resultado" };

  const borraEl = new Date(obtenido);
  borraEl.setDate(borraEl.getDate() + DIAS_RETENCION_DOCUMENTOS);

  const msPorDia = 24 * 60 * 60 * 1000;
  // Se redondea hacia arriba para no anunciar "0 días" mientras el
  // documento todavía se puede descargar.
  const diasRestantes = Math.max(0, Math.ceil((borraEl.getTime() - ahora.getTime()) / msPorDia));

  return { estado: "vigente", diasRestantes, borraEl };
}
