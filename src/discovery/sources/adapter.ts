import { extractCandidate } from "../extraction/extractor";
import type { AdvertiserKind, PropertyCandidate, SourceMetadata } from "../models/types";

/**
 * SOURCE ADAPTER — saber entender uma fonte é diferente de saber encontrá-la.
 * Hoje existe apenas o adapter genérico: não criamos adapters de portais aos
 * quais não temos acesso autorizado, para não fingir integração.
 */
export interface SourceAdapter {
  readonly name: string;
  canHandle(url: string): boolean;
  getSourceMetadata(url: string): SourceMetadata;
  extract(args: {
    url: string;
    html: string;
    candidateId: string;
    fallbackTitle?: string | null;
  }): PropertyCandidate;
}

function nomeDaFonte(hostname: string): string {
  const partes = hostname.replace(/^www\./, "").split(".");
  const principal = partes[0] ?? hostname;
  return principal.charAt(0).toUpperCase() + principal.slice(1);
}

function tipoDaFonte(hostname: string): AdvertiserKind {
  const h = hostname.toLowerCase();
  if (/imobiliaria|imoveis|imovel/.test(h)) return "agency";
  if (/construtora|incorporadora|empreendimento/.test(h)) return "developer";
  if (/portal|anuncios|classificados/.test(h)) return "portal";
  if (/corretor/.test(h)) return "broker";
  return "unknown";
}

export class GenericSourceAdapter implements SourceAdapter {
  readonly name = "generic";

  canHandle(): boolean {
    return true;
  }

  getSourceMetadata(url: string): SourceMetadata {
    let hostname = "";
    try {
      hostname = new URL(url).hostname;
    } catch {
      hostname = "desconhecido";
    }
    return {
      sourceDomain: hostname,
      sourceName: nomeDaFonte(hostname),
      sourceKind: tipoDaFonte(hostname),
      adapter: this.name,
    };
  }

  extract(args: { url: string; html: string; candidateId: string; fallbackTitle?: string | null }) {
    return extractCandidate({
      url: args.url,
      html: args.html,
      candidateId: args.candidateId,
      source: this.getSourceMetadata(args.url),
      ...(args.fallbackTitle !== undefined ? { fallbackTitle: args.fallbackTitle } : {}),
    });
  }
}

const ADAPTERS: SourceAdapter[] = [new GenericSourceAdapter()];

export function adapterPara(url: string): SourceAdapter {
  const encontrado = ADAPTERS.find((a) => a.canHandle(url));
  // O adapter genérico é sempre o último recurso e sempre existe.
  return encontrado ?? new GenericSourceAdapter();
}
