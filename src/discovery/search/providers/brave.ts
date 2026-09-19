import type { SearchQuery, SearchResult } from "../../models/types";
import type { SearchOptions, SearchProvider } from "../provider";

interface BraveWebResult {
  url?: unknown;
  title?: unknown;
  description?: unknown;
}

/**
 * REAL SEARCH PROVIDER (Brave Search API).
 * A chave vive apenas no servidor. Se não houver chave, o provider se declara
 * não configurado — nunca finge que funcionou.
 */
export class BraveSearchProvider implements SearchProvider {
  readonly name = "brave";
  readonly mode = "real" as const;
  readonly configured: boolean;

  constructor(private readonly apiKey: string | undefined) {
    this.configured = typeof apiKey === "string" && apiKey.trim() !== "";
  }

  async search(query: SearchQuery, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.configured) throw new Error("Real search provider not configured.");

    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query.site ? `site:${query.site} ${query.text}` : query.text);
    url.searchParams.set("count", String(options?.limit ?? 6));
    url.searchParams.set("country", options?.country ?? "br");
    url.searchParams.set("search_lang", "pt");

    const controlador = new AbortController();
    const prazo = setTimeout(() => controlador.abort(), 8000);
    try {
      const resposta = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": this.apiKey ?? "",
        },
        signal: controlador.signal,
      });
      if (!resposta.ok) throw new Error(`search provider responded ${resposta.status}`);

      const corpo = (await resposta.json()) as { web?: { results?: BraveWebResult[] } };
      const resultados = corpo.web?.results ?? [];

      const saida: SearchResult[] = [];
      for (const item of resultados) {
        if (typeof item.url !== "string") continue;
        let hostname: string;
        try {
          hostname = new URL(item.url).hostname;
        } catch {
          continue;
        }
        saida.push({
          url: item.url,
          title: typeof item.title === "string" ? item.title : item.url,
          snippet: typeof item.description === "string" ? item.description : null,
          sourceDomain: hostname,
          provider: this.name,
          queryId: query.queryId,
        });
      }
      return saida;
    } finally {
      clearTimeout(prazo);
    }
  }
}
