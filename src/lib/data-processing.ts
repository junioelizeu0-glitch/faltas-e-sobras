import { useState, useEffect, useMemo, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { fetchDashboardData } from "./dashboard.functions";

export type FilterState = {
  dateRef: string;
  periodo: string;
  dataInicio?: string;
  dataFim?: string;
  cd: string;
  transp: string;
  status: string;
  tipo: string;
};

export function parseDataBR(dataStr: any): Date | null {
  if (!dataStr) return null;
  if (dataStr instanceof Date) {
    return isNaN(dataStr.getTime()) ? null : dataStr;
  }
  const str = String(dataStr).trim();
  if (str === "") return null;

  // 1. Check DD/MM/YYYY or DD/MM/YYYY HH:mm:ss
  const brRegex =
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
  const brMatch = str.match(brRegex);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    const year = parseInt(brMatch[3], 10);
    const hour = brMatch[4] ? parseInt(brMatch[4], 10) : 0;
    const minute = brMatch[5] ? parseInt(brMatch[5], 10) : 0;
    const second = brMatch[6] ? parseInt(brMatch[6], 10) : 0;
    const d = new Date(year, month, day, hour, minute, second);
    return isNaN(d.getTime()) ? null : d;
  }

  // 2. Check YYYY-MM-DD
  const ymdRegex =
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
  const ymdMatch = str.match(ymdRegex);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const hour = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
    const minute = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    const second = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;
    const d = new Date(year, month, day, hour, minute, second);
    return isNaN(d.getTime()) ? null : d;
  }

  // 3. Fallback to standard JS Date parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d;
  }

  return null;
}

export function formatarDataBR(valor: any): string {
  if (!valor) return "-";
  if (valor instanceof Date) {
    return isNaN(valor.getTime()) ? "-" : valor.toLocaleDateString("pt-BR");
  }
  const parsed = parseDataBR(valor);
  if (parsed && !isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("pt-BR");
  }
  const data = new Date(valor);
  if (isNaN(data.getTime())) return String(valor);
  return data.toLocaleDateString("pt-BR");
}

