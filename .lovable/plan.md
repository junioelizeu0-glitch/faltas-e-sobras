
Vou implementar tudo em fases para você conseguir validar aos poucos. Antes de começar, dois pontos que preciso te confirmar (já ajusto conforme sua resposta):

### Decisões que preciso confirmar

1. **Reuso de tabelas já existentes no banco.** Você pediu "não reaproveite tabelas existentes a menos que eu confirme". Só que já existem, criadas para este mesmo projeto, três tabelas que casam 100% com o que você descreveu:
   - `tarefas_catalogo` → o "Cadastro de Tarefas/Etapas" (nome, dias_uteis, aplica_faltas/sobras)
   - `chamados_referencias` → linhas da aba Referências (chamado_id, referencia, cor, tamanho, fornecedor)
   - `chamados_etapas` → linhas da aba Etapas (chamado_id, nome_tarefa, dias_uteis_previsto, dt_inicio, dt_fim, dias_uteis_real, sla_status)
   
   Minha recomendação é **reusar essas três** (só adicionando `descricao` e `quantidade` em `chamados_referencias`) e **criar novas** para o resto (`produtos`, `transportadoras`, `conferentes`, `motivos`). Se preferir tabelas totalmente novas, me diga e crio zeradas.

2. **Cadastro de Tarefas.** Você mencionou "SLA padrão em dias úteis" só. A tabela `tarefas_catalogo` já tem também os flags `aplica_faltas` e `aplica_sobras` (para filtrar quais tarefas aparecem por tipo de chamado). Mantenho esses flags no cadastro? (Recomendo manter — é útil pra quando entrar Sobras.)

### Fases da implementação

**Fase 1 — Banco (nesta primeira mensagem)**
- `produtos` (referencia, cor, descricao, nome_parceiro; UNIQUE em referencia+cor) + índices de busca
- `transportadoras`, `conferentes`, `motivos` (só id + nome único)
- Adiciona `descricao` e `quantidade` em `chamados_referencias`
- RLS liberado sob o gate de senha (padrão do projeto)
- Import da sua planilha `base_produto.xlsx` (12.633 linhas) via `INSERT` em lotes, aplicando `ON CONFLICT (referencia, cor) DO UPDATE`

**Fase 2 — Cadastros mestres e menu**
- Novo grupo "Cadastros" no menu lateral: Produtos, Tarefas/Etapas, Transportadoras, Conferentes, Motivos
- Tela genérica de CRUD reaproveitada para transportadora/conferente/motivo (só nome)
- Tela de Tarefas: nome + SLA (dias úteis) + flags Faltas/Sobras
- Tela de Produtos: tabela com busca (referência/cor/descrição/fornecedor), edição inline, exclusão, **import .xlsx/.csv** (upsert por ref+cor), **export .xlsx**

**Fase 3 — Chamado em 3 abas**
- Refatorar `NovoChamadoForm` para 3 abas: **Cadastro / Referências / Etapas**
- **Cadastro**: Transportadora, Conferente, Motivo passam a puxar das tabelas mestras (combobox — digita ou seleciona)
  - Campo "Situação (tarefa atual)" vira **read-only, calculado**: mostra a primeira etapa sem `dt_fim` (ou "Finalizado" se todas estão concluídas)
- **Referências**: linhas com Ref → busca em `produtos` (autocomplete), ao escolher preenche Cor/Descrição/Fornecedor automaticamente; Tamanho e Quantidade manuais; botão + para adicionar linha, lixeira para remover
- **Etapas**: linhas com Nome (select puxa de `tarefas_catalogo` → traz SLA padrão), Data início, **Data prevista (auto = início + SLA em dias úteis)**, Data finalizado (manual), **Dias úteis gastos (auto)**, badge dentro do prazo / no limite / atrasado
- Salvar grava chamado + referências + etapas em uma transação lógica (chama `createChamadoCompleto`, que já existe e vou estender)

**Fase 4 — Consulta e Editar**
- Modal de edição do `ConsultaChamados` também vira 3 abas (mesmo formulário)
- Coluna "Tarefa Atual" na consulta passa a refletir a etapa em aberto

**Fase 5 — Utilitário de dias úteis**
- Já existe `isDiaUtil` e `diasUteisEntre` espalhados em 2 arquivos. Consolido em `src/lib/business-days.ts` e adiciono `addBusinessDays(date, n)` para calcular data prevista.

### Nota técnica
- 12.633 produtos: rodo o import em batches de ~500 por INSERT para não estourar limite de payload.
- A autopreenchimento de referência usa server function com `ilike` + limit(20) — leve.

Posso rodar direto a **Fase 1** (migration + import da planilha) já nessa aprovação? Depois sigo pra Fase 2/3/4 em mensagens subsequentes sem pausar.
