import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { descobrirNaInternet, type OportunidadeExterna } from "@/lib/discovery/descoberta.functions";
import { formatarPrecoCheio } from "@/lib/discovery/interpret";

/**
 * Oportunidades encontradas fora da nossa base.
 * Mesma linguagem do resto do produto: primeiro por que apareceu,
 * depois o que não corresponde, sempre com a fonte original à vista.
 */

function Linha({
  simbolo,
  label,
  note,
  tom,
}: {
  simbolo: string;
  label: string;
  note: string | null;
  tom: "affirm" | "caution" | "absent";
}) {
  const cor =
    tom === "affirm"
      ? "text-affirm"
      : tom === "caution"
        ? "text-caution"
        : "text-muted-foreground";
  return (
    <li className="flex gap-2.5 text-sm leading-relaxed">
      <span className={`mt-0.5 shrink-0 ${cor}`}>{simbolo}</span>
      <span className="text-foreground">
        {label}
        {note ? <span className="text-muted-foreground"> — {note}</span> : null}
      </span>
    </li>
  );
}

function Oportunidade({ item }: { item: OportunidadeExterna }) {
  const { imovel, explicacao } = item;
  const ficha = [
    imovel.area !== null ? `${imovel.area} m² privativos` : "Área não informada",
    imovel.suites !== null ? `${imovel.suites} suítes` : "Suítes não informadas",
    imovel.parking !== null ? `${imovel.parking} vagas` : "Vagas não informadas",
  ];

  return (
    <article className="fade-in-soft border-t border-border pt-7">
      <p className="text-eyebrow">{explicacao.sourceLine}</p>

      <h3 className="mt-3 font-display text-xl leading-snug text-foreground sm:text-2xl">
        {imovel.title ?? "Anúncio sem título"}
      </h3>

      <p className="mt-1.5 text-sm text-muted-foreground">
        {[imovel.neighborhood, imovel.city].filter(Boolean).join(", ") || "Localização não informada"}
      </p>

      <p className="mt-4 font-display text-lg text-foreground">
        {imovel.price !== null ? formatarPrecoCheio(imovel.price) : "Preço não informado"}
      </p>

      <p className="mt-2 text-sm text-muted-foreground">{ficha.join(" · ")}</p>

      <p className="mt-5 text-eyebrow">Por que este imóvel apareceu?</p>
      <ul className="mt-3 space-y-1.5">
        {explicacao.meets.map((r) => (
          <Linha key={r.label} simbolo="✓" label={r.label} note={r.note} tom="affirm" />
        ))}
        {explicacao.unconfirmed.map((r) => (
          <Linha key={r.label} simbolo="△" label={r.label} note={r.note} tom="caution" />
        ))}
      </ul>

      {explicacao.diverges.length > 0 ? (
        <>
          <p className="mt-5 text-eyebrow">O que não corresponde exatamente</p>
          <ul className="mt-3 space-y-1.5">
            {explicacao.diverges.map((r) => (
              <Linha key={r.label} simbolo="✕" label={r.label} note={r.note} tom="absent" />
            ))}
          </ul>
        </>
      ) : null}

      {explicacao.caveats.length > 0 ? (
        <ul className="mt-5 space-y-1 text-sm text-muted-foreground">
          {explicacao.caveats.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : null}

      <p className="mt-5 text-sm text-muted-foreground">
        Anunciado por {imovel.advertiser ?? "anunciante não informado"}.{" "}
        <a
          href={imovel.sourceUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-accent"
        >
          Ver anúncio original
        </a>
      </p>
    </article>
  );
}

export function OportunidadesExternas({ consulta }: { consulta: string }) {
  const buscar = useServerFn(descobrirNaInternet);

  const { data, isPending, isError } = useQuery({
    queryKey: ["descoberta-externa", consulta],
    queryFn: () => buscar({ data: { texto: consulta } }),
    enabled: consulta.trim() !== "",
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (consulta.trim() === "") return null;

  if (isPending) {
    return (
      <section className="mt-20 border-t border-border pt-10">
        <p className="text-eyebrow">Procurando também fora da nossa base</p>
        <p className="mt-3 text-sm text-muted-foreground">Lendo anúncios publicados na internet…</p>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="mt-20 border-t border-border pt-10">
        <p className="text-eyebrow">Fora da nossa base</p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Não conseguimos consultar fontes externas agora. Preferimos dizer isso a mostrar algo
          que não pudemos verificar.
        </p>
      </section>
    );
  }

  if (!data) return null;

  if (!data.disponivel) {
    if (!data.aviso) return null;
    return (
      <section className="mt-20 border-t border-border pt-10">
        <p className="text-eyebrow">Fora da nossa base</p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{data.aviso}</p>
      </section>
    );
  }

  return (
    <section className="mt-20 border-t border-border pt-10">
      <p className="text-eyebrow">Fora da nossa base</p>
      <h2 className="mt-3 max-w-2xl text-2xl leading-snug sm:text-3xl">
        {data.oportunidades.length > 0
          ? "Também encontramos estas oportunidades publicadas em outras fontes."
          : "Não encontramos, em outras fontes, nada que correspondesse ao que você descreveu."}
      </h2>

      {data.demonstracao ? (
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Os anúncios abaixo vêm de fontes de demonstração, usadas enquanto a busca real na
          internet não está ativada.
        </p>
      ) : null}

      {data.oportunidades.length > 0 ? (
        <div className="mt-10 space-y-10">
          {data.oportunidades.map((item) => (
            <Oportunidade key={item.matchId} item={item} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
