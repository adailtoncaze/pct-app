import { KpisGerais } from "@/lib/types";
import { Radio, MapPinned, Building2, UserCheck } from "lucide-react";

function KpiCard({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="teams-card p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pct-muted">
          {label}
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pct-accent/10 text-pct-accent">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-pct-text">{value}</div>
      {sublabel && <div className="mt-2 text-xs text-pct-muted">{sublabel}</div>}
    </div>
  );
}

export function KpiPanel({ kpis }: { kpis: KpisGerais }) {
  const percentualCobertura =
    kpis.total_locais_vinculados > 0
      ? Math.round((kpis.pcts_com_locais_vinculados / kpis.total_locais_vinculados) * 100)
      : 0;

  const percentualAlvt =
    kpis.total_alvts > 0
      ? Math.round((kpis.alvts_treinados_homologados / kpis.total_alvts) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard icon={Radio} label="PCTs Ativos" value={String(kpis.total_pcts_ativos)} />
      <KpiCard
        icon={Building2}
        label="Seções Atendidas"
        value={String(kpis.total_secoes_atendidas)}
        sublabel={`${percentualCobertura}% de cobertura de locais`}
      />
      <KpiCard
        icon={MapPinned}
        label="Locais de Votação Vinculados"
        value={String(kpis.total_locais_vinculados)}
      />
      <KpiCard
        icon={UserCheck}
        label="Escala de ALVTs"
        value={`${percentualAlvt}%`}
        sublabel="treinados e homologados"
      />
    </div>
  );
}
