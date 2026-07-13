import XLSX from "xlsx-js-style";

/**
 * Exporta um array de objetos para .xlsx com formatação minimalista padrão:
 * - Cabeçalho em negrito + borda inferior
 * - Filtros automáticos
 * - Congelar 1ª linha
 * - Larguras auto-ajustadas pelo conteúdo (limitadas)
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
    // Ainda gera um arquivo vazio com cabeçalho, se houver colunas definidas
    if (!columns || columns.length === 0) return;
  }

  const cols =
    columns ||
    Object.keys(rows[0] || {}).map((k) => ({ key: k, header: k }));

  const headerRow = cols.map((c) => c.header);
  const dataRows = rows.map((r) => cols.map((c) => r[c.key] ?? ""));

  const aoa = [headerRow, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Estilo do cabeçalho: negrito + borda inferior + preenchimento suave
  const headerStyle = {
    font: { bold: true, sz: 11, color: { rgb: "1E293B" } },
    fill: { fgColor: { rgb: "F1F5F9" } },
    alignment: { vertical: "center", horizontal: "left" },
    border: {
      bottom: { style: "medium", color: { rgb: "334155" } },
    },
  };
  const cellStyle = {
    font: { sz: 10, color: { rgb: "1E293B" } },
    alignment: { vertical: "center", horizontal: "left" },
  };

  for (let c = 0; c < headerRow.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) ws[addr].s = headerStyle;
  }
  for (let r = 1; r <= dataRows.length; r++) {
    for (let c = 0; c < headerRow.length; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) ws[addr].s = cellStyle;
    }
  }

  // Auto-fit de colunas (limite entre 8 e 45)
  const widths = cols.map((_, idx) => {
    const maxLen = Math.max(
      String(headerRow[idx] ?? "").length,
      ...dataRows.map((row) => String(row[idx] ?? "").length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 45) };
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
