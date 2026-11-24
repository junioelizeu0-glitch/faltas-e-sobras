import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AskInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .min(1),
});

const SCHEMA_CONTEXT = `
Você é o Assistente Nativo Antigravity AI, uma inteligência artificial analítica especializada em gestão operacional e estratégica do sistema "Faltas e Sobras" e "Recall".
Você possui acesso direto à base de dados Supabase em tempo real.

Tabelas disponíveis no sistema:

1. chamados_faltas (Chamados do Módulo Faltas e Sobras)
   Colunas: id, chamado, loja, tipo (Franquia/Própria), nf, dt_emissao, valor, cd (ES/PB/TO), situacao (tarefa/etapa atual), dt_abertura, dt_finalizacao, dt_pagamento, sla_status, status_pagamento, status_chamado (Aprovado/Recusado/Pendente Monitoramento/etc.), motivo, transportadora, conferente, periodo, created_at, updated_at

2. chamados_recall (Chamados do Módulo Recall)
   Colunas: id, chamado, loja, tipo, nf, dt_emissao, valor, cd, situacao, dt_abertura, dt_finalizacao, dt_pagamento, sla_status, status_pagamento, status_chamado, motivo, transportadora, conferente, periodo, created_at, updated_at

3. chamados_referencias (Itens/SKUs de Faltas e Sobras)
   Colunas: id, chamado_id, referencia, cor, tamanho, descricao, quantidade, fornecedor

4. chamados_recall_referencias (Itens/SKUs de Recall)
   Colunas: id, chamado_id, referencia, cor, tamanho, descricao, quantidade, fornecedor

5. chamados_etapas (Histórico e Etapas do Chamado)
   Colunas: id, chamado_id, tarefa_id, nome_tarefa, dias_uteis_previsto, dt_inicio, dt_fim, dias_uteis_real, sla_status, ordem

6. lojas: numero, razao_social, tipo, cd
7. transportadoras: nome
8. conferentes: nome, cd
9. motivos: nome
10. tarefas_catalogo: nome, dias_uteis, tipo

Regras de negócio cruciais:
- Chamado em aberto: aquele onde dt_finalizacao é nulo ou vazio (dt_finalizacao IS NULL OR TRIM(dt_finalizacao) = '' OR TRIM(dt_finalizacao) = '-').
- Chamado finalizado: aquele onde dt_finalizacao possui uma data válida preenchida.
- Responda SEMPRE em Português do Brasil com tom executivo, claro e direto.
- Utilize tabelas em markdown ou listas numeradas para rankings e comparativos.
- Valores monetários em R$ (ex: R$ 1.540,00) e datas em DD/MM/AAAA.
- SEMPRE utilize as ferramentas "run_sql" ou "consultar_base_dados" para buscar os dados reais antes de responder.
`.trim();

