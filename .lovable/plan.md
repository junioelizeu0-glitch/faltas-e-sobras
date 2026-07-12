## Mudanças solicitadas

### 1. Popup de erro no login
Hoje o `/unlock` mostra o erro em texto no card. Trocar por um dialog/alert modal (shadcn `AlertDialog`) quando as credenciais falharem ou a API retornar erro.

### 2. Tela inicial em branco após login
Hoje `/` redireciona (após unlock) direto ao Dashboard (Relatório). Vamos:
- Criar rota `/` como página em branco com apenas título "Bem-vindo" (ou logo Constance).
- Mover o Dashboard atual para `/relatorio` (o menu já aponta para o submenu "relatorio").
- Ajustar `AppShell` para não abrir automaticamente nenhum submenu.

### 3. Novo Chamado com abas: Cadastro / Referências / Etapas
O formulário `NovoChamadoForm` vira uma tela com 3 abas (`Tabs` shadcn):

**Aba 1 — Cadastro**
Campos atuais do chamado (Loja, NF, Data Abertura, Valor, Status, Transportadora, Conferente, Motivo, etc).

**Aba 2 — Referências** (1..N por chamado)
Lista editável com botão "Adicionar referência". Cada linha:
- Referência (código)
- Cor
- Tamanho
- Fornecedor

Validação: mínimo 1 referência para salvar.

**Aba 3 — Etapas** (fluxo de tarefas)
Lista de etapas do chamado. Cada linha:
- Tarefa (select alimentado por `tarefas_catalogo` filtrado pelo tipo do chamado — FALTA/SOBRA)
- Data de início
- Data de finalização (opcional)
- Dias úteis previstos (auto da tarefa cadastrada)
- Dias úteis reais (calculado quando finalizada)
- SLA (Dentro / Fora) calculado

Ao criar o chamado, a primeira etapa "Aguardando monitoramento" é inserida automaticamente com data de início = hoje.

### 4. Cadastro de Tarefas (novo)
Nova rota `/tarefas` (submenu "Cadastros" → "Tarefas") com CRUD simples:
- Nome da tarefa
- Dias úteis (SLA)
- Aplica em: FALTA / SOBRA / AMBOS (checkboxes)
- Ativo (bool)

Quando o usuário seleciona a tarefa na aba Etapas do chamado, o sistema filtra pelo tipo do chamado aberto.

---

## Mudanças no banco (Lovable Cloud)

Nova migration com 3 tabelas:

**`tarefas_catalogo`**
- `id uuid pk`
- `nome text not null`
- `dias_uteis int not null`
- `aplica_faltas bool default false`
- `aplica_sobras bool default false`
- `ativo bool default true`
- timestamps

**`chamados_referencias`**
- `id uuid pk`
- `chamado_id uuid fk → chamados_faltas(id) on delete cascade`
- `referencia text`
- `cor text`
- `tamanho text`
- `fornecedor text`
- timestamps

**`chamados_etapas`**
- `id uuid pk`
- `chamado_id uuid fk → chamados_faltas(id) on delete cascade`
- `tarefa_id uuid fk → tarefas_catalogo(id)`
- `nome_tarefa text` (snapshot)
- `dias_uteis_previsto int`
- `dt_inicio date`
- `dt_fim date null`
- `dias_uteis_real int null`
- `sla_status text null` (Dentro/Fora)
- `ordem int`
- timestamps

Todas com RLS fechada (só service_role) — segue o padrão gate atual.
Adicionar tabelas ao visualizador `/admin/tabelas`.

---

## Server functions

Em `src/lib/chamados.functions.ts` (novo):
- `createChamadoCompleto({ chamado, referencias[], etapas[] })` — transação: insere chamado, referências e etapas. Cria etapa "Aguardando monitoramento" default.
- `listTarefas({ tipo })` — retorna catálogo filtrado.
- `createTarefa`, `updateTarefa`, `deleteTarefa`.
- `addReferencia`, `removeReferencia` (para edição futura).
- `updateEtapa` — recalcula SLA ao preencher `dt_fim`.

Utilitário de dias úteis reaproveitado do form atual.

---

## Sugestão / observações

1. **Snapshot do nome da tarefa** em `chamados_etapas.nome_tarefa` para não perder histórico se você editar/excluir uma tarefa do catálogo.
2. **Não replicar referências/etapas na planilha Apps Script** — o dual-write hoje só cobre a linha do chamado. Referências e etapas ficam só no banco (a planilha não tem essas colunas). Confirme se está ok.
3. **Etapas pré-cadastradas**: já criar no seed as tarefas comuns (Aguardando monitoramento, Em análise transportadora, Aguardando aprovação, Aprovado/Pago, etc.) — me confirme a lista ou deixo genérica pra você editar depois.
4. **Ordem das etapas**: o sistema respeita ordem de inserção (`ordem` incremental). Você pode arrastar/reordenar depois se quiser (fica pra próxima iteração).

---

## Ordem de execução

1. Migration (3 tabelas + grants + RLS fechada).
2. `chamados.functions.ts` + `tarefas.functions.ts`.
3. Refatorar `NovoChamadoForm` para abas.
4. Nova rota `/tarefas` (cadastro).
5. Nova rota `/relatorio` (dashboard) + `/` em branco.
6. Popup de erro no `/unlock`.
7. Ajustar `AppShell` (menu Cadastros → Tarefas; sem submenu default).
8. Atualizar `/admin/tabelas` com novas tabelas.

Confirma que posso seguir? Se quiser mudar algo (ex.: campos das tabelas, seed das tarefas, se quer replicar referências na planilha), me avisa antes.
