import { IMOVEIS } from "./imoveis";
import { formatarMoeda } from "./interpret";
import type {
  CriterioAvaliado,
  Imovel,
  Intencao,
  Match,
  ResultadoBusca,
} from "./types";

const PESO: Record<CriterioAvaliado["status"], number> = {
  atende: 1,
  parcial: 0.55,
  nao_atende: 0,
};

/**
 * MATCH explicável: cada critério declarado pela pessoa é avaliado
 * individualmente. Nunca escondemos incompatibilidade e não existe
 * pontuação sem justificativa visível.
 */
function avaliar(imovel: Imovel, intencao: Intencao): CriterioAvaliado[] {
  const criterios: CriterioAvaliado[] = [];

  if (intencao.cidade) {
    criterios.push({
      chave: "cidade",
      rotulo: intencao.cidade,
      status: imovel.cidade === intencao.cidade ? "atende" : "nao_atende",
      ...(imovel.cidade !== intencao.cidade ? { observacao: `Está em ${imovel.cidade}` } : {}),
    });
  }

  if (intencao.tipo) {
    criterios.push({
      chave: "tipo",
      rotulo: intencao.tipo === "apartamento" ? "Apartamento" : intencao.tipo === "cobertura" ? "Cobertura" : "Casa",
      status: imovel.tipo === intencao.tipo ? "atende" : "nao_atende",
      ...(imovel.tipo !== intencao.tipo ? { observacao: `É ${imovel.tipo}` } : {}),
    });
  }

  if (intencao.frenteMar) {
    criterios.push({
      chave: "frenteMar",
      rotulo: "Frente-mar",
      status: imovel.frenteMar ? "atende" : imovel.quadraMar ? "parcial" : "nao_atende",
      ...(imovel.frenteMar
        ? {}
        : imovel.quadraMar
          ? { observacao: "Quadra-mar, não frente-mar" }
          : { observacao: "Não é frente-mar" }),
    });
  }

  if (intencao.pertoDoMar) {
    criterios.push({
      chave: "pertoDoMar",
      rotulo: "Perto do mar",
      status: imovel.frenteMar || imovel.quadraMar ? "atende" : "nao_atende",
      ...(imovel.frenteMar || imovel.quadraMar
        ? { observacao: imovel.distanciaMar }
        : { observacao: "Longe da orla" }),
    });
  }

  if (intencao.espacoso) {
    // Preferência subjetiva: avaliamos em palavras, sem devolver uma exigência
    // numérica que a pessoa nunca informou.
    const area = imovel.areaPrivativa;
    criterios.push({
      chave: "espacoso",
      rotulo: "Imóvel espaçoso",
      status:
        area === null ? "parcial" : area >= 150 ? "atende" : area >= 120 ? "parcial" : "nao_atende",
      ...(area === null
        ? { observacao: "Área não informada" }
        : area >= 150
          ? { observacao: `${area} m² privativos` }
          : {
              observacao: `${area} m² privativos — pode ser menor do que você imagina por “bastante espaço”`,
            }),
    });
  }

  if (intencao.areaMin) {
    const area = imovel.areaPrivativa;
    criterios.push({
      chave: "areaMin",
      rotulo: `Área mínima de ${intencao.areaMin} m²`,
      status:
        area === null
          ? "parcial"
          : area >= intencao.areaMin
            ? "atende"
            : area >= intencao.areaMin * 0.85
              ? "parcial"
              : "nao_atende",
      ...(area === null
        ? { observacao: "Área não informada" }
        : area < intencao.areaMin
          ? { observacao: `${area} m² privativos` }
          : {}),
    });
  }

  if (intencao.suites) {
    const diff = imovel.suites - intencao.suites;
    criterios.push({
      chave: "suites",
      rotulo: `${intencao.suites} suítes`,
      status: diff === 0 ? "atende" : diff > 0 ? "atende" : diff === -1 ? "parcial" : "nao_atende",
      ...(diff !== 0 ? { observacao: `${imovel.suites} suítes neste imóvel` } : {}),
    });
  }

  if (intencao.vagas) {
    const diff = imovel.vagas - intencao.vagas;
    criterios.push({
      chave: "vagas",
      rotulo: `${intencao.vagas} vagas`,
      status: diff >= 0 ? "atende" : diff === -1 ? "parcial" : "nao_atende",
      ...(diff < 0 ? { observacao: `${imovel.vagas} vagas em vez de ${intencao.vagas}` } : {}),
    });
  }

  if (intencao.pronto) {
    criterios.push({
      chave: "entrega",
      rotulo: "Pronto para morar",
      status: imovel.status === "pronto" ? "atende" : "nao_atende",
      ...(imovel.status !== "pronto" ? { observacao: "Ainda em construção" } : {}),
    });
  }

  if (intencao.orcamentoMax) {
    const excedente = imovel.preco - intencao.orcamentoMax;
    const tolerancia = intencao.orcamentoMax * 0.12;
    criterios.push({
      chave: "orcamento",
      rotulo: `Até ${formatarMoeda(intencao.orcamentoMax)}`,
      status: excedente <= 0 ? "atende" : excedente <= tolerancia ? "parcial" : "nao_atende",
      ...(excedente > 0
        ? { observacao: `${formatarMoeda(imovel.preco)} — acima do orçamento informado` }
        : {}),
    });
  }

  if (criterios.length === 0) {
    criterios.push({ chave: "aberto", rotulo: "Busca ampla", status: "atende" });
  }

  return criterios;
}

