"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Message = { type: "success" | "error"; text: string };

export default function AccountSecurityForm() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsSignedIn(!!data.user);
    });
  }, []);

  // ProfileForm ya muestra el aviso de "inicia sesión" — esta sección se
  // queda en silencio si no hay sesión en vez de repetirlo.
  if (!isSignedIn) return null;

  return (
    <div className="space-y-8">
      <ChangeEmailForm />
      <ChangePasswordForm />
    </div>
  );
}

function ChangeEmailForm() {
  const [newEmail, setNewEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setSubmitting(false);
    if (error) {
      setMessage({ type: "error", text: traducirErrorEmail(error.message) });
      return;
    }
    setMessage({
      type: "success",
      text: `Te enviamos un enlace de confirmación a ${newEmail}. Tu correo actual sigue activo hasta que lo confirmes.`,
    });
    setNewEmail("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Cambiar correo</h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Nuevo correo"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-x-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed px-4 py-2 whitespace-nowrap"
        >
          {submitting ? "Enviando..." : "Cambiar correo"}
        </button>
      </div>
      {message && (
        <p
          className={
            message.type === "error" ? "text-sm text-red-600" : "text-sm text-green-600"
          }
        >
          {message.text}
        </p>
      )}
    </form>
  );
}

function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passwordsMatch) return;
    setSubmitting(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setMessage({ type: "error", text: traducirErrorPassword(error.message) });
      return;
    }
    setMessage({ type: "success", text: "Tu contraseña se actualizó correctamente." });
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 pt-6 border-t border-gray-200"
    >
      <h3 className="text-sm font-semibold text-gray-900">Cambiar contraseña</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Confirmar contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClass}
        />
      </div>
      {confirmPassword.length > 0 && !passwordsMatch && (
        <p className="text-sm text-red-600">Las contraseñas no coinciden.</p>
      )}
      <button
        type="submit"
        disabled={submitting || !passwordsMatch}
        className="inline-flex items-center justify-center gap-x-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed px-4 py-2"
      >
        {submitting ? "Guardando..." : "Actualizar contraseña"}
      </button>
      {message && (
        <p
          className={
            message.type === "error" ? "text-sm text-red-600" : "text-sm text-green-600"
          }
        >
          {message.text}
        </p>
      )}
    </form>
  );
}

function traducirErrorEmail(message: string): string {
  const errores: Record<string, string> = {
    "A user with this email address has already been registered":
      "Ese correo ya está en uso por otra cuenta.",
    "Unable to validate email address: invalid format":
      "El formato del correo no es válido.",
  };
  return errores[message] ?? `No pudimos cambiar el correo. Intenta de nuevo. (${message})`;
}

function traducirErrorPassword(message: string): string {
  const errores: Record<string, string> = {
    "Password should be at least 6 characters":
      "La contraseña debe tener al menos 6 caracteres.",
    "New password should be different from the old password.":
      "La nueva contraseña debe ser distinta a la actual.",
  };
  return (
    errores[message] ?? `No pudimos actualizar la contraseña. Intenta de nuevo. (${message})`
  );
}

const inputClass =
  "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none";
