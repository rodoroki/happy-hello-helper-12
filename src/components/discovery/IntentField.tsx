import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, AudioLines } from "lucide-react";
import { useRef, useState } from "react";

const EXEMPLOS = [
  "Apartamento frente-mar, 3 suítes, pronto para morar, em Balneário Camboriú, até R$ 5 milhões",
  "Frente-mar em Itapema, 3 suítes, pronto, até R$ 4,5 milhões",
  "Cobertura em Balneário Camboriú com 4 suítes e 3 vagas",
];

export function IntentField({ valorInicial = "" }: { valorInicial?: string }) {
  const navigate = useNavigate();
  const [texto, setTexto] = useState(valorInicial);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  function enviar(consulta: string) {
    const q = consulta.trim();
    if (!q) {
      areaRef.current?.focus();
      return;
    }
    navigate({ to: "/busca", search: { q } });
  }

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="group relative rounded-2xl border border-border bg-card shadow-[0_1px_0_rgba(0,0,0,0.02),0_24px_60px_-40px_rgba(0,0,0,0.35)] transition-colors focus-within:border-accent/60"
      >
        <label htmlFor="intencao" className="sr-only">
          Descreva o imóvel que você procura
        </label>
        <textarea
          id="intencao"
          ref={areaRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar(texto);
            }
          }}
          rows={3}
          placeholder="Descreva o imóvel que você procura..."
          className="w-full resize-none bg-transparent px-6 pt-6 pb-2 font-sans text-lg leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 sm:text-xl"
        />

        <div className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-3 sm:px-5">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <AudioLines className="h-4 w-4 text-accent/70" aria-hidden />
            Escreva como você falaria
          </span>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:gap-3 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Encontrar imóveis
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </form>

      <div className="mt-6 flex flex-col gap-2 sm:mt-7">
        <span className="text-eyebrow">Ou comece por um exemplo</span>
        <div className="flex flex-wrap gap-2">
          {EXEMPLOS.map((exemplo) => (
            <button
              key={exemplo}
              type="button"
              onClick={() => {
                setTexto(exemplo);
                enviar(exemplo);
              }}
              className="max-w-full truncate rounded-full border border-border bg-surface px-4 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
            >
              {exemplo}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
