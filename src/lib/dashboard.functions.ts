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
