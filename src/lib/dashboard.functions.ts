import { createServerFn } from "@tanstack/react-start";

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxIm2ANZSX22T9_tM3vAlfEd_F-GRHHMj_8dQo4n6uKk4WDno91GzmCSAbfj20tceJN/exec";

export const fetchDashboardData = createServerFn({ method: "GET" }).handler(
  async () => {
    const response = await fetch(GOOGLE_SCRIPT_URL);
    if (!response.ok) {
      throw new Error("Falha ao buscar dados da planilha");
    }
    const json = await response.json();
    if (!json || !json["CONTROLE CHAMADOS (FALTAS)"]) {
      throw new Error("Formato de dados inválido");
    }
    return json["CONTROLE CHAMADOS (FALTAS)"] as any[];
  },
);

export type NovoChamadoPayload = {
  aba: "FALTAS" | "SOBRA" | "RECALL" | "GATO";
  Chamado: number | string;
  Loja: number | string;
  Tipo: string;
  NF: number | string;
  "Dt Emissão": string;
  " Valor ": number | string;
  CD: string;
  "Situação ": string;
  "Dt Abertura": string;
  "Dt Finalização": string;
  "Dt Pagamento": string;
  "SLA por chamado (60dias)": string;
  "Status Pagamento": string;
  "Status Chamado": string;
  Motivo: string;
  Transportadora: string;
  Conferente: string;
  Periodo: string;
};

const ABA_TO_SHEET: Record<string, string> = {
  FALTAS: "CONTROLE CHAMADOS (FALTAS)",
  SOBRA: "CONTROLE CHAMADOS (SOBRA)",
  RECALL: "CONTROLE CHAMADOS (RECALL)",
  GATO: "CONTROLE CHAMADOS (GATO)",
};

export const createChamado = createServerFn({ method: "POST" })
  .inputValidator((data: NovoChamadoPayload) => data)
  .handler(async ({ data }) => {
    const { aba, ...rest } = data;
    const sheet = ABA_TO_SHEET[aba] || aba;
    const body = {
      action: "insert",
      sheet,
      data: rest,
    };
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      redirect: "follow",
    });
    const text = await response.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(
        "O Apps Script respondeu em HTML. Verifique se a implantação Web App está ativa e acessível a 'Qualquer pessoa'.",
      );
    }
    if (!response.ok || json?.success === false) {
      throw new Error(json?.error || "Falha ao inserir chamado na planilha");
    }
    return json;
  });


