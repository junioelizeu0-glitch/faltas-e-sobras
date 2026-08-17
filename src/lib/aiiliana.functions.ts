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
Você é AIliana, uma assistente analítica em português do sistema "Faltas e Sobras".
Você tem acesso READ-ONLY ao banco Postgres via a ferramenta "run_sql". Somente SELECT/WITH é permitido.

Tabelas disponíveis (schema public):

- chamados_faltas (chamado principal)
  Colunas: id (uuid), numero_chamado (text), loja (text), cd (text), tipo (text),
    dt_emissao_nf (date), numero_nf (text), valor (numeric), dt_abertura (date),
    sla_dias_uteis (int), situacao (text) -- tarefa atual,
    status_chamado (text), transportadora (text), conferente (text), motivo (text),
    dt_finalizacao (date), observacoes (text), created_at (timestamptz), updated_at (timestamptz)

- chamados_etapas (etapas de fluxo por chamado)
  Colunas: id, chamado_id (uuid FK -> chamados_faltas.id), nome_tarefa (text),
    dias_uteis_previsto (int), dt_inicio (date), dt_fim (date),
    dias_uteis_real (int), sla_status (text), ordem (int)

- chamados_referencias (produtos/refs do chamado)
  Colunas: chamado_id, referencia, cor, tamanho, descricao, quantidade, fornecedor

- lojas: numero_loja, cnpj, razao_social, tipo (Propria/Franquia), banco, agencia, conta, cd
- produtos: referencia, cor, descricao, nome_parceiro
- transportadoras: nome
- conferentes: nome, cd
- motivos: nome
- tarefas_catalogo: nome, dias_uteis, aplica_faltas, aplica_sobras
- audit_log: tabela, operacao, registro_id, dados_antigos (jsonb), dados_novos (jsonb), usuario, created_at

Regras:
- Use SEMPRE run_sql para responder qualquer pergunta que dependa de dados.
- Sempre limite resultados (LIMIT 50) quando fizer listagens. Para totais/contagens, agregue.
- Datas em pt-BR (dd/mm/aaaa) na resposta final. Valores em R$.
- "Chamados em aberto" = dt_finalizacao IS NULL.
- Responda de forma direta, com números/tabelas em markdown quando útil. Nada de SQL na resposta final.
- Se a pergunta for ambígua, pergunte antes de consultar.
`.trim();

export const askAiiliana = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AskInput.parse(d))
  .handler(async ({ data }) => {
    const { requireUnlockedSession } = await import("@/lib/gate.server");
    await requireUnlockedSession();
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { generateText, tool, stepCountIs } = await import("ai");
    const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const provider = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: {
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
    });

    const runSql = tool({
      description:
        "Executa uma consulta SELECT (ou WITH) somente-leitura no banco e retorna as linhas como JSON. Use isso para responder qualquer pergunta sobre dados.",
      parameters: z.object({
        sql: z.string().describe("Consulta SQL Postgres (apenas SELECT/WITH, sem ponto-e-vírgula extra)."),
      }),
      execute: async ({ sql }) => {
        const { data: rows, error } = await supabaseAdmin.rpc("aiiliana_run_sql", { sql });
        if (error) return { error: error.message };
        const arr = Array.isArray(rows) ? rows : [];
        // Trim payload
        const truncated = arr.length > 200 ? arr.slice(0, 200) : arr;
        return { rows: truncated, total: arr.length, truncated: arr.length > truncated.length };
      },
    });

    const result = await generateText({
      model: provider("openai/gpt-5.5"),
      system: SCHEMA_CONTEXT,
      messages: data.messages,
      tools: { run_sql: runSql },
      stopWhen: stepCountIs(8),
    });

    return { text: result.text };
  });
