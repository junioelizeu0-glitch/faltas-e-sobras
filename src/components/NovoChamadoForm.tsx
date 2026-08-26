import ChamadoForm from "./ChamadoForm";

type Props = { rawData: any[] | undefined; onCreated?: () => void; onClose?: () => void; tabela?: "faltas" | "recall" };

export default function NovoChamadoForm({ rawData, onCreated, onClose, tabela = "faltas" }: Props) {
  // Sugere próximo número a partir dos dados
  const max = (rawData || []).reduce((acc: number, r: any) => Math.max(acc, Number(r.Chamado) || 0), 0);
  const initial = max ? { Chamado: max + 1 } : null;
  return <ChamadoForm mode="novo" initialChamado={initial} onSaved={onCreated} onCancel={onClose} tabela={tabela} />;
}
