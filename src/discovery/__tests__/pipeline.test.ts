import { describe, expect, it } from "vitest";

import { dedupe, similaridade } from "../dedupe/deduplicator";
import { extractCandidate } from "../extraction/extractor";
import { urlPermitida } from "../fetch/page-fetcher";
import { toSearchIntent } from "../intent/interpreter";
import { evaluate } from "../match/matcher";
import type { NormalizedProperty, SourceMetadata } from "../models/types";
import { normalize, parseInteiro, parsePreco } from "../normalize/normalizer";
import { runDiscovery } from "../pipeline/discovery";
import { planQueries } from "../search/planner";
import { MockPageFetcher, MockSearchProvider } from "../search/providers/mock";
import { MOCK_PAGES } from "../search/providers/mock-fixtures";
import { GenericSourceAdapter } from "../sources/adapter";
import { validate } from "../validate/critic";

const fonte: SourceMetadata = {
  sourceDomain: "exemplo-imobiliaria-litoral.com.br",
  sourceName: "Exemplo",
  sourceKind: "agency",
  adapter: "generic",
};

function normalizadoDaFixture(indice: number): NormalizedProperty {
  const pagina = MOCK_PAGES[indice]!;
  const candidato = extractCandidate({
    url: pagina.url,
    html: pagina.html,
    source: fonte,
    candidateId: `c${indice}`,
  });
  return validate(normalize(candidato)).property;
}

describe("intent", () => {
  it("lê cidade, suítes, frente-mar e orçamento", () => {
    const intent = toSearchIntent(
      "apartamento frente-mar em Itapema com 3 suítes até 4 milhões",
    );
    expect(intent.city).toBe("Itapema");
    expect(intent.suites).toBe(3);
    expect(intent.beachfront).toBe(true);
    expect(intent.maxPrice).toBe(4_000_000);
  });

  it('"bastante espaço" é preferência, nunca metragem', () => {
    const intent = toSearchIntent(
      "Quero algo para morar, perto do mar, com bastante espaço e que não precise reformar.",
    );
    expect(intent.preferences).toContain("spacious");
    expect(intent.areaMin).toBeNull();
    expect(intent.purpose).toBe("living");
    expect(intent.nearSea).toBe(true);
  });

  it("metragem só vira número quando a pessoa informa", () => {
    expect(toSearchIntent("apartamento com pelo menos 160 m²").areaMin).toBe(160);
  });
});

describe("planner", () => {
  it("gera poucas consultas e inclui cidade e preço", () => {
    const queries = planQueries(toSearchIntent("apartamento frente-mar em Itapema até 4 milhões"));
    expect(queries.length).toBeGreaterThan(0);
    expect(queries.length).toBeLessThanOrEqual(3);
    expect(queries[0]!.text).toContain("Itapema");
    expect(queries[0]!.text).toContain("milhões");
  });
});

describe("fetcher", () => {
  it("bloqueia alvos internos e protocolos estranhos", () => {
    expect(urlPermitida("https://www.exemplo.com.br/x")).toBe(true);
    expect(urlPermitida("http://localhost:8080")).toBe(false);
    expect(urlPermitida("http://169.254.169.254/latest/meta-data")).toBe(false);
    expect(urlPermitida("http://192.168.0.10/")).toBe(false);
    expect(urlPermitida("file:///etc/passwd")).toBe(false);
    expect(urlPermitida("nao-e-url")).toBe(false);
  });
});

describe("extractor e normalizer", () => {
  it("extrai dados estruturados quando existem", () => {
    const pagina = MOCK_PAGES[0]!;
    const candidato = new GenericSourceAdapter().extract({
      url: pagina.url,
      html: pagina.html,
      candidateId: "c1",
    });
    expect(candidato.extractionLayers).toContain("structured");
    const p = normalize(candidato);
    expect(p.price).toBe(3_650_000);
    expect(p.area).toBe(168);
    expect(p.suites).toBe(3);
    expect(p.city).toBe("Itapema");
    expect(p.confidence.price).toBe("confirmed");
  });

  it("não inventa dados ausentes", () => {
    const candidato = extractCandidate({
      url: "https://www.exemplo.com.br/x",
      html: "<html><body><h1>Imóvel em Itapema</h1></body></html>",
      source: fonte,
      candidateId: "c2",
    });
    const p = normalize(candidato);
    expect(p.price).toBeNull();
    expect(p.area).toBeNull();
    expect(p.confidence.price).toBe("unknown");
  });

  it("converte preço e inteiros com segurança", () => {
    expect(parsePreco("3.650.000")).toBe(3_650_000);
    expect(parsePreco("R$ 2.480.000,00")).toBe(2_480_000);
    expect(parsePreco("abc")).toBeNull();
    expect(parseInteiro("3", 12)).toBe(3);
    expect(parseInteiro("99", 12)).toBeNull();
  });
});

