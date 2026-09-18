import { Link } from "@tanstack/react-router";

import { CriterioLinha } from "./CriterioTag";
import { formatarPrecoCheio } from "@/lib/discovery/interpret";
import type { Match } from "@/lib/discovery/types";

const TITULO_DIVERGENCIAS = "O que não corresponde exatamente";

export function PropertyCard({ match, consulta }: { match: Match; consulta: string }) {
  const { imovel, criterios, divergencias, exato } = match;
  const atendidos = criterios.filter((c) => c.status === "atende");

  return (
    <article className="rise-in group overflow-hidden">
      <Link
        to="/imovel/$imovelId"
        params={{ imovelId: imovel.id }}
        search={{ q: consulta }}
        className="block"
      >
        <div className="relative overflow-hidden rounded-2xl bg-surface-deep">
          <img
            src={imovel.capa}
            alt={`${imovel.titulo} — ${imovel.bairro}, ${imovel.cidade}`}
            loading="lazy"
            width={1600}
            height={1104}
            className="aspect-[16/10] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
          />
          <span className="absolute top-4 left-4 rounded-full bg-background/85 px-3 py-1 text-[11px] tracking-wide text-foreground backdrop-blur-sm">
            {exato ? "Atende ao que você descreveu" : "Próximo do que você descreveu"}
          </span>
        </div>
      </Link>

      <div className="grid gap-6 pt-5 md:grid-cols-[1.1fr_1fr] md:gap-10">
        <div>
          <p className="text-eyebrow">
            {imovel.bairro} · {imovel.cidade}
          </p>
          <h3 className="mt-2 text-2xl leading-snug">
            <Link
              to="/imovel/$imovelId"
              params={{ imovelId: imovel.id }}
              search={{ q: consulta }}
              className="transition-colors hover:text-accent"
            >
              {imovel.titulo}
            </Link>
          </h3>
          <p className="mt-3 text-lg text-foreground">{formatarPrecoCheio(imovel.preco)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {imovel.suites} suítes · {imovel.vagas} vagas ·{" "}
            {imovel.areaPrivativa ? `${imovel.areaPrivativa} m² privativos` : "área não informada"} ·{" "}
            {imovel.status === "pronto" ? "Pronto" : "Em construção"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface/60 p-5">
          <p className="text-eyebrow">Por que este imóvel apareceu?</p>

          {atendidos.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {atendidos.slice(0, 5).map((criterio) => (
                <CriterioLinha key={criterio.chave} criterio={criterio} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              É o imóvel mais próximo do conjunto que você descreveu.
            </p>
          )}

          {divergencias.length > 0 ? (
            <div className="mt-5 border-t border-border/70 pt-4">
              <p className="text-sm text-foreground">{TITULO_DIVERGENCIAS}</p>
              <ul className="mt-2 space-y-2">
                {divergencias.map((criterio) => (
                  <CriterioLinha key={criterio.chave} criterio={criterio} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
