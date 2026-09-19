import type { SearchQuery, SearchResult } from "../../models/types";
import type { PageFetcher, SearchOptions, SearchProvider } from "../provider";
import { MOCK_PAGES, MOCK_PAGE_BY_URL } from "./mock-fixtures";

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * MOCK SEARCH PROVIDER — permite exercitar o pipeline inteiro sem depender
 * de API externa. O frontend não sabe qual provider está ativo.
 */
export class MockSearchProvider implements SearchProvider {
  readonly name = "mock";
  readonly configured = true;
  readonly mode = "mock" as const;

  async search(query: SearchQuery, options?: SearchOptions): Promise<SearchResult[]> {
    const termos = normalizar(query.text).split(/\s+/).filter((t) => t.length > 2);

    const pontuados = MOCK_PAGES.map((pagina) => {
      const alvo = normalizar(`${pagina.title} ${pagina.snippet} ${pagina.url}`);
      const acertos = termos.filter((t) => alvo.includes(t)).length;
      return { pagina, acertos };
    })
      .filter((p) => p.acertos > 0)
      .sort((a, b) => b.acertos - a.acertos);

    return pontuados.slice(0, options?.limit ?? 6).map(({ pagina }) => ({
      url: pagina.url,
      title: pagina.title,
      snippet: pagina.snippet,
      sourceDomain: new URL(pagina.url).hostname,
      provider: this.name,
      queryId: query.queryId,
    }));
  }
}

/** Leitor de páginas do modo demonstração: serve o HTML fictício das fixtures. */
export class MockPageFetcher implements PageFetcher {
  readonly name = "mock";

  async fetchPage(url: string) {
    const pagina = MOCK_PAGE_BY_URL.get(url);
    if (!pagina) throw new Error("page not available in mock mode");
    return { url, status: 200, html: pagina.html };
  }
}
