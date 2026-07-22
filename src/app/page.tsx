import { Header } from "@/components/Header";
import { AboutSection } from "@/components/AboutSection";
import { ProductGrid } from "@/components/ProductGrid";
import { SiteFooter } from "@/components/SiteFooter";
import { DishRoulette } from "@/components/DishRoulette";
import { Hero } from "@/components/Hero";

export default function HomePage() {
  return (
    <main id="top">
      <div className="page-bg" aria-hidden />
      <Header />

      <Hero />

      <DishRoulette />

      <AboutSection />

      <section id="menu" className="section menu-section">
        <div className="section-head">
          <h2>Ассортимент</h2>
          <p className="lede">
            Реальные наборы для офиса, дня рождения и тёплого приёма гостей.
          </p>
        </div>
        <ProductGrid />
      </section>

      <SiteFooter />
    </main>
  );
}
