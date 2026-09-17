import type { Intencao, LeituraItem, TipoImovel } from "./types";

const CIDADES = [
  "Balneário Camboriú",
  "Itapema",
  "Itajaí",
  "Porto Belo",
  "Bombinhas",
];

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extrairOrcamento(t: string): number | undefined {
  const milhoes = t.match(/(\d+[.,]?\d*)\s*(mi\b|milhao|milhoes|mm)/)?.[1];
  if (milhoes) return Math.round(parseFloat(milhoes.replace(",", ".")) * 1_000_000);
  const mil = t.match(/(\d+[.,]?\d*)\s*mil\b/)?.[1];
  if (mil) return Math.round(parseFloat(mil.replace(",", ".")) * 1_000);
  const cru = t.match(/r\$\s*([\d.]{4,})/)?.[1];
  if (cru) return parseInt(cru.replace(/\./g, ""), 10);
  return undefined;
}

function extrairTipo(t: string): TipoImovel | undefined {
  if (/cobertura/.test(t)) return "cobertura";
  if (/\bcasa\b|sobrado/.test(t)) return "casa";
  if (/apart|apto|ap\b|flat/.test(t)) return "apartamento";
  return undefined;
}

/**
 * INTERPRETAÇÃO: transforma a demanda escrita em critérios.
 * Heurística local e determinística nesta primeira versão — o ponto de troca
 * por um interpretador mais rico no futuro é esta função.
 */
export function interpretarIntencao(texto: string): Intencao {
  const t = normalizar(texto);
  const inferidos: string[] = [];

  const cidade = CIDADES.find((c) => t.includes(normalizar(c)))
    ?? (/\bbc\b|camboriu/.test(t) ? "Balneário Camboriú" : undefined);

  const suites = t.match(/(\d+)\s*(suite|suites|su[íi]tes)/)?.[1]
    ?? t.match(/(\d+)\s*(dorm|quarto)/)?.[1];
  const vagas = t.match(/(\d+)\s*vaga/)?.[1];
  const tipo = extrairTipo(t);
  const orcamentoMax = extrairOrcamento(t);

  const frenteMar = /(frente\s*-?\s*mar|frente ao mar|pe na areia|vista mar)/.test(t);
  const pertoDoMar =
    !frenteMar && /(perto do mar|proximo ao mar|proximo do mar|beira mar|quadra do mar|perto da praia|proximo a praia)/.test(t);

  // Sentido, não palavra-chave: "não precisa reformar" também quer dizer pronto.
  const prontoLiteral = /(pronto|entregue|mudar|morar ja|imediat)/.test(t);
  const prontoInferido = /(nao precis\w* reformar|sem reforma|nao reformar|reformado|sem obra)/.test(t);
  if (!prontoLiteral && prontoInferido) inferidos.push("entrega");

  const espacoso = /(bastante espaco|muito espaco|espacos\w*|amplo|ampla|bem grande|metragem grande)/.test(t);
  if (espacoso) inferidos.push("area");
  if (pertoDoMar) inferidos.push("pertoDoMar");

  const uso = /(investi|alugar|locacao|renda|temporada)/.test(t)
    ? ("investimento" as const)
    : /(morar|moradia|familia|mudar|residir|para mim)/.test(t)
      ? ("moradia" as const)
      : undefined;
  if (uso) inferidos.push("uso");

  return {
    demandaId: `dem_${Date.now().toString(36)}`,
    texto: texto.trim(),
    ...(cidade ? { cidade } : {}),
    ...(tipo ? { tipo } : {}),
    ...(frenteMar ? { frenteMar: true } : {}),
    ...(pertoDoMar ? { pertoDoMar: true } : {}),
    ...(suites ? { suites: Number(suites) } : {}),
    ...(vagas ? { vagas: Number(vagas) } : {}),
    ...(prontoLiteral || prontoInferido ? { pronto: true } : {}),
    ...(espacoso ? { areaMin: 160 } : {}),
    ...(uso ? { uso } : {}),
    ...(orcamentoMax !== undefined ? { orcamentoMax } : {}),
    ...(inferidos.length > 0 ? { inferidos } : {}),
  };
}

/** Formatação determinística (idêntica no servidor e no navegador). */
function agruparMilhares(valor: number) {
  return String(Math.round(valor)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatarMoeda(valor: number) {
  if (valor >= 1_000_000) {
    const milhoes = valor / 1_000_000;
    const texto = Number.isInteger(milhoes)
      ? String(milhoes)
      : milhoes.toFixed(1).replace(".", ",");
    return `R$ ${texto} mi`;
  }
  if (valor >= 1_000) {
    const mil = valor / 1_000;
    const texto = Number.isInteger(mil) ? String(mil) : mil.toFixed(0);
    return `R$ ${texto} mil`;
  }
  return `R$ ${agruparMilhares(valor)}`;
}

export function formatarPrecoCheio(valor: number) {
  return `R$ ${agruparMilhares(valor)}`;
}

/** Lista legível dos critérios interpretados, para a apresentação. */
export function criteriosDaIntencao(intencao: Intencao): string[] {
  const itens: string[] = [];
  if (intencao.cidade) itens.push(intencao.cidade);
  if (intencao.tipo) {
    itens.push(
      intencao.tipo === "apartamento"
        ? "Apartamento"
        : intencao.tipo === "cobertura"
          ? "Cobertura"
          : "Casa",
    );
  }
  if (intencao.frenteMar) itens.push("Frente-mar");
  if (intencao.suites) itens.push(`${intencao.suites} suítes`);
  if (intencao.vagas) itens.push(`${intencao.vagas} vagas`);
  if (intencao.pronto) itens.push("Pronto para morar");
  if (intencao.orcamentoMax) itens.push(`Até ${formatarMoeda(intencao.orcamentoMax)}`);
  return itens;
}
