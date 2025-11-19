import { releases } from "@/data/releases";
import { useAuth } from "@/hooks/use-auth";

const typeLabels: Record<string, string> = {
  feature: "Nova Funcionalidade",
  fix: "Correção",
  perf: "Performance",
  docs: "Documentação",
};

export default function Releases() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-0">
        <header className="flex flex-col gap-4 border-b border-border pb-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Atualizações do Simonia
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">Notas de Lançamento</h1>
            <p className="max-w-xl text-base text-muted-foreground">
              Acompanhe rapidamente tudo o que foi lançado recentemente na plataforma.
              Aqui você encontra todas as novas funcionalidades, correções e melhorias.
            </p>
          </div>
          {isAuthenticated && (
            <div>
              <a
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-white transition hover:bg-foreground/5"
              >
                ← Voltar para o Simonia
              </a>
            </div>
          )}
        </header>

        <section className="flex flex-col gap-8">
          {releases.map((release) => (
            <article
              key={release.version}
              className="flex flex-col gap-4 border-l border-border/80 pl-6"
            >
              <div className="flex items-baseline gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span>{new Date(release.date).toLocaleDateString("pt-BR")}</span>
                <span className="text-primary">{typeLabels[release.type]}</span>
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold">{release.title}</h2>
                <p className="text-sm font-medium text-foreground/70">{release.version}</p>
                <p className="text-base text-muted-foreground">{release.description}</p>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground">O que mudou:</p>
                <ul className="flex flex-col gap-2 text-sm text-foreground/90">
                  {release.changes.map((change, idx) => (
                    <li key={idx} className="flex gap-2 leading-relaxed">
                      <span aria-hidden="true">•</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
