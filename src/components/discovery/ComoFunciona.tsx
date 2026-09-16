import { useState } from "react";

const MOVIMENTOS = [
  { numero: "01", titulo: "Você conta", texto: "Diga o que procura, do seu jeito." },
  {
    numero: "02",
    titulo: "Nós entendemos",
    texto: "Transformamos sua descrição em critérios de busca.",
  },
  {
    numero: "03",
    titulo: "Nós encontramos",
    texto: "Cruzamos esses critérios e mostramos poucos imóveis relevantes.",
  },
  {
    numero: "04",
    titulo: "Nós explicamos",
    texto: "Você consegue entender por que cada imóvel apareceu.",
  },
];

export function ComoFunciona() {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {aberto ? "Fechar" : "Como funciona?"}
        <span
          className={`transition-transform duration-300 ${aberto ? "rotate-90" : ""}`}
          aria-hidden
        >
          →
        </span>
      </button>

      {aberto ? (
        <div className="fade-in-soft mt-6 grid gap-6 border-t border-border pt-6 sm:grid-cols-2 sm:gap-x-10">
          {MOVIMENTOS.map((movimento) => (
            <div key={movimento.numero} className="flex gap-3">
              <span className="mt-0.5 font-display text-sm text-accent">{movimento.numero}</span>
              <div>
                <p className="text-sm text-foreground">{movimento.titulo}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {movimento.texto}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
