/**
 * Páginas fictícias para desenvolvimento e teste do pipeline.
 * NÃO são anúncios reais e nunca devem ser apresentadas como tal:
 * os domínios são de exemplo e os dados são inventados de propósito,
 * apenas para exercitar extração, normalização, dedup e match.
 */

export interface MockPage {
  url: string;
  title: string;
  snippet: string;
  html: string;
}

function paginaComJsonLd(args: {
  url: string;
  nome: string;
  preco: number;
  cidade: string;
  bairro: string;
  area: number;
  quartos: number;
  suites: number;
  vagas: number;
  anunciante: string;
  texto: string;
}): MockPage {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Residence",
    name: args.nome,
    offers: { "@type": "Offer", price: args.preco, priceCurrency: "BRL" },
    address: {
      "@type": "PostalAddress",
      addressLocality: args.cidade,
      addressRegion: "SC",
      streetAddress: args.bairro,
    },
    floorSize: { "@type": "QuantitativeValue", value: args.area, unitCode: "MTK" },
    numberOfRooms: args.quartos,
    provider: { "@type": "Organization", name: args.anunciante },
  };

  return {
    url: args.url,
    title: args.nome,
    snippet: args.texto.slice(0, 160),
    html: `<!doctype html><html lang="pt-BR"><head>
<title>${args.nome}</title>
<meta property="og:title" content="${args.nome}" />
<meta property="og:description" content="${args.texto}" />
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head><body>
<nav><a href="/">Início</a> / <a href="/sc">${args.cidade}</a> / <span>${args.bairro}</span></nav>
<h1>${args.nome}</h1>
<p class="price">R$ ${args.preco.toLocaleString("pt-BR")}</p>
<ul>
  <li>${args.area} m² privativos</li>
  <li>${args.quartos} dormitórios, sendo ${args.suites} suítes</li>
  <li>${args.vagas} vagas de garagem</li>
</ul>
<p>${args.texto}</p>
<footer>Anunciado por ${args.anunciante}</footer>
</body></html>`,
  };
}

export const MOCK_PAGES: MockPage[] = [
  paginaComJsonLd({
    url: "https://www.exemplo-imobiliaria-litoral.com.br/imovel/1001",
    nome: "Apartamento frente-mar na Meia Praia",
    preco: 3_650_000,
    cidade: "Itapema",
    bairro: "Meia Praia",
    area: 168,
    quartos: 3,
    suites: 3,
    vagas: 2,
    anunciante: "Exemplo Imobiliária Litoral",
    texto: "Apartamento frente-mar, pronto para morar, com vista permanente para o mar.",
  }),
  paginaComJsonLd({
    url: "https://anuncios.exemplo-portal-imoveis.com.br/sc/itapema/ap-1001",
    nome: "Apartamento frente mar Meia Praia Itapema 3 suítes",
    preco: 3_650_000,
    cidade: "Itapema",
    bairro: "Meia Praia",
    area: 168,
    quartos: 3,
    suites: 3,
    vagas: 2,
    anunciante: "Exemplo Portal Imóveis",
    texto: "Frente-mar na Meia Praia, 3 suítes, pronto para morar.",
  }),
  paginaComJsonLd({
    url: "https://www.exemplo-construtora-sc.com.br/empreendimentos/2002",
    nome: "Apartamento a 100 metros da praia em Itapema",
    preco: 2_480_000,
    cidade: "Itapema",
    bairro: "Centro",
    area: 121,
    quartos: 3,
    suites: 2,
    vagas: 2,
    anunciante: "Exemplo Construtora SC",
    texto: "Apartamento a 100 metros da praia, entrega prevista para o próximo ano.",
  }),
  paginaComJsonLd({
    url: "https://www.exemplo-corretor-bc.com.br/imoveis/3003",
    nome: "Cobertura quadra-mar em Balneário Camboriú",
    preco: 5_900_000,
    cidade: "Balneário Camboriú",
    bairro: "Centro",
    area: 240,
    quartos: 4,
    suites: 3,
    vagas: 3,
    anunciante: "Exemplo Negócios Imobiliários",
    texto: "Cobertura na primeira quadra do mar, pronta, com ampla área social.",
  }),
  paginaComJsonLd({
    url: "https://www.exemplo-imobiliaria-litoral.com.br/imovel/4004",
    nome: "Apartamento espaçoso perto do mar em Porto Belo",
    preco: 1_950_000,
    cidade: "Porto Belo",
    bairro: "Perequê",
    area: 155,
    quartos: 3,
    suites: 2,
    vagas: 2,
    anunciante: "Exemplo Imobiliária Litoral",
    texto: "Apartamento amplo a duas quadras do mar, pronto para morar.",
  }),
  paginaComJsonLd({
    url: "https://www.exemplo-portal-bombinhas.com.br/anuncio/5005",
    nome: "Apartamento frente-mar em Bombinhas",
    preco: 2_850_000,
    cidade: "Bombinhas",
    bairro: "Bombas",
    area: 132,
    quartos: 3,
    suites: 2,
    vagas: 2,
    anunciante: "Exemplo Portal Bombinhas",
    texto: "Frente-mar em Bombas, pronto para morar, com sacada ampla.",
  }),
];

export const MOCK_PAGE_BY_URL = new Map(MOCK_PAGES.map((p) => [p.url, p]));
