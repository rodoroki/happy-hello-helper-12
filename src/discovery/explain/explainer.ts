import type { MatchResult } from "../models/types";

/**
 * RESULT EXPLAINER — nenhum resultado aparece sem explicação.
 * A interface mostra frases, não porcentagens.
 */

export interface ResultExplanation {
  headline: string;
  meets: Array<{ label: string; note: string | null }>;
  unconfirmed: Array<{ label: string; note: string | null }>;
  diverges: Array<{ label: string; note: string | null }>;
  caveats: string[];
  sourceLine: string;
}

function itens(lista: MatchResult["reasons"]) {
  return lista.map((r) => ({ label: r.label, note: r.note }));
}

export function explain(match: MatchResult): ResultExplanation {
  const exato = match.divergences.length === 0 && match.unconfirmed.length === 0;
  const headline = exato
    ? "Atende ao que você descreveu"
    : match.divergences.length === 0
      ? "Parece atender, com pontos não confirmados"
      : "Próximo do que você descreveu";

  return {
    headline,
    meets: itens(match.reasons),
    unconfirmed: itens(match.unconfirmed),
    diverges: itens(match.divergences),
    caveats: match.property.caveats,
    sourceLine: `Encontrado em ${match.property.source.sourceName}`,
  };
}
