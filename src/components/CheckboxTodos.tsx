"use client";

import { useEffect, useRef } from "react";

// Checkbox "Todos" reutilizado en los tres checklists de documentos
// (persona en /solicitar, empresa al invitar individual y en carga
// masiva). Queda marcado si están todos seleccionados, en estado
// "indeterminado" (guion) si hay una selección parcial, y al hacer clic
// selecciona o deselecciona todo de una vez.
export default function CheckboxTodos({
  total,
  seleccionados,
  onToggle,
}: {
  total: number;
  seleccionados: number;
  onToggle: (marcarTodos: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const todos = total > 0 && seleccionados === total;
  const indeterminado = seleccionados > 0 && seleccionados < total;

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminado;
  }, [indeterminado]);

  return (
    <label className="flex items-center gap-x-2.5 cursor-pointer select-none">
      <input
        ref={ref}
        type="checkbox"
        checked={todos}
        onChange={() => onToggle(!todos)}
        className="size-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-brand-blue focus:ring-brand-blue"
      />
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Todos</span>
    </label>
  );
}
