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

/** De onde a informação do imóvel veio. */
export type Origem = {
  tipo: "anunciante" | "portal" | "demonstracao";
  nome: string;
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
  suites?: number;
  vagas?: number;
  pronto?: boolean;
  orcamentoMax?: number;
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
