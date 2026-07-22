"use client";

import { useSiteSettings } from "./SiteSettingsProvider";
import { BrandName } from "./BrandName";

export function Hero() {
  const { ready } = useSiteSettings();

  return (
    <section className={`hero hero-bleed${ready ? " hero-ready" : ""}`}>
      {!ready && (
        <div className="hero-loading" aria-hidden>
          <span className="hero-spinner" />
        </div>
      )}

      <div className="hero-media" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero-chef.png" alt="" className="hero-photo" />
        <div className="hero-veil" />
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/IMG_5293-Photoroom (1).png" alt="" className="hero-logo-badge" />

      <div className="hero-copy">
        <BrandName as="p" className="brand-hero" />
        <h1>Стол встречает гостей раньше вас</h1>
        <p className="hero-sub">
          Свежие закуски, собранные вручную — чтобы вечер начался с вкуса,
          а не с суеты.
        </p>
        <div className="hero-cta">
          <a href="#menu" className="btn btn-primary">
            Смотреть ассортимент
          </a>
          <a href="#about" className="btn btn-ghost btn-ghost-light">
            Условия заказа
          </a>
        </div>
      </div>
    </section>
  );
}
