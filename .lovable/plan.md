Objetivo: substituir o template atual pelo dashboard **Faltas e Sobras**, mantendo a integração real com a Google Apps Script e replicando todas as abas existentes (Geral, Operação, Financeiro, Transportadoras, Conferentes).

Escopo da migração:
- O repositório enviado é Next.js; a stack do Lovable é TanStack Start + Tailwind v4 + shadcn.
- Toda a lógica de dados, componentes e estilos serão movidos para a estrutura do Lovable.
- A chamada à Google Apps Script sairá do browser e passará por uma `createServerFn` segura no servidor.

Etapas:

1. Dependências
   - Instalar `recharts`, `lucide-react`, `html-to-image`, `clsx`, `tailwind-merge` (caso ainda não estejam).
   - Verificar se `class-variance-authority` já está disponível.

2. Design system
   - Atualizar `src/styles.css` com tokens semânticos no tema atual (slate/blue/emerald/rose/amber) para manter a aparência do dashboard.
   - Garantir que nenhuma cor seja hardcoded em classes novas; criar tokens quando necessário.

3. Backend seguro para dados
   - Criar `src/lib/dashboard.functions.ts` com `createServerFn` que busca `https://script.google.com/macros/s/AKfycbxIm2ANZSX22T9_tM3vAlfEd_F-GRHHMj_8dQo4n6uKk4WDno91GzmCSAbfj20tceJN/exec` no servidor.
   - Retornar o array `CONTROLE CHAMADOS (FALTAS)` como DTO plano.

4. Lógica de dados
   - Migrar `lib/data-processing.ts` para `src/lib/data-processing.ts`, mantendo parse de datas BR, filtros, KPIs, agregações mensais, SLA, rankings e opções de filtro.
   - Adaptar o hook `useDashboardData` para chamar a server function via `useServerFn` dentro de `useQuery` (ou carregar via loader).

5. Componentes
   - Migrar `components/AppShell.tsx` → `src/components/AppShell.tsx` (menu lateral colapsável com logo, grupos Faltas/Sobras/Recall/Gato).
   - Migrar `components/DrillDownModal.tsx` → `src/components/DrillDownModal.tsx` (modal de detalhamento com busca, ordenação, paginação e exportação CSV).
   - Criar componente principal `src/components/Dashboard.tsx` com todas as abas: Visão Executiva, Operação, Financeiro, Transportadoras e Conferentes.

6. Rota principal
   - Substituir `src/routes/index.tsx` pelo dashboard, com `head()` contendo título, descrição e metadados para "Faltas e Sobras".
   - Usar `createServerFn` via loader para pré-carregar dados (opcional) ou carregar no componente com `useQuery` + `useServerFn`.

7. Ajustes de compatibilidade
   - Remover referências a `next/image` e `Image` do Next.js; usar `<img>` com referências diretas ao logo.
   - Remover `'use client'` e ajustar para componentes React normais.
   - Garantir que exportações PNG via `html-to-image` funcionem no browser.

8. Verificação
   - Rodar build/typecheck para garantir que todos os imports resolvem.
   - Verificar visualmente o preview (KPIs, abas, filtros, modal de detalhamento).

Observações:
- A URL da Google Apps Script está hardcoded no código original; manteremos ela como configuração pública (não é um segredo do usuário).
- As abas "Novo Chamado" e "Consulta" permanecem "Em construção", como no original.
- Não usaremos Supabase/Lovable Cloud a princípio, pois os dados vêm da planilha. Se o usuário quiser persistência depois, adicionamos Cloud.