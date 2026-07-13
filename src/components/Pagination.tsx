import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;          // 0-based
  totalPages: number;
  onChange: (p: number) => void;
  totalItems?: number;
  pageSize?: number;
};

function pageWindow(current: number, total: number): (number | "…")[] {
  // current, total são 1-based aqui
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([1, total, current - 1, current, current + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < nums.length; i++) {
    out.push(nums[i]);
    if (i < nums.length - 1 && nums[i + 1] - nums[i] > 1) out.push("…");
  }
  return out;
}

export default function Pagination({ page, totalPages, onChange, totalItems, pageSize }: Props) {
  if (totalPages <= 1) {
    return totalItems != null ? (
      <div className="text-xs text-slate-500 mt-2">{totalItems} registro{totalItems === 1 ? "" : "s"}</div>
    ) : null;
  }
  const current = page + 1;
  const items = pageWindow(current, totalPages);
  const btn = "min-w-[32px] h-8 px-2 text-xs rounded-md border transition-colors";
  return (
    <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
      <div className="text-xs text-slate-500">
        {totalItems != null && pageSize
          ? `Mostrando ${page * pageSize + 1}–${Math.min(totalItems, (page + 1) * pageSize)} de ${totalItems.toLocaleString("pt-BR")}`
          : `Página ${current} de ${totalPages}`}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4 inline"/>
        </button>
        {items.map((it, i) =>
          it === "…" ? (
            <span key={`e${i}`} className="px-1 text-slate-400 text-xs">…</span>
          ) : (
            <button
              key={it}
              onClick={() => onChange(it - 1)}
              className={`${btn} ${it === current ? "border-blue-600 bg-blue-600 text-white font-semibold" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {it}
            </button>
          )
        )}
        <button
          onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
          disabled={page + 1 >= totalPages}
          className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label="Próxima página"
        >
          <ChevronRight className="w-4 h-4 inline"/>
        </button>
      </div>
    </div>
  );
}
