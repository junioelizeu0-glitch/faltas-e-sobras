import React, { useState } from "react";
import {
  X,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { getTarefaAtual, parseDataBR, formatarDataBR } from "@/lib/data-processing";
import { exportToExcel } from "@/lib/excel-export";

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  columns?: string[];
  title?: string;
}

export default function DrillDownModal({
  isOpen,
  onClose,
  data,
  columns,
  title,
}: DrillDownModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);
  const itemsPerPage = 100;

  if (!isOpen) return null;

  const activeColumns = columns || [
    "Chamado",
    "Loja",
    "CD",
    "Tipo",
    "Transportadora",
    "Conferente",
    "Status",
    "Valor",
    "Dt Abertura",
    "Dt Finalização",
    "SLA",
  ];

  let filtered = (data || []).filter((item: any) =>
    Object.values(item).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );

  if (sortColumn && sortDirection) {
    filtered.sort((a: any, b: any) => {
      const getVal = (row: any, col: string) => {
        if (col === "Chamado") {
          return (
            row["Chamados"] ||
            row["Chamado"] ||
            row["Chave"] ||
            row["Número"] ||
            row["Nº"] ||
            row["N° Chamado"] ||
            row["Nº Chamado"] ||
            row["chamadoId"] ||
            ""
          );
        }
        if (col === "Status") return row["Status Chamado"] || row["status"] || "";
        if (col === "Valor") return Number(row[" Valor "] || row["valor"] || 0);
        if (col === "SLA") return row["SLA por chamado (60dias)"] || row["sla"] || "";
        if (col === "Tarefa Atual") {
          return getTarefaAtual(row);
        }
        if (col === "NF" || col === "Numero da NF") return row["Nº Nfe"] || row["NF"] || row["nfe"] || "";
        if (col === "Dt Emissão NF") {
          const parsed = parseDataBR(row["Dt Emissão"] || row.dt_emissao);
          return parsed ? parsed.getTime() : 0;
        }
        if (col.startsWith("Dt ") || col.includes("Dt ") || col.includes("Data")) {
          const parsed = parseDataBR(row[col]);
          return parsed ? parsed.getTime() : 0;
        }
        const exactKey = Object.keys(row).find(
          (k) => k.trim().toLowerCase() === col.trim().toLowerCase(),
        );
        return exactKey ? row[exactKey] : row[col] || "";
      };

      const valA = getVal(a, sortColumn);
      const valB = getVal(b, sortColumn);

      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
      return 0;
    });
  }

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filtered.slice(startIndex, startIndex + itemsPerPage);

  const exportCSV = () => {
    if (!filtered.length) return;
    const rows = filtered.map((row: any) => {
      const out: Record<string, any> = {};
      activeColumns.forEach((col: string) => {
        let val: any = "";
        if (col === "Chamado") {
          val =
            row["Chamados"] || row["Chamado"] || row["Chave"] || row["Número"] ||
            row["Nº"] || row["N° Chamado"] || row["Nº Chamado"] || row["chamadoId"] || "";
          if (val && !isNaN(Number(val))) val = Math.trunc(Number(val)).toString();
        } else if (col === "Status") {
          val = row["Status Chamado"] || row["status"] || "";
        } else if (col === "Valor") {
          val = Number(row[" Valor "] || row["valor"] || 0);
        } else if (col === "SLA") {
          val = row["SLA por chamado (60dias)"] || row["sla"] || "";
        } else if (col === "Tarefa Atual") {
          val = getTarefaAtual(row) || "";
        } else if (col === "NF" || col === "Numero da NF") {
          val = row["Nº Nfe"] || row["NF"] || row["nfe"] || "";
        } else if (col === "Dt Emissão NF") {
          val = formatarDataBR(row["Dt Emissão"] || row.dt_emissao);
        } else if (col.startsWith("Dt ") || col.includes("Dt ") || col.includes("Data")) {
          const cellVal = row[col] ?? row[Object.keys(row).find(
            (k) => k.trim().toLowerCase() === col.trim().toLowerCase()) || ""];
          val = formatarDataBR(cellVal);
        } else {
          const exactKey = Object.keys(row).find(
            (k) => k.trim().toLowerCase() === col.trim().toLowerCase());
          val = exactKey ? row[exactKey] : (row[col] ?? "");
        }
        out[col] = val;
      });
      return out;
    });
    exportToExcel(rows, {
      filename: `detalhamento_chamados_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: "Chamados",
      columns: activeColumns.map((c) => ({ key: c, header: c })),
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start p-5 border-b border-slate-200">
          <div>
            <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1 uppercase tracking-wider">
              <span>Dashboard</span>
              <span className="text-slate-300">/</span>
              <span className="text-blue-500">
                {title?.replace("Detalhamento de Chamados - ", "")?.replace("Detalhamento de Chamados ", "") ||
                  "Indicador"}
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-600">Detalhamento</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              {title || "Detalhamento de Chamados"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-white px-4">
          <table className="w-full text-left text-sm whitespace-nowrap relative border-collapse">
            <thead className="bg-slate-100 text-slate-600 sticky top-0 z-20 shadow-xs after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:border-b after:border-slate-200">
              <tr>
                {activeColumns.map((col: string, idx: number) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className={`p-3 font-semibold cursor-pointer hover:bg-slate-200 transition-colors select-none group ${
                      idx === 0 ? "rounded-tl-lg" : ""
                    } ${idx === activeColumns.length - 1 ? "rounded-tr-lg" : ""}`}
                  >
                    <div className="flex items-center gap-1">
                      {col}
                      {sortColumn === col ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3 h-3 text-blue-600" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-blue-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentData.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  {activeColumns.map((col: string) => {
                    let val = "";
                    if (col === "Chamado") {
                      val =
                        row["Chamados"] ||
                        row["Chamado"] ||
                        row["Chave"] ||
                        row["Número"] ||
                        row["Nº"] ||
                        row["N° Chamado"] ||
                        row["Nº Chamado"] ||
                        row["chamadoId"] ||
                        "";
                      if (!val) {
                        const k = Object.keys(row).find(
                          (key) =>
                            key.trim().toLowerCase() === "chamado" ||
                            key.trim().toLowerCase() === "chamados" ||
                            key.trim().toLowerCase() === "nº" ||
                            key.trim().toLowerCase() === "n° chamado" ||
                            key.trim().toLowerCase() === "nº chamado" ||
                            key.trim().toLowerCase() === "chamadoid",
                        );
                        if (k) val = row[k];
                      }
                      if (val && !isNaN(Number(val))) {
                        val = Math.trunc(Number(val)).toString();
                      }
                      if (!val) val = "Sem informação";
                      return (
                        <td key={col} className="p-3 text-slate-700 font-medium">
                          {val}
                        </td>
                      );
                    }
                    if (col === "Status") {
                      const statusVal = row["Status Chamado"] || row["status"] || "Sem informação";
                      return (
                        <td key={col} className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                              statusVal === "Aprovado"
                                ? "bg-emerald-100 text-emerald-700"
                                : statusVal === "Recusado"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {statusVal}
                          </span>
                        </td>
                      );
                    }
                    if (col === "Valor") {
                      val = Number(row[" Valor "] || row["valor"] || 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      });
                      return (
                        <td key={col} className="p-3 text-slate-700 font-medium">
                          {val}
                        </td>
                      );
                    }
                    if (col === "Tarefa Atual") {
                      val = getTarefaAtual(row) || "Sem informação";
                      return (
                        <td key={col} className="p-3 text-slate-600 truncate max-w-[200px]" title={val}>
                          {val}
                        </td>
                      );
                    }
                    if (col === "Dt Emissão NF") {
                      val = formatarDataBR(row["Dt Emissão"] || row.dt_emissao);
                      return (
                        <td key={col} className="p-3 text-slate-500">
                          {val}
                        </td>
                      );
                    }
                    if (col.startsWith("Dt ") || col.includes("Dt ") || col.includes("Data")) {
                      const cellVal =
                        row[col] !== undefined
                          ? row[col]
                          : row[
                              Object.keys(row).find(
                                (k) => k.trim().toLowerCase() === col.trim().toLowerCase(),
                              ) || ""
                            ];
                      val = formatarDataBR(cellVal);
                      return (
                        <td key={col} className="p-3 text-slate-500">
                          {val}
                        </td>
                      );
                    }
                    if (col === "SLA") {
                      val = row["SLA por chamado (60dias)"] || row["sla"] || "Sem informação";
                      return (
                        <td key={col} className="p-3 text-slate-600">
                          {val}
                        </td>
                      );
                    }
                    if (col === "NF") {
                      val = row["Nº Nfe"] || row["NF"] || row["nfe"] || "Sem informação";
                      return (
                        <td key={col} className="p-3 text-slate-600">
                          {val}
                        </td>
                      );
                    }

                    const exactKey = Object.keys(row).find(
                      (k) => k.trim().toLowerCase() === col.trim().toLowerCase(),
                    );
                    val = exactKey ? row[exactKey] : row[col] || "Sem informação";
                    return (
                      <td key={col} className="p-3 text-slate-600 truncate max-w-[150px]">
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="border-t border-slate-200 bg-white p-4 flex items-center justify-between text-sm">
            <span className="text-slate-500">
              Mostrando de <span className="font-semibold text-slate-700">{startIndex + 1}</span> a{" "}
              <span className="font-semibold text-slate-700">
                {Math.min(startIndex + itemsPerPage, filtered.length)}
              </span>{" "}
              de <span className="font-semibold text-slate-700">{filtered.length}</span> registros
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Página Anterior"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <span className="text-slate-600 font-medium px-2">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Próxima Página"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
