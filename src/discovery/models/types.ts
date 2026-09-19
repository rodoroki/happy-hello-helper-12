/**
 * NÚCLEO DE DESCOBERTA — tipos primeiro.
 *
 * O fluxo do produto é:
 * INTENT -> PLANNER -> SEARCH PROVIDER -> FETCHER -> EXTRACTOR ->
 * NORMALIZER -> DEDUPLICATOR -> CRITIC/VALIDATOR -> MATCH -> RELEVANCE -> UI
 *
 * Regra que atravessa tudo: nada é inventado. O que não foi encontrado é
 * `null` e aparece como "Não informado".
 */

export type DemandId = string;
export type QueryId = string;
export type CandidateId = string;
export type SearchExecutionId = string;

/** Confiança de cada dado extraído — origem importa mais que precisão aparente. */
export type ExtractionConfidence =
  | "confirmed" // dado estruturado da própria fonte (JSON-LD, schema.org)
  | "advertiser" // afirmação do anunciante no texto do anúncio
  | "estimated" // derivado por heurística nossa
  | "unknown" // não encontrado
  | "stale"; // encontrado, porém com sinais de desatualização

export type PropertyKind = "apartamento" | "cobertura" | "casa" | "outro" | "unknown";
export type PropertyCondition = "ready" | "under_construction" | "unknown";
export type Purpose = "living" | "investment";

export type AdvertiserKind =
  | "owner"
  | "broker"
  | "agency"
  | "developer"
  | "portal"
  | "other"
  | "unknown";

/**
 * INTENÇÃO DE BUSCA.
 * `stated` guarda apenas o que a pessoa disse. `inferred` guarda o que o
 * sistema entendeu do sentido da frase. Essa separação é obrigatória:
 * inferência interna nunca é exigência explícita do usuário.
 */
export interface SearchIntent {
  demandId: DemandId;
  rawText: string;
  city: string | null;
  propertyType: PropertyKind | null;
  maxPrice: number | null;
  minPrice: number | null;
  bedrooms: number | null;
  suites: number | null;
  parking: number | null;
  /** Só existe quando a pessoa informou a metragem. */
  areaMin: number | null;
  beachfront: boolean | null;
  nearSea: boolean | null;
  condition: PropertyCondition | null;
  purpose: Purpose | null;
  /** Preferências subjetivas ("espaçoso"), sem virar número na interface. */
  preferences: string[];
  /** Chaves que vieram de interpretação, não de menção literal. */
  inferred: string[];
}

export interface SearchQuery {
  queryId: QueryId;
  text: string;
  /** Por que esta consulta existe — ajuda o diagnóstico depois. */
  purpose: "primary" | "variation" | "source_focused";
  site: string | null;
}

export interface SearchResult {
  url: string;
  title: string;
  snippet: string | null;
  sourceDomain: string;
  provider: string;
  queryId: QueryId;
}

export interface SourceMetadata {
  sourceDomain: string;
  sourceName: string;
  /** "portal", "agency", "developer", "unknown" — sem fingir integração. */
  sourceKind: AdvertiserKind;
  adapter: string;
}

/** Bruto lido de uma página, antes de padronizar. */
export interface PropertyCandidate {
  candidateId: CandidateId;
  sourceUrl: string;
  source: SourceMetadata;
  title: string | null;
  rawPrice: string | null;
  rawLocation: string | null;
  rawArea: string | null;
  rawBedrooms: string | null;
  rawSuites: string | null;
  rawParking: string | null;
  rawFeatures: string[];
  rawText: string | null;
  advertiserName: string | null;
  images: string[];
  discoveredAt: string;
  updatedAt: string | null;
  /** De onde vieram os dados: estruturado, semântico ou textual. */
  extractionLayers: Array<"structured" | "semantic" | "text">;
}

export interface NormalizedProperty {
  candidateId: CandidateId;
  title: string | null;
  price: number | null;
  currency: "BRL" | null;
  location: string | null;
  city: string | null;
  neighborhood: string | null;
  propertyType: PropertyKind;
  area: number | null;
  bedrooms: number | null;
  suites: number | null;
  parking: number | null;
  beachfront: boolean | null;
  nearSea: boolean | null;
  condition: PropertyCondition;
  /** Resumo curto próprio; não reproduzimos a descrição do anúncio. */
  summary: string | null;
  features: string[];
  images: string[];
  sourceUrl: string;
  source: SourceMetadata;
  advertiser: string | null;
  advertiserType: AdvertiserKind;
  agency: string | null;
  broker: string | null;
  developer: string | null;
  owner: string | null;
  discoveredAt: string;
  updatedAt: string | null;
  confidence: Partial<Record<keyof NormalizedProperty, ExtractionConfidence>>;
  /** Observações do CRITIC: o que não pôde ser afirmado. */
  caveats: string[];
}

export type ReasonStatus = "meets" | "unconfirmed" | "diverges";

export interface MatchReason {
  key: string;
  label: string;
  status: ReasonStatus;
  note: string | null;
  /** Hard constraint = critério que a pessoa colocou como limite. */
  hard: boolean;
}

export interface MatchResult {
  matchId: string;
  demandId: DemandId;
  candidateId: CandidateId;
  property: NormalizedProperty;
  /** Score interno; a interface mostra explicação, não porcentagem. */
  score: number;
  reasons: MatchReason[];
  divergences: MatchReason[];
  unconfirmed: MatchReason[];
  /** Violação de limite explícito exclui o candidato. */
  violatesHardConstraint: boolean;
  relevance: number;
}

export interface SourceFailure {
  url: string;
  sourceDomain: string;
  stage: "fetch" | "extract" | "normalize" | "validate";
  reason: string;
}

/** Telemetria da execução — diagnóstico interno, nunca exibido cru. */
export interface SearchExecution {
  searchExecutionId: SearchExecutionId;
  demandId: DemandId;
  query: string;
  searchProvider: string;
  providerConfigured: boolean;
  mode: "mock" | "real";
  queriesGenerated: number;
  sourcesFound: number;
  pagesFetched: number;
  propertiesExtracted: number;
  propertiesValidated: number;
  duplicatesRemoved: number;
  matchesFound: number;
  resultsPresented: number;
  partial: boolean;
  failures: SourceFailure[];
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export interface DiscoveryOutcome {
  intent: SearchIntent;
  matches: MatchResult[];
  execution: SearchExecution;
}
