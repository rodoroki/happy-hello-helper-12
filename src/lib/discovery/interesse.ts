import type { DemandaId, ImovelId, MatchId, Origem } from "./types";

/**
 * CAPTURA DA DEMANDA — nada de CRM nesta etapa.
 * Apenas o registro do contexto no momento em que alguém demonstra interesse,
 * para que essa informação possa ser usada depois.
 */
export interface RegistroInteresse {
  demandaId: DemandaId;
  imovelId: ImovelId;
  matchId: MatchId | null;
  origem: Origem;
  dataHora: string;
  acao: "falar_sobre_imovel";
  contextoDaDemanda: string;
  /** Reservado para quando existir identificação do usuário. */
  clienteId?: string;
}

/** Ponto único de troca por um envio real de oportunidade no futuro. */
export function registrarInteresse(registro: RegistroInteresse): RegistroInteresse {
  if (typeof window !== "undefined") {
    // Bastidores: fica registrado o contexto, sem aparecer na experiência.
    console.info("[interesse]", registro);
  }
  return registro;
}