export function getBusinessDays(startDate: any, endDate: any): number {
  const startParsed = parseDataBR(startDate);
  const endParsed = parseDataBR(endDate);
  if (!startParsed || !endParsed) return 0;

  let start = new Date(startParsed);
  start.setHours(0, 0, 0, 0);
  let end = new Date(endParsed);
  end.setHours(0, 0, 0, 0);

  if (start > end) return 0;

  let count = 0;
  let cur = new Date(start);
  cur.setDate(cur.getDate() + 1);
  while (cur <= end) {
    const dayOfWeek = cur.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function isValidField(value: any): boolean {
  if (value === null || value === undefined) return false;
  const str = String(value).trim().toLowerCase();
  return (
    str !== "" &&
    str !== "#n/d" &&
    str !== "sem informação" &&
    str !== "sem informacao" &&
    str !== "n/d" &&
    str !== "nd" &&
    str !== "sem transp." &&
    str !== "sem transportadora"
  );
}

export function isValidValue(value: any): boolean {
  if (!value && value !== 0) return false;
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
}

export function getTarefaAtual(item: any): string {
  if (!item) return "";
  const key = Object.keys(item).find((k) => {
    const normalized = k
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return (
      normalized === "situacao" ||
      normalized === "tarefa atual" ||
      normalized.includes("tarefa") ||
      normalized.includes("situac")
    );
  });
  return key ? String(item[key] || "") : "";
}

export function isSemRetorno(item: any): boolean {
  if (!item) return false;

  const statusChamadoRaw = String(item["Status Chamado"] || "").toLowerCase().trim();
  if (statusChamadoRaw !== "aprovado") return false;

  const tarefa = getTarefaAtual(item).toLowerCase();
  if (!tarefa.includes("sem retorno")) return false;

  const dtFinRaw = item["Dt Finalização"];
  if (!dtFinRaw) return false;

  const dtFin = parseDataBR(dtFinRaw);
  return dtFin !== null;
}

export function useDashboardData(filters?: FilterState) {
  const [rawData, setRawData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDataFn = useServerFn(fetchDashboardData);

  const fetchData = useCallback(
    async (isInitial = true) => {
      if (isInitial) {
        setIsLoading(true);
      } else {
        setIsRefetching(true);
      }
      setError(null);
      try {
        const json = await fetchDataFn();
        setRawData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        if (isInitial) {
          setIsLoading(false);
        } else {
          setIsRefetching(false);
        }
      }
    },
    [fetchDataFn],
  );

  useEffect(() => {
    fetchData(true);

    // Auto-refresh every 60 seconds
    const intervalId = setInterval(() => {
      fetchData(false);
    }, 60000);

    return () => clearInterval(intervalId);
  }, [fetchData]);

  const filterOptions = useMemo(() => {
    const cds = new Set<string>();
    const transps = new Set<string>();
    const tipos = new Set<string>();
    rawData.forEach((item) => {
      const rawcd = item["CD"];
      if (rawcd && rawcd.trim() !== "") {
        const cleanCd = rawcd.trim().replace(/^CD\s+/i, "");
        cds.add(cleanCd);
      }
      const tran = item["Transportadora"];
      if (tran && isValidField(tran)) transps.add(tran.trim());
      const tipo = item["Tipo"];
      if (tipo && tipo.trim() !== "") tipos.add(tipo.trim());
    });
    return {
      cds: Array.from(cds).sort(),
      transps: Array.from(transps).sort(),
      tipos: Array.from(tipos).sort(),
    };
  }, [rawData]);

  const kpis = useMemo(() => {
    if (!rawData.length) return null;

    let totalAprovado = 0;
    let totalPago = 0;
    let totalPagosQtd = 0;
    let totalPendente = 0;
    let totalRecusado = 0;
    let totalFinalizados = 0;
    let totalAprovadosQtd = 0;
    let totalAprovadosComValorQtd = 0;
    let totalAprovadosSemRetornoQtd = 0;
    let totalRecusadosQtd = 0;
    let totalPendentesQtd = 0;
    let foraSlaQtd = 0;

    let minTempo: number | null = null;
    let maxTempo: number | null = null;
    let accTempo = 0;
    let tempoCount = 0;

    let slaChamadoDentro = 0;
    let slaChamadoFora = 0;
    let slaPagamentoDentro = 0;
    let slaPagamentoFora = 0;
    let slaChamadoList: any[] = [];
    let slaPagamentoList: any[] = [];

    const monthNames = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];

    // Aggregation Maps
    const monthlyMap: Record<string, any> = {};
    const origemPagamentoMap: Record<string, any> = {};
    const cdMap: Record<string, any> = {};
    const lojaMap: Record<string, any> = {};
    const transpMap: Record<string, any> = {};
    const confMap: Record<string, any> = {};
    const confMapES: Record<string, any> = {};
    const confMapPB: Record<string, any> = {};

    rawData.forEach((item) => {
      const isValValid = isValidValue(item[" Valor "]);
      const val = isValValid ? Number(item[" Valor "]) : 0;
      const dtOpen = parseDataBR(item["Dt Abertura"]);
      const dtFin = parseDataBR(item["Dt Finalização"]);
      const dtPag = parseDataBR(item["Dt Pagamento"]);
      const sChamado = (item["Status Chamado"] || "").toString().toLowerCase().trim();
      const statusPagamento = item["Status Pagamento"];

      if (dtOpen && !isNaN(dtOpen.getTime())) {
        const key = `${monthNames[dtOpen.getMonth()]} ${String(dtOpen.getFullYear()).slice(2)}`;
        if (!monthlyMap[key]) {
          monthlyMap[key] = {
            name: key,
            sortObj: new Date(dtOpen.getFullYear(), dtOpen.getMonth(), 1).getTime(),
            abertos: 0,
            aprovados: 0,
            recusados: 0,
            pendentes: 0,
            valAberto: 0,
            valAprovado: 0,
            valPago: 0,
            valPendente: 0,
            valRecusado: 0,
            valPendenteAnalise: 0,
          };
        }
        monthlyMap[key].abertos++;
        if (isValValid) {
          monthlyMap[key].valAberto += val;
        }

        let hasDtPag = dtPag && !isNaN(dtPag.getTime());

        if (sChamado === "aprovado") {
          monthlyMap[key].aprovados++;
          if (isValValid && !isSemRetorno(item)) {
            monthlyMap[key].valAprovado += val;
            if (statusPagamento === "Pago" && hasDtPag) monthlyMap[key].valPago += val;
            else monthlyMap[key].valPendente += val; // pendente de pagamento
          }
        } else if (sChamado === "recusado") {
          monthlyMap[key].recusados++;
          if (isValValid) monthlyMap[key].valRecusado += val;
        } else {
          monthlyMap[key].pendentes++;
          if (isValValid) monthlyMap[key].valPendenteAnalise += val; // pendente de análise
        }
      }
    });

    const agingMap = {
      "0-10 dias": 0,
      "11-20 dias": 0,
      "21-30 dias": 0,
      "Mais de 30 dias": 0,
    };

    const filteredData = rawData.filter((item) => {
      if (!filters) return true;
      const rawCd = item["CD"]
        ? String(item["CD"]).trim().replace(/^CD\s+/i, "")
        : "Sem informação";

      if (filters.cd !== "Todos" && rawCd !== filters.cd) return false;
      if (filters.transp !== "Todas" && item["Transportadora"] !== filters.transp) return false;
      if (filters.tipo !== "Todos" && item["Tipo"] !== filters.tipo) return false;

      const apiStatus = item["Status Chamado"];

      if (filters.status !== "Todos") {
        const filterStatusNorm = String(filters.status || "").toLowerCase().trim();
        const apiStatusNorm = String(apiStatus || "").toLowerCase().trim();
        if (
          apiStatusNorm !== filterStatusNorm &&
          !apiStatusNorm.includes(filterStatusNorm.replace("pendente monitoramento", "monit"))
        ) {
          if (filterStatusNorm === "pendente") {
            if (apiStatusNorm === "aprovado" || apiStatusNorm === "recusado") return false;
          } else {
            return false;
          }
        }
      }

      const refMap: Record<string, string> = {
        "Ref: Data de Abertura": "Dt Abertura",
        "Ref: Data de Finalização": "Dt Finalização",
        "Ref: Data de Pagamento": "Dt Pagamento",
      };

      const refDateKey = refMap[filters.dateRef] || "Dt Abertura";
      const refDateStr = item[refDateKey];

      if (filters.dataInicio || filters.dataFim) {
        if (!refDateStr) return false;
        const d = parseDataBR(refDateStr);
        if (d) {
          if (filters.dataInicio) {
            const start = parseDataBR(filters.dataInicio);
            if (start) {
              start.setHours(0, 0, 0, 0);
              if (d < start) return false;
            }
          }
          if (filters.dataFim) {
            const end = parseDataBR(filters.dataFim);
            if (end) {
              end.setHours(23, 59, 59, 999);
              if (d > end) return false;
            }
          }
        } else {
          return false;
        }
      }
      return true;
    });

    const slaStatusMap: Record<string, number> = {};
    const mensalValoresMap: Record<string, any> = {};

    filteredData.forEach((item) => {
      const isValValid = isValidValue(item[" Valor "]);
      const val = isValValid ? Number(item[" Valor "]) : 0;
      const statusChamadoRaw = (item["Status Chamado"] || "").toString().toLowerCase().trim();

      const statusChamado =
        statusChamadoRaw === "aprovado"
          ? "Aprovado"
          : statusChamadoRaw === "recusado"
            ? "Recusado"
            : statusChamadoRaw === "cancelado" || statusChamadoRaw === "finalizado"
              ? "Outros"
              : "Pendente";
      const statusPagamento = item["Status Pagamento"];
      const dtOpen = parseDataBR(item["Dt Abertura"]);
      const dtFin = parseDataBR(item["Dt Finalização"]);
      const dtPag = parseDataBR(item["Dt Pagamento"]);
      const cdRaw = item["CD"];
      const cd = cdRaw ? String(cdRaw).trim().replace(/^CD\s+/i, "") : "Sem informação";
      const loja = String(item["Loja"] || "Sem informação");
      const transp = item["Transportadora"] || "Sem informação";
      const conf = item["Conferente"] || "Sem informação";

      // Mensal Valores Graph Grouping (by Periodo)
      let pKey = "";
      let mIdx = -1;
      let yStr = "";
      if (item["Periodo"] && typeof item["Periodo"] === "string" && item["Periodo"].length >= 7) {
        const parts = item["Periodo"].split("-"); // Assuming YYYY-MM-DD
        if (parts.length >= 2) {
          mIdx = parseInt(parts[1], 10) - 1;
          yStr = parts[0].slice(2);
        }
      } else if (dtOpen && !isNaN(dtOpen.getTime())) {
        mIdx = dtOpen.getMonth();
        yStr = String(dtOpen.getFullYear()).slice(2);
      }

      if (mIdx >= 0 && mIdx < 12 && yStr) {
        pKey = `${monthNames[mIdx]} ${yStr}`;
        if (!mensalValoresMap[pKey]) {
          mensalValoresMap[pKey] = {
            name: pKey,
            sortObj: new Date(Number("20" + yStr), mIdx, 1).getTime(),
            valAprovado: 0,
            valPago: 0,
            valPendente: 0,
            valAberto: 0,
          };
        }
        if (isValValid) {
          mensalValoresMap[pKey].valAberto += val;
          if (statusChamado === "Aprovado" && !isSemRetorno(item)) {
            mensalValoresMap[pKey].valAprovado += val;
            const hasPag = dtPag && !isNaN(dtPag.getTime());
            if (item["Status Pagamento"] === "Pago" && hasPag) {
              mensalValoresMap[pKey].valPago += val;
            }
          }
        }
      }

      // SLA dynamics (Only for finalized tickets)
      if (dtOpen && dtFin && !isNaN(dtOpen.getTime()) && !isNaN(dtFin.getTime())) {
        const days = (dtFin.getTime() - dtOpen.getTime()) / (1000 * 3600 * 24);
        const slaKey = days > 60 ? "Fora da SLA" : "Dentro da SLA";

        if (slaKey === "Fora da SLA") foraSlaQtd++;

        if (!slaStatusMap[slaKey]) slaStatusMap[slaKey] = 0;
        slaStatusMap[slaKey]++;

        // Tempo Médio Calculation
        accTempo += days;
        tempoCount++;
        if (minTempo === null || days < minTempo) minTempo = days;
        if (maxTempo === null || days > maxTempo) maxTempo = days;
      }

      // SLA do Chamado (considere finalizados e aprovados em aberto)
      const isAprovadoAberto = statusChamado === "Aprovado" && !dtFin;
      if (
        dtOpen &&
        !isNaN(dtOpen.getTime()) &&
        (dtFin || isAprovadoAberto) &&
        dtOpen.getFullYear() === new Date().getFullYear()
      ) {
        const targetDate = dtFin || new Date();
        const diasUteisChamado = getBusinessDays(dtOpen, targetDate);
        if (diasUteisChamado <= 60) slaChamadoDentro++;
        else slaChamadoFora++;

        if (dtFin) {
          slaChamadoList.push({
            chamadoId:
              item["Chamados"] ||
              item["Chamado"] ||
              item["Chave"] ||
              item["Número"] ||
              item["Nº"] ||
              item["N° Chamado"] ||
              item["Nº Chamado"] ||
              "",
            dtAbertura: formatarDataBR(item["Dt Abertura"]),
            dtFinalizacao: formatarDataBR(item["Dt Finalização"]),
            status: statusChamado || "",
            slaDias: 60,
            diasDemorou: diasUteisChamado,
            dentroSla: diasUteisChamado <= 60 ? "Sim" : "Não",
          });
        }
      }

      // SLA de Pagamento
      if (
        statusChamadoRaw !== "recusado" &&
        dtOpen &&
        dtPag &&
        !isNaN(dtOpen.getTime()) &&
        !isNaN(dtPag.getTime()) &&
        dtOpen.getFullYear() === new Date().getFullYear()
      ) {
        const diasUteisPagamento = getBusinessDays(dtOpen, dtPag);
        if (diasUteisPagamento <= 60) slaPagamentoDentro++;
        else slaPagamentoFora++;
        slaPagamentoList.push({
          chamadoId:
            item["Chamados"] ||
            item["Chamado"] ||
            item["Chave"] ||
            item["Número"] ||
            item["Nº"] ||
            item["N° Chamado"] ||
            item["Nº Chamado"] ||
            "",
          dtAbertura: formatarDataBR(item["Dt Abertura"]),
          dtPagamento: formatarDataBR(item["Dt Pagamento"]),
          status: statusChamado || "",
          slaDias: 60,
          diasDemorou: diasUteisPagamento,
          dentroSla: diasUteisPagamento <= 60 ? "Sim" : "Não",
          nfe: item["Nº Nfe"] || item["NF"] || "",
          valor: val || 0,
        });
      }

      // Aging (Apenas chamados que estão aberto sem data de finalização)
      const statusNorm = (statusChamado || "").toString().toLowerCase().trim();
      const isPendente =
        statusChamadoRaw.includes("pendente") || statusNorm === "pendente";
      if (
        (statusNorm === "aprovado" || isPendente) &&
        !dtFin &&
        dtOpen &&
        !isNaN(dtOpen.getTime())
      ) {
        const daysInfo = Math.floor(
          (new Date().getTime() - dtOpen.getTime()) / (1000 * 3600 * 24),
        );
        if (daysInfo <= 10) agingMap["0-10 dias"]++;
        else if (daysInfo <= 20) agingMap["11-20 dias"]++;
        else if (daysInfo <= 30) agingMap["21-30 dias"]++;
        else agingMap["Mais de 30 dias"]++;
      }

      // CDs
      const isNFValid =
        (item["Nº Nfe"] || item["NF"]) !== null &&
        (item["Nº Nfe"] || item["NF"]) !== undefined &&
        String(item["Nº Nfe"] || item["NF"]).trim() !== "";
      const isValorValid = val !== null && val !== undefined && val > 0;

      if (isValidField(cd)) {
        if (!cdMap[cd])
          cdMap[cd] = {
            name: cd,
            abertos: 0,
            aprovados: 0,
            topCdsChartQtd: 0,
            valAprovado: 0,
            valPago: 0,
            pendente: 0,
          };
        cdMap[cd].abertos++;
        if (statusChamado === "Aprovado") {
          cdMap[cd].aprovados++;
          if (!isSemRetorno(item)) {
            cdMap[cd].valAprovado += val;
            if (statusPagamento === "Pago") cdMap[cd].valPago += val;
            else cdMap[cd].pendente += val;
          }

          if (isNFValid && isValorValid) {
            cdMap[cd].topCdsChartQtd++;
          }
        }
      }

      // Lojas
      const nf = item["Nº Nfe"] || item["NF"];
      const hasValidNF = nf !== null && nf !== undefined && String(nf).trim() !== "";
      const hasValidValor = val !== null && val !== undefined && val > 0;

      if (hasValidNF && hasValidValor && isValidField(loja)) {
        if (!lojaMap[loja]) lojaMap[loja] = { name: loja, chamados: 0, valAprovado: 0, valPago: 0 };
        lojaMap[loja].chamados++;
        if (statusChamado === "Aprovado") {
          if (!isSemRetorno(item)) {
            lojaMap[loja].valAprovado += val;
            if (statusPagamento === "Pago") lojaMap[loja].valPago += val;
          }
        }
      }

      // Transportadoras
      const isPendenteMonitoramento =
        statusChamadoRaw.includes("pendente monitoramento") ||
        statusChamadoRaw.includes("pendente de monitoramento") ||
        statusChamadoRaw.includes("monitoramento");
      if (isValidField(transp) && !isPendenteMonitoramento) {
        if (!transpMap[transp])
          transpMap[transp] = { name: transp, ocorrencias: 0, recusados: 0, aprovados: 0, taxaRecusa: 0 };
        transpMap[transp].ocorrencias++;
        if (statusChamado === "Recusado") transpMap[transp].recusados++;
        if (statusChamado === "Aprovado") transpMap[transp].aprovados++;
      }

      // Conferentes
      if (isValidField(conf)) {
        if (!confMap[conf])
          confMap[conf] = { name: conf, analisados: 0, aprovados: 0, recusados: 0, score: 0 };
        confMap[conf].analisados++;
        if (statusChamado === "Aprovado") confMap[conf].aprovados++;
        if (statusChamado === "Recusado") confMap[conf].recusados++;

        const cdStr = String(cd).toUpperCase();
        if (
          cdStr.includes("ES") ||
          cdStr.includes("ESPIRITO SANTO") ||
          cdStr.includes("ESPÍRITO SANTO")
        ) {
          if (!confMapES[conf]) confMapES[conf] = { name: conf, aprovados: 0, recusados: 0 };
          if (statusChamado === "Aprovado") confMapES[conf].aprovados++;
          if (statusChamado === "Recusado") confMapES[conf].recusados++;
        } else if (
          cdStr.includes("PB") ||
          cdStr.includes("PARAIBA") ||
          cdStr.includes("PARAÍBA")
        ) {
          if (!confMapPB[conf]) confMapPB[conf] = { name: conf, aprovados: 0, recusados: 0 };
          if (statusChamado === "Aprovado") confMapPB[conf].aprovados++;
          if (statusChamado === "Recusado") confMapPB[conf].recusados++;
        }
      }

      // Global KPIs
      if (statusChamado === "Aprovado") {
        totalAprovadosQtd++;
        if (isSemRetorno(item)) {
          totalAprovadosSemRetornoQtd++;
        } else {
          totalAprovadosComValorQtd++;
          totalAprovado += val;

          let hasDtPag = dtPag && !isNaN(dtPag.getTime());
          let hasDtFin = dtFin && !isNaN(dtFin.getTime());

          if (dtPag && hasDtPag && hasDtFin) {
            totalPago += val;
            totalPagosQtd++;
            if (dtOpen && !isNaN(dtOpen.getTime())) {
              const mPag = `${monthNames[dtPag.getMonth()]} ${String(dtPag.getFullYear()).slice(2)}`;
              const mOpen = monthNames[dtOpen.getMonth()].toLowerCase();
              if (!origemPagamentoMap[mPag]) {
                origemPagamentoMap[mPag] = {
                  name: mPag,
                  sortObj: new Date(dtPag.getFullYear(), dtPag.getMonth(), 1).getTime(),
                };
              }
              if (!origemPagamentoMap[mPag][mOpen]) {
                origemPagamentoMap[mPag][mOpen] = 0;
                origemPagamentoMap[mPag][mOpen + "_qtd"] = 0;
              }
              origemPagamentoMap[mPag][mOpen] += val;
              origemPagamentoMap[mPag][mOpen + "_qtd"] += 1;
            }
          } else {
            totalPendente += val;
          }
        }
      } else if (statusChamado === "Recusado") {
        totalRecusadosQtd++;
        totalRecusado += val;
      } else {
        totalPendentesQtd++;
      }

      if (statusChamado === "Aprovado" || statusChamado === "Recusado") {
        totalFinalizados++;
      }
    });

    Object.keys(transpMap).forEach((k) => {
      const items = transpMap[k];
      const rec = items.recusados || 0;
      const apro = items.aprovados || 0;
      const total = rec + apro;
      transpMap[k].taxaRecusa = Math.round((rec / (items.ocorrencias || 1)) * 1000) / 10;
      transpMap[k].percAprovados = total > 0 ? Math.round((apro / total) * 1000) / 10 : 0;
      transpMap[k].percRecusados = total > 0 ? Math.round((rec / total) * 1000) / 10 : 0;
    });

    Object.keys(confMap).forEach((k) => {
      const items = confMap[k];
      const rec = items.recusados || 0;
      const an = items.analisados || 1;
      const ap = items.aprovados || 0;
      confMap[k].score = Math.min(
        100,
        Math.trunc(((ap + rec) / an) * 1000 * 0.5) / 10 + (1 - ap / an) * 50,
      );
    });

    Object.keys(mensalValoresMap).forEach((key) => {
      mensalValoresMap[key].valPendente = Math.max(
        0,
        mensalValoresMap[key].valAprovado - mensalValoresMap[key].valPago,
      );
    });

    const charts = {
      evolucaoMensal: Object.values(monthlyMap)
        .filter((item: any) => {
          const now = new Date();
          const currentMonthKey = `${monthNames[now.getMonth()]} ${String(now.getFullYear()).slice(2)}`;
          if (item.name === currentMonthKey) {
            return item.valAprovado > 0;
          }
          return true;
        })
        .sort((a: any, b: any) => a.sortObj - b.sortObj)
        .slice(-5),
      origemPagamentosData: Object.values(origemPagamentoMap)
        .sort((a: any, b: any) => a.sortObj - b.sortObj)
        .slice(-6),
      cdsData: Object.values(cdMap)
        .filter((c: any) => c.valAprovado > 0)
        .sort((a: any, b: any) => b.valAprovado - a.valAprovado)
        .slice(0, 5),
      lojasData: Object.values(lojaMap)
        .filter((l: any) => l.valAprovado > 0)
        .sort((a: any, b: any) => b.valAprovado - a.valAprovado)
        .slice(0, 5),
      agingData: Object.entries(agingMap).map(([name, qtd]) => ({ name, qtd })),
      transpDataRaw: Object.values(transpMap)
        .sort((a: any, b: any) => b.ocorrencias - a.ocorrencias)
        .map((t: any) => ({
          ...t,
          displayName: `${t.name} (${t.ocorrencias})`,
        })),
      topTranspData: Object.values(transpMap)
        .sort((a: any, b: any) => b.ocorrencias - a.ocorrencias)
        .slice(0, 5),
      taxaRecusaTranspData: Object.values(transpMap)
        .filter((t: any) => t.ocorrencias >= 5)
        .map((t: any) => ({
          ...t,
          displayName: `${t.name} (${t.ocorrencias})`,
        }))
        .sort((a: any, b: any) => b.taxaRecusa - a.taxaRecusa)
        .slice(0, 5),
      topConferentesData: Object.values(confMap)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5),
      topConferentesAprovados: Object.values(confMap)
        .sort((a: any, b: any) => b.aprovados - a.aprovados)
        .slice(0, 5),
      topConferentesRecusados: Object.values(confMap)
        .sort((a: any, b: any) => b.recusados - a.recusados)
        .slice(0, 5),
      conferentesGeral: Object.values(confMap).sort(
        (a: any, b: any) => b.aprovados + b.recusados - (a.aprovados + a.recusados),
      ),
      conferentesES: Object.values(confMapES).sort(
        (a: any, b: any) => b.aprovados + b.recusados - (a.aprovados + a.recusados),
      ),
      conferentesPB: Object.values(confMapPB).sort(
        (a: any, b: any) => b.aprovados + b.recusados - (a.aprovados + a.recusados),
      ),
      taxaAprovacaoCdData: Object.values(cdMap)
        .map((c: any) => ({
          name: c.name,
          taxaAprovacao: c.abertos > 0 ? Math.trunc((c.aprovados / c.abertos) * 1000) / 10 : 0,
        }))
        .sort((a: any, b: any) => b.taxaAprovacao - a.taxaAprovacao),
      slaData: Object.keys(slaStatusMap).map((k: string) => ({
        name: k,
        value: filteredData.length
          ? Math.round(
              (slaStatusMap[k] / Math.max(1, foraSlaQtd + (slaStatusMap["Dentro da SLA"] || 0))) * 100,
            )
          : 0,
        color: k === "Dentro da SLA" ? "#10b981" : "#f43f5e",
      })).filter((d) => d.value > 0),
      slaComparativoData: [
        {
          name: "SLA do Chamado",
          "No Prazo": slaChamadoDentro,
          "Fora do Prazo": slaChamadoFora,
          Total: slaChamadoDentro + slaChamadoFora,
        },
        {
          name: "SLA de Pagamento",
          "No Prazo": slaPagamentoDentro,
          "Fora do Prazo": slaPagamentoFora,
          Total: slaPagamentoDentro + slaPagamentoFora,
        },
      ],
    };

    return {
      totalChamados: filteredData.length,
      totalPagosQtd,
      finalizados: totalFinalizados,
      aprovados: totalAprovadosQtd,
      recusados: totalRecusadosQtd,
      pendentes: totalPendentesQtd,
      taxaAprovacao: filteredData.length
        ? Math.trunc((totalAprovadosQtd / filteredData.length) * 1000) / 10
        : 0,
      taxaRecusa: filteredData.length
        ? Math.trunc((totalRecusadosQtd / filteredData.length) * 1000) / 10
        : 0,
      foraSla: foraSlaQtd,
      slaCumprido: filteredData.length
        ? Math.round(((filteredData.length - foraSlaQtd) / filteredData.length) * 100)
        : 0,
      valAprovado: totalAprovado,
      valPago: totalPago,
      valPendente: totalPendente,
      valRecusado: totalRecusado,
      ticketMedio: totalAprovadosQtd ? totalAprovado / totalAprovadosQtd : 0,
      semRetornoDesconsideradosQtd: totalAprovadosSemRetornoQtd,
      tempoMedio: tempoCount > 0 ? (accTempo / tempoCount).toFixed(1) : "0",
      tempoMin: minTempo !== null ? (minTempo as number).toFixed(1) : "0",
      tempoMax: maxTempo !== null ? (maxTempo as number).toFixed(1) : "0",
      slaChamadoDentro,
      slaChamadoFora,
      slaPagamentoDentro,
      slaPagamentoFora,
      slaChamadoList,
      slaPagamentoList,
      charts,
      filteredData,
    };
  }, [rawData, filters]);

  return { rawData, filterOptions, isLoading, isRefetching, error, kpis, refetch: () => fetchData(false) };
}
