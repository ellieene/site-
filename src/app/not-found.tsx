import Link from "next/link";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";

export default function NotFound() {
  return (
    <main id="top">
      <div className="page-bg" aria-hidden />
      <Header />

      <section className="error-page">
        <p className="error-code">404</p>
        <h1>Страница не найдена</h1>
        <p className="error-text">
          Такой страницы нет — возможно, ссылка устарела или в адресе опечатка.
        </p>
        <div className="error-actions">
          <Link href="/" className="btn btn-primary">
            На главную
          </Link>
          <Link href="/#menu" className="btn btn-ghost">
            Смотреть ассортимент
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
