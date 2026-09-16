import { createFileRoute } from "@tanstack/react-router";

import { IntentField } from "@/components/discovery/IntentField";
import { SiteFooter, SiteHeader } from "@/components/discovery/SiteHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Litoral — Diga o que você procura e encontre o imóvel certo" },
      {
        name: "description",
        content:
          "Descoberta imobiliária inteligente: descreva em uma frase o imóvel que faz sentido para você e receba poucas opções realmente relevantes, com explicação de cada match.",
      },
      { property: "og:title", content: "Litoral — Descoberta imobiliária inteligente" },
      {
        property: "og:description",
        content:
          "Você não precisa saber procurar um imóvel. Basta dizer o que procura.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16 sm:py-24">
        <div className="fade-in-soft">
          <p className="text-eyebrow">Descoberta imobiliária</p>
          <h1 className="mt-5 text-[2.6rem] leading-[1.06] sm:text-6xl">
            Diga o que você procura.
            <span className="block text-muted-foreground">A gente encontra o que faz sentido.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
            Sem dezenas de filtros. Escreva sua intenção em uma frase — nós interpretamos,
            procuramos e explicamos por que cada imóvel apareceu.
          </p>
        </div>

        <div className="mt-10 sm:mt-12">
          <IntentField />
        </div>

        <p className="mt-12 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Mostramos poucos imóveis, não centenas. E quando algo não corresponde exatamente
          ao seu pedido, dizemos com clareza o que ficou diferente.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
