import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="legal-page">
      <div className="page-bg" aria-hidden />
      <Header />
      <article className="legal-article">
        <p className="eyebrow">Документы</p>
        <h1>{title}</h1>
        <div className="legal-body">{children}</div>
        <p className="legal-back">
          <a href="/">← На главную</a>
        </p>
      </article>
      <SiteFooter />
    </main>
  );
}
