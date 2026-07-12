 




import React, { useState, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, AreaChart, Area, LabelList
} from 'recharts';
import {
  Filter, Brain, Calendar, MapPin, Truck, Users, Activity, FileText, 
  AlertTriangle, Clock, CheckCircle2, XCircle, DollarSign, DownloadCloud, 
  ChevronDown, LayoutDashboard, Settings, History, Store, UserCheck, UserX, Target, AlertCircle, Banknote, ListTodo, PackageX, Search, Loader2, RefreshCcw, MoreVertical, Download,
  Plus, BarChart2, LayoutGrid, Menu, ChevronLeft, Package
} from 'lucide-react';
import { useDashboardData, isValidField, getTarefaAtual, isSemRetorno, parseDataBR, getBusinessDays } from '@/lib/data-processing';

import DrillDownModal from '@/components/DrillDownModal';
import AppShell from '@/components/AppShell';
import { toPng } from 'html-to-image';

// --- MOCK DATA ---
const evolucaoMensal = [
  { name: 'Jan', abertos: 420, aprovados: 180, recusados: 200, pendentes: 40, valAberto: 70000, valAprovado: 35000, valPago: 30000, valPendente: 5000, valRecusado: 25000, valPendenteAnalise: 10000 },
  { name: 'Fev', abertos: 450, aprovados: 200, recusados: 210, pendentes: 40, valAberto: 80000, valAprovado: 42000, valPago: 38000, valPendente: 4000, valRecusado: 28000, valPendenteAnalise: 10000 },
  { name: 'Mar', abertos: 380, aprovados: 160, recusados: 190, pendentes: 30, valAberto: 60000, valAprovado: 31000, valPago: 29000, valPendente: 2000, valRecusado: 20000, valPendenteAnalise: 9000 },
  { name: 'Abr', abertos: 520, aprovados: 240, recusados: 220, pendentes: 60, valAberto: 90000, valAprovado: 48000, valPago: 40000, valPendente: 8000, valRecusado: 30000, valPendenteAnalise: 12000 },
  { name: 'Mai', abertos: 610, aprovados: 280, recusados: 250, pendentes: 80, valAberto: 105000, valAprovado: 55000, valPago: 42000, valPendente: 13000, valRecusado: 35000, valPendenteAnalise: 15000 },
  { name: 'Jun', abertos: 580, aprovados: 260, recusados: 230, pendentes: 90, valAberto: 95000, valAprovado: 51000, valPago: 30000, valPendente: 21000, valRecusado: 32000, valPendenteAnalise: 12000 },
];

const backlogEtapas = [
  { name: 'Ag. Monitoramento', qtd: 45 },
  { name: 'Ag. NF Espelho', qtd: 28 },
  { name: 'Validação Fiscal', qtd: 15 },
  { name: 'Ag. NF Definitiva', qtd: 32 },
  { name: 'Importação Fiscal', qtd: 12 },
  { name: 'Pendente Financeiro', qtd: 85 },
];

const origemPagamentosData = [
  { name: 'Março', jan: 10000, fev: 5000, mar: 14000 },
  { name: 'Abril', jan: 2000, fev: 8000, mar: 12000, abr: 18000 },
  { name: 'Maio', fev: 1000, mar: 5000, abr: 15000, mai: 21000 },
  { name: 'Junho', mar: 2000, abr: 6000, mai: 10000, jun: 12000 },
];

const agingData = [
  { name: '0 a 30 dias', qtd: 145 },
  { name: '31 a 60 dias', qtd: 85 },
  { name: '61 a 90 dias', qtd: 42 },
  { name: '91 a 180 dias', qtd: 18 },
  { name: '> 180 dias', qtd: 7 },
];

const slaData = [
  { name: 'No Prazo', value: 78, color: '#10b981' },
  { name: 'Em Risco', value: 12, color: '#f59e0b' },
  { name: 'Atrasado', value: 10, color: '#f43f5e' },
];

const topTranspData = [
  { name: 'Metta Brasil', ocorrencias: 145, recusados: 85, aprovados: 60, taxaRecusa: 58 },
  { name: 'Ampla SLJ', ocorrencias: 120, recusados: 50, aprovados: 70, taxaRecusa: 41 },
  { name: 'Expresso Rio', ocorrencias: 95, recusados: 65, aprovados: 30, taxaRecusa: 68 },
  { name: 'Movvi', ocorrencias: 88, recusados: 40, aprovados: 48, taxaRecusa: 45 },
  { name: 'Rapido Pan.', ocorrencias: 62, recusados: 22, aprovados: 40, taxaRecusa: 35 },
];

const topConferentesData = [
  { name: 'Maria Hora', analisados: 450, aprovados: 210, recusados: 240, score: 96 },
  { name: 'Melyssa', analisados: 410, aprovados: 190, recusados: 220, score: 92 },
  { name: 'Yendielly', analisados: 380, aprovados: 160, recusados: 220, score: 88 },
  { name: 'Alexandra', analisados: 320, aprovados: 180, recusados: 140, score: 85 },
  { name: 'Ester Cout.', analisados: 290, aprovados: 120, recusados: 170, score: 81 },
];

const lojasData = [
  { name: 'Loja Paulista', chamados: 112, valAprovado: 12500, valPago: 10000 },
  { name: 'Loja Morumbi', chamados: 98, valAprovado: 9800, valPago: 8000 },
  { name: 'Loja Ibirapuera', chamados: 85, valAprovado: 8500, valPago: 6000 },
  { name: 'Loja Berrini', chamados: 74, valAprovado: 7200, valPago: 7200 },
  { name: 'Loja Tatuapé', chamados: 65, valAprovado: 5400, valPago: 4000 },
];

const cdsData = [
  { name: 'CD ES', valAprovado: 45000, valPago: 32000, pendente: 13000 },
  { name: 'CD PB', valAprovado: 22000, valPago: 18000, pendente: 4000 },
  { name: 'CD MG', valAprovado: 18000, valPago: 15000, pendente: 3000 },
  { name: 'CD SP', valAprovado: 15000, valPago: 12000, pendente: 3000 },
  { name: 'CD RJ', valAprovado: 9000,  valPago: 5000,  pendente: 4000 },
];

// --- COMPONENTS BASE ---
const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
const formatCurrencyCompact = (val: number) => {
  const absVal = Math.abs(val);
  if (absVal >= 1000000) return `R$ ${(val / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} mi`;
  if (absVal >= 1000) return `R$ ${(val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} mil`;
  return formatCurrency(val);
};

const formatNum = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

const getDynamicCeiling = (data: any[], key: string, fallback: number = 10) => {
  if (!data || !data.length) return fallback;
  const values = data
    .map(item => Number(item[key]))
    .filter(val => Number.isFinite(val));
  if (!values.length) return fallback;
  const maxVal = Math.max(...values);
  return Math.ceil(maxVal * 1.2) || fallback;
};

const getDynamicCeilingMulti = (data: any[], keys: string[], fallback: number = 10) => {
  if (!data || !data.length) return fallback;
  const values: number[] = [];
  data.forEach(item => {
    keys.forEach(k => {
      const val = Number(item[k]);
      if (Number.isFinite(val)) {
        values.push(val);
      }
    });
  });
  if (!values.length) return fallback;
  const maxVal = Math.max(...values);
  return Math.ceil(maxVal * 1.2) || fallback;
};

const getDynamicCeilingStacked = (data: any[], keys: string[], fallback: number = 10) => {
  if (!data || !data.length) return fallback;
  const values = data.map(item => {
    let sum = 0;
    keys.forEach(k => {
      const val = Number(item[k]);
      if (Number.isFinite(val)) {
        sum += val;
      }
    });
    return sum;
  });
  const maxVal = Math.max(...values);
  return Math.ceil(maxVal * 1.2) || fallback;
};

