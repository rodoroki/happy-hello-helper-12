import type { NormalizedProperty } from "../models/types";

/**
 * DEDUPLICATOR — o mesmo imóvel pode aparecer em várias fontes.
 * Nunca unificamos por um sinal isolado (preço, área ou quartos).
 * Confiança baixa na semelhança => mantemos os dois anúncios.
 */

export interface DedupeOutcome {
  properties: NormalizedProperty[];
  removed: number;
  /** Grupos com mais de uma fonte, para diagnóstico. */
  groups: Array<{ kept: string; alsoSeenAt: string[] }>;
}

const LIMITE_SIMILARIDADE = 0.75;

function tokens(texto: string | null): Set<string> {
  if (!texto) return new Set();
  return new Set(
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersecao = 0;
  for (const t of a) if (b.has(t)) intersecao += 1;
  return intersecao / (a.size + b.size - intersecao);
}

function proximo(a: number | null, b: number | null, tolerancia: number): boolean | null {
  if (a === null || b === null) return null;
  if (a === 0 || b === 0) return null;
  return Math.abs(a - b) / Math.max(a, b) <= tolerancia;
}

/** Retorna 0..1 — quanto confiamos de que são o mesmo imóvel. */
export function similaridade(a: NormalizedProperty, b: NormalizedProperty): number {
  let pontos = 0;
  let peso = 0;

  const mesmaCidade = a.city !== null && b.city !== null ? a.city === b.city : null;
  if (mesmaCidade === false) return 0;
  if (mesmaCidade === true) {
    pontos += 1;
    peso += 1;
  }

  const precoProximo = proximo(a.price, b.price, 0.02);
  if (precoProximo !== null) {
    pontos += precoProximo ? 2 : 0;
    peso += 2;
  }

  const areaProxima = proximo(a.area, b.area, 0.05);
  if (areaProxima !== null) {
    pontos += areaProxima ? 2 : 0;
    peso += 2;
  }

  if (a.suites !== null && b.suites !== null) {
    pontos += a.suites === b.suites ? 1 : 0;
    peso += 1;
  }

  const titulos = jaccard(tokens(a.title), tokens(b.title));
  pontos += titulos * 2;
  peso += 2;

  if (peso === 0) return 0;
  return pontos / peso;
}

export function dedupe(propriedades: NormalizedProperty[]): DedupeOutcome {
  const mantidos: NormalizedProperty[] = [];
  const grupos: Array<{ kept: string; alsoSeenAt: string[] }> = [];
  let removidos = 0;

  for (const atual of propriedades) {
    let duplicado = false;
    for (let i = 0; i < mantidos.length; i += 1) {
      const existente = mantidos[i];
      if (!existente) continue;
      // Sinais precisam concordar em conjunto; um só não decide.
      if (similaridade(existente, atual) < LIMITE_SIMILARIDADE) continue;

      duplicado = true;
      removidos += 1;
      const grupo = grupos.find((g) => g.kept === existente.candidateId);
      if (grupo) grupo.alsoSeenAt.push(atual.source.sourceDomain);
      else
        grupos.push({
          kept: existente.candidateId,
          alsoSeenAt: [existente.source.sourceDomain, atual.source.sourceDomain],
        });
      break;
    }
    if (!duplicado) mantidos.push(atual);
  }

  return { properties: mantidos, removed: removidos, groups: grupos };
}
