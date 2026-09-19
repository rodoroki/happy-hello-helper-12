import type { SearchIntent, SearchQuery } from "../models/types";

/**
 * SEARCH PLANNER — transforma intenção em poucas consultas úteis.
 * Cobertura suficiente com o menor número razoável de buscas.
 */

const TERRITORIO_PADRAO = "litoral de Santa Catarina";

function tipoEmPalavras(intent: SearchIntent): string {
  switch (intent.propertyType) {
    case "cobertura":
      return "cobertura";
    case "casa":
      return "casa";
    case "apartamento":
      return "apartamento";
    default:
      return "imóvel";
  }
}

function precoEmPalavras(maxPrice: number | null): string | null {
  if (maxPrice === null) return null;
  if (maxPrice >= 1_000_000) {
    const milhoes = maxPrice / 1_000_000;
    const texto = Number.isInteger(milhoes) ? String(milhoes) : milhoes.toFixed(1).replace(".", ",");
    return `até ${texto} milhões`;
  }
  return `até ${Math.round(maxPrice / 1000)} mil`;
}

export function planQueries(intent: SearchIntent, limite = 3): SearchQuery[] {
  const local = intent.city ?? TERRITORIO_PADRAO;
  const tipo = tipoEmPalavras(intent);

  const partesPrincipais = [tipo, intent.beachfront ? "frente mar" : null, local];
  if (intent.suites !== null) partesPrincipais.push(`${intent.suites} suítes`);
  const preco = precoEmPalavras(intent.maxPrice);
  if (preco) partesPrincipais.push(preco);

  const queries: SearchQuery[] = [
    {
      queryId: "q1",
      text: partesPrincipais.filter(Boolean).join(" "),
      purpose: "primary",
      site: null,
    },
  ];

  // Variação: "à venda" costuma separar anúncio de conteúdo editorial.
  const variacao = [tipo, local, "à venda"];
  if (intent.condition === "ready") variacao.push("pronto para morar");
  if (intent.nearSea && !intent.beachfront) variacao.push("perto do mar");
  queries.push({
    queryId: "q2",
    text: variacao.filter(Boolean).join(" "),
    purpose: "variation",
    site: null,
  });

  // Variação enxuta, sem preferências subjetivas, para ampliar a cobertura.
  if (intent.suites !== null || intent.parking !== null) {
    const enxuta = [tipo, local];
    if (intent.suites !== null) enxuta.push(`${intent.suites} suítes`);
    if (intent.parking !== null) enxuta.push(`${intent.parking} vagas`);
    queries.push({
      queryId: "q3",
      text: enxuta.join(" "),
      purpose: "variation",
      site: null,
    });
  }

  return queries.slice(0, limite);
}
