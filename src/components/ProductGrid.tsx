"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "./CartProvider";

type Product = {
  id: number;
  title: string;
  description: string;
  price: number;
  image: string | null;
  category: string;
};

const PAGE_SIZE = 20;
const ALL_CATEGORY = "Все";

function formatPrice(n: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

export function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState(ALL_CATEGORY);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const { add } = useCart();

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch(console.error);
  }, []);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const p of products) {
      if (p.category && !seen.has(p.category)) {
        seen.add(p.category);
        list.push(p.category);
      }
    }
    return [ALL_CATEGORY, ...list];
  }, [products]);

  const filtered =
    category === ALL_CATEGORY ? products : products.filter((p) => p.category === category);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  const selectCategory = (cat: string) => {
    setCategory(cat);
    setVisible(PAGE_SIZE);
  };

  return (
    <div className="product-grid-wrap">
      {categories.length > 2 && (
        <div className="category-filter">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`category-pill${cat === category ? " active" : ""}`}
              onClick={() => selectCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="product-grid">
        {shown.map((p, idx) => (
          <article
            key={p.id}
            className="product-card"
            style={{ animationDelay: `${Math.min(idx, 9) * 0.05}s` }}
          >
            <div className="product-visual">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image || ""} alt={p.title} loading="lazy" />
            </div>
            <div className="product-body">
              <p className="product-cat">{p.category}</p>
              <h3>{p.title}</h3>
              <p className="product-desc">{p.description}</p>
              <div className="product-footer">
                <span className="product-price">{formatPrice(p.price)}</span>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() =>
                    add({
                      productId: p.id,
                      title: p.title,
                      price: p.price,
                    })
                  }
                >
                  В корзину
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {hasMore && (
        <div className="load-more-wrap">
          <button
            type="button"
            className="btn btn-ghost load-more-btn"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
          >
            Загрузить ещё
          </button>
        </div>
      )}
    </div>
  );
}
