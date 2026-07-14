import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  allowFree?: boolean; // permitir texto livre (não só da lista)
  uppercase?: boolean;
};

export default function Combobox({ value, onChange, options, placeholder, className = "", allowFree = true, uppercase }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filtered = options.filter((o) => o && o.toLowerCase().includes((query || "").toLowerCase()));

  const commit = (v: string) => {
    const val = uppercase ? v.toUpperCase() : v;
    onChange(val);
    setQuery(val);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="flex items-center border border-slate-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            const v = uppercase ? e.target.value.toUpperCase() : e.target.value;
            setQuery(v);
            setOpen(true);
            if (allowFree) onChange(v);
          }}
          onFocus={() => setOpen(true)}
          className="flex-1 text-sm px-3 py-2 bg-transparent focus:outline-none min-w-0"
        />
        {value && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); commit(""); }}
            className="p-1 text-slate-400 hover:text-slate-700"
            title="Limpar"
          ><X className="w-3.5 h-3.5" /></button>
        )}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
          className="px-2 text-slate-500 hover:text-slate-800"
          title="Abrir lista"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-56 overflow-auto bg-white border border-slate-200 rounded-md shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">Nenhuma opção</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => commit(o)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between ${o === value ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"}`}
              >
                <span className="truncate">{o}</span>
                {o === value && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
