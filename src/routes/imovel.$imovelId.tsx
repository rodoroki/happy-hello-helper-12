import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";

import { ConfiancaTag, CriterioLinha } from "@/components/discovery/CriterioTag";
import { SiteFooter, SiteHeader } from "@/components/discovery/SiteHeader";
import { destinoDeContato } from "@/lib/discovery/contato";
import { buscarImovel } from "@/lib/discovery/imoveis";
import { registrarInteresse } from "@/lib/discovery/interesse";
import { formatarPrecoCheio, interpretarIntencao } from "@/lib/discovery/interpret";
import { matchDoImovel } from "@/lib/discovery/match";

export const Route = createFileRoute("/imovel/$imovelId")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? search["q"] : "",
  }),
  loader: ({ params }) => {
    const imovel = buscarImovel(params.imovelId);
    if (!imovel) throw notFound();
    return { imovel };
  },
  head: ({ loaderData }) => {
    const titulo = loaderData?.imovel
      ? `${loaderData.imovel.titulo} — ${loaderData.imovel.cidade}`
      : "Imóvel — Litoral";
    return {
      meta: [
        { title: titulo },
        {
          name: "description",
          content: loaderData?.imovel
            ? `${loaderData.imovel.titulo} em ${loaderData.imovel.bairro}, ${loaderData.imovel.cidade}. Veja informações essenciais, localização e por que este imóvel corresponde à sua busca.`
            : "Detalhes do imóvel e explicação do match com sua busca.",
        },
        { property: "og:title", content: titulo },
        {
          property: "og:description",
          content: "Informações essenciais, localização e explicação do match.",
        },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: PaginaImovel,
});

function PaginaImovel() {
  const { imovel } = Route.useLoaderData();
  const { q } = Route.useSearch();
  const [contatoAberto, setContatoAberto] = useState(false);
  const match = q ? matchDoImovel(interpretarIntencao(q), imovel) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6">
        <Link
          to="/busca"
          search={{ q }}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Voltar aos resultados
        </Link>

        <figure className="mt-6 overflow-hidden rounded-2xl bg-surface-deep">
          <img
            src={imovel.capa}
            alt={`${imovel.titulo} — ${imovel.bairro}, ${imovel.cidade}`}
            width={1600}
            height={1104}
            className="aspect-[16/9] w-full object-cover"
          />
        </figure>

        <div className="mt-3 grid grid-cols-3 gap-3">
          {imovel.galeria.slice(1, 4).map((imagem, indice) => (
            <img
              key={`${imagem}-${indice}`}
              src={imagem}
              alt={`Ambiente do imóvel em ${imovel.bairro}`}
              loading="lazy"
              width={1600}
              height={1104}
              className="aspect-[4/3] w-full rounded-xl object-cover"
            />
          ))}
        </div>

        <div className="mt-12 grid gap-14 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-eyebrow">
              {imovel.bairro} · {imovel.cidade}
            </p>
            <h1 className="mt-3 text-4xl leading-tight">{imovel.titulo}</h1>
            <p className="mt-5 text-2xl">{formatarPrecoCheio(imovel.preco)}</p>

            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-border py-7 sm:grid-cols-4">
              {[
                { rotulo: "Suítes", valor: String(imovel.suites) },
                { rotulo: "Vagas", valor: String(imovel.vagas) },
                {
                  rotulo: "Área privativa",
                  valor: imovel.areaPrivativa ? `${imovel.areaPrivativa} m²` : "Não informado",
                },
                { rotulo: "Situação", valor: imovel.status === "pronto" ? "Pronto" : "Em construção" },
              ].map((item) => (
                <div key={item.rotulo}>
                  <dt className="text-eyebrow">{item.rotulo}</dt>
                  <dd className="mt-1 text-base text-foreground">{item.valor}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-8 max-w-xl leading-relaxed text-muted-foreground">{imovel.descricao}</p>

            <div className="mt-9">
              <p className="text-eyebrow">Características</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {imovel.caracteristicas.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[13px]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-12">
              <p className="text-eyebrow">Localização</p>
              <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
                <div
                  className="relative h-44 w-full"
                  style={{
                    backgroundImage:
                      "linear-gradient(0deg, color-mix(in oklch, var(--color-surface-deep) 60%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklch, var(--color-surface-deep) 60%, transparent) 1px, transparent 1px)",
                    backgroundSize: "34px 34px",
                  }}
                >
                  <span className="absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-4 ring-accent/20" />
                </div>
                <div className="border-t border-border px-5 py-4 text-sm">
                  <p className="text-foreground">{imovel.referenciaLocalizacao}</p>
                  <p className="mt-1 text-muted-foreground">{imovel.distanciaMar}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                O mapa serve para confirmar a localização — a descoberta acontece antes dele.
              </p>
            </div>
          </div>

          <aside className="lg:sticky lg:top-10 lg:self-start">
            {match ? (
              <div className="rounded-2xl border border-border bg-card p-6">
                <p className="text-eyebrow">
                  {match.exato ? "Por que combina com sua busca" : "Muito próximo do que você procura"}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {match.criterios.map((criterio) => (
                    <CriterioLinha key={criterio.chave} criterio={criterio} />
                  ))}
                </ul>
                {match.divergencias.length > 0 ? (
                  <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                    A transparência vem antes de parecer perfeito: as divergências acima fazem
                    parte da recomendação.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-6">
                <p className="text-sm text-muted-foreground">
                  Descreva o que você procura para ver por que este imóvel apareceria na sua busca.
                </p>
                <Link
                  to="/"
                  className="mt-4 inline-block text-sm text-accent hover:underline"
                >
                  Dizer o que procuro
                </Link>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-border bg-surface/60 p-6">
              <p className="text-eyebrow">Origem da informação</p>
              <p className="mt-2 text-sm text-foreground">{imovel.origem.nome}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {imovel.confianca.preco ? (
                  <ConfiancaTag campo="Preço" nivel={imovel.confianca.preco} />
                ) : null}
                {imovel.confianca.area ? (
                  <ConfiancaTag campo="Área" nivel={imovel.confianca.area} />
                ) : null}
                {imovel.confianca.entrega ? (
                  <ConfiancaTag campo="Entrega" nivel={imovel.confianca.entrega} />
                ) : null}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Imóvel de demonstração. Nenhum dado real foi inventado nesta versão conceitual.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-card p-6">
              <p className="text-base text-foreground">Gostou deste imóvel?</p>
              <button
                type="button"
                onClick={() => {
                  const registroBase = {
                    demandaId: match?.demandaId ?? "dem_sem_busca",
                    imovelId: imovel.id,
                    matchId: match?.matchId ?? null,
                    origem: imovel.origem,
                    contextoDaDemanda: q,
                    ...(match ? { matchScore: match.score } : {}),
                  };
                  registrarInteresse({
                    ...registroBase,
                    acao: "falar_sobre_imovel",
                    canal: destino ? destino.canal : null,
                    contatoDestino: destino ? destino.valor : null,
                  });

                  if (destino) {
                    registrarInteresse({
                      ...registroBase,
                      acao: "abriu_whatsapp",
                      canal: destino.canal,
                      contatoDestino: destino.valor,
                    });
                    window.open(destino.url, "_blank", "noopener,noreferrer");
                    return;
                  }

                  registrarInteresse({
                    ...registroBase,
                    acao: "contato_indisponivel",
                    canal: null,
                    contatoDestino: null,
                  });
                  setContatoAberto(true);
                }}
                className="mt-4 w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Falar sobre este imóvel
              </button>
              {destino ? (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  A conversa continua no WhatsApp
                  {destino.responsavel ? `, com ${destino.responsavel}` : ""}.
                </p>
              ) : null}
              {contatoAberto && !destino ? (
                <p className="fade-in-soft mt-4 text-sm leading-relaxed text-muted-foreground">
                  Guardamos o contexto da sua busca junto deste imóvel. O contato direto deste
                  anúncio ainda não está disponível — assim que estiver, a conversa começa aqui.
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
