import { Link } from "@tanstack/react-router";

import { CriterioLinha } from "./CriterioTag";
import { formatarPrecoCheio } from "@/lib/discovery/interpret";
import type { Match } from "@/lib/discovery/types";

export function PropertyCard({ match, consulta }: { match: Match; consulta: string }) {
  const { imovel, criterios, divergencias, exato } = match;

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
            {exato ? "Corresponde ao que você descreveu" : "Muito próximo do que você procura"}
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
          <p className="text-eyebrow">Por que combina com sua busca</p>
          <ul className="mt-3 space-y-2">
            {criterios.slice(0, 5).map((criterio) => (
              <CriterioLinha key={criterio.chave} criterio={criterio} />
            ))}
          </ul>
          {divergencias.length > 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Mostramos a divergência em vez de esconder.
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