const KpiCard = ({ title, value, subtitle, icon: Icon, colorClass = "blue", onClick, disableTruncate }: any) => {
  const colorMap: Record<string, string> = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    rose: "text-rose-600 bg-rose-50 border-rose-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    slate: "text-slate-600 bg-slate-50 border-slate-200",
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
  };

  const valSizeClass = String(value).length > 6 ? 'text-base sm:text-lg' : 'text-lg sm:text-xl';

  return (
    <div onClick={onClick} className={`bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all h-full min-h-[120px] w-full overflow-visible relative ${onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : ''}`} title={`${title} - ${subtitle} (${value})`}>
      <div className="flex justify-between items-start mb-2 gap-2 w-full min-w-0">
        <h3 className="text-[10px] sm:text-xs uppercase font-semibold text-slate-500 tracking-wide leading-tight break-words flex-1 min-w-0 pr-1">{title}</h3>
        {Icon && (
          <div className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg flex-shrink-0 ${colorMap[colorClass] || colorMap.blue}`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          </div>
        )}
      </div>
      <div className="min-w-0 w-full mt-auto">
        <div className={`${valSizeClass} font-bold text-slate-800 leading-tight break-words`}>{value}</div>
        <div className="text-[10px] sm:text-xs text-slate-400 font-medium mt-1 leading-snug break-words">{subtitle}</div>
      </div>
    </div>
  );
};

const ChartCard = ({ title, children, span = 1, desc, onClick }: any) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const generateImageFromNode = async (originalNode: HTMLDivElement, filename: string) => {
    // 1. Criar cópia temporária
    const clone = originalNode.cloneNode(true) as HTMLDivElement;
    
    // Anexar no DOM oculto
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    // Garantir que não afeta o layout da página
    container.style.width = `${originalNode.offsetWidth}px`;
    container.style.height = `${originalNode.offsetHeight}px`;
    document.body.appendChild(container);
    container.appendChild(clone);
    
    // 2. Converter cores para rgb (resolvendo problemas com oklch)
    const origEls = [originalNode, ...Array.from(originalNode.querySelectorAll('*'))] as HTMLElement[];
    const cloneEls = [clone, ...Array.from(clone.querySelectorAll('*'))] as HTMLElement[];
    
    for (let i = 0; i < origEls.length; i++) {
        const o = origEls[i];
        const c = cloneEls[i];
        const computed = window.getComputedStyle(o);
        
        // Ocultar elementos com data-html2canvas-ignore (ex: menus dropdown)
        if (o.hasAttribute('data-html2canvas-ignore')) {
            c.style.display = 'none';
        }
        
        // Atribuir inline styles para converter variaveis e oklch para rgb real resolvido no browser
        c.style.color = computed.color;
        c.style.backgroundColor = computed.backgroundColor;
        c.style.borderColor = computed.borderColor;
        c.style.fill = computed.fill;
        c.style.stroke = computed.stroke;
    }
    
    try {
       
      const dataUrl = await toPng(clone, { 
          cacheBust: true, 
          backgroundColor: '#f8fafc', 
          pixelRatio: 2,
          style: { transform: 'scale(1)', transformOrigin: 'top left' }
      });
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Erro na exportação", err);
    } finally {
      // 3. Remover cópia temporária
      document.body.removeChild(container);
    }
  };

  const handleExport = async (e: any) => {
    e.stopPropagation();
    if (!cardRef.current) return;
    await generateImageFromNode(cardRef.current, `grafico-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`);
  };

  return (
    <div ref={cardRef} className={`bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col ${onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-md transition-all' : ''} ${span === 1 ? 'col-span-1' : span === 2 ? 'col-span-1 lg:col-span-2' : span === 3 ? 'col-span-1 lg:col-span-3' : ''}`}>
      <div className="mb-5 flex justify-between items-start relative">
        <div onClick={onClick}>
          <h3 className="text-[15px] font-semibold text-slate-800">{title}</h3>
          {desc && <p className="text-[13px] text-slate-500 mt-1">{desc}</p>}
        </div>
        <div className="relative">
          <button data-html2canvas-ignore onClick={handleExport} title="Baixar Gráfico (PNG)" className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div onClick={onClick} className="w-full min-h-[320px] relative">
        {children}
      </div>
    </div>
  );
};

const AgingTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
     let desc = "";
     if(label === '0-10 dias') desc = "Chamados abertos há até 10 dias.";
     else if(label === '11-20 dias') desc = "Chamados abertos entre 11 e 20 dias.";
     else if(label === '21-30 dias') desc = "Chamados abertos entre 21 e 30 dias.";
     else desc = "Chamados críticos com mais de 30 dias em aberto.";

     return (
        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-xl text-xs">
          <p className="font-bold text-slate-800 mb-1">{label}</p>
          <p className="text-amber-600 mb-2 font-medium">{desc}</p>
          <p className="text-slate-600">Qtd Chamados: <span className="font-bold text-slate-900">{payload[0].value}</span></p>
        </div>
     );
  }
  return null;
};

const CustomCDTick = ({ x, y, payload, data }: any) => {
  const cdData = (data || []).find((d:any) => d.name === payload.value);
  if(!cdData) return null;
  return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={-10} dy={0} textAnchor="end" fill="#475569" fontSize={11} fontWeight="bold">{payload.value}</text>
        <text x={0} y={4} dy={0} textAnchor="end" fill="#64748b" fontSize={10}>{formatCurrencyCompact(cdData.valAprovado)}</text>
        <text x={0} y={18} dy={0} textAnchor="end" fill="#94a3b8" fontSize={9}>{cdData.aprovados || cdData.chamados || 0} chamados</text>
      </g>
  );
};

const CustomLojaTick = ({ x, y, payload, data }: any) => {
  const lojaData = (data || []).find((d:any) => d.name === payload.value);
  if(!lojaData) return null;
  return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={-10} dy={0} textAnchor="end" fill="#475569" fontSize={11} fontWeight="bold">{payload.value}</text>
        <text x={0} y={4} dy={0} textAnchor="end" fill="#64748b" fontSize={10}>{formatCurrencyCompact(lojaData.valAprovado)}</text>
        <text x={0} y={18} dy={0} textAnchor="end" fill="#94a3b8" fontSize={9}>{lojaData.chamados || 0} chamados</text>
      </g>
  );
};

// --- TAB SUB-COMPONENTS ---

const CustomEvolucaoTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const taxaPagamento = data.valAprovado ? ((data.valPago / data.valAprovado) * 100).toFixed(0) : 0;

    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-xs font-sans">
        <p className="font-semibold text-slate-800 mb-2 border-b border-slate-100 pb-1">Mês: {label}</p>
        <p className="text-emerald-600 mb-1 font-medium">✓ Valor Aprovado: {formatCurrency(data.valAprovado || 0)}</p>
        <p className="text-blue-600 mb-1">✓ Valor Pago: {formatCurrency(data.valPago || 0)}</p>
        <p className="text-amber-500 mb-2 border-b border-slate-100 pb-2">✓ Valor Pendente: {formatCurrency(data.valPendente || 0)}</p>
        <p className="text-slate-600 font-semibold">Taxa de Pagamento: {taxaPagamento}%</p>
      </div>
    );
  }
  return null;
};

const formatShortValueNoSpace = (val: number) => {
  const absVal = Math.abs(val);
  if (absVal === 0) return 'R$0';
  if (absVal >= 1000000) {
    const num = val / 1000000;
    const formatted = num % 1 === 0 ? num.toFixed(0) : num.toFixed(1).replace('.', ',');
    return `R$${formatted}M`;
  }
  if (absVal >= 1000) {
    const num = val / 1000;
    const formatted = num % 1 === 0 ? num.toFixed(0) : num.toFixed(1).replace('.', ',');
    return `R$${formatted}k`;
  }
  return `R$${val}`;
};

const CustomHorizontalBarLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (value === undefined || value === null || value === 0) return null;

  const labelText = formatCurrency(value);
  const posX = x + width + 6;
  const posY = y + height / 2;

  return (
    <g>
      <text
        x={posX}
        y={posY}
        dy={4}
        fill="#334155"
        className="text-[10px] sm:text-[11px] font-bold"
        textAnchor="start"
      >
        {labelText}
      </text>
    </g>
  );
};

const formatTaxa = (valor: number, total: number): string => {
  if (total === 0) return "0,0%";
  return ((valor / total) * 100).toFixed(1).replace('.', ',') + '%';
};

