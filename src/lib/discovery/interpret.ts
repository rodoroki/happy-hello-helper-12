import type { Intencao, TipoImovel } from "./types";

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
  const milhoes = t.match(/(\d+[.,]?\d*)\s*(mi\b|milhao|milhoes|mm)/);
  if (milhoes) {
    return Math.round(parseFloat(milhoes[1].replace(",", ".")) * 1_000_000);
  }
  const mil = t.match(/(\d+[.,]?\d*)\s*mil\b/);
  if (mil) return Math.round(parseFloat(mil[1].replace(",", ".")) * 1_000);
  const cru = t.match(/r\$\s*([\d.]{4,})/);
  if (cru) return parseInt(cru[1].replace(/\./g, ""), 10);
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

  const cidade = CIDADES.find((c) => t.includes(normalizar(c)))
    ?? (/\bbc\b|camboriu/.test(t) ? "Balneário Camboriú" : undefined);

  const suitesMatch = t.match(/(\d+)\s*(suite|suites|su[íi]tes)/);
  const dormMatch = t.match(/(\d+)\s*(dorm|quarto)/);
  const vagasMatch = t.match(/(\d+)\s*vaga/);

  return {
    demandaId: `dem_${Date.now().toString(36)}`,
    texto: texto.trim(),
    ...(cidade ? { cidade } : {}),
    ...(extrairTipo(t) ? { tipo: extrairTipo(t) } : {}),
    ...(/(frente\s*-?\s*mar|frente ao mar|pe na areia|vista mar)/.test(t)
      ? { frenteMar: true }
      : {}),
    ...(suitesMatch
      ? { suites: Number(suitesMatch[1]) }
      : dormMatch
        ? { suites: Number(dormMatch[1]) }
        : {}),
    ...(vagasMatch ? { vagas: Number(vagasMatch[1]) } : {}),
    ...(/(pronto|entregue|mudar|morar ja|imediat)/.test(t) ? { pronto: true } : {}),
    ...(extrairOrcamento(t) !== undefined
      ? { orcamentoMax: extrairOrcamento(t) }
      : {}),
  };
}

export function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: valor >= 1_000_000 ? 1 : 0,
    notation: valor >= 1_000_000 ? "compact" : "standard",
  });
}

export function formatarPrecoCheio(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
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
