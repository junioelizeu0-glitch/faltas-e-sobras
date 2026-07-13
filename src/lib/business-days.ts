// Utilitários de dias úteis (pula sábados, domingos e feriados nacionais fixos)
export const FERIADOS_FIXOS = new Set([
  "01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "12-25",
]);

export function isDiaUtil(d: Date): boolean {
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return !FERIADOS_FIXOS.has(`${mm}-${dd}`);
}

/** Dias úteis decorridos entre duas datas (não conta o dia inicial). */
export function diasUteisEntre(ini: Date, fim: Date): number {
  if (fim < ini) return 0;
  let count = 0;
  const cur = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate());
  const end = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
  while (cur <= end) {
    if (isDiaUtil(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(0, count - 1);
}

/** Adiciona N dias úteis a uma data, pulando sábados, domingos e feriados. */
export function addBusinessDays(base: Date, n: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  let remaining = Math.max(0, Math.floor(n));
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    if (isDiaUtil(d)) remaining--;
  }
  return d;
}

export function parseISO(s?: string | null): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
  if (!m) {
    const d = new Date(String(s));
    return isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Devolve a data prevista (ISO) somando dias úteis à data de início (ISO). */
export function calcDataPrevista(dtInicioISO: string, dias: number | null | undefined): string {
  const ini = parseISO(dtInicioISO);
  if (!ini || !dias || dias <= 0) return "";
  return toISODate(addBusinessDays(ini, dias));
}
