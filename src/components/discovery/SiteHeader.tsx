import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:py-8">
      <Link to="/" className="flex items-baseline gap-2">
        <span className="font-display text-xl tracking-tight">Litoral</span>
        <span className="text-eyebrow">Descoberta</span>
      </Link>
      <span className="hidden text-xs text-muted-foreground sm:block">
        Relevância primeiro
      </span>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-6 py-14">
      <div className="border-t border-border pt-6">
        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
          Versão conceitual. Os imóveis exibidos são exemplos de demonstração e não
          representam ofertas reais. Informações não disponíveis aparecem como
          <span className="text-foreground"> não informado</span>.
        </p>
      </div>
    </footer>
  );
}
