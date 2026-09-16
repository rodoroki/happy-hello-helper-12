import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { IntencaoTag } from "@/components/discovery/CriterioTag";
import { IntentField } from "@/components/discovery/IntentField";
import { PropertyCard } from "@/components/discovery/PropertyCard";
import { SiteFooter, SiteHeader } from "@/components/discovery/SiteHeader";
import { criteriosDaIntencao, interpretarIntencao } from "@/lib/discovery/interpret";
import { buscar } from "@/lib/discovery/match";

export const Route = createFileRoute("/busca")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? search["q"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Entendendo sua busca — Litoral" },
      {
        name: "description",
        content:
          "Veja como sua intenção foi interpretada e quais imóveis realmente correspondem ao que você descreveu, com o motivo de cada match.",
      },
      { property: "og:title", content: "Entendendo sua busca — Litoral" },
      {
        property: "og:description",
        content: "Sua intenção interpretada em critérios, com poucos imóveis relevantes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Busca,
});

const ETAPAS = ["Lendo sua intenção", "Interpretando critérios", "Procurando correspondências"];

function Busca() {
  const { q } = Route.useSearch();
  const [pronto, setPronto] = useState(false);
  const [etapa, setEtapa] = useState(0);

  const resultado = useMemo(() => buscar(interpretarIntencao(q)), [q]);
  const criterios = criteriosDaIntencao(resultado.intencao);

  useEffect(() => {
    setPronto(false);
    setEtapa(0);
    const passos = [
      window.setTimeout(() => setEtapa(1), 480),
      window.setTimeout(() => setEtapa(2), 960),
      window.setTimeout(() => setPronto(true), 1500),
    ];
    return () => passos.forEach(window.clearTimeout);
  }, [q]);

  if (!q) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20">
          <h1 className="text-3xl">Comece dizendo o que você procura</h1>
          <div className="mt-8">
            <IntentField />
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!pronto) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-20">
          <p className="text-eyebrow">Sua intenção</p>
          <p className="mt-4 font-display text-2xl leading-snug text-foreground sm:text-3xl">
            “{q}”
          </p>
          <ul className="mt-10 space-y-3">
            {ETAPAS.map((passo, indice) => (
              <li
                key={passo}
                className={`flex items-center gap-3 text-sm transition-all duration-500 ${
                  indice <= etapa ? "text-foreground opacity-100" : "text-muted-foreground opacity-40"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    indice <= etapa ? "bg-accent" : "bg-border"
                  }`}
                />
                {passo}
              </li>
            ))}
          </ul>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-10">
        <section className="fade-in-soft max-w-2xl pt-6">
          <p className="text-eyebrow">
            {resultado.modo === "exato"
              ? "Entendi o que você procura"
              : "Não encontrei exatamente isso"}
          </p>
          <h1 className="mt-4 text-3xl leading-snug sm:text-4xl">
            {resultado.modo === "exato"
              ? "Encontrei alguns imóveis que realmente correspondem ao que você descreveu."
              : resultado.modo === "flexibilizado"
                ? "Encontrei opções próximas do que você procura."
                : "Nada no acervo atende a esse conjunto de critérios."}
          </h1>

          {criterios.length > 0 ? (
            <div className="mt-7">
              <p className="text-eyebrow">Como interpretei seu pedido</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {criterios.map((criterio) => (
                  <IntencaoTag key={criterio}>{criterio}</IntencaoTag>
                ))}
              </div>
            </div>
          ) : null}

          {resultado.modo === "flexibilizado" ? (
            <div className="mt-7 rounded-xl border border-caution/30 bg-caution-soft/60 p-5 text-sm leading-relaxed">
              {resultado.mantidos.length > 0 ? (
                <p className="text-foreground">
                  Mantivemos {resultado.mantidos.slice(0, 3).join(", ")}.
                </p>
              ) : (
                <p className="text-foreground">
                  Nenhum critério pôde ser mantido por completo.
                </p>
              )}
              <p className="mt-1 text-muted-foreground">
                Flexibilizamos {resultado.flexibilizados.slice(0, 3).join(", ").toLowerCase()}.
              </p>
            </div>
          ) : null}
        </section>

        {resultado.matches.length > 0 ? (
          <section className="mt-14 space-y-16 sm:mt-16">
            {resultado.matches.map((match) => (
              <PropertyCard key={match.matchId} match={match} consulta={q} />
            ))}
          </section>
        ) : (
          <section className="mt-12 rounded-2xl border border-border bg-surface/60 p-8">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Tente descrever com um pouco mais de folga — outra cidade do litoral, um número
              menor de suítes ou um orçamento um pouco maior — e eu mostro o que existe de
              mais próximo.
            </p>
          </section>
        )}

        <section className="mt-20 border-t border-border pt-10">
          <p className="text-eyebrow">Refinar em palavras</p>
          <div className="mt-5">
            <IntentField valorInicial={q} />
          </div>
          <Link to="/" className="mt-8 inline-block text-sm text-muted-foreground hover:text-foreground">
            Começar do zero
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
