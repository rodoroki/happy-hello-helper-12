import { createServerFn } from "@tanstack/react-start";

import type { ResultExplanation } from "@/discovery/explain/explainer";
import type { NormalizedProperty, SearchExecution } from "@/discovery/models/types";

/**
 * Ponte entre a interface e o núcleo de descoberta.
 * Todo o pipeline roda no servidor: chaves, leitura de páginas e telemetria
 * nunca passam pelo navegador.
 */

export interface OportunidadeExterna {
  matchId: string;
  score: number;
  relevance: number;
  explicacao: ResultExplanation;
  imovel: Pick<
    NormalizedProperty,
    | "title"
    | "price"
    | "city"
    | "neighborhood"
    | "area"
    | "suites"
    | "parking"
    | "condition"
    | "beachfront"
    | "nearSea"
    | "summary"
    | "sourceUrl"
    | "advertiser"
    | "advertiserType"
    | "caveats"
  > & { sourceName: string };
}

export interface RespostaDescoberta {
  disponivel: boolean;
  /** Mensagem honesta quando a busca real não está configurada. */
  aviso: string | null;
  modo: "mock" | "real";
  demonstracao: boolean;
  oportunidades: OportunidadeExterna[];
  diagnostico: Pick<
    SearchExecution,
    | "searchExecutionId"
    | "queriesGenerated"
    | "sourcesFound"
    | "pagesFetched"
    | "propertiesExtracted"
    | "propertiesValidated"
    | "duplicatesRemoved"
    | "matchesFound"
    | "resultsPresented"
    | "partial"
    | "durationMs"
  > | null;
}

export const descobrirNaInternet = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const texto =
      typeof data === "object" && data !== null && typeof (data as { texto?: unknown }).texto === "string"
        ? (data as { texto: string }).texto
        : "";
    return { texto: texto.slice(0, 400) };
  })
  .handler(async ({ data }): Promise<RespostaDescoberta> => {
    if (data.texto.trim() === "") {
      return {
        disponivel: false,
        aviso: null,
        modo: "mock",
        demonstracao: true,
        oportunidades: [],
        diagnostico: null,
      };
    }

    const { createDiscoveryRuntime } = await import("@/discovery/config");
    const { runDiscovery } = await import("@/discovery/pipeline/discovery");

    const runtime = createDiscoveryRuntime();

    if (!runtime.provider.configured) {
      return {
        disponivel: false,
        aviso:
          "A busca real na internet ainda não está configurada, então nenhuma fonte externa foi consultada.",
        modo: runtime.provider.mode,
        demonstracao: false,
        oportunidades: [],
        diagnostico: null,
      };
    }

    const relatorio = await runDiscovery({
      text: data.texto,
      provider: runtime.provider,
      fetcher: runtime.fetcher,
    });

    // Telemetria de diagnóstico fica no servidor, nunca na interface crua.
    console.info("[discovery]", relatorio.execution);

    return {
      disponivel: true,
      aviso: null,
      modo: relatorio.execution.mode,
      demonstracao: relatorio.execution.mode === "mock",
      oportunidades: relatorio.results.map(({ match, explanation }) => ({
        matchId: match.matchId,
        score: match.score,
        relevance: match.relevance,
        explicacao: explanation,
        imovel: {
          title: match.property.title,
          price: match.property.price,
          city: match.property.city,
          neighborhood: match.property.neighborhood,
          area: match.property.area,
          suites: match.property.suites,
          parking: match.property.parking,
          condition: match.property.condition,
          beachfront: match.property.beachfront,
          nearSea: match.property.nearSea,
          summary: match.property.summary,
          sourceUrl: match.property.sourceUrl,
          advertiser: match.property.advertiser,
          advertiserType: match.property.advertiserType,
          caveats: match.property.caveats,
          sourceName: match.property.source.sourceName,
        },
      })),
      diagnostico: {
        searchExecutionId: relatorio.execution.searchExecutionId,
        queriesGenerated: relatorio.execution.queriesGenerated,
        sourcesFound: relatorio.execution.sourcesFound,
        pagesFetched: relatorio.execution.pagesFetched,
        propertiesExtracted: relatorio.execution.propertiesExtracted,
        propertiesValidated: relatorio.execution.propertiesValidated,
        duplicatesRemoved: relatorio.execution.duplicatesRemoved,
        matchesFound: relatorio.execution.matchesFound,
        resultsPresented: relatorio.execution.resultsPresented,
        partial: relatorio.execution.partial,
        durationMs: relatorio.execution.durationMs,
      },
    };
  });
