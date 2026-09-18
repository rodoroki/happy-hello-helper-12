import type { CanalContato, DemandaId, ImovelId, MatchId, Origem } from "./types";

/**
 * CAPTURA DA DEMANDA — nada de CRM nesta etapa.
 * Apenas o registro do contexto no momento em que alguém demonstra interesse,
 * para que essa informação possa ser usada depois:
 * DEMANDA -> IMÓVEL -> MATCH -> INTERESSE -> ORIGEM -> ANUNCIANTE -> CONTATO.
 */
export type AcaoInteresse = "falar_sobre_imovel" | "abriu_whatsapp" | "contato_indisponivel";

export interface RegistroInteresse {
  interesseId: string;
  demandaId: DemandaId;
  imovelId: ImovelId;
  matchId: MatchId | null;
  matchScore?: number;
  origem: Origem;
  dataHora: string;
  acao: AcaoInteresse;
  canal: CanalContato | null;
  /** Destino do contato, quando existe. Fica nos bastidores. */
  contatoDestino: string | null;
  contextoDaDemanda: string;
  /** Reservado para quando existir identificação do usuário. */
  clienteId?: string;
}

export type EntradaInteresse = Omit<RegistroInteresse, "interesseId" | "dataHora"> &
  Partial<Pick<RegistroInteresse, "interesseId" | "dataHora">>;

function novoInteresseId(): string {
  const aleatorio =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);
  return `int_${aleatorio}`;
}

/** Ponto único de troca por um envio real de oportunidade no futuro. */
export function registrarInteresse(entrada: EntradaInteresse): RegistroInteresse {
  const registro: RegistroInteresse = {
    ...entrada,
    interesseId: entrada.interesseId ?? novoInteresseId(),
    dataHora: entrada.dataHora ?? new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    // Bastidores: fica registrado o contexto, sem aparecer na experiência.
    console.info("[interesse]", registro);
  }
  return registro;
}
