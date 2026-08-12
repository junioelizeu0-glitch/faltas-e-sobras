import XLSX from "xlsx-js-style";

/**
 * Exporta um array de objetos para .xlsx com formatação executiva profissional:
 * - Cabeçalho Esmeralda com texto em negrito
 * - Borda sutil em todas as células
 * - Destacamento visual para "Sim" / "No Prazo" (Verde) e "Não" / "Fora do Prazo" (Vermelho)
 * - Formatação de alinhamento para números, datas e IDs
 * - Filtros automáticos e congelamento da 1ª linha
 * - Auto-ajuste de largura das colunas
 */
export function exportToExcel(
  rows: Record<string, any>[],
  opts: {
    filename: string;
    sheetName?: string;
    /** Ordem/nomes das colunas. Se omitido, usa as chaves do primeiro registro. */
    columns?: { key: string; header: string }[];
  }
) {
  const { filename, sheetName = "Dados", columns } = opts;
  if (!rows || rows.length === 0) {
    if (!columns || columns.length === 0) return;
  }

  const cols =
    columns ||
    Object.keys(rows[0] || {}).map((k) => ({ key: k, header: k }));

  const headerRow = cols.map((c) => c.header);
  const dataRows = rows.map((r) => cols.map((c) => r[c.key] ?? ""));

  const aoa = [headerRow, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Estilo do cabeçalho executivo (Emerald 700 `#047857`)
  const headerStyle = {
    font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "047857" } },
    alignment: { vertical: "center", horizontal: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "065F46" } },
      bottom: { style: "medium", color: { rgb: "065F46" } },
      left: { style: "thin", color: { rgb: "065F46" } },
      right: { style: "thin", color: { rgb: "065F46" } },
    },
  };

  const defaultCellStyle = {
    font: { sz: 10, color: { rgb: "1E293B" } },
    alignment: { vertical: "center", horizontal: "left" },
    border: {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } },
    },
  };

  const simStyle = {
    ...defaultCellStyle,
    font: { bold: true, sz: 10, color: { rgb: "065F46" } },
    fill: { fgColor: { rgb: "D1FAE5" } },
    alignment: { vertical: "center", horizontal: "center" },
  };

  const naoStyle = {
    ...defaultCellStyle,
    font: { bold: true, sz: 10, color: { rgb: "991B1B" } },
    fill: { fgColor: { rgb: "FEE2E2" } },
    alignment: { vertical: "center", horizontal: "center" },
  };

  const centerStyle = {
    ...defaultCellStyle,
    alignment: { vertical: "center", horizontal: "center" },
  };

  const numberStyle = {
    ...defaultCellStyle,
    alignment: { vertical: "center", horizontal: "right" },
  };

  // Aplica estilos aos cabeçalhos
  for (let c = 0; c < headerRow.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) ws[addr].s = headerStyle;
  }

  // Aplica estilos às linhas de dados
  for (let r = 1; r <= dataRows.length; r++) {
    for (let c = 0; c < headerRow.length; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;

      const rawVal = String(dataRows[r - 1][c] ?? "").trim();
      const normVal = rawVal.toLowerCase();

      if (normVal === "sim" || normVal === "no prazo" || normVal === "dentro do sla") {
        ws[addr].s = simStyle;
      } else if (normVal === "não" || normVal === "nao" || normVal === "fora do prazo" || normVal === "fora do sla") {
        ws[addr].s = naoStyle;
      } else if (typeof dataRows[r - 1][c] === "number") {
        ws[addr].s = numberStyle;
      } else if (["dt ", "data", "sla", "status", "chamado"].some((k) => cols[c].header.toLowerCase().includes(k))) {
        ws[addr].s = centerStyle;
      } else {
        ws[addr].s = defaultCellStyle;
      }
    }
  }

  // Auto-fit de colunas (limite entre 12 e 50)
  const widths = cols.map((_, idx) => {
    const maxLen = Math.max(
      String(headerRow[idx] ?? "").length,
      ...dataRows.map((row) => String(row[idx] ?? "").length)
    );
    return { wch: Math.min(Math.max(maxLen + 4, 12), 50) };
  });
  ws["!cols"] = widths;

  // Congelar 1ª linha e filtros automáticos
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  (ws as any)["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: dataRows.length, c: headerRow.length - 1 },
    }),
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
