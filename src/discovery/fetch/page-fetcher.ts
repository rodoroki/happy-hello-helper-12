import type { PageFetcher } from "../search/provider";

/**
 * FETCHER seguro. O frontend nunca busca URL arbitrária: só este módulo,
 * no servidor, e com política mínima de segurança.
 */

const TAMANHO_MAXIMO = 1_500_000; // ~1,5 MB de HTML é mais que suficiente
const TIMEOUT_MS = 7000;

const HOSTS_BLOQUEADOS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "169.254.169.254",
]);

/** Impede SSRF: protocolo, host interno, IP privado e URL malformada. */
export function urlPermitida(bruta: string): boolean {
  let url: URL;
  try {
    url = new URL(bruta);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  if (HOSTS_BLOQUEADOS.has(host)) return false;
  if (host.endsWith(".local") || host.endsWith(".internal")) return false;

  // Faixas privadas e link-local.
  if (/^10\./.test(host)) return false;
  if (/^192\.168\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (/^169\.254\./.test(host)) return false;
  if (/^127\./.test(host)) return false;
  if (host.startsWith("[")) return false; // IPv6 literal

  return true;
}

export class SafePageFetcher implements PageFetcher {
  readonly name = "safe-http";

  async fetchPage(bruta: string) {
    if (!urlPermitida(bruta)) throw new Error("url not allowed");

    const controlador = new AbortController();
    const prazo = setTimeout(() => controlador.abort(), TIMEOUT_MS);
    try {
      const resposta = await fetch(bruta, {
        redirect: "follow",
        signal: controlador.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "pt-BR,pt;q=0.9",
          "User-Agent": "LitoralDiscoveryBot/0.1 (+descoberta imobiliária; contato via site)",
        },
      });

      if (!resposta.ok) throw new Error(`status ${resposta.status}`);

      const tipo = resposta.headers.get("content-type") ?? "";
      if (tipo !== "" && !tipo.includes("html")) throw new Error("unsupported content type");

      const texto = await resposta.text();
      return {
        url: resposta.url !== "" ? resposta.url : bruta,
        status: resposta.status,
        html: texto.slice(0, TAMANHO_MAXIMO),
      };
    } finally {
      clearTimeout(prazo);
    }
  }
}
