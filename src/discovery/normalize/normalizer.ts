import type {
  AdvertiserKind,
  ExtractionConfidence,
  NormalizedProperty,
  PropertyCandidate,
  PropertyCondition,
  PropertyKind,
} from "../models/types";

/**
 * NORMALIZER — padroniza sem completar lacunas.
 * Todo campo ausente fica `null` e recebe confiança "unknown".
 */

const CIDADES = [
  "Balneário Camboriú",
  "Itapema",
  "Itajaí",
  "Porto Belo",
  "Bombinhas",
  "Balneário Piçarras",
];

function semAcento(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function parsePreco(bruto: string | null): number | null {
  if (!bruto) return null;
  const limpo = bruto.replace(/[^\d.,]/g, "");
  if (limpo === "") return null;
  // "3.650.000" e "3650000" e "3.650.000,00"
  const semMilhar = limpo.replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const valor = Number.parseFloat(semMilhar);
  if (!Number.isFinite(valor)) return null;
  if (valor < 50_000 || valor > 500_000_000) return null;
  return Math.round(valor);
}

export function parseInteiro(bruto: string | null, max: number): number | null {
  if (!bruto) return null;
  const valor = Number.parseInt(bruto.replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(valor) || valor <= 0 || valor > max) return null;
  return valor;
}

function detectarCidade(...textos: Array<string | null>): string | null {
  const alvo = semAcento(textos.filter(Boolean).join(" "));
  for (const cidade of CIDADES) {
    if (alvo.includes(semAcento(cidade))) return cidade;
  }
  return null;
}

function detectarTipo(...textos: Array<string | null>): PropertyKind {
  const alvo = semAcento(textos.filter(Boolean).join(" "));
  if (alvo.includes("cobertura")) return "cobertura";
  if (alvo.includes("apartamento") || alvo.includes(" apto")) return "apartamento";
  if (alvo.includes("casa") || alvo.includes("sobrado")) return "casa";
  return "unknown";
}

function detectarCondicao(...textos: Array<string | null>): PropertyCondition {
  const alvo = semAcento(textos.filter(Boolean).join(" "));
  if (/pronto para morar|pronto pra morar|imovel pronto|entrega imediata/.test(alvo)) return "ready";
  if (/em construcao|na planta|entrega prevista|lancamento|previsao de entrega/.test(alvo)) {
    return "under_construction";
  }
  return "unknown";
}

/**
 * Frente-mar é afirmação forte: só quando a fonte diz exatamente isso.
 * "a 100 metros da praia" é perto do mar, não frente-mar.
 */
function detectarMar(...textos: Array<string | null>): {
  beachfront: boolean | null;
  nearSea: boolean | null;
} {
  const alvo = semAcento(textos.filter(Boolean).join(" "));
  const frenteMar = /frente\s*-?\s*mar|frente para o mar|pe na areia/.test(alvo);
  const perto =
    frenteMar ||
    /quadra\s*-?\s*mar|primeira quadra|quadra do mar|perto do mar|proximo ao mar|proximo do mar|proximo a praia|perto da praia|\d{1,3}\s*metros da praia|\d{1,3}\s*m da praia|quadras do mar/.test(
      alvo,
    );
  return {
    beachfront: frenteMar ? true : null,
    nearSea: perto ? true : null,
  };
}

function detectarTipoAnunciante(nome: string | null, fonte: AdvertiserKind): AdvertiserKind {
  if (!nome) return fonte;
  const alvo = semAcento(nome);
  if (alvo.includes("construtora") || alvo.includes("incorporadora")) return "developer";
  if (alvo.includes("imobiliaria") || alvo.includes("imoveis")) return "agency";
  if (alvo.includes("corretor")) return "broker";
  if (alvo.includes("portal")) return "portal";
  return fonte;
}

function confiancaDoCampo(
  valor: unknown,
  estruturado: boolean,
  textual: boolean,
): ExtractionConfidence {
  if (valor === null || valor === undefined) return "unknown";
  if (estruturado) return "confirmed";
  if (textual) return "estimated";
  return "advertiser";
}

export function normalize(candidate: PropertyCandidate): NormalizedProperty {
  const estruturado = candidate.extractionLayers.includes("structured");
  const textual = candidate.extractionLayers.includes("text");

  const price = parsePreco(candidate.rawPrice);
  const area = parseInteiro(candidate.rawArea, 2000);
  const bedrooms = parseInteiro(candidate.rawBedrooms, 12);
  const suites = parseInteiro(candidate.rawSuites, 12);
  const parking = parseInteiro(candidate.rawParking, 12);

  const textos = [candidate.title, candidate.rawLocation, candidate.rawText, candidate.sourceUrl];
  const cidade = detectarCidade(...textos);
  const mar = detectarMar(candidate.title, candidate.rawText, candidate.rawLocation);
  const bairro = candidate.rawLocation?.split(",")[0]?.trim() ?? null;

  const advertiserType = detectarTipoAnunciante(candidate.advertiserName, candidate.source.sourceKind);

  return {
    candidateId: candidate.candidateId,
    title: candidate.title,
    price,
    currency: price === null ? null : "BRL",
    location: candidate.rawLocation,
    city: cidade,
    neighborhood: bairro !== cidade ? bairro : null,
    propertyType: detectarTipo(candidate.title, candidate.rawText),
    area,
    bedrooms,
    suites,
    parking,
    beachfront: mar.beachfront,
    nearSea: mar.nearSea,
    condition: detectarCondicao(candidate.title, candidate.rawText, candidate.rawFeatures.join(" ")),
    summary: candidate.rawText ? candidate.rawText.slice(0, 220) : null,
    features: candidate.rawFeatures,
    images: candidate.images,
    sourceUrl: candidate.sourceUrl,
    source: candidate.source,
    advertiser: candidate.advertiserName,
    advertiserType,
    // Anunciante, imobiliária, corretor e proprietário são coisas distintas:
    // só preenchemos quando a própria fonte permite afirmar.
    agency: advertiserType === "agency" ? candidate.advertiserName : null,
    broker: advertiserType === "broker" ? candidate.advertiserName : null,
    developer: advertiserType === "developer" ? candidate.advertiserName : null,
    owner: null,
    discoveredAt: candidate.discoveredAt,
    updatedAt: candidate.updatedAt,
    confidence: {
      price: confiancaDoCampo(price, estruturado, textual),
      area: confiancaDoCampo(area, estruturado, textual),
      suites: confiancaDoCampo(suites, false, true),
      parking: confiancaDoCampo(parking, false, true),
      beachfront: confiancaDoCampo(mar.beachfront, false, true),
      nearSea: confiancaDoCampo(mar.nearSea, false, true),
      condition: candidate.rawText ? "advertiser" : "unknown",
      city: confiancaDoCampo(cidade, estruturado, textual),
    },
    caveats: [],
  };
}
