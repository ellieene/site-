"use client";

import { useEffect, useState } from "react";

type RouletteItem = {
  id: number;
  title: string;
  image: string;
};

export function DishRoulette() {
  const [items, setItems] = useState<RouletteItem[]>([]);

  useEffect(() => {
    fetch("/api/roulette")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch(console.error);
  }, []);

  if (items.length === 0) return null;

  const loop = [...items, ...items];

  return (
    <section className="dish-roulette" aria-label="Фуршетные блюда">
      <div className="roulette-fade left" aria-hidden />
      <div className="roulette-fade right" aria-hidden />
      <div className="roulette-track">
        {loop.map((dish, i) => (
          <figure key={`${dish.id}-${i}`} className="roulette-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dish.image} alt={dish.title} loading="lazy" />
            <figcaption>{dish.title}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
