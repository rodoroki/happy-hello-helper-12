import { Check, Minus, X } from "lucide-react";

import type { CriterioAvaliado, Confianca } from "@/lib/discovery/types";

/** Critério interpretado da intenção — leitura, não filtro. */
export function IntencaoTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] text-foreground">
      {children}
    </span>
  );
}

const ICONE = {
  atende: Check,
  parcial: Minus,
  nao_atende: X,
} as const;

const COR = {
  atende: "text-affirm",
  parcial: "text-caution",
  nao_atende: "text-absent",
} as const;

export function CriterioLinha({ criterio }: { criterio: CriterioAvaliado }) {
  const Icone = ICONE[criterio.status];
  return (
    <li className="flex items-start gap-3 text-sm">
      <Icone className={`mt-0.5 h-4 w-4 shrink-0 ${COR[criterio.status]}`} aria-hidden />
      <span className="text-foreground">
        {criterio.rotulo}
        {criterio.observacao ? (
          <span className="text-muted-foreground"> — {criterio.observacao}</span>
        ) : null}
      </span>
    </li>
  );
}

const CONFIANCA_ROTULO: Record<Confianca, string> = {
  confirmado: "Confirmado",
  informado: "Informado pelo anunciante",
  estimado: "Estimado",
  desconhecido: "Não informado",
  desatualizado: "Pode estar desatualizado",
};

export function ConfiancaTag({ nivel }: { nivel: Confianca }) {
  const estilo =
    nivel === "confirmado"
      ? "border-affirm/30 text-affirm"
      : nivel === "estimado" || nivel === "desatualizado"
        ? "border-caution/40 text-caution"
        : "border-border text-muted-foreground";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${estilo}`}>
      {CONFIANCA_ROTULO[nivel]}
    </span>
  );
}
