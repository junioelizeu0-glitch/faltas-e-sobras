## Correções nos gráficos das abas Transportadoras e Conferentes

**Arquivo alterado:** `src/components/Dashboard.tsx`

### 1. `ChartCard` (container dos gráficos)
- Trocar `h-[320px] overflow-hidden` por `min-h-[320px]` e remover `overflow-hidden`, permitindo que o card cresça conforme o conteúdo (necessário para o gráfico de Conferentes, que é vertical e dinâmico).

### 2. Top 5 Transportadoras — Volume (BarChart)
- Aumentar `margin.bottom` do BarChart para ~70px.
- No `XAxis`: adicionar `interval={0}`, `angle={-25}`, `textAnchor="end"`, `height={80}`, `tick={{ fontSize: 11 }}` para garantir que os nomes apareçam sem cortar.

### 3. Top 5 Transportadoras — Taxa de Aprovação x Recusa
- Mesmos ajustes do item 2 (margin + XAxis com rotação e height).

### 4. Gráfico de Conferentes (barra vertical, "Chamados por Conferente")
- Com o `ChartCard` liberando altura, o `chartHeight` dinâmico existente passa a renderizar todos os itens sem corte.
- Garantir que o `ResponsiveContainer` desse gráfico use a altura dinâmica (não fixa em 320) para acompanhar o número de conferentes.

### Escopo
- Apenas ajustes de apresentação (layout/eixos). Nenhuma mudança em dados, cálculos ou server functions.

### Validação
- `bun run build:dev`.
- Playwright screenshots das abas Transportadoras e Conferentes em viewport pequeno (~680px, igual ao atual do usuário) e desktop, confirmando que rótulos aparecem completos e nenhum gráfico é cortado.