const AbaVisaoExecutiva = ({ data, onOpenModal }: any) => (
  <div className="flex flex-col gap-6">
    <div id="executivo-cards-grid" className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 p-2 bg-slate-100">
      <KpiCard onClick={() => onOpenModal('TOTAL CHAMADOS')} title="Total Chamados" value={formatNum(data.kpis?.totalChamados || 0)} subtitle="Volume Geral do período" icon={FileText} colorClass="blue" />
      <KpiCard onClick={() => onOpenModal('APROVADOS')} title="Aprovados" value={formatNum(data.kpis?.aprovados || 0)} subtitle="Ressarcimentos devidos" icon={CheckCircle2} colorClass="emerald" />
      <KpiCard onClick={() => onOpenModal('RECUSADOS')} title="Recusados" value={formatNum(data.kpis?.recusados || 0)} subtitle="Improcedentes" icon={XCircle} colorClass="rose" />
      <KpiCard onClick={() => onOpenModal('PENDENTE MONITORAMENTO')} title="Pendente Monitoramento" value={formatNum(data.kpis?.pendentes || 0)} subtitle="Aguardando análise" icon={Clock} colorClass="amber" />
      <KpiCard onClick={() => onOpenModal('VALORES APROVADOS')} title="Valores Aprovados" value={formatCurrency(data.kpis?.valAprovado || 0)} subtitle="Acumulado" icon={Banknote} colorClass="indigo" />
      <KpiCard onClick={() => onOpenModal('VALORES PAGOS')} title="Valores Pagos" value={formatCurrency(data.kpis?.valPago || 0)} subtitle="Quitados" icon={CheckCircle2} colorClass="emerald" />
      <KpiCard onClick={() => onOpenModal('VALOR PENDENTE')} title="Valor Pendente" value={formatCurrency(data.kpis?.valPendente || 0)} subtitle="Aguardando fin." icon={AlertCircle} colorClass="amber" />
      <KpiCard title="Taxa Aprovação" value={formatTaxa(data.kpis?.aprovados || 0, data.kpis?.totalChamados || 0)} subtitle="Efetividade (%)" icon={Activity} colorClass="indigo" />
      <KpiCard title="Taxa Recusa" value={formatTaxa(data.kpis?.recusados || 0, data.kpis?.totalChamados || 0)} subtitle="Improcedentes (%)" icon={XCircle} colorClass="rose" />
      <KpiCard title="SLA Cumprido" value={`${data.kpis?.slaCumprido || 0}%`} subtitle="Chamados no prazo" icon={CheckCircle2} colorClass="emerald" />
      <KpiCard title="Ticket Médio" value={formatCurrency(data.kpis?.ticketMedio || 0)} subtitle="Por chamado aprovado" icon={Target} colorClass="slate" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      <ChartCard title="Evolução Mensal de Valores" span={2} desc="Valores em R$ (Aprovados, Pagos e Pendentes)">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            layout="vertical"
            data={(data.charts?.evolucaoMensal || evolucaoMensal).slice(-3)}
            barCategoryGap="35%"
            barGap={3}
            margin={{ top: 15, right: 105, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis
              type="number"
              tickFormatter={formatShortValueNoSpace}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <YAxis
              dataKey="name"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
              width={55}
            />
            <Tooltip content={<CustomEvolucaoTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.4 }} />
            <Legend
              iconType="square"
              iconSize={10}
              align="center"
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }}
            />
            <Bar
              dataKey="valAprovado"
              name="Valor Aprovado"
              fill="#1baf7a"
              radius={[0, 4, 4, 0]}
              barSize={12}
            >
              <LabelList dataKey="valAprovado" content={<CustomHorizontalBarLabel />} />
            </Bar>
            <Bar
              dataKey="valPago"
              name="Valor Pago"
              fill="#2a78d6"
              radius={[0, 4, 4, 0]}
              barSize={12}
            >
              <LabelList dataKey="valPago" content={<CustomHorizontalBarLabel />} />
            </Bar>
            <Bar
              dataKey="valPendente"
              name="Valor Pendente Pag."
              fill="#eda100"
              radius={[0, 4, 4, 0]}
              barSize={12}
            >
              <LabelList dataKey="valPendente" content={<CustomHorizontalBarLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Comparativo SLA (Prazo de 60 dias úteis)">
        <div className="flex items-center gap-4 mb-2 text-xs justify-between w-full px-2">
          <div className="flex gap-4">
             <div className="flex flex-col bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
               <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total de Chamados</span>
               <span className="font-bold text-slate-700">{formatNum(data.kpis?.totalChamados || 0)}</span>
             </div>
             <div className="flex flex-col bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
               <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Pagos</span>
               <span className="font-bold text-slate-700">{formatNum(data.kpis?.totalPagosQtd || 0)}</span>
             </div>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#10b981] inline-block" />
              <span className="font-semibold text-[#898781]">No Prazo (Qtd)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#f43f5e] inline-block" />
              <span className="font-semibold text-[#898781]">Fora do Prazo (Qtd)</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart layout="vertical" data={data.charts?.slaComparativoData || data.kpis?.slaComparativoData || []} margin={{ top: 0, right: 50, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569', fontWeight: 'bold' }} width={110} />
            <Tooltip cursor={{ fill: '#f1f5f9' }} />
            <Bar dataKey="No Prazo" stackId="a" fill="#10b981" barSize={30} />
            <Bar dataKey="Fora do Prazo" stackId="a" fill="#f43f5e" barSize={30} radius={[0, 4, 4, 0]}>
              <LabelList dataKey="Total" position="right" fill="#64748b" fontSize={11} formatter={(val: any) => `Total: ${val}`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <ChartCard title="Taxa de Aprovação por CD" desc="Aprovados / Abertos (%)">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart layout="vertical" onClick={(e: any) => { if(e && e.activeLabel) onOpenModal(`TAXA APROVAÇÃO CD - ${e.activeLabel}`) }} data={data.charts?.taxaAprovacaoCdData?.slice(0,10) || []} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" hide domain={[0, 100]} />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569' }} width={120} />
            <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: any) => `${val}%`} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
            <Bar dataKey="taxaAprovacao" name="Aprovação (%)" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} minPointSize={2} label={{ position: 'right', fontSize: 10, fill: '#64748b', formatter: (val: any) => `${val || 0}%` }} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Aging Geral (Aprovados Pendentes)">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart onClick={(e: any) => { if (e && e.activeLabel) onOpenModal(`AGING - ${e.activeLabel}`) }} data={data.charts?.agingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} style={{ cursor: 'pointer' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
            <Tooltip content={<AgingTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
            <Bar dataKey="qtd" name="Qtd Chamados" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} label={{ position: 'top', fontSize: 10, fill: '#64748b' }} style={{ cursor: 'pointer' }} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>

    <div className="grid grid-cols-1 gap-6 mt-6">
      <ChartCard title="Valores: Top Lojas" desc="Lojas com maior passivo aprovado">
        <ResponsiveContainer width="100%" height={320}>
           <BarChart layout="vertical" data={data.charts?.lojasData || []} margin={{ top: 0, right: 90, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569' }} width={90} />
            <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: any) => formatCurrency(val)} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
            <Bar dataKey="valAprovado" name="Valor Aprovado" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={16} label={{ position: 'right', fontSize: 11, fill: '#64748b', formatter: (val: any) => formatCurrencyCompact(val) }} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>

    <div className="grid grid-cols-1 gap-6 mt-6">
      <ChartCard title="Detalhes: SLA do Chamado (Apenas Finalizados)">
        <div className="overflow-x-auto w-full max-h-[400px]">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Chamado</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Dt Abertura</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Dt Finalização</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">SLA (dias)</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Demorou (dias)</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Dentro do SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data.kpis?.slaChamadoList || []).map((item: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50/50 text-slate-700 transition-colors">
                  <td className="px-4 py-2.5 font-medium whitespace-nowrap">{item.chamadoId}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{item.dtAbertura}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{item.dtFinalizacao}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{item.status}</td>
                  <td className="px-4 py-2.5">{item.slaDias}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{item.diasDemorou}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${item.dentroSla === 'Sim' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {item.dentroSla}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>

    <div className="grid grid-cols-1 gap-6 mt-6">
      <ChartCard title="Detalhes: SLA de Pagamento (Apenas Pagos)">
        <div className="overflow-x-auto w-full max-h-[400px]">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Chamado</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">NF</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Dt Abertura</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Dt Pagamento</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Valor</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">SLA (dias)</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Demorou (dias)</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Dentro do SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data.kpis?.slaPagamentoList || []).map((item: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50/50 text-slate-700 transition-colors">
                  <td className="px-4 py-2.5 font-medium whitespace-nowrap">{item.chamadoId}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{item.nfe}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{item.dtAbertura}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{item.dtPagamento}</td>
                  <td className="px-4 py-2.5 font-semibold whitespace-nowrap">{formatCurrency(item.valor)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{item.status}</td>
                  <td className="px-4 py-2.5">{item.slaDias}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{item.diasDemorou}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${item.dentroSla === 'Sim' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {item.dentroSla}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  </div>
);

const CustomTooltipEtapa = ({ active, payload, totalAbertos }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const count = data.qtd;
    const percent = totalAbertos > 0 ? ((count / totalAbertos) * 100).toFixed(1) : '0.0';
    return (
      <div className="bg-white px-3 py-2 border border-slate-200 shadow-md rounded-lg text-xs">
        <p className="font-bold text-slate-700 mb-1">{data.name}</p>
        <div className="flex gap-4">
          <span className="text-slate-500">Chamados: <span className="font-medium text-blue-600">{count}</span></span>
          <span className="text-slate-500">Share: <span className="font-medium text-emerald-600">{percent}%</span></span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1 italic">Clique para detalhar chamados aprovados nesta etapa.</p>
      </div>
    );
  }
  return null;
};

const AbaOperacao = ({ data, onOpenModal }: any) => {
  const raw = data.kpis?.filteredData || [];
  
  const { 
    slaChamadoDentro = 0, slaChamadoFora = 0, 
    slaPagamentoDentro = 0, slaPagamentoFora = 0, 
    totalChamados = 0 
  } = data.kpis || {};
  
  const totalSlaChamado = slaChamadoDentro + slaChamadoFora;
  const percSlaChamado = totalSlaChamado > 0 ? Math.round((slaChamadoDentro / totalSlaChamado) * 100) : 0;
  
  const totalSlaPagamento = slaPagamentoDentro + slaPagamentoFora;
  const percSlaPagamento = totalSlaPagamento > 0 ? Math.round((slaPagamentoDentro / totalSlaPagamento) * 100) : 0;
  
  const activeChamados = raw.filter((d: any) => {
    const dtFin = String(d['Dt Finalização'] || '');
    return !dtFin.trim();
  });

  const qtdAbertos = activeChamados.length;
  
  const getDiffDays = (abertura: any) => {
     if (!abertura) return NaN;
     const aberto = parseDataBR(abertura);
     if (!aberto) return NaN;
     return Math.floor((new Date().getTime() - aberto.getTime()) / (1000 * 3600 * 24));
  };

  let oldestDays = 0;
  let totalDays = 0;
  let validDaysCount = 0;
  activeChamados.forEach((d:any) => {
      const diffDays = getDiffDays(d['Dt Abertura']);
      if(isNaN(diffDays)) return;
      if(diffDays > oldestDays) oldestDays = diffDays;
      totalDays += diffDays;
      validDaysCount++;
  });
  const avgDays = validDaysCount > 0 ? Math.round(totalDays / validDaysCount) : 0;

  const cdCount: Record<string, number> = {};
  activeChamados.forEach((d:any) => {
     const cd = d['CD'] || 'Sem CD';
     cdCount[cd] = (cdCount[cd] || 0) + 1;
  });
  const cdCriticoEntry = Object.entries(cdCount).sort((a,b) => b[1] - a[1])[0];
  const cdCritico = cdCriticoEntry ? cdCriticoEntry[0] : 'N/A';

  const etapaCount: Record<string, number> = {};
  activeChamados.forEach((d:any) => {
     const key = Object.keys(d).find(k => k.trim().toLowerCase() === 'situação' || k.trim().toLowerCase() === 'tarefa atual');
     let etapa = key ? d[key] || 'Não identificada' : 'Não identificada';
     etapaCount[etapa] = (etapaCount[etapa] || 0) + 1;
  });
  const backlogEtapasCalc = Object.entries(etapaCount)
    .map(([name, qtd]) => ({ name, qtd }))
    .sort((a, b) => b.qtd - a.qtd);
    
  const etapaCritica = backlogEtapasCalc[0]?.name || 'N/A';

  const faixas = {
     '0-7 dias': 0,
     '8-15 dias': 0,
     '16-30 dias': 0,
     '31-60 dias': 0,
     'Acima de 60 dias': 0
  };
  activeChamados.forEach((d:any) => {
     const diffDays = getDiffDays(d['Dt Abertura']);
     if(isNaN(diffDays)) return;
     if(diffDays <= 7) faixas['0-7 dias']++;
     else if(diffDays <= 15) faixas['8-15 dias']++;
     else if(diffDays <= 30) faixas['16-30 dias']++;
     else if(diffDays <= 60) faixas['31-60 dias']++;
     else faixas['Acima de 60 dias']++;
  });
  const idadeBacklog = Object.entries(faixas).map(([name, qtd]) => ({ name, qtd }));

  const handleEtapaClick = (target: any) => {
    let etapa = target;
    if (typeof target === 'object' && target !== null) {
      etapa = target.name || target.value || target.activeLabel || target.payload?.name;
    }
    if (!etapa) return;
    onOpenModal(`ETAPA - ${etapa}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <KpiCard onClick={() => onOpenModal('CHAMADOS EM ABERTO')} title="Chamados em Aberto" value={qtdAbertos} subtitle="Chamados ativos" icon={ListTodo} colorClass="blue" />
        <KpiCard title="Tempo Médio em Aberto" value={`${avgDays} dias`} subtitle="Média geral" icon={Activity} colorClass="indigo" />
        <KpiCard title="Pend. Mais Antiga" value={`${oldestDays} dias`} subtitle="Maior retenção" icon={Clock} colorClass="slate" />
        <KpiCard title="CD Crítico" value={cdCritico} subtitle="Maior backlog" icon={AlertCircle} colorClass="rose" />
        <KpiCard title="Etapa Crítica" value={etapaCritica} subtitle="Maior gargalo" icon={Settings} colorClass="amber" disableTruncate={true} />
        <KpiCard onClick={() => onOpenModal('SLA DO CHAMADO')} title="SLA DO CHAMADO" value={`${percSlaChamado}%`} subtitle={`${slaChamadoDentro} de ${totalSlaChamado} finalizados em até 60 dias úteis`} icon={CheckCircle2} colorClass="emerald" />
        <KpiCard onClick={() => onOpenModal('SLA DE PAGAMENTO')} title="SLA DE PAGAMENTO" value={`${percSlaPagamento}%`} subtitle={`${slaPagamentoDentro} de ${totalSlaPagamento} pagos em até 60 dias úteis`} icon={DollarSign} colorClass="indigo" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <ChartCard title="Backlog Operacional por Etapa">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart layout="vertical" data={backlogEtapasCalc} margin={{ top: 0, right: 30, left: 10, bottom: 0 }} onClick={(e:any) => handleEtapaClick(e)}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569' }} width={120} onClick={(val) => handleEtapaClick(val)} style={{ cursor: 'pointer' }} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} content={<CustomTooltipEtapa totalAbertos={qtdAbertos} />} />
              <Bar dataKey="qtd" name="Chamados ativos" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} onClick={(data) => handleEtapaClick(data)} style={{ cursor: 'pointer' }}>
                <LabelList dataKey="qtd" position="right" fill="#64748b" fontSize={11} formatter={(val:any) => val > 0 ? val : ''} />
                {backlogEtapasCalc.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.qtd > 50 ? '#ef4444' : entry.qtd > 30 ? '#f59e0b' : '#10b981'} className="hover:opacity-80 transition-opacity" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        
        <ChartCard title="Idade do Backlog">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart onClick={(e: any) => { if (e && e.activeLabel) onOpenModal(`IDADE BACKLOG - ${e.activeLabel}`) }} data={idadeBacklog} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
               <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} dy={10} interval={0} angle={-30} textAnchor="end" height={60} style={{ cursor: 'pointer' }} />
               <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, getDynamicCeiling(idadeBacklog, 'qtd', 10)]} />
               <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
               <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
               <Bar dataKey="qtd" name="Chamados" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} label={{ position: 'top', fontSize: 10, fill: '#64748b' }} style={{ cursor: 'pointer' }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      
    </div>
  );
};

const AbaFinanceiro = ({ data, onOpenModal, filters }: any) => {
  let rawChartData = data.charts?.origemPagamentosData || origemPagamentosData;
  if (filters && !filters.dataInicio && !filters.dataFim) {
    rawChartData = rawChartData.slice(-6);
  }

  const aggregatedMap: Record<string, number> = {};
  rawChartData.forEach((row: any) => {
     Object.keys(row).forEach(k => {
        if (k !== 'name' && k !== 'sortObj') {
           const val = Number(row[k]);
           if (Number.isFinite(val)) {
             aggregatedMap[k] = (aggregatedMap[k] || 0) + val;
           }
        }
     });
  });

  const allMonths = [
    { key: 'jan', name: 'Janeiro', color: '#0284c7' },
    { key: 'fev', name: 'Fevereiro', color: '#be123c' },
    { key: 'mar', name: 'Março', color: '#3b82f6' },
    { key: 'abr', name: 'Abril', color: '#8b5cf6' },
    { key: 'mai', name: 'Maio', color: '#10b981' },
    { key: 'jun', name: 'Junho', color: '#ec4899' },
    { key: 'jul', name: 'Julho', color: '#06b6d4' },
    { key: 'ago', name: 'Agosto', color: '#eab308' },
    { key: 'set', name: 'Setembro', color: '#84cc16' },
    { key: 'out', name: 'Outubro', color: '#6366f1' },
    { key: 'nov', name: 'Novembro', color: '#14b8a6' },
    { key: 'dez', name: 'Dezembro', color: '#d946ef' }
  ];

  const chartDataPivot = allMonths
    .filter(m => aggregatedMap[m.key] > 0)
    .map(m => ({
       name: m.name,
       valor: aggregatedMap[m.key],
       qtd: aggregatedMap[m.key + '_qtd'] || 0,
       fill: m.color
    }));

  const ceilingOrigem = getDynamicCeiling(chartDataPivot, 'valor', 10000);
  const ceilingEvolucao = getDynamicCeilingMulti(data.charts?.evolucaoMensal || evolucaoMensal, ['valAprovado', 'valPago'], 10000);

  return (
  <div className="flex flex-col gap-6">
     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <KpiCard onClick={() => onOpenModal('VALORES PAGOS')} title="Total Pago" value={formatCurrency(data.kpis?.valPago || 0)} subtitle="Quitados" icon={CheckCircle2} colorClass="emerald" />
      <KpiCard onClick={() => onOpenModal('VALORES PAGOS')} title="Chamados Pagos" value={formatNum(data.kpis?.totalPagosQtd || 0)} subtitle="Quantidade de quitados" icon={FileText} colorClass="blue" />
      <KpiCard title="Ticket Médio" value={formatCurrency(data.kpis?.ticketMedio || 0)} subtitle="Por chamado aprovado" icon={Target} colorClass="indigo" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard title="Evolução Financeira Mensal (Aprovado vs Pago)">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data.charts?.evolucaoMensal || evolucaoMensal} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAprov" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPago" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
            <YAxis tickFormatter={(val) => formatCurrencyCompact(val)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dx={-10} domain={[0, ceilingEvolucao]} />
            <Tooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
            <Area type="monotone" dataKey="valAprovado" name="Valor Aprovado" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorAprov)" />
            <Area type="monotone" dataKey="valPago" name="Valor Pago" stroke="#10b981" fillOpacity={1} fill="url(#colorPago)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Origem dos Pagamentos de acordo com Abertura (Mensal)">
         <div className="w-full h-full overflow-hidden">
         <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartDataPivot} margin={{ top: 30, right: 10, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} name="Mês de Abertura" />
            <YAxis tickFormatter={(val) => formatCurrencyCompact(val)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dx={-10} domain={[0, ceilingOrigem]} />
            <Tooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
            <Bar dataKey="valor" name="Valor Pago (Abertura no Mês)" radius={[4, 4, 0, 0]} maxBarSize={50}>
               <LabelList dataKey="qtd" position="top" fill="#64748b" fontSize={12} offset={10} formatter={(v: any) => v > 0 ? `${v}` : ''} />
               {chartDataPivot.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
               ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  </div>
  );
};

// Plugin customizado do Chart.js especificado para renderização de labels (mantido para compatibilidade e referência técnica)
const centerLabelPlugin = {
  id: 'centerLabel',
  afterDatasetsDraw(chart: any) {
    const ctx = chart.ctx;
    chart.data.datasets.forEach((dataset: any, i: number) => {
      const meta = chart.getDatasetMeta(i);
      meta.data.forEach((bar: any, index: number) => {
        const data = dataset.data[index];
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(data, bar.x, bar.y + bar.height / 2);
      });
    });
  }
};

const AbaTransportadoras = ({ mode, data, onOpenModal }: { mode: 'geral', data: any, onOpenModal?: any }) => (
  <div className="flex flex-col gap-6">
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
      <KpiCard title="Total Ocorrências" value={data.kpis?.totalChamados || 0} subtitle="No período selecionado" icon={Truck} colorClass="slate" />
      <KpiCard title="Valor Aprovado" value={formatCurrency(data.kpis?.valAprovado || 0)} subtitle="Passivo gerado" icon={CheckCircle2} colorClass="emerald" />
      <KpiCard title="Valor Recusado" value={formatCurrency(data.kpis?.valRecusado || 0)} subtitle="Economia" icon={XCircle} colorClass="rose" />
      <KpiCard title="Taxa de Recusa Média" value={formatTaxa(data.kpis?.recusados || 0, data.kpis?.totalChamados || 0)} subtitle="Geral da Transportadora (%)" icon={Activity} colorClass="amber" />
    </div>

    <div className="grid grid-cols-1 gap-6">
      <ChartCard title="Top 5 Transportadoras (Volume)">
        <div className="flex items-center gap-4 mb-2 text-xs justify-end w-full px-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#1baf7a] inline-block" />
            <span className="font-semibold text-[#898781]">Aprovados</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#e34948] inline-block" />
            <span className="font-semibold text-[#898781]">Recusados</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart onClick={(e: any) => { if(e && e.activeLabel) onOpenModal(`TRANSP - ${e.activeLabel}`) }} data={data.charts?.topTranspData || []} margin={{ top: 15, right: 10, left: -20, bottom: 60 }}>
            <CartesianGrid vertical={false} stroke="#e1e0d9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#898781' }} dy={10} interval={0} angle={-25} textAnchor="end" height={80} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#898781' }} domain={[0, getDynamicCeilingMulti(data.charts?.topTranspData || [], ['aprovados', 'recusados'], 10)]} />
            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
            <Bar dataKey="aprovados" name="Aprovados" fill="#1baf7a" radius={[4, 4, 0, 0]} maxBarSize={40}>
              <LabelList dataKey="aprovados" position="center" fill="#ffffff" style={{ fontWeight: 'bold', fontSize: 12, fontFamily: 'sans-serif' }} />
            </Bar>
            <Bar dataKey="recusados" name="Recusados" fill="#e34948" radius={[4, 4, 0, 0]} maxBarSize={40}>
              <LabelList dataKey="recusados" position="center" fill="#ffffff" style={{ fontWeight: 'bold', fontSize: 12, fontFamily: 'sans-serif' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Taxa de Aprovação x Recusa (Top 5 Transportadoras)">
         <div className="flex items-center gap-4 mb-2 text-xs justify-end w-full px-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#1baf7a] inline-block" />
            <span className="font-semibold text-[#898781]">Aprovados (%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#e34948] inline-block" />
            <span className="font-semibold text-[#898781]">Recusados (%)</span>
          </div>
        </div>
         <ResponsiveContainer width="100%" height={320}>
          <BarChart onClick={(e: any) => { if(e && e.activeLabel) onOpenModal(`TRANSP - ${e.activeLabel}`) }} data={data.charts?.topTranspData || []} margin={{ top: 15, right: 10, left: -20, bottom: 60 }}>
             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
             <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#898781' }} dy={10} interval={0} angle={-25} textAnchor="end" height={80} />
             <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `${String(val).replace('.', ',')}%`} domain={[0, 100]} />
             <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} formatter={(val) => `${String(val).replace('.', ',')}%`} />
             <Bar dataKey="percAprovados" name="Aprovados (%)" fill="#1baf7a" radius={[4, 4, 0, 0]} maxBarSize={40}>
                 <LabelList dataKey="percAprovados" position="top" fill="#64748b" formatter={(val: any) => `${String(val).replace('.', ',')}%`} style={{ fontSize: 10 }} />
             </Bar>
             <Bar dataKey="percRecusados" name="Recusados (%)" fill="#e34948" radius={[4, 4, 0, 0]} maxBarSize={40}>
                 <LabelList dataKey="percRecusados" position="top" fill="#64748b" formatter={(val: any) => `${String(val).replace('.', ',')}%`} style={{ fontSize: 10 }} />
             </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  </div>
);

const ConferenteTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const aprovados = payload.find((p: any) => p.dataKey === 'aprovados')?.value || 0;
    const recusados = payload.find((p: any) => p.dataKey === 'recusados')?.value || 0;
    const total = aprovados + recusados;
    const taxa = total > 0 ? ((aprovados / total) * 100).toFixed(0) : '0';
    return (
      <div className="bg-white px-3 py-2 border border-slate-200 shadow-md rounded-lg text-xs min-w-[160px]">
        <p className="font-bold text-slate-700 mb-1.5">{label}</p>
        <p className="text-emerald-600 mb-0.5">Aprovados: <span className="font-semibold">{aprovados}</span></p>
        <p className="text-rose-600 mb-1.5">Recusados: <span className="font-semibold">{recusados}</span></p>
        <div className="border-t border-slate-100 pt-1.5 flex justify-between gap-4">
          <span className="text-slate-500">Total: <span className="font-semibold text-slate-700">{total}</span></span>
          <span className="text-slate-500">Aprovação: <span className="font-semibold text-blue-600">{taxa}%</span></span>
        </div>
      </div>
    );
  }
  return null;
};

// Gráfico horizontal reutilizável: nomes completos sempre visíveis (sem
// cortar/pular rótulos), altura cresce com a quantidade de conferentes,
// mostra a quantidade dentro de cada segmento e a taxa de aprovação ao final.
const ConferenteBarChart = ({ items, limit, onOpenModal }: { items: any[]; limit: number; onOpenModal?: any }) => {
  const sorted = [...items]
    .map((d: any) => {
      const aprovados = Number(d.aprovados) || 0;
      const recusados = Number(d.recusados) || 0;
      const total = aprovados + recusados;
      const pct = total > 0 ? Math.round((aprovados / total) * 100) : 0;
      return { ...d, aprovados, recusados, total, pct };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  const chartHeight = Math.max(220, sorted.length * 34);

  if (sorted.length === 0) {
    return <div className="flex items-center justify-center h-[220px] text-sm text-slate-400 font-medium">Sem dados para o período selecionado</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        layout="vertical"
        onClick={(e: any) => { if (e && e.activeLabel) onOpenModal?.(`CONF - ${e.activeLabel}`); }}
        data={sorted}
        margin={{ top: 0, right: 70, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
        <YAxis
          dataKey="name"
          type="category"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
          width={150}
          interval={0}
        />
        <Tooltip cursor={{ fill: '#f8fafc' }} content={<ConferenteTooltip />} />
        <Bar dataKey="aprovados" name="Aprovados" stackId="a" fill="#10b981" barSize={18} style={{ cursor: onOpenModal ? 'pointer' : 'default' }}>
          <LabelList dataKey="aprovados" position="center" fill="#ffffff" fontSize={11} style={{ fontWeight: 'bold' }} formatter={(v: any) => v > 0 ? v : ''} />
        </Bar>
        <Bar dataKey="recusados" name="Recusados" stackId="a" fill="#f43f5e" barSize={18} radius={[0, 4, 4, 0]} style={{ cursor: onOpenModal ? 'pointer' : 'default' }}>
          <LabelList dataKey="recusados" position="center" fill="#ffffff" fontSize={11} style={{ fontWeight: 'bold' }} formatter={(v: any) => v > 0 ? v : ''} />
          <LabelList dataKey="pct" position="right" fill="#64748b" fontSize={11} style={{ fontWeight: 500 }} formatter={(v: any) => `${v}% aprov.`} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const AbaConferentes = ({ mode, data, onOpenModal }: { mode: 'geral', data: any, onOpenModal?: any }) => {
  const conferentesGeral = data.charts?.conferentesGeral || [];
  const conferentesES = data.charts?.conferentesES || [];
  const conferentesPB = data.charts?.conferentesPB || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6">
        <ChartCard title="Chamados por Conferente (Geral)">
          <div className="flex items-center gap-4 mb-2 text-xs justify-end w-full px-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#10b981] inline-block" />
              <span className="font-semibold text-[#898781]">Aprovados</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#f43f5e] inline-block" />
              <span className="font-semibold text-[#898781]">Recusados</span>
            </div>
          </div>
          <ConferenteBarChart items={conferentesGeral} limit={15} onOpenModal={onOpenModal} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Chamados por Conferente (CD Espírito Santo)">
          <div className="flex items-center gap-4 mb-2 text-xs justify-end w-full px-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#10b981] inline-block" />
              <span className="font-semibold text-[#898781]">Aprovados</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#f43f5e] inline-block" />
              <span className="font-semibold text-[#898781]">Recusados</span>
            </div>
          </div>
          <ConferenteBarChart items={conferentesES} limit={10} onOpenModal={onOpenModal} />
        </ChartCard>

        <ChartCard title="Chamados por Conferente (CD Paraíba)">
          <div className="flex items-center gap-4 mb-2 text-xs justify-end w-full px-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#10b981] inline-block" />
              <span className="font-semibold text-[#898781]">Aprovados</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#f43f5e] inline-block" />
              <span className="font-semibold text-[#898781]">Recusados</span>
            </div>
          </div>
          <ConferenteBarChart items={conferentesPB} limit={10} onOpenModal={onOpenModal} />
        </ChartCard>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function Dashboard() {
  const [selectedSubmenu, setSelectedSubmenu] = useState<string | null>("relatorio");
  const [activeTab, setActiveTab] = useState('executivo');
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
  const [drillDownData, setDrillDownData] = useState<any[]>([]);
  const [drillDownCols, setDrillDownCols] = useState<string[]>([]);
  const [drillDownTitle, setDrillDownTitle] = useState('');

  const [filterSelections, setFilterSelections] = useState({
    dateRef: 'Ref: Data de Abertura',
    periodo: 'Todos',
    dataInicio: '',
    dataFim: '',
    cd: 'Todos',
    transp: 'Todas',
    status: 'Todos',
    tipo: 'Todos'
  });
  
  const [activeFilters, setActiveFilters] = useState({
    dateRef: 'Ref: Data de Abertura',
    periodo: 'Todos',
    dataInicio: '',
    dataFim: '',
    cd: 'Todos',
    transp: 'Todas',
    status: 'Todos',
    tipo: 'Todos'
  });

  const handlePeriodoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const p = e.target.value;
    let start = '';
    let end = '';
    
    if (p !== 'Todos') {
      const today = new Date();
      const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      if (p === 'Últimos 7 dias') {
        const dStart = new Date();
        dStart.setDate(today.getDate() - 7);
        start = formatDate(dStart);
        end = formatDate(today);
      } else if (p === 'Últimos 30 dias') {
        const dStart = new Date();
        dStart.setDate(today.getDate() - 30);
        start = formatDate(dStart);
        end = formatDate(today);
      } else if (p === 'Mês Atual') {
        const dStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const dEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        start = formatDate(dStart);
        end = formatDate(dEnd);
      }
    }
    
    setFilterSelections(prev => ({
      ...prev,
      periodo: p,
      dataInicio: start,
      dataFim: end
    }));
  };

  const { kpis, filterOptions, isLoading, isRefetching, error, refetch } = useDashboardData(activeFilters);
  const charts = kpis?.charts;

  const executiveSummaryRef = useRef<HTMLDivElement>(null);
  const [isExportingSummary, setIsExportingSummary] = useState(false);

  const handleExportExecutiveSummary = async () => {
    let targetNode: HTMLElement | null = dashboardRef.current;
    if (activeTab === 'executivo') {
       const cardsGrid = document.getElementById('executivo-cards-grid');
       if (cardsGrid) targetNode = cardsGrid;
    }
    
    if (!targetNode) return;
    setIsExportingSummary(true);
    let container: HTMLDivElement | null = null;
    try {
      const originalNode = targetNode as HTMLElement;
      const clone = originalNode.cloneNode(true) as HTMLDivElement;
      
      container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = `${originalNode.offsetWidth || 1200}px`;
      document.body.appendChild(container);
      container.appendChild(clone);
      
      const origEls = [originalNode, ...Array.from(originalNode.querySelectorAll('*'))] as HTMLElement[];
      const cloneEls = [clone, ...Array.from(clone.querySelectorAll('*'))] as HTMLElement[];
      
      for (let i = 0; i < origEls.length; i++) {
          const o = origEls[i];
          const c = cloneEls[i];
          const computed = window.getComputedStyle(o);
          
          if (o.hasAttribute('data-html2canvas-ignore')) {
              c.style.display = 'none';
          }
          
          c.style.color = computed.color;
          c.style.backgroundColor = computed.backgroundColor;
          c.style.borderColor = computed.borderColor;
          c.style.fill = computed.fill;
          c.style.stroke = computed.stroke;
      }

      const today = new Date().toISOString().split('T')[0];
       
      const dataUrl = await toPng(clone, { cacheBust: true, backgroundColor: '#f8fafc', pixelRatio: 2 });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `dashboard-${activeTab}-${today}.png`;
      link.click();
    } catch (err: any) {
      console.error("Erro ao exportar dashboard", err);
      if (err?.name === 'ChunkLoadError' || err?.message?.includes('Loading chunk')) {
          alert("Uma nova versão do painel está disponível. A página será recarregada.");
          window.location.reload();
      } else {
          alert("Ocorreu um erro ao exportar o relatório. Por favor, recarregue a página e tente novamente.");
      }
    } finally {
      if (container) document.body.removeChild(container);
      setIsExportingSummary(false);
    }
  };

  const handleSearch = () => {
    if (filterSelections.dataInicio && filterSelections.dataFim) {
      const dStart = parseDataBR(filterSelections.dataInicio);
      const dEnd = parseDataBR(filterSelections.dataFim);
      if (dStart && dEnd && dStart > dEnd) {
        alert('Período inválido.\nA data inicial não pode ser maior que a data final.\nCorrija os filtros para continuar.');
        return;
      }
    }
    setActiveFilters(filterSelections);
  };

  const handleOpenModal = (type: string) => {
    let raw = kpis?.filteredData || [];
    let cols = ['Chamado', 'Loja', 'CD', 'Tipo', 'Tarefa Atual', 'Status', 'Valor', 'Dt Abertura', 'Dt Finalização', 'SLA'];
    let title = `Detalhamento de Chamados - ${type}`;

    if (type.startsWith('TAXA APROVAÇÃO CD - ')) {
      const cdInfo = type.replace('TAXA APROVAÇÃO CD - ', '');
      raw = raw.filter((d:any) => (d['CD']||'') === cdInfo);
      cols = ['Chamado', 'Loja', 'CD', 'Status', 'Dt Abertura'];
      title = `Detalhamento de Chamados - CD ${cdInfo}`;
    } else if (type.startsWith('ETAPA - ')) {
      const etapaInfo = type.replace('ETAPA - ', '');
      raw = raw.filter((d:any) => {
        // Only consider open items
        const dtFin = String(d['Dt Finalização'] || '');
        if (dtFin.trim() !== '') return false;
        
        // Only target Etapa
        const key = Object.keys(d).find(k => k.trim().toLowerCase() === 'situação' || k.trim().toLowerCase() === 'tarefa atual');
        const dEtapa = key ? d[key] || 'Não identificada' : 'Não identificada';
        if (dEtapa !== etapaInfo) return false;

        return true;
      });
      cols = ['Chamado', 'Loja', 'CD', 'Tarefa Atual', 'Status', 'Valor', 'Dt Abertura', 'SLA'];
      title = `Detalhamento - Etapa: ${etapaInfo}`;
    } else if (type.startsWith('TRANSP - ')) {
      const transpInfo = type.replace('TRANSP - ', '');
      raw = raw.filter((d:any) => {
        if ((d['Transportadora']||'') !== transpInfo) return false;
        const st = d['Status Chamado'];
        if (st !== 'Aprovado' && st !== 'Recusado') return false;
        return true;
      });
      cols = ['Chamado', 'CD', 'NF', 'Valor', 'Tarefa Atual', 'Status', 'Dt Abertura'];
      title = `Detalhamento - Transportadora: ${transpInfo}`;
    } else if (type.startsWith('CONF - ')) {
      const confInfo = type.replace('CONF - ', '');
      raw = raw.filter((d:any) => {
        if ((d['Conferente']||'') !== confInfo) return false;
        const st = d['Status Chamado'];
        if (st !== 'Aprovado' && st !== 'Recusado') return false;
        return true;
      });
      cols = ['Chamado', 'CD', 'NF', 'Valor', 'Tarefa Atual', 'Status', 'Dt Abertura'];
      title = `Detalhamento - Conferente: ${confInfo}`;
    } else if (type.startsWith('VALORES TOP CDS - ')) {
      const cdInfo = type.replace('VALORES TOP CDS - ', '');
      raw = raw.filter((d:any) => {
        if ((d['CD']||'') !== cdInfo) return false;
        if (d['Status Chamado'] !== 'Aprovado') return false;
        if (isSemRetorno(d)) return false;
        const nf = d['Nº Nfe'] || d['NF'];
        if (nf === null || nf === undefined || String(nf).trim() === '') return false;
        const v = Number(d[' Valor ']) || 0;
        if (v <= 0) return false;
        return true;
      });
      cols = ['Chamado', 'Loja', 'CD', 'NF', 'Valor', 'Dt Abertura', 'Dt Finalização', 'Tarefa Atual'];
      title = `Detalhamento - CD ${cdInfo}`;
    } else if (type.startsWith('AGING - ')) {
      const range = type.replace('AGING - ', '');
      raw = raw.filter((d:any) => {
        const statusNorm = (d['Status Chamado'] || '').toString().toLowerCase().trim();
        const statusChamadoRaw = (d['Status Chamado'] || '').toString().toLowerCase().trim();
        const isPendente = statusChamadoRaw.includes('pendente') || statusNorm === 'pendente';
        const dtOpen = parseDataBR(d['Dt Abertura']);
        const dtFin = parseDataBR(d['Dt Finalização']);
        
        if (!(statusNorm === 'aprovado' || isPendente) || dtFin || !dtOpen || isNaN(dtOpen.getTime())) {
          return false;
        }
        
        const daysInfo = Math.floor((new Date().getTime() - dtOpen.getTime()) / (1000 * 3600 * 24));
        if (range === '0-10 dias') return daysInfo <= 10;
        if (range === '11-20 dias') return daysInfo > 10 && daysInfo <= 20;
        if (range === '21-30 dias') return daysInfo > 20 && daysInfo <= 30;
        if (range === 'Mais de 30 dias') return daysInfo > 30;
        return false;
      }).map((d: any) => {
        const dtOpen = parseDataBR(d['Dt Abertura']);
        const daysInfo = dtOpen ? Math.floor((new Date().getTime() - dtOpen.getTime()) / (1000 * 3600 * 24)) : 0;
        return {
          ...d,
          'Idade (Dias)': daysInfo
        };
      });
      cols = ['Chamado', 'Loja', 'CD', 'Tipo', 'Tarefa Atual', 'Status', 'Dt Abertura', 'Idade (Dias)'];
      title = `Idade do Backlog - ${range}`;
    } else if (type.startsWith('IDADE BACKLOG - ')) {
      const range = type.replace('IDADE BACKLOG - ', '');
      raw = raw.filter((d:any) => {
        // Only active/open items (no "Dt Finalização")
        const dtFin = String(d['Dt Finalização'] || '');
        if (dtFin.trim() !== '') return false;

        const dtOpen = parseDataBR(d['Dt Abertura']);
        if (!dtOpen || isNaN(dtOpen.getTime())) return false;
        
        const daysInfo = Math.floor((new Date().getTime() - dtOpen.getTime()) / (1000 * 3600 * 24));
        if (range === '0-7 dias') return daysInfo <= 7;
        if (range === '8-15 dias') return daysInfo > 7 && daysInfo <= 15;
        if (range === '16-30 dias') return daysInfo > 15 && daysInfo <= 30;
        if (range === '31-60 dias') return daysInfo > 30 && daysInfo <= 60;
        if (range === 'Acima de 60 dias') return daysInfo > 60;
        return false;
      }).map((d: any) => {
        const dtOpen = parseDataBR(d['Dt Abertura']);
        const daysInfo = dtOpen ? Math.floor((new Date().getTime() - dtOpen.getTime()) / (1000 * 3600 * 24)) : 0;
        return {
          ...d,
          'Idade (Dias)': daysInfo
        };
      });
      cols = ['Chamado', 'Loja', 'CD', 'Tarefa Atual', 'Dt Abertura', 'Idade (Dias)'];
      title = `Idade do Backlog - ${range}`;
    } else {
      switch (type) {
        case 'SLA DO CHAMADO':
          raw = raw.filter((d:any) => {
            const dtOpen = parseDataBR(d['Dt Abertura']);
            const dtFin = parseDataBR(d['Dt Finalização']);
            return dtOpen && dtFin && !isNaN(dtOpen.getTime()) && !isNaN(dtFin.getTime()) && dtOpen.getFullYear() === new Date().getFullYear();
          }).map((d: any) => {
            const dtOpen = parseDataBR(d['Dt Abertura']);
            const dtFin = parseDataBR(d['Dt Finalização']);
            const diasUteis = (dtOpen && dtFin) ? getBusinessDays(dtOpen, dtFin) : 0;
            return {
              ...d,
              'Dias Decorridos': diasUteis,
              'SLA': diasUteis <= 60 ? 'No Prazo' : 'Fora do Prazo'
            };
          });
          cols = ['Chamado', 'Loja', 'CD', 'Dt Abertura', 'Dt Finalização', 'Dias Decorridos', 'SLA'];
          title = 'Detalhes: SLA do Chamado (Apenas Finalizados)';
          break;
        case 'SLA DE PAGAMENTO':
          raw = raw.filter((d:any) => {
            const statusChamadoRaw = (d['Status Chamado'] || '').toString().toLowerCase().trim();
            const dtOpen = parseDataBR(d['Dt Abertura']);
            const dtPag = parseDataBR(d['Dt Pagamento']);
            return statusChamadoRaw !== 'recusado' && dtOpen && dtPag && !isNaN(dtOpen.getTime()) && !isNaN(dtPag.getTime()) && dtOpen.getFullYear() === new Date().getFullYear();
          }).map((d: any) => {
            const dtOpen = parseDataBR(d['Dt Abertura']);
            const dtPag = parseDataBR(d['Dt Pagamento']);
            const diasUteis = (dtOpen && dtPag) ? getBusinessDays(dtOpen, dtPag) : 0;
            return {
              ...d,
              'Dias Decorridos': diasUteis,
              'SLA': diasUteis <= 60 ? 'No Prazo' : 'Fora do Prazo'
            };
          });
          cols = ['Chamado', 'Loja', 'CD', 'NF', 'Valor', 'Dt Abertura', 'Dt Pagamento', 'Dias Decorridos', 'SLA'];
          title = 'Detalhes: SLA de Pagamento (Apenas Pagos)';
          break;
        case 'TOTAL CHAMADOS':
          cols = ['Chamado', 'Loja', 'CD', 'Tipo', 'Tarefa Atual', 'Status', 'Dt Abertura', 'Dt Finalização', 'SLA'];
          break;
        case 'APROVADOS':
          raw = raw.filter((d:any) => d['Status Chamado'] === 'Aprovado');
          cols = ['Chamado', 'Loja', 'CD', 'Tipo', 'Tarefa Atual', 'Dt Abertura'];
          break;
        case 'RECUSADOS':
        case 'VALORES RECUSADOS':
          raw = raw.filter((d:any) => d['Status Chamado'] === 'Recusado');
          cols = ['Chamado', 'Loja', 'CD', 'Tipo', 'Dt Abertura', 'Dt Finalização'];
          break;
        case 'PENDENTE MONITORAMENTO':
          raw = raw.filter((d:any) => String(d['Status Chamado'] || '').toLowerCase().includes('pendente'));
          cols = ['Chamado', 'Loja', 'CD', 'Tipo', 'Dt Abertura', 'Status'];
          break;
        case 'VALORES APROVADOS':
          raw = raw.filter((d:any) => d['Status Chamado'] === 'Aprovado' && !isSemRetorno(d) && d[' Valor '] && String(d[' Valor ']).trim() !== '' && String(d[' Valor ']).trim().toLowerCase() !== 'gerado');
          cols = ['Chamado', 'Loja', 'CD', 'NF', 'Valor', 'SLA', 'Dt Abertura', 'Tarefa Atual'];
          break;
        case 'VALORES PAGOS':
          raw = raw.filter((d:any) => d['Status Chamado'] === 'Aprovado' && !isSemRetorno(d) && String(d['Status Pagamento'] || '').toLowerCase() === 'pago' && d[' Valor '] && String(d[' Valor ']).trim() !== '' && String(d[' Valor ']).trim().toLowerCase() !== 'gerado');
          cols = ['Chamado', 'Loja', 'CD', 'NF', 'Valor', 'SLA', 'Dt Abertura', 'Tarefa Atual', 'Dt Pagamento'];
          break;
        case 'VALOR PENDENTE':
          raw = raw.filter((d:any) => d['Status Chamado'] === 'Aprovado' && !isSemRetorno(d) && !d['Dt Pagamento'] && d[' Valor '] && String(d[' Valor ']).trim() !== '' && String(d[' Valor ']).trim().toLowerCase() !== 'gerado');
          cols = ['Chamado', 'Loja', 'CD', 'NF', 'Valor', 'Tarefa Atual', 'Dt Abertura'];
          break;
        case 'CHAMADOS EM ABERTO':
          raw = raw.filter((d:any) => !['finalizado', 'aprovado', 'recusado', 'cancelado'].includes(String(d['Status Chamado'] || '').toLowerCase()));
          cols = ['Chamado', 'Loja', 'CD', 'Tipo', 'Tarefa Atual', 'Status', 'Dt Abertura', 'SLA'];
          break;
        case 'SLA ESTOURADO':
          raw = raw.filter((d:any) => {
            const dOpen = parseDataBR(d['Dt Abertura']);
            if (!dOpen) return false;
            const diffDays = Math.floor((new Date().getTime() - dOpen.getTime()) / (1000 * 3600 * 24));
            return diffDays > 60 && !['finalizado', 'aprovado', 'recusado', 'cancelado'].includes(String(d['Status Chamado'] || '').toLowerCase());
          });
          cols = ['Chamado', 'Loja', 'CD', 'Tipo', 'Tarefa Atual', 'Status', 'Dt Abertura', 'SLA'];
          break;
        case 'VALOR EM ABERTO':
          raw = raw.filter((d:any) => !['finalizado', 'aprovado', 'recusado', 'cancelado'].includes(String(d['Status Chamado'] || '').toLowerCase()) && d[' Valor ']);
          cols = ['Chamado', 'Loja', 'CD', 'Tipo', 'Tarefa Atual', 'Status', 'Valor', 'Dt Abertura', 'SLA'];
          break;
        case 'VALORES TOP LOJAS':
          raw = raw.filter((d:any) => d['Status Chamado'] === 'Aprovado' && !isSemRetorno(d));
          cols = ['Chamado', 'Loja', 'CD', 'NF', 'Valor', 'Dt Abertura'];
          break;
        case 'ALL':
        default:
          title = 'Detalhamento de Chamados - Geral';
          break;
      }
    }
    setDrillDownData(raw);
    setDrillDownCols(cols);
    setDrillDownTitle(title);
    setIsDrillDownOpen(true);
  };

  const tabs = [
    { id: 'executivo', label: 'Geral', icon: LayoutDashboard },
    { id: 'operacao', label: 'Operação', icon: Settings },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'transp_geral', label: 'Transportadoras', icon: Truck },
    { id: 'conf_geral', label: 'Conferentes', icon: Users },
  ];

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-96 gap-4 text-slate-500">
           <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
           <p className="font-medium">Carregando e processando dados reais...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-96 gap-4 text-rose-500">
           <AlertTriangle className="w-8 h-8" />
           <p className="font-bold">Erro ao carregar os dados</p>
           <p className="text-sm font-medium">{error}</p>
        </div>
      );
    }

    const passData = { kpis, charts };

    switch (activeTab) {
      case 'executivo': return <AbaVisaoExecutiva data={passData} onOpenModal={handleOpenModal} />;
      case 'operacao': return <AbaOperacao data={passData} onOpenModal={handleOpenModal} />;
      case 'financeiro': return <AbaFinanceiro data={passData} onOpenModal={handleOpenModal} filters={filterSelections} />;
      case 'transp_geral': return <AbaTransportadoras mode="geral" data={passData} onOpenModal={handleOpenModal} />;
      case 'conf_geral': return <AbaConferentes mode="geral" data={passData} onOpenModal={handleOpenModal} />;
      default: return <AbaVisaoExecutiva data={passData} onOpenModal={handleOpenModal} />;
    }
  };

  return (
    <>
    <AppShell selectedSubmenu={selectedSubmenu} setSelectedSubmenu={setSelectedSubmenu}>
        {selectedSubmenu === null && (
          <div className="flex-1 bg-slate-100"></div>
        )}

        {(selectedSubmenu === 'novo' || selectedSubmenu === 'consulta') && (
          <div className="flex-1 bg-white flex items-center justify-center">
            <span className="text-slate-400 font-medium text-sm">Em construção</span>
          </div>
        )}

        {selectedSubmenu === 'relatorio' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            {/* Header Corporativo */}
            <header className="h-14 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between px-6 flex-shrink-0 z-30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-transparent">
                  <img src="https://iili.io/CKolF1t.png" alt="Logo" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h1 className="text-sm font-bold tracking-wide text-slate-800">Dashboard <span className="text-slate-500 font-medium">| Faltas e Sobras</span></h1>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                <button onClick={handleExportExecutiveSummary} disabled={isExportingSummary} className="flex items-center gap-2 px-3 py-1.5 border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-50 cursor-pointer">
                  {isExportingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Exportar Aba Atual
                </button>
                <button onClick={() => refetch()} disabled={isRefetching || isLoading} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-md transition-colors disabled:opacity-50 cursor-pointer">
                  <RefreshCcw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} /> Atualizar
                </button>
              </div>
            </header>

            {/* Global Filters Bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-end gap-4 text-xs flex-shrink-0 z-20 shadow-sm relative">
               <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tipo de Data</label>
                  <select value={filterSelections.dateRef} onChange={(e) => setFilterSelections({...filterSelections, dateRef: e.target.value})} className="bg-white border border-slate-300 text-slate-700 h-9 px-3 rounded shadow-sm outline-none focus:ring-1 focus:ring-blue-500 font-semibold cursor-pointer text-xs appearance-none pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_10px_center] bg-[length:8px_8px]">
                     <option>Ref: Data de Abertura</option>
                     <option>Ref: Data de Finalização</option>
                     <option>Ref: Data de Pagamento</option>
                  </select>
               </div>

               <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Período</label>
                  <select value={filterSelections.periodo} onChange={handlePeriodoChange} className="bg-white border border-slate-300 text-slate-700 h-9 px-3 rounded shadow-sm outline-none focus:ring-1 focus:ring-blue-500 font-semibold cursor-pointer text-xs appearance-none pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_10px_center] bg-[length:8px_8px]">
                     <option value="Todos">Todos</option>
                     <option value="Últimos 7 dias">Últimos 7 dias</option>
                     <option value="Últimos 30 dias">Últimos 30 dias</option>
                     <option value="Mês Atual">Mês Atual</option>
                  </select>
               </div>

               <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Data Inicial</label>
                  <input type="date" value={filterSelections.dataInicio} onChange={(e) => setFilterSelections({...filterSelections, dataInicio: e.target.value, periodo: 'Todos'})} className="bg-white border border-slate-300 h-9 px-2 rounded shadow-sm outline-none text-slate-700 text-xs font-semibold cursor-pointer max-w-[130px]" />
               </div>

               <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Data Final</label>
                  <input type="date" value={filterSelections.dataFim} onChange={(e) => setFilterSelections({...filterSelections, dataFim: e.target.value, periodo: 'Todos'})} className="bg-white border border-slate-300 h-9 px-2 rounded shadow-sm outline-none text-slate-700 text-xs font-semibold cursor-pointer max-w-[130px]" />
               </div>

               <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tipo</label>
                  <select value={filterSelections.tipo} onChange={(e) => setFilterSelections({...filterSelections, tipo: e.target.value})} className="bg-white border border-slate-300 text-slate-700 h-9 px-3 rounded shadow-sm outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer text-xs">
                     <option>Todos</option>
                     {filterOptions?.tipos?.map((t: string) => <option key={t} value={t}>{t}</option>)}
                  </select>
               </div>

               <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">CD</label>
                  <select value={filterSelections.cd} onChange={(e) => setFilterSelections({...filterSelections, cd: e.target.value})} className="bg-white border border-slate-300 text-slate-700 h-9 px-3 rounded shadow-sm outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer text-xs">
                     <option>Todos</option>
                     {filterOptions?.cds?.map((cd: string) => <option key={cd} value={cd}>{cd}</option>)}
                  </select>
               </div>

               <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Transportadora</label>
                  <select value={filterSelections.transp} onChange={(e) => setFilterSelections({...filterSelections, transp: e.target.value})} className="bg-white border border-slate-300 text-slate-700 h-9 px-3 rounded shadow-sm outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer text-xs max-w-[200px]">
                     <option>Todas</option>
                     {filterOptions?.transps?.map((t: string) => <option key={t} value={t}>{t}</option>)}
                  </select>
               </div>
               
               <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Status do Chamado</label>
                  <select value={filterSelections.status} onChange={(e) => setFilterSelections({...filterSelections, status: e.target.value})} className="bg-white border border-slate-300 text-slate-700 h-9 px-3 rounded shadow-sm outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer text-xs">
                     <option>Todos</option>
                     <option>Aprovado</option>
                     <option>Recusado</option>
                     <option>Pendente</option>
                  </select>
               </div>

               <button onClick={handleSearch} disabled={isLoading} className="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold h-9 px-6 rounded border border-blue-500 transition-colors shadow-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 cursor-pointer">
                  <Search className="w-4 h-4" /> Buscar
               </button>
            </div>

            {/* Navegação por Abas */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 pt-3 flex overflow-x-auto hide-scrollbar flex-shrink-0 z-10">
               {tabs.map(tab => (
                  <button 
                     key={tab.id}
                     className={`px-4 py-2.5 font-bold text-[11px] uppercase tracking-wider border-b-[3px] whitespace-nowrap flex items-center gap-2 transition-all group ${activeTab === tab.id ? 'border-blue-600 text-blue-700 bg-white shadow-[0_-2px_6px_rgba(0,0,0,0.02)] rounded-t-md' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300'}`}
                     onClick={() => setActiveTab(tab.id)}
                  >
                     <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                     {tab.label}
                  </button>
               ))}
            </div>

            {/* Main Layout Content Area */}
            <div className="flex-1 overflow-auto bg-slate-100">
              <main ref={dashboardRef} className="p-6 w-full max-w-[1600px] mx-auto bg-slate-100 min-h-max">
                {renderContent()}
              </main>
            </div>
          </div>
        )}

      <div className="fixed -top-[12000px] -left-[12000px] opacity-0 pointer-events-none">
        <div ref={executiveSummaryRef} className="p-8 bg-slate-100 w-[1200px]">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Resumo Executivo - Faltas e Sobras</h2>
          <div className="grid grid-cols-4 gap-6">
            <KpiCard title="Total Chamados" value={formatNum(kpis?.totalChamados || 0)} subtitle="Volume Geral do período" icon={FileText} colorClass="blue" onClick={undefined} />
            <KpiCard title="Aprovados" value={formatNum(kpis?.aprovados || 0)} subtitle="Ressarcimentos devidos" icon={CheckCircle2} colorClass="emerald" onClick={undefined} />
            <KpiCard title="Recusados" value={formatNum(kpis?.recusados || 0)} subtitle="Improcedentes" icon={XCircle} colorClass="rose" onClick={undefined} />
            <KpiCard title="Pendente Monitoramento" value={formatNum(kpis?.pendentes || 0)} subtitle="Aguardando análise" icon={Clock} colorClass="amber" onClick={undefined} />
            <KpiCard title="Valores Aprovados" value={formatCurrency(kpis?.valAprovado || 0)} subtitle="Acumulado" icon={Banknote} colorClass="indigo" onClick={undefined} />
            <KpiCard title="Valores Pagos" value={formatCurrency(kpis?.valPago || 0)} subtitle="Quitados" icon={CheckCircle2} colorClass="emerald" onClick={undefined} />
            <KpiCard title="Valores Pendentes" value={formatCurrency(kpis?.valPendente || 0)} subtitle="Aguardando fin." icon={AlertCircle} colorClass="amber" onClick={undefined} />
          </div>
        </div>
      </div>

      <DrillDownModal isOpen={isDrillDownOpen} onClose={() => setIsDrillDownOpen(false)} data={drillDownData} columns={drillDownCols} title={drillDownTitle} />
    </AppShell>
    </>
  );
}