describe("critic", () => {
  it('"100 metros da praia" não é frente-mar', () => {
    const p = normalizadoDaFixture(2);
    expect(p.beachfront).toBeNull();
    expect(p.nearSea).toBe(true);
    expect(p.caveats.join(" ")).toContain("não confirma frente-mar");
  });

  it("descarta preço implausível", () => {
    const base = normalizadoDaFixture(0);
    const { property } = validate({ ...base, price: 10 });
    expect(property.price).toBeNull();
  });
});

describe("deduplicator", () => {
  it("une o mesmo imóvel visto em duas fontes", () => {
    const a = normalizadoDaFixture(0);
    const b = normalizadoDaFixture(1);
    expect(similaridade(a, b)).toBeGreaterThan(0.75);
    const resultado = dedupe([a, b]);
    expect(resultado.properties).toHaveLength(1);
    expect(resultado.removed).toBe(1);
  });

  it("mantém os dois quando os sinais não concordam", () => {
    const a = normalizadoDaFixture(0);
    const b = normalizadoDaFixture(3);
    const resultado = dedupe([a, b]);
    expect(resultado.properties).toHaveLength(2);
  });
});

describe("match", () => {
  it("frente-mar pedido com fonte que só diz proximidade fica não confirmado", () => {
    const intent = toSearchIntent("apartamento frente-mar em Itapema");
    const match = evaluate(intent, normalizadoDaFixture(2));
    const razao = [...match.unconfirmed, ...match.divergences].find((r) => r.key === "beachfront");
    expect(razao?.status).toBe("unconfirmed");
  });

  it("respeita limite de orçamento como restrição rígida", () => {
    const intent = toSearchIntent("cobertura em Balneário Camboriú até 3 milhões");
    const match = evaluate(intent, normalizadoDaFixture(3));
    expect(match.violatesHardConstraint).toBe(true);
  });

  it('"espaçoso" nunca aparece como metragem exigida', () => {
    const intent = toSearchIntent("algo espaçoso perto do mar em Porto Belo para morar");
    const match = evaluate(intent, normalizadoDaFixture(4));
    const todas = [...match.reasons, ...match.unconfirmed, ...match.divergences];
    expect(todas.some((r) => r.key === "spacious")).toBe(true);
    expect(todas.every((r) => !/\d+\s*m²\s*mínim/i.test(r.label))).toBe(true);
  });

  it("dado ausente vira 'não confirmado', não 'atende'", () => {
    const intent = toSearchIntent("apartamento em Itapema com 3 suítes");
    const base = normalizadoDaFixture(0);
    const match = evaluate(intent, { ...base, suites: null });
    expect(match.unconfirmed.some((r) => r.key === "suites")).toBe(true);
    expect(match.reasons.some((r) => r.key === "suites")).toBe(false);
  });
});

describe("pipeline (integração com provider mock)", () => {
  it("vai do texto ao resultado explicado", async () => {
    const relatorio = await runDiscovery({
      text: "apartamento frente-mar em Itapema com 3 suítes até 4 milhões",
      provider: new MockSearchProvider(),
      fetcher: new MockPageFetcher(),
    });

    expect(relatorio.execution.mode).toBe("mock");
    expect(relatorio.execution.queriesGenerated).toBeGreaterThan(0);
    expect(relatorio.execution.pagesFetched).toBeGreaterThan(0);
    expect(relatorio.results.length).toBeGreaterThan(0);

    const primeiro = relatorio.results[0]!;
    expect(primeiro.explanation.meets.length).toBeGreaterThan(0);
    expect(primeiro.explanation.sourceLine).toContain("Encontrado em");
    expect(primeiro.match.property.sourceUrl).toMatch(/^https:\/\//);
  });

  it("nenhum resultado apresentado viola restrição rígida", async () => {
    const relatorio = await runDiscovery({
      text: "apartamento frente-mar em Bombinhas até 3 milhões",
      provider: new MockSearchProvider(),
      fetcher: new MockPageFetcher(),
    });
    for (const { match } of relatorio.results) {
      expect(match.violatesHardConstraint).toBe(false);
      expect(match.property.price === null || match.property.price <= 3_000_000).toBe(true);
    }
  });
});
