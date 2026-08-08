"use client";

import { useRef, useState, type SVGProps } from "react";

// Editor de texto enriquecido minimalista basado en contentEditable +
// document.execCommand. Se optó por esto (en vez de una librería como
// TipTap) para no agregar una dependencia npm nueva — las instalaciones en
// esta máquina son lentas/inestables por vivir en una unidad de red (ver
// AGENTS.md / .claude/CLAUDE.md). El HTML resultante lo escribe el propio
// admin (no un usuario público), así que se trata como contenido confiable
// al renderizarlo con dangerouslySetInnerHTML en la página pública.
export default function RichTextEditor({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string | null;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"visual" | "html">("visual");
  // Fuente de verdad cuando se (re)monta la vista visual o la de código. En
  // modo visual, mientras se escribe, el HTML vive solo en el DOM (no en
  // este estado) para no perder la posición del cursor en cada tecla.
  const [htmlValue, setHtmlValue] = useState(defaultValue ?? "");

  const syncHiddenInput = (value: string) => {
    if (hiddenInputRef.current) hiddenInputRef.current.value = value;
  };

  const syncFromEditor = () => {
    if (editorRef.current) syncHiddenInput(editorRef.current.innerHTML);
  };

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncFromEditor();
  };

  const handleLink = () => {
    const url = window.prompt("Enlace (https://...)");
    if (url) exec("createLink", url);
  };

  const switchToHtml = () => {
    setHtmlValue(editorRef.current?.innerHTML ?? htmlValue);
    setMode("html");
  };

  const switchToVisual = () => {
    syncHiddenInput(htmlValue);
    setMode("visual");
  };

  const handleHtmlChange = (value: string) => {
    setHtmlValue(value);
    syncHiddenInput(value);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 rounded-t-lg border border-b-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-1.5">
        {mode === "visual" && (
          <>
            <ToolbarButton label="Negrita" onClick={() => exec("bold")}>
              <IconBold className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Cursiva" onClick={() => exec("italic")}>
              <IconItalic className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Subrayado" onClick={() => exec("underline")}>
              <IconUnderline className="size-4" />
            </ToolbarButton>
            <Divider />
            <ToolbarButton
              label="Título grande"
              onClick={() => exec("formatBlock", "h2")}
            >
              H2
            </ToolbarButton>
            <ToolbarButton
              label="Título pequeño"
              onClick={() => exec("formatBlock", "h3")}
            >
              H3
            </ToolbarButton>
            <ToolbarButton
              label="Párrafo normal"
              onClick={() => exec("formatBlock", "p")}
            >
              P
            </ToolbarButton>
            <Divider />
            <ToolbarButton
              label="Lista con viñetas"
              onClick={() => exec("insertUnorderedList")}
            >
              <IconBulletList className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Lista numerada"
              onClick={() => exec("insertOrderedList")}
            >
              <IconNumberedList className="size-4" />
            </ToolbarButton>
            <Divider />
            <ToolbarButton label="Insertar enlace" onClick={handleLink}>
              <IconLink className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Quitar formato"
              onClick={() => exec("removeFormat")}
            >
              <IconClear className="size-4" />
            </ToolbarButton>
          </>
        )}
        <div className="ml-auto">
          <ToolbarButton
            label={mode === "visual" ? "Ver código HTML" : "Ver vista previa"}
            onClick={mode === "visual" ? switchToHtml : switchToVisual}
          >
            <IconCode className="size-4" />
          </ToolbarButton>
        </div>
      </div>
      {mode === "visual" ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncFromEditor}
          onBlur={syncFromEditor}
          dangerouslySetInnerHTML={{ __html: htmlValue }}
          className="min-h-48 rounded-b-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-brand-blue [&_a]:underline"
        />
      ) : (
        <textarea
          value={htmlValue}
          onChange={(e) => handleHtmlChange(e.target.value)}
          spellCheck={false}
          className="min-h-48 w-full rounded-b-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 font-mono text-xs text-gray-900 dark:text-gray-100 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
        />
      )}
      <input
        ref={hiddenInputRef}
        type="hidden"
        name={name}
        defaultValue={defaultValue ?? ""}
      />
    </div>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600" />;
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex items-center justify-center min-w-7 h-7 px-1.5 rounded text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
    >
      {children}
    </button>
  );
}

function IconBold(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M6 4h7a3.5 3.5 0 0 1 0 7H6z" />
      <path d="M6 11h8a3.5 3.5 0 0 1 0 7H6z" />
    </svg>
  );
}

function IconItalic(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M10 4h6" />
      <path d="M6 20h6" />
      <path d="M14 4 8 20" />
    </svg>
  );
}

function IconUnderline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M6 4v6a6 6 0 0 0 12 0V4" />
      <path d="M4 20h16" />
    </svg>
  );
}

function IconBulletList(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
    </svg>
  );
}

function IconNumberedList(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="M4 6h1v3" />
      <path d="M4 18c0-.7.5-1 1-1s1 .3 1 1-1 1.5-2 2h2" />
    </svg>
  );
}

function IconLink(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M9 15 15 9" />
      <path d="M11 6 12.5 4.5a3.5 3.5 0 1 1 5 5L16 11" />
      <path d="M13 18l-1.5 1.5a3.5 3.5 0 1 1-5-5L8 13" />
    </svg>
  );
}

function IconCode(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="m9 6-6 6 6 6" />
      <path d="m15 6 6 6-6 6" />
    </svg>
  );
}

function IconClear(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 4l16 16" />
      <path d="M7 4h10l-3 8 3 8H7" opacity="0" />
      <path d="M6 20l3-8-3-8" />
      <path d="M12 4h6l-2.5 8L18 20h-6" />
    </svg>
  );
}
