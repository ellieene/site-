"use client";

import { useSiteSettings } from "./SiteSettingsProvider";

export function AboutSection() {
  const { aboutBlocks } = useSiteSettings();

  return (
    <section id="about" className="section about-section">
      <div className="section-head">
        <p className="eyebrow">Как работаем</p>
        <h2>Заказ, доставка и юрлица</h2>
        <p className="lede">
          Коротко о главном — чтобы было удобно заказать бокс без лишних вопросов.
        </p>
      </div>

      <div className="info-columns">
        {aboutBlocks.map((block, idx) => (
          <article key={idx} className="info-block">
            <h3>{block.title}</h3>
            <ul>
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
