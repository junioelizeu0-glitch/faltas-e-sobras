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

export const createChamado = createServerFn({ method: "POST" })
  .inputValidator((data: NovoChamadoPayload) => data)
  .handler(async ({ data }) => {
    const payload = { action: "insert", ...data };
    // Apps Script aceita melhor form-urlencoded (e.parameter) do que JSON puro.
    const form = new URLSearchParams();
    Object.entries(payload).forEach(([k, v]) => {
      form.append(k, v == null ? "" : String(v));
    });
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: form.toString(),
      redirect: "follow",
    });
    const text = await response.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(
        "O Apps Script respondeu em HTML (provavelmente ainda não tem a função doPost). Adicione o snippet doPost fornecido no editor do Apps Script e reimplante a mesma versão.",
      );
    }
    if (!response.ok || json?.ok === false) {
      throw new Error(json?.error || "Falha ao inserir chamado na planilha");
    }
    return json;
  });

