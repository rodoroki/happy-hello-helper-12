import { SafePageFetcher } from "./fetch/page-fetcher";
import type { PageFetcher, SearchProvider } from "./search/provider";
import { BraveSearchProvider } from "./search/providers/brave";
import { MockPageFetcher, MockSearchProvider } from "./search/providers/mock";

/**
 * Escolha do modo de operação. Só o servidor lê estas variáveis;
 * nenhuma chave chega ao navegador.
 *
 * SEARCH_MODE=mock  -> pipeline completo com páginas fictícias (padrão)
 * SEARCH_MODE=real  -> busca real, exige BRAVE_SEARCH_API_KEY
 */
export interface DiscoveryRuntime {
  provider: SearchProvider;
  fetcher: PageFetcher;
  requestedMode: "mock" | "real";
}

export function createDiscoveryRuntime(): DiscoveryRuntime {
  const requestedMode = process.env["SEARCH_MODE"] === "real" ? "real" : "mock";

  if (requestedMode === "real") {
    const provider = new BraveSearchProvider(process.env["BRAVE_SEARCH_API_KEY"]);
    if (provider.configured) {
      return { provider, fetcher: new SafePageFetcher(), requestedMode };
    }
    // Sem chave, devolvemos o provider real não configurado: a interface avisa
    // com clareza em vez de fingir que a busca real aconteceu.
    return { provider, fetcher: new SafePageFetcher(), requestedMode };
  }

  return { provider: new MockSearchProvider(), fetcher: new MockPageFetcher(), requestedMode };
}
