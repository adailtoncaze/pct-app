"use client";

import { PCT } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { gerarFichaPCT } from "@/lib/pdf";
import { FileDown, MapPin, Pencil, Route } from "lucide-react";

export function PctCard({
  pct,
  onEdit,
  onMapear,
}: {
  pct: PCT;
  onEdit?: (pct: PCT) => void;
  onMapear?: (pct: PCT) => void;
}) {
  const secoesVinculadas = pct.secoes_vinculadas ?? 0;
  const secoesTotais = pct.secoes_totais ?? pct.secoes_proprias + secoesVinculadas;

  return (
    <div className="teams-card flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-pct-accent/10 px-2 py-0.5 text-[11px] font-bold text-pct-accent">
              {pct.codigo}
            </span>
            <StatusBadge status={pct.status} />
          </div>
          <h3 className="mt-2 line-clamp-2 text-base font-semibold text-pct-text">{pct.nome}</h3>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 text-sm text-pct-muted">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-pct-accent" />
        <span className="line-clamp-2">{pct.logradouro}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-pct-border bg-slate-50 p-3 text-sm">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-pct-muted">
            Seções
          </div>
          <div className="mt-1 font-semibold text-pct-text">{secoesTotais}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-pct-muted">
            Locais Vinculados
          </div>
          <div className="mt-1 font-semibold text-pct-text">
            {pct.locais_vinculados?.length ?? 0}
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-pct-muted">
        {pct.alvt ? <span>ALVT - {pct.alvt.nome}</span> : <span>ALVT não atribuído</span>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-pct-border pt-4">
        <button
          onClick={() => gerarFichaPCT(pct)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-pct-accent/10 px-3 py-2 text-[11px] font-semibold text-pct-accent transition hover:bg-pct-accent/15"
        >
          <FileDown className="h-3.5 w-3.5" /> PDF
        </button>
        <button
          onClick={() => onEdit?.(pct)}
          className="teams-button-secondary flex w-full items-center justify-center gap-1.5 px-3 py-2 text-[11px]"
        >
          <Pencil className="h-3.5 w-3.5" /> Editar
        </button>
      </div>
    </div>
  );
}
