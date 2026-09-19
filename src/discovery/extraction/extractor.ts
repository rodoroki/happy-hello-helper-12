import type { PropertyCandidate, SourceMetadata } from "../models/types";

/**
 * EXTRACTOR em camadas:
 * 1) dados estruturados (JSON-LD / schema.org / OpenGraph);
 * 2) HTML semântico (h1, breadcrumb, listas, preço);
 * 3) fallback textual (padrões), somente quando necessário.
 *
 * Não copiamos a descrição integral do anúncio: guardamos um trecho curto de
 * texto apenas para interpretar sinais, e a fonte original continua sendo o
 * destino do usuário.
 */

const LIMITE_TEXTO = 600;

function removerTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jsonLdBlocos(html: string): unknown[] {
  const blocos: unknown[] = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let achado: RegExpExecArray | null;
  while ((achado = regex.exec(html)) !== null) {
    const cru = achado[1];
    if (!cru) continue;
    try {
      blocos.push(JSON.parse(cru.trim()));
    } catch {
      // Estrutura inválida não derruba a extração.
    }
  }
  return blocos;
}

function meta(html: string, chave: string): string | null {
  const padroes = [
    new RegExp(`<meta[^>]+property=["']${chave}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${chave}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${chave}["'][^>]+content=["']([^"']+)["']`, "i"),
  ];
  for (const padrao of padroes) {
    const achado = html.match(padrao)?.[1];
    if (achado) return achado.trim();
  }
  return null;
}

function achar(objeto: unknown, caminho: string[]): unknown {
  let atual: unknown = objeto;
  for (const passo of caminho) {
    if (typeof atual !== "object" || atual === null) return undefined;
    atual = (atual as Record<string, unknown>)[passo];
  }
  return atual;
}

function comoTexto(valor: unknown): string | null {
  if (typeof valor === "string" && valor.trim() !== "") return valor.trim();
  if (typeof valor === "number") return String(valor);
  return null;
}

export function extractCandidate(args: {
  url: string;
  html: string;
  source: SourceMetadata;
  candidateId: string;
  fallbackTitle?: string | null;
}): PropertyCandidate {
  const { url, html, source, candidateId } = args;
  const camadas: PropertyCandidate["extractionLayers"] = [];

  // Camada 1 — estruturado
  const blocos = jsonLdBlocos(html);
  let titulo: string | null = null;
  let preco: string | null = null;
  let localizacao: string | null = null;
  let area: string | null = null;
  let quartos: string | null = null;
  let anunciante: string | null = null;

  for (const bloco of blocos) {
    const candidatos = Array.isArray(bloco) ? bloco : [bloco];
    for (const item of candidatos) {
      titulo = titulo ?? comoTexto(achar(item, ["name"]));
      preco =
        preco ??
        comoTexto(achar(item, ["offers", "price"])) ??
        comoTexto(achar(item, ["price"]));
      const cidade = comoTexto(achar(item, ["address", "addressLocality"]));
      const rua = comoTexto(achar(item, ["address", "streetAddress"]));
      if (!localizacao && (cidade || rua)) {
        localizacao = [rua, cidade].filter(Boolean).join(", ");
      }
      area = area ?? comoTexto(achar(item, ["floorSize", "value"]));
      quartos = quartos ?? comoTexto(achar(item, ["numberOfRooms"]));
      anunciante =
        anunciante ??
        comoTexto(achar(item, ["provider", "name"])) ??
        comoTexto(achar(item, ["seller", "name"]));
    }
  }
  if (titulo || preco || localizacao || area) camadas.push("structured");

  // Camada 2 — semântico
  const ogTitulo = meta(html, "og:title");
  const ogDescricao = meta(html, "og:description");
  const ogImagem = meta(html, "og:image");
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const tituloSemantico = h1 ? removerTags(h1) : null;
  if (!titulo) titulo = ogTitulo ?? tituloSemantico ?? args.fallbackTitle ?? null;
  if (titulo || ogDescricao) camadas.push("semantic");

  const texto = removerTags(html);

  // Camada 3 — textual (somente o que falta)
  if (!preco) {
    const bruto = texto.match(/R\$\s*([\d.]{6,})(?:,\d{2})?/)?.[1];
    if (bruto) preco = bruto;
  }
  if (!area) {
    area = texto.match(/(\d{2,4})\s*m²/)?.[1] ?? null;
  }
  if (!quartos) {
    quartos = texto.match(/(\d)\s*(dormit[óo]rios?|quartos?|dorms?\.?)/i)?.[1] ?? null;
  }
  const suites = texto.match(/(\d)\s*su[íi]tes?/i)?.[1] ?? null;
  const vagas = texto.match(/(\d)\s*vagas?/i)?.[1] ?? null;
  if (!preco || !area) camadas.push("text");

  const caracteristicas: string[] = [];
  const listas = html.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) ?? [];
  for (const li of listas.slice(0, 20)) {
    const limpo = removerTags(li);
    if (limpo.length >= 3 && limpo.length <= 80) caracteristicas.push(limpo);
  }

  const imagens = ogImagem ? [ogImagem] : [];

  return {
    candidateId,
    sourceUrl: url,
    source,
    title: titulo,
    rawPrice: preco,
    rawLocation: localizacao,
    rawArea: area,
    rawBedrooms: quartos,
    rawSuites: suites,
    rawParking: vagas,
    rawFeatures: Array.from(new Set(caracteristicas)).slice(0, 10),
    rawText: (ogDescricao ?? texto).slice(0, LIMITE_TEXTO),
    advertiserName: anunciante,
    images: imagens,
    discoveredAt: new Date().toISOString(),
    updatedAt: meta(html, "article:modified_time"),
    extractionLayers: Array.from(new Set(camadas)),
  };
}
