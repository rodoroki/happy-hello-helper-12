import type { SearchQuery, SearchResult } from "../models/types";

export interface SearchOptions {
  /** Máximo de resultados por consulta. */
  limit?: number;
  /** Território de interesse, quando o provedor aceitar. */
  country?: string;
}

/**
 * SEARCH PROVIDER — abstração de mecanismo de busca.
 * O produto nunca fala com um fornecedor específico diretamente.
 */
export interface SearchProvider {
  readonly name: string;
  /** Falso quando falta chave/credencial: a interface diz isso com honestidade. */
  readonly configured: boolean;
  readonly mode: "mock" | "real";
  search(query: SearchQuery, options?: SearchOptions): Promise<SearchResult[]>;
}

/** Responsável por ler uma página quando isso for apropriado. */
export interface PageFetcher {
  readonly name: string;
  fetchPage(url: string): Promise<{ url: string; status: number; html: string }>;
}