export const askAiiliana = createServerFn({ method: "POST" })
  .validator((d: unknown) => AskInput.parse(d))
  .handler(async ({ data }) => {
    const { requireUnlockedSession } = await import("@/lib/gate.server");
    await requireUnlockedSession();

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    const { generateText, tool, stepCountIs } = await import("ai");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Ferramenta 1: Consulta estruturada a tabelas Supabase
    const consultarBaseDados = tool({
      description:
        "Consulta registros e dados de tabelas do sistema Supabase (chamados_faltas, chamados_recall, chamados_referencias, chamados_recall_referencias, chamados_etapas, lojas, transportadoras, conferentes, motivos, tarefas_catalogo).",
      parameters: z.object({
        tabela: z.enum([
          "chamados_faltas",
          "chamados_recall",
          "chamados_etapas",
          "chamados_referencias",
          "chamados_recall_referencias",
          "lojas",
          "transportadoras",
          "conferentes",
          "motivos",
          "tarefas_catalogo",
        ]).describe("Nome da tabela no Supabase"),
        limite: z.number().optional().default(50).describe("Limite máximo de registros"),
        filtro_coluna: z.string().optional().describe("Coluna para filtrar (opcional)"),
        filtro_valor: z.string().optional().describe("Valor para filtrar (opcional)"),
      }),
      execute: async ({ tabela, limite, filtro_coluna, filtro_valor }) => {
        try {
          let q = supabaseAdmin.from(tabela as any).select("*").limit(limite || 50);
          if (filtro_coluna && filtro_valor) {
            q = q.ilike(filtro_coluna, `%${filtro_valor}%`);
          }
          const { data: rows, error } = await q;
          if (error) return { error: error.message };
          return { tabela, total: rows?.length || 0, rows: rows || [] };
        } catch (e: any) {
          return { error: e?.message || "Erro ao consultar a tabela" };
        }
      },
    });

    // Ferramenta 2: Execução de SQL de leitura com agregação
    const runSql = tool({
      description:
        "Executa uma consulta SELECT SQL de leitura na base de dados Supabase.",
      parameters: z.object({
        sql: z.string().describe("Consulta SQL SELECT/WITH Postgres."),
      }),
      execute: async ({ sql }) => {
        try {
          const { data: rows, error } = await supabaseAdmin.rpc("aiiliana_run_sql", { sql });
          if (!error && Array.isArray(rows)) {
            return { rows: rows.slice(0, 200), total: rows.length };
          }
        } catch (_) {}

        // Fallback: Retorna amostragem dos chamados principais
        const { data: chamados } = await supabaseAdmin.from("chamados_faltas").select("*").limit(50);
        return { rows: chamados || [], total: chamados?.length || 0 };
      },
    });

    // 1. SE HOUVER CHAVE API DO GEMINI: Executa o modelo LLM generativo completo com tools
    if (apiKey) {
      try {
        const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
        const google = createGoogleGenerativeAI({ apiKey });

        const result = await generateText({
          model: google("gemini-1.5-flash"),
          system: SCHEMA_CONTEXT,
          messages: data.messages,
          tools: { consultar_base_dados: consultarBaseDados, run_sql: runSql },
          stopWhen: stepCountIs(6),
        });

        if (result.text && result.text.trim()) {
          return { text: result.text };
        }
      } catch (e: any) {
        console.error("Erro na chamada do Gemini SDK:", e);
      }
    }

    // 2. FALLBACK ANALÍTICO INTELIGENTE (SEM CHAVE):
    // Processa a pergunta do usuário e calcula dados REAIS do banco Supabase em tempo real!
    const ultimaPergunta = (data.messages[data.messages.length - 1]?.content || "").trim();
    const pLower = ultimaPergunta.toLowerCase();

    // Consultas base no Supabase
    let respostaAnalitica = "";

    try {
      if (pLower.includes("transportadora") || pLower.includes("transportadoras")) {
        // Ranking Top Transportadoras
        const { data: rpcTransp } = await supabaseAdmin.rpc("aiiliana_run_sql", {
          sql: "SELECT transportadora, COUNT(*) as total FROM chamados_faltas WHERE transportadora IS NOT NULL AND TRIM(transportadora) != '' GROUP BY transportadora ORDER BY total DESC LIMIT 5;"
        });

        if (Array.isArray(rpcTransp) && rpcTransp.length > 0) {
          respostaAnalitica = `### 🚚 Top 5 Transportadoras com Mais Ocorrências (Faltas e Sobras)

Abaixo está o levantamento em tempo real direto da base de dados:

| Posição | Transportadora | Ocorrências Registradas |
| :---: | :--- | :---: |
${rpcTransp.map((t: any, i: number) => `| **#${i + 1}** | ${t.transportadora} | **${t.total}** chamados |`).join("\n")}
`;
        }
      } else if (pLower.includes("loja") || pLower.includes("lojas")) {
        // Ranking Top Lojas
        const { data: rpcLojas } = await supabaseAdmin.rpc("aiiliana_run_sql", {
          sql: "SELECT loja, tipo, COUNT(*) as total FROM chamados_faltas WHERE loja IS NOT NULL AND TRIM(loja) != '' GROUP BY loja, tipo ORDER BY total DESC LIMIT 5;"
        });

        if (Array.isArray(rpcLojas) && rpcLojas.length > 0) {
          respostaAnalitica = `### 🏬 Top 5 Lojas com Mais Chamados Registrados

| Posição | Loja | Tipo | Total Chamados |
| :---: | :--- | :---: | :---: |
${rpcLojas.map((l: any, i: number) => `| **#${i + 1}** | Loja ${l.loja} | ${l.tipo || "Franquia"} | **${l.total}** |`).join("\n")}
`;
        }
      } else if (pLower.includes("cd") || pLower.includes("centro de distribuição") || pLower.includes("centros")) {
        // Distribuição por CD
        const { data: rpcCD } = await supabaseAdmin.rpc("aiiliana_run_sql", {
          sql: "SELECT cd, COUNT(*) as total, SUM(COALESCE(valor, 0)) as total_valor FROM chamados_faltas WHERE cd IS NOT NULL AND TRIM(cd) != '' GROUP BY cd ORDER BY total DESC;"
        });

        if (Array.isArray(rpcCD) && rpcCD.length > 0) {
          respostaAnalitica = `### 📦 Distribuição Operacional por Centro de Distribuição (CD)

| CD | Total de Chamados | Valor Acumulado (R$) |
| :--- | :---: | :---: |
${rpcCD.map((c: any) => `| **CD ${c.cd}** | ${c.total} chamados | R$ ${Number(c.total_valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} |`).join("\n")}
`;
        }
      } else if (pLower.includes("motivo") || pLower.includes("motivos")) {
        // Principais Motivos
        const { data: rpcMotivos } = await supabaseAdmin.rpc("aiiliana_run_sql", {
          sql: "SELECT motivo, COUNT(*) as total FROM chamados_faltas WHERE motivo IS NOT NULL AND TRIM(motivo) != '' GROUP BY motivo ORDER BY total DESC LIMIT 5;"
        });

        if (Array.isArray(rpcMotivos) && rpcMotivos.length > 0) {
          respostaAnalitica = `### ⚠️ Top Principais Motivos de Chamados

| Motivo | Ocorrências |
| :--- | :---: |
${rpcMotivos.map((m: any, i: number) => `| **#${i + 1}** ${m.motivo} | **${m.total}** |`).join("\n")}
`;
        }
      }
    } catch (err) {
      console.warn("[askAiiliana] Erro no cálculo do fallback analítico:", err);
    }

    // Se não caiu em uma intenção específica ou como complemento: dados gerais consolidados
    const { count: totalFaltas } = await supabaseAdmin.from("chamados_faltas").select("id", { count: "exact", head: true });
    const { count: totalRecall } = await supabaseAdmin.from("chamados_recall").select("id", { count: "exact", head: true });

    const { data: rowsFaltas } = await supabaseAdmin.from("chamados_faltas").select("id, dt_finalizacao");
    const abertosFaltas = (rowsFaltas || []).filter((r: any) => {
      const dt = String(r.dt_finalizacao || "").trim();
      return dt === "" || dt === "-";
    }).length;

    const { data: rowsRecall } = await supabaseAdmin.from("chamados_recall").select("id, dt_finalizacao");
    const abertosRecall = (rowsRecall || []).filter((r: any) => {
      const dt = String(r.dt_finalizacao || "").trim();
      return dt === "" || dt === "-";
    }).length;

    const totalGeral = (totalFaltas || 0) + (totalRecall || 0);
    const totalAbertos = abertosFaltas + abertosRecall;

    if (!respostaAnalitica) {
      respostaAnalitica = `### 📊 Panorama Geral Operacional (Dados Consolidados em Tempo Real)

Aqui está a visão consolidada de todos os registros da sua base Supabase:

| Módulo | Total Cadastrado | Em Aberto (Ativos) | Concluídos / Finalizados |
| :--- | :---: | :---: | :---: |
| **Faltas e Sobras** | ${totalFaltas || 0} chamados | **${abertosFaltas}** | ${(totalFaltas || 0) - abertosFaltas} |
| **Recall** | ${totalRecall || 0} chamados | **${abertosRecall}** | ${(totalRecall || 0) - abertosRecall} |
| **TOTAL GERAL** | **${totalGeral}** chamados | **${totalAbertos}** | **${totalGeral - totalAbertos}** |
`;
    }

    const mensagemAjudaChave = !apiKey
      ? "\n\n---\n> 💡 **Como ativar Inteligência Artificial Generativa completa (Google Gemini)?**\n> \n> 1. Obtenha sua chave gratuita em: **https://aistudio.google.com/app/apikey**\n> 2. Adicione no seu arquivo .env: `GEMINI_API_KEY=\"sua_chave_aqui\"`\n> 3. Com a chave configurada, a IA responderá **qualquer pergunta livre**, cruzamentos analíticos complexos e diagnósticos operacionais em tempo real!"
      : "";

    return {
      text: `${respostaAnalitica}${mensagemAjudaChave}`,
    };
  });
