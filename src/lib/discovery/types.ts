/**
 * Vocabulário do domínio.
 *
 * A arquitetura já nomeia as entidades do futuro motor
 * (DEMANDA -> INTERPRETAÇÃO -> BUSCA -> MATCH -> RELEVÂNCIA -> APRESENTAÇÃO),
 * sem implementar o motor nesta etapa.
 */

export type DemandaId = string;
export type ImovelId = string;
export type MatchId = string;

/** Quem anunciou — nunca presumimos que seja o proprietário. */
export type TipoAnunciante =
  | "proprietario"
  | "corretor"
  | "imobiliaria"
  | "construtora"
  | "portal"
  | "outro"
  | "desconhecido";

/**
 * ORIGEM do anúncio. Só preenchemos o que pode ser identificado com
 * confiança; o restante permanece ausente e aparece como "Não informado".
 * Fonte do anúncio, responsável e proprietário são coisas distintas.
 */
export type Origem = {
  tipo: "anunciante" | "portal" | "demonstracao";
  nome: string;
  anuncianteId?: string;
  fonte?: string;
  urlOriginal?: string;
  idNaFonte?: string;
  anunciante?: string;
  tipoAnunciante?: TipoAnunciante;
  imobiliaria?: string;
  construtora?: string;
  corretorResponsavel?: string;
  proprietario?: string;
  contatoDoAnunciante?: string;
  dataDaColeta?: string;
  dataDaAtualizacao?: string;
};

/** Camada de confiança da informação. */
export type Confianca =
  | "confirmado"
  | "informado"
  | "estimado"
  | "desconhecido"
  | "desatualizado";

export type TipoImovel = "apartamento" | "cobertura" | "casa";
export type StatusObra = "pronto" | "construcao";

/** Resultado da INTERPRETAÇÃO de uma demanda escrita em linguagem natural. */
export interface Intencao {
  demandaId: DemandaId;
  texto: string;
  cidade?: string;
  tipo?: TipoImovel;
  frenteMar?: boolean;
  pertoDoMar?: boolean;
  suites?: number;
  vagas?: number;
  pronto?: boolean;
  orcamentoMax?: number;
  /** Uso pretendido, quando a pessoa deixa isso claro em palavras. */
  uso?: "moradia" | "investimento";
  /**
   * Preferência subjetiva de espaço ("bastante espaço", "amplo").
   * Preferência, nunca metragem: não vira número na apresentação.
   */
  espacoso?: boolean;
  /** Área mínima APENAS quando a pessoa informa a metragem. */
  areaMin?: number;
  /** Chaves que vieram de interpretação de sentido, não de menção literal. */
  inferidos?: string[];
}

/** Um item da leitura apresentada ao usuário. */
export interface LeituraItem {
  chave: string;
  rotulo: string;
  interpretado: boolean;
}

export interface Imovel {
  id: ImovelId;
  titulo: string;
  cidade: string;
  bairro: string;
  tipo: TipoImovel;
  frenteMar: boolean;
  quadraMar: boolean;
  suites: number;
  vagas: number;
  areaPrivativa: number | null;
  status: StatusObra;
  preco: number;
  capa: string;
  galeria: string[];
  descricao: string;
  caracteristicas: string[];
  origem: Origem;
  confianca: Partial<Record<"preco" | "area" | "frenteMar" | "entrega", Confianca>>;
  referenciaLocalizacao: string;
  distanciaMar: string;
}

export type CriterioStatus = "atende" | "parcial" | "nao_atende";

export interface CriterioAvaliado {
  chave: string;
  rotulo: string;
  status: CriterioStatus;
  observacao?: string;
}

/** MATCH entre uma DEMANDA e um IMÓVEL, sempre explicável. */
export interface Match {
  matchId: MatchId;
  demandaId: DemandaId;
  imovelId: ImovelId;
  imovel: Imovel;
  score: number;
  criterios: CriterioAvaliado[];
  divergencias: CriterioAvaliado[];
  exato: boolean;
}

export type ModoResultado = "exato" | "flexibilizado" | "vazio";

export interface ResultadoBusca {
  intencao: Intencao;
  modo: ModoResultado;
  matches: Match[];
  mantidos: string[];
  flexibilizados: string[];
}
