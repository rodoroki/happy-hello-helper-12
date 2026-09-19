import { interpretarIntencao } from "@/lib/discovery/interpret";

import type { PropertyKind, SearchIntent } from "../models/types";

/**
 * INTENT INTERPRETER.
 * Reaproveita o interpretador de linguagem natural já existente e traduz o
 * resultado para o vocabulário do núcleo, preservando a separação entre o que
 * foi dito e o que foi inferido.
 */
export function toSearchIntent(texto: string): SearchIntent {
  const i = interpretarIntencao(texto);
  const inferred = i.inferidos ?? [];

  const preferences: string[] = [];
  if (i.espacoso) preferences.push("spacious");
  if (i.pertoDoMar) preferences.push("near_sea");

  const propertyType: PropertyKind | null = i.tipo ?? null;

  return {
    demandId: i.demandaId,
    rawText: i.texto,
    city: i.cidade ?? null,
    propertyType,
    maxPrice: i.orcamentoMax ?? null,
    minPrice: null,
    bedrooms: null,
    suites: i.suites ?? null,
    parking: i.vagas ?? null,
    areaMin: i.areaMin ?? null,
    beachfront: i.frenteMar ? true : null,
    nearSea: i.pertoDoMar ? true : null,
    condition: i.pronto ? "ready" : null,
    purpose: i.uso === "investimento" ? "investment" : i.uso === "moradia" ? "living" : null,
    preferences,
    inferred,
  };
}
