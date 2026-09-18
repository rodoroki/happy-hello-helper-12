import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { IntentField } from "@/components/discovery/IntentField";
import { PropertyCard } from "@/components/discovery/PropertyCard";
import { SiteFooter, SiteHeader } from "@/components/discovery/SiteHeader";
import { formatarMoeda, interpretarIntencao, leituraDaIntencao } from "@/lib/discovery/interpret";
import { buscar } from "@/lib/discovery/match";
import type { Intencao } from "@/lib/discovery/types";

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

/** Sugestões de flexibilização — sugestão, nunca alteração automática. */
function sugestoesDeFolga(intencao: Intencao): string[] {
  const sugestoes: string[] = [];
  if (intencao.orcamentoMax) {
    sugestoes.push(`aumentar o orçamento acima de ${formatarMoeda(intencao.orcamentoMax)}`);
  }
  if (intencao.cidade) sugestoes.push(`considerar outra cidade do litoral além de ${intencao.cidade}`);
  if (intencao.suites) sugestoes.push(`aceitar ${intencao.suites - 1} suítes`);
  if (intencao.frenteMar) sugestoes.push("aceitar a primeira quadra do mar, não só frente-mar");
  if (intencao.pronto) sugestoes.push("considerar imóveis em construção");
  return sugestoes;
}

function Busca() {
  const { q } = Route.useSearch();
  const [pronto, setPronto] = useState(false);
  const [etapa, setEtapa] = useState(0);
  const [ajustando, setAjustando] = useState(false);

  const resultado = useMemo(() => buscar(interpretarIntencao(q)), [q]);
  const leitura = leituraDaIntencao(resultado.intencao);
  const interpretados = leitura.filter((item) => item.interpretado);
  const ditos = leitura.filter((item) => !item.interpretado);

  useEffect(() => {
    setPronto(false);
    setEtapa(0);
    setAjustando(false);
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
          <p className="text-eyebrow">Você escreveu</p>
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

  const sugestoes = sugestoesDeFolga(resultado.intencao);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-10">
        {/* ETAPA 1 — a leitura da intenção, antes de qualquer imóvel */}
        <section className="fade-in-soft max-w-2xl pt-8">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Você escreveu: <span className="text-foreground">“{resultado.intencao.texto}”</span>
          </p>

          <h1 className="mt-6 text-3xl leading-snug sm:text-4xl">Entendi o que você procura.</h1>

          <div className="mt-7">
            {resultado.intencao.cidade ? (
              <p className="font-display text-2xl text-foreground sm:text-3xl">
                {resultado.intencao.cidade}
              </p>
            ) : (
              <p className="font-display text-2xl text-foreground sm:text-3xl">
                Litoral de Santa Catarina
              </p>
            )}

            {leitura.length === 0 ? (
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Sem restrições declaradas — leitura ampla do litoral.
              </p>
            ) : null}

            {resultado.intencao.orcamentoMax ? (
              <p className="mt-2 text-base text-foreground">
                Até {formatarMoeda(resultado.intencao.orcamentoMax)}
              </p>
            ) : null}
          </div>

          {leitura.length > 0 ? (
            <div className="mt-7 grid gap-6 border-t border-border pt-5 sm:grid-cols-2">
              {ditos.length > 0 ? (
                <div>
                  <p className="text-eyebrow">O que você disse</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-foreground">
                    {ditos.map((item) => (
                      <li key={item.chave}>{item.rotulo}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {interpretados.length > 0 ? (
                <div>
                  <p className="text-eyebrow">O que entendemos</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    {interpretados.map((item) => (
                      <li key={item.chave}>{item.rotulo}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-7">
            {ajustando ? (
              <div className="fade-in-soft">
                <p className="text-eyebrow">Reescreva do seu jeito</p>
                <div className="mt-4">
                  <IntentField valorInicial={q} />
                </div>
                <button
                  type="button"
                  onClick={() => setAjustando(false)}
                  className="mt-5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Deixar como está
                </button>
              </div>
            ) : (
              <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                Algo não está certo?
                <button
                  type="button"
                  onClick={() => setAjustando(true)}
                  className="rounded-full border border-border px-4 py-1.5 text-foreground transition-colors hover:border-accent/50"
                >
                  Ajustar busca
                </button>
              </p>
            )}
          </div>
        </section>

        {/* ETAPA 2 — só então, os imóveis */}
        {resultado.matches.length > 0 ? (
          <section className="mt-16 border-t border-border pt-10">
            <h2 className="max-w-2xl text-2xl leading-snug sm:text-3xl">
              {resultado.modo === "exato"
                ? "Encontramos alguns imóveis que fazem sentido."
                : "Não encontramos exatamente isso, mas encontramos opções próximas."}
            </h2>

            {resultado.modo === "flexibilizado" ? (
              <div className="mt-6 max-w-2xl rounded-xl border border-caution/30 bg-caution-soft/60 p-5 text-sm leading-relaxed">
                {resultado.mantidos.length > 0 ? (
                  <p className="text-foreground">
                    Mantivemos: {resultado.mantidos.slice(0, 4).join(", ")}.
                  </p>
                ) : (
                  <p className="text-foreground">Nenhum critério pôde ser mantido por completo.</p>
                )}
                <p className="mt-1 text-muted-foreground">
                  Flexibilizamos: {resultado.flexibilizados.slice(0, 4).join(", ").toLowerCase()}.
                </p>
              </div>
            ) : null}

            <div className="mt-12 space-y-16">
              {resultado.matches.map((match) => (
                <PropertyCard key={match.matchId} match={match} consulta={q} />
              ))}
            </div>
          </section>
        ) : (
          <section className="mt-16 max-w-2xl border-t border-border pt-10">
            <h2 className="text-2xl leading-snug sm:text-3xl">
              Ainda não encontramos exatamente o que você descreveu.
            </h2>
            {sugestoes.length > 0 ? (
              <>
                <p className="mt-6 text-eyebrow">Talvez faça sentido flexibilizar</p>
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {sugestoes.map((sugestao) => (
                    <li key={sugestao}>{sugestao}</li>
                  ))}
                </ul>
                <p className="mt-5 text-sm text-muted-foreground">
                  A escolha continua sua — reescreva a frase do jeito que fizer sentido.
                </p>
              </>
            ) : null}
          </section>
        )}

        <section className="mt-20 border-t border-border pt-10">
          <p className="text-eyebrow">Continue em palavras</p>
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
