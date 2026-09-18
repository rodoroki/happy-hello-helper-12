import type { CanalContato, ContatoDoAnunciante, Imovel } from "./types";

/**
 * CONTATO — nada é inventado aqui.
 * Só existe destino de contato quando o próprio anúncio traz um contato
 * apropriado, ou quando a plataforma tem um atendimento configurado.
 * Sem isso, a interface informa com elegância que ainda não há canal direto.
 */

export interface DestinoContato {
  canal: CanalContato;
  /** Somente dígitos, no formato internacional. */
  valor: string;
  /** Link pronto, já com a mensagem inicial. */
  url: string;
  /** Quem receberá a conversa, quando isso pode ser dito com honestidade. */
  responsavel?: string;
}

const SO_DIGITOS = /\D+/g;

/** Um WhatsApp brasileiro válido tem 12 ou 13 dígitos com o código do país. */
function normalizarWhatsapp(valor: string): string | null {
  const digitos = valor.replace(SO_DIGITOS, "");
  if (digitos.length < 10 || digitos.length > 15) return null;
  if (digitos.length <= 11) return `55${digitos}`;
  return digitos;
}

function atendimentoDaPlataforma(): ContatoDoAnunciante | null {
  const bruto = import.meta.env["VITE_WHATSAPP_ATENDIMENTO"];
  if (typeof bruto !== "string" || bruto.trim() === "") return null;
  return { canal: "whatsapp", valor: bruto.trim() };
}

/** Mensagem inicial: curta, humana, sem cara de robô. */
export function mensagemInicial(imovel: Imovel): string {
  return [
    "Olá! Vi este imóvel no Litoral e gostaria de saber mais sobre ele.",
    `${imovel.titulo} — ${imovel.bairro}, ${imovel.cidade}.`,
  ].join("\n\n");
}

export function destinoDeContato(imovel: Imovel): DestinoContato | null {
  const contato = imovel.origem.contatoDoAnunciante ?? atendimentoDaPlataforma();
  if (!contato || contato.canal !== "whatsapp") return null;

  const numero = normalizarWhatsapp(contato.valor);
  if (!numero) return null;

  const responsavel =
    imovel.origem.corretorResponsavel ??
    imovel.origem.imobiliaria ??
    imovel.origem.construtora ??
    imovel.origem.anunciante;

  return {
    canal: "whatsapp",
    valor: numero,
    url: `https://wa.me/${numero}?text=${encodeURIComponent(mensagemInicial(imovel))}`,
    ...(responsavel !== undefined && { responsavel }),
  };
}
