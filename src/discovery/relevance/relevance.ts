import type { MatchResult, SearchIntent } from "../models/types";

/**
 * RELEVANCE ENGINE — relevância primeiro, sempre.
 * Composição: MATCH + CONFIANÇA DOS DADOS + QUALIDADE DA FONTE + FRESCOR +
 * INTENÇÃO DO USUÁRIO. Nenhum peso comercial entra aqui.
 */

function qualidadeDosDados(match: MatchResult): number {
  const p = match.property;
  const campos = [p.price, p.area, p.suites, p.parking, p.city, p.title];
  const preenchidos = campos.filter((c) => c !== null && c !== "").length;
  return preenchidos / campos.length;
}

function confiancaDosDados(match: MatchResult): number {
  const valores = Object.values(match.property.confidence);
  if (valores.length === 0) return 0.5;
  const nota = valores.map((c) => {
    switch (c) {
      case "confirmed":
        return 1;
      case "advertiser":
        return 0.75;
      case "estimated":
        return 0.5;
      case "stale":
        return 0.3;
      default:
        return 0.2;
    }
  });
  return nota.reduce((a, b) => a + b, 0) / nota.length;
}

function qualidadeDaFonte(match: MatchResult): number {
  switch (match.property.source.sourceKind) {
    case "agency":
    case "developer":
    case "broker":
      return 0.9;
    case "portal":
      return 0.75;
    default:
      return 0.5;
  }
}

function frescor(match: MatchResult): number {
  const atualizado = match.property.updatedAt;
  if (!atualizado) return 0.6;
  const dias = (Date.now() - new Date(atualizado).getTime()) / 86_400_000;
  if (!Number.isFinite(dias)) return 0.6;
  if (dias <= 30) return 1;
  if (dias <= 90) return 0.85;
  if (dias <= 180) return 0.7;
  return 0.4;
}

function alinhamentoDeUso(match: MatchResult, intent: SearchIntent): number {
  if (intent.purpose === null) return 0.7;
  const p = match.property;
  if (intent.purpose === "living") return p.condition === "ready" ? 1 : 0.6;
  // Investimento: frente-mar e proximidade do mar sustentam locação.
  return p.beachfront === true || p.nearSea === true ? 1 : 0.65;
}

export function rank(matches: MatchResult[], intent: SearchIntent): MatchResult[] {
  return matches
    .map((match) => {
      const relevancia =
        (match.score / 100) * 0.5 +
        confiancaDosDados(match) * 0.15 +
        qualidadeDosDados(match) * 0.15 +
        qualidadeDaFonte(match) * 0.08 +
        frescor(match) * 0.04 +
        alinhamentoDeUso(match, intent) * 0.08;
      return { ...match, relevance: Math.round(relevancia * 100) };
    })
    .sort((a, b) => b.relevance - a.relevance);
}
