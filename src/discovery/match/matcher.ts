import type {
  MatchReason,
  MatchResult,
  NormalizedProperty,
  SearchIntent,
} from "../models/types";

/**
 * MATCH ENGINE.
 * HARD CONSTRAINTS: limites explícitos da pessoa (cidade, orçamento, suítes,
 * vagas, frente-mar quando pedido, área mínima informada em números).
 * SOFT PREFERENCES: sentido subjetivo ("espaçoso", "perto do mar").
 *
 * O que não pode ser confirmado vira "não confirmado" — nunca vira "atende".
 */

const AREA_ESPACOSO_BOA = 150;
const AREA_ESPACOSO_LIMITE = 120;

function razao(
  key: string,
  label: string,
  status: MatchReason["status"],
  hard: boolean,
  note: string | null = null,
): MatchReason {
  return { key, label, status, hard, note };
}

export function evaluate(intent: SearchIntent, property: NormalizedProperty): MatchResult {
  const reasons: MatchReason[] = [];

  if (intent.city) {
    if (property.city === null) {
      reasons.push(razao("city", intent.city, "unconfirmed", true, "Cidade não informada na fonte."));
    } else if (property.city === intent.city) {
      reasons.push(razao("city", intent.city, "meets", true));
    } else {
      reasons.push(razao("city", intent.city, "diverges", true, `Está em ${property.city}.`));
    }
  }

  if (intent.propertyType && intent.propertyType !== "unknown") {
    if (property.propertyType === "unknown") {
      reasons.push(razao("type", "Tipo de imóvel", "unconfirmed", false, "Tipo não informado."));
    } else if (
      property.propertyType === intent.propertyType ||
      (intent.propertyType === "apartamento" && property.propertyType === "cobertura")
    ) {
      reasons.push(razao("type", intent.propertyType === "casa" ? "Casa" : "Apartamento", "meets", false));
    } else {
      reasons.push(razao("type", "Tipo de imóvel", "diverges", false, `É ${property.propertyType}.`));
    }
  }

  if (intent.maxPrice !== null) {
    if (property.price === null) {
      reasons.push(razao("price", "Dentro do orçamento", "unconfirmed", true, "Preço não informado."));
    } else if (property.price <= intent.maxPrice) {
      reasons.push(razao("price", "Dentro do orçamento", "meets", true));
    } else {
      reasons.push(razao("price", "Dentro do orçamento", "diverges", true, "Acima do valor que você indicou."));
    }
  }

  if (intent.beachfront === true) {
    if (property.beachfront === true) {
      reasons.push(razao("beachfront", "Frente-mar", "meets", true));
    } else if (property.nearSea === true) {
      reasons.push(
        razao("beachfront", "Frente-mar", "unconfirmed", true, "A fonte fala de proximidade do mar, não de frente-mar."),
      );
    } else {
      reasons.push(razao("beachfront", "Frente-mar", "diverges", true, "Não há indicação de frente-mar."));
    }
  } else if (intent.nearSea === true) {
    if (property.nearSea === true || property.beachfront === true) {
      reasons.push(razao("nearSea", "Perto do mar", "meets", false));
    } else {
      reasons.push(razao("nearSea", "Perto do mar", "unconfirmed", false, "A fonte não diz a distância do mar."));
    }
  }

  if (intent.suites !== null) {
    const rotulo = `${intent.suites} suítes`;
    if (property.suites === null) {
      reasons.push(razao("suites", rotulo, "unconfirmed", true, "Suítes não informadas."));
    } else if (property.suites >= intent.suites) {
      reasons.push(razao("suites", rotulo, "meets", true));
    } else {
      reasons.push(razao("suites", rotulo, "diverges", true, `Tem ${property.suites}.`));
    }
  }

  if (intent.parking !== null) {
    const rotulo = `${intent.parking} vagas`;
    if (property.parking === null) {
      reasons.push(razao("parking", rotulo, "unconfirmed", false, "Vagas não informadas."));
    } else if (property.parking >= intent.parking) {
      reasons.push(razao("parking", rotulo, "meets", false));
    } else {
      reasons.push(razao("parking", rotulo, "diverges", false, `Tem ${property.parking}.`));
    }
  }

  if (intent.condition === "ready") {
    if (property.condition === "ready") {
      reasons.push(razao("condition", "Pronto para morar", "meets", false));
    } else if (property.condition === "under_construction") {
      reasons.push(razao("condition", "Pronto para morar", "diverges", false, "Está em construção."));
    } else {
      reasons.push(razao("condition", "Pronto para morar", "unconfirmed", false, "Situação da obra não informada."));
    }
  }

  // Área mínima só é exigência quando a pessoa informou a metragem.
  if (intent.areaMin !== null) {
    const rotulo = `Área mínima de ${intent.areaMin} m²`;
    if (property.area === null) {
      reasons.push(razao("areaMin", rotulo, "unconfirmed", true, "Área não informada."));
    } else if (property.area >= intent.areaMin) {
      reasons.push(razao("areaMin", rotulo, "meets", true));
    } else {
      reasons.push(razao("areaMin", rotulo, "diverges", true, `Tem ${property.area} m².`));
    }
  }

  // "Bastante espaço" é preferência: nunca aparece como metragem exigida.
  if (intent.preferences.includes("spacious")) {
    if (property.area === null) {
      reasons.push(razao("spacious", "Imóvel espaçoso", "unconfirmed", false, "Área não informada."));
    } else if (property.area >= AREA_ESPACOSO_BOA) {
      reasons.push(razao("spacious", "Imóvel espaçoso", "meets", false));
    } else if (property.area >= AREA_ESPACOSO_LIMITE) {
      reasons.push(
        razao("spacious", "Imóvel espaçoso", "unconfirmed", false, `${property.area} m² — pode ser menor do que você imagina.`),
      );
    } else {
      reasons.push(razao("spacious", "Imóvel espaçoso", "diverges", false, `${property.area} m².`));
    }
  }

  const divergences = reasons.filter((r) => r.status === "diverges");
  const unconfirmed = reasons.filter((r) => r.status === "unconfirmed");
  const atende = reasons.filter((r) => r.status === "meets");

  const violatesHardConstraint = divergences.some((r) => r.hard);

  const total = reasons.length;
  const score =
    total === 0
      ? 50
      : Math.round(((atende.length + unconfirmed.length * 0.4) / total) * 100);

  return {
    matchId: `match_${intent.demandId}_${property.candidateId}`,
    demandId: intent.demandId,
    candidateId: property.candidateId,
    property,
    score,
    reasons: atende,
    divergences,
    unconfirmed,
    violatesHardConstraint,
    relevance: score,
  };
}
