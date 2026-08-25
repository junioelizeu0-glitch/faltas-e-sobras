import ChamadoForm from "./ChamadoForm";

type Props = { rawData: any[] | undefined; onCreated?: () => void; onClose?: () => void; tabela?: "faltas" | "recall" };

export default function NovoChamadoForm({ rawData, onCreated, onClose, tabela = "faltas" }: Props) {
  // Sugere próximo número a partir dos dados
  const max = Math.max(0, ...(rawData || []).map((r: any) => Number(r.Chamado) || 0));
  const initial = max ? { Chamado: max + 1 } : null;
  return <ChamadoForm mode="novo" initialChamado={initial} onSaved={onCreated} onCancel={onClose} tabela={tabela} />;
}
