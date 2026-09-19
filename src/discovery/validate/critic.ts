import type { NormalizedProperty } from "../models/types";

/**
 * CRITIC / VALIDATOR — duvida antes de apresentar.
 * Não conserta dados: rebaixa afirmações que não se sustentam e anota o motivo.
 */

export interface ValidationOutcome {
  property: NormalizedProperty;
  /** Falso quando nem o mínimo pôde ser estabelecido. */
  usable: boolean;
  reason: string | null;
}

const ATENCAO_FRENTE_MAR = "A fonte não confirma frente-mar; fala de proximidade do mar.";

export function validate(propriedade: NormalizedProperty): ValidationOutcome {
  const caveats = [...propriedade.caveats];
  let property: NormalizedProperty = { ...propriedade };

  // Frente-mar exige afirmação explícita. Distância da praia não basta.
  const texto = `${property.title ?? ""} ${property.summary ?? ""}`.toLowerCase();
  const falaDeDistancia = /\d{1,4}\s*(m|metros)\s*(da|de)\s*(praia|mar)/.test(texto);
  if (property.beachfront === true && falaDeDistancia && !/frente\s*-?\s*mar/.test(texto)) {
    property = { ...property, beachfront: null, nearSea: true };
    caveats.push(ATENCAO_FRENTE_MAR);
  }
  if (property.beachfront === null && property.nearSea === true && falaDeDistancia) {
    caveats.push(ATENCAO_FRENTE_MAR);
  }

  // Preço implausível não é apresentado como preço.
  if (property.price !== null && (property.price < 80_000 || property.price > 200_000_000)) {
    property = { ...property, price: null, currency: null };
    caveats.push("O preço encontrado não era plausível e foi descartado.");
  }

  // Área implausível idem.
  if (property.area !== null && (property.area < 20 || property.area > 1500)) {
    property = { ...property, area: null };
    caveats.push("A área encontrada não era plausível e foi descartada.");
  }

  // Suítes não podem passar do total de dormitórios informado.
  if (property.suites !== null && property.bedrooms !== null && property.suites > property.bedrooms) {
    property = { ...property, suites: null };
    caveats.push("O número de suítes divergia dos dormitórios informados.");
  }

  // Anúncio antigo é sinalizado, não escondido.
  if (property.updatedAt) {
    const idadeDias = (Date.now() - new Date(property.updatedAt).getTime()) / 86_400_000;
    if (Number.isFinite(idadeDias) && idadeDias > 180) {
      property = {
        ...property,
        confidence: { ...property.confidence, price: "stale" },
      };
      caveats.push("O anúncio não é atualizado há algum tempo.");
    }
  }

  property = { ...property, caveats: Array.from(new Set(caveats)) };

  const temIdentidade = (property.title ?? "").trim() !== "";
  const temAlgumDado = property.price !== null || property.area !== null || property.city !== null;
  if (!temIdentidade || !temAlgumDado) {
    return { property, usable: false, reason: "dados insuficientes para apresentar com honestidade" };
  }

  return { property, usable: true, reason: null };
}
