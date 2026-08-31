import ChamadoForm from "./ChamadoForm";

type Props = { rawData: any[] | undefined; onCreated?: () => void; onClose?: () => void; tabela?: "faltas" | "recall" };

export default function NovoChamadoForm({ rawData, onCreated, onClose, tabela = "faltas" }: Props) {
  return <ChamadoForm mode="novo" onSaved={onCreated} onCancel={onClose} tabela={tabela} />;
}
