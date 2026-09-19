import { dedupe } from "../dedupe/deduplicator";
import { explain, type ResultExplanation } from "../explain/explainer";
import { toSearchIntent } from "../intent/interpreter";
import { evaluate } from "../match/matcher";
import type {
  DiscoveryOutcome,
  MatchResult,
  NormalizedProperty,
  SearchExecution,
  SearchResult,
  SourceFailure,
} from "../models/types";
import { normalize } from "../normalize/normalizer";
import { rank } from "../relevance/relevance";
import { planQueries } from "../search/planner";
import type { PageFetcher, SearchProvider } from "../search/provider";
import { adapterPara } from "../sources/adapter";
import { validate } from "../validate/critic";

/**
 * PIPELINE de descoberta. Uma execução completa, do texto ao resultado
 * explicado, com telemetria própria e tolerância a falha por fonte.
 */

export interface DiscoveryLimits {
  maxQueries?: number;
  maxResultsPerQuery?: number;
  maxPages?: number;
  maxPresented?: number;
}

export interface DiscoveryRequest {
  text: string;
  provider: SearchProvider;
  fetcher: PageFetcher;
  limits?: DiscoveryLimits;
}

export interface ExplainedMatch {
  match: MatchResult;
  explanation: ResultExplanation;
}

export interface DiscoveryReport extends DiscoveryOutcome {
  results: ExplainedMatch[];
}

function agora() {
  return new Date().toISOString();
}

export async function runDiscovery(request: DiscoveryRequest): Promise<DiscoveryReport> {
  const inicio = Date.now();
  const startedAt = agora();
  const limites = {
    maxQueries: request.limits?.maxQueries ?? 3,
    maxResultsPerQuery: request.limits?.maxResultsPerQuery ?? 6,
    maxPages: request.limits?.maxPages ?? 8,
    maxPresented: request.limits?.maxPresented ?? 6,
  };

  const intent = toSearchIntent(request.text);
  const queries = planQueries(intent, limites.maxQueries);
  const failures: SourceFailure[] = [];

  // BUSCA — encontrar páginas candidatas.
  const encontrados: SearchResult[] = [];
  for (const query of queries) {
    try {
      const parciais = await request.provider.search(query, { limit: limites.maxResultsPerQuery });
      encontrados.push(...parciais);
    } catch (erro) {
      failures.push({
        url: query.text,
        sourceDomain: request.provider.name,
        stage: "fetch",
        reason: erro instanceof Error ? erro.message : "falha na busca",
      });
    }
  }

  const unicos: SearchResult[] = [];
  const vistos = new Set<string>();
  for (const resultado of encontrados) {
    if (vistos.has(resultado.url)) continue;
    vistos.add(resultado.url);
    unicos.push(resultado);
  }
  const paraLer = unicos.slice(0, limites.maxPages);

  // LEITURA + EXTRAÇÃO + NORMALIZAÇÃO
  let pagesFetched = 0;
  let extracted = 0;
  const normalizados: NormalizedProperty[] = [];

  for (const [indice, resultado] of paraLer.entries()) {
    let html: string;
    try {
      const pagina = await request.fetcher.fetchPage(resultado.url);
      html = pagina.html;
      pagesFetched += 1;
    } catch (erro) {
      failures.push({
        url: resultado.url,
        sourceDomain: resultado.sourceDomain,
        stage: "fetch",
        reason: erro instanceof Error ? erro.message : "falha ao ler a página",
      });
      continue;
    }

    try {
      const adapter = adapterPara(resultado.url);
      const candidato = adapter.extract({
        url: resultado.url,
        html,
        candidateId: `cand_${indice + 1}`,
        fallbackTitle: resultado.title,
      });
      extracted += 1;

      const { property, usable, reason } = validate(normalize(candidato));
      if (!usable) {
        failures.push({
          url: resultado.url,
          sourceDomain: resultado.sourceDomain,
          stage: "validate",
          reason: reason ?? "não validado",
        });
        continue;
      }
      normalizados.push(property);
    } catch (erro) {
      failures.push({
        url: resultado.url,
        sourceDomain: resultado.sourceDomain,
        stage: "extract",
        reason: erro instanceof Error ? erro.message : "falha ao interpretar a página",
      });
    }
  }

  // DEDUPLICAÇÃO
  const dedupado = dedupe(normalizados);

  // MATCH + RELEVÂNCIA
  const avaliados = dedupado.properties.map((p) => evaluate(intent, p));
  const aceitos = avaliados.filter((m) => !m.violatesHardConstraint);
  const base = aceitos.length > 0 ? aceitos : [];
  const ordenados = rank(base, intent).slice(0, limites.maxPresented);

  const finishedAt = agora();
  const execution: SearchExecution = {
    searchExecutionId: `exec_${inicio.toString(36)}`,
    demandId: intent.demandId,
    query: request.text,
    searchProvider: request.provider.name,
    providerConfigured: request.provider.configured,
    mode: request.provider.mode,
    queriesGenerated: queries.length,
    sourcesFound: unicos.length,
    pagesFetched,
    propertiesExtracted: extracted,
    propertiesValidated: normalizados.length,
    duplicatesRemoved: dedupado.removed,
    matchesFound: aceitos.length,
    resultsPresented: ordenados.length,
    partial: failures.length > 0,
    failures,
    startedAt,
    finishedAt,
    durationMs: Date.now() - inicio,
  };

  return {
    intent,
    matches: ordenados,
    execution,
    results: ordenados.map((match) => ({ match, explanation: explain(match) })),
  };
}
