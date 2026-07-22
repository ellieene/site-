"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "./CartProvider";

export function FloatingCart() {
  const { count, setOpen } = useCart();
  const pathname = usePathname();
  const [overPhoto, setOverPhoto] = useState(false);

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".hero");
    if (!hero) {
      setOverPhoto(false);
      return;
    }

    let ticking = false;
    const update = () => {
      const rect = hero.getBoundingClientRect();
      setOverPhoto(rect.bottom >= window.innerHeight);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  if (pathname?.startsWith("/staff-4f6867e4")) return null;

  return (
    <button
      type="button"
      className={`floating-cart${overPhoto ? " floating-cart-light" : ""}`}
      onClick={() => setOpen(true)}
      aria-label="Открыть корзину"
    >
      <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6 6h15l-1.5 9h-12z" strokeLinejoin="round" />
        <path d="M6 6 5 3H2" strokeLinecap="round" />
        <circle cx="9" cy="20" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="17" cy="20" r="1.3" fill="currentColor" stroke="none" />
      </svg>
      <span className="floating-cart-label">Корзина</span>
      {count > 0 && <span className="floating-cart-badge">{count}</span>}
    </button>
  );
}