function montarMatch(imovel: Imovel, intencao: Intencao): Match {
  const criterios = avaliar(imovel, intencao);
  const total = criterios.reduce((soma, c) => soma + PESO[c.status], 0);
  const score = Math.round((total / criterios.length) * 100);
  const divergencias = criterios.filter((c) => c.status !== "atende");

  return {
    matchId: `mat_${intencao.demandaId}_${imovel.id}`,
    demandaId: intencao.demandaId,
    imovelId: imovel.id,
    imovel,
    score,
    criterios,
    divergencias,
    exato: divergencias.length === 0,
  };
}

/**
 * RELEVÂNCIA PRIMEIRO: ordenamos apenas por aderência à intenção.
 * Nenhuma prioridade comercial participa desta ordenação.
 */
export function buscar(intencao: Intencao): ResultadoBusca {
  const todos = IMOVEIS.map((imovel) => montarMatch(imovel, intencao)).sort(
    (a, b) => b.score - a.score || a.imovel.preco - b.imovel.preco,
  );

  const exatos = todos.filter((m) => m.exato);
  const primeiroExato = exatos[0];
  if (primeiroExato) {
    const proximos = todos.filter((m) => !m.exato && m.score >= 70).slice(0, 2);
    return {
      intencao,
      modo: "exato",
      matches: [...exatos.slice(0, 3), ...proximos],
      mantidos: primeiroExato.criterios.map((c) => c.rotulo),
      flexibilizados: [],
    };
  }

  // Nunca respondemos apenas "nada encontrado": mostramos o mais próximo
  // e dizemos com clareza o que foi flexibilizado.
  const relevantes = todos.filter((m) => m.score >= 55).slice(0, 4);
  const aproximados = relevantes.length > 0 ? relevantes : todos.slice(0, 2);
  const melhor = aproximados[0];
  if (melhor) {
    const flexibilizados = Array.from(
      new Set(aproximados.flatMap((m) => m.divergencias.map((d) => d.rotulo))),
    );
    const mantidos = melhor.criterios
      .filter((c) => c.status === "atende")
      .map((c) => c.rotulo);
    return { intencao, modo: "flexibilizado", matches: aproximados, mantidos, flexibilizados };
  }

  return { intencao, modo: "vazio", matches: [], mantidos: [], flexibilizados: [] };
}

export function matchDoImovel(intencao: Intencao, imovel: Imovel) {
  return montarMatch(imovel, intencao);
}
