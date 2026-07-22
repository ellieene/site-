"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";

function formatPrice(n: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

export function CartDrawer() {
  const { items, open, setOpen, setQty, remove, total, clear } = useCart();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState("");

  if (!open) return null;

  const handlePhoneChange = (raw: string) => {
    // Если ввели 8 или 7 первым символом — заменяем на +7
    const normalized = /^[78]/.test(raw) ? `+7${raw.slice(1)}` : raw;
    setPhone(normalized);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, email, notes, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка заказа");
      setDone(data.orderId);
      clear();
      setPhone("");
      setEmail("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cart-overlay" onClick={() => setOpen(false)}>
      <aside className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="cart-header">
          <h2>Корзина</h2>
          <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Закрыть">
            ✕
          </button>
        </header>

        {done ? (
          <div className="cart-success">
            <p className="cart-success-title">Заказ принят</p>
            <p>Мы свяжемся с вами для подтверждения. Спасибо!</p>
            <button type="button" className="btn btn-primary" onClick={() => { setDone(null); setOpen(false); }}>
              Закрыть
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="cart-empty">Корзина пока пустая — добавьте бокс из ассортимента.</p>
        ) : (
          <>
            <ul className="cart-list">
              {items.map((item) => (
                <li key={item.productId} className="cart-item">
                  <div>
                    <strong>{item.title}</strong>
                    <div className="muted">{formatPrice(item.price)}</div>
                  </div>
                  <div className="cart-item-actions">
                    <button type="button" onClick={() => setQty(item.productId, item.qty - 1)}>−</button>
                    <span>{item.qty}</span>
                    <button type="button" onClick={() => setQty(item.productId, item.qty + 1)}>+</button>
                    <button type="button" className="linkish" onClick={() => remove(item.productId)}>
                      Удалить
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="cart-total">Итого: {formatPrice(total)}</div>

            <form className="cart-form" onSubmit={submit}>
              <label>
                Телефон *
                <input
                  required
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="+7 ..."
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  name="phone"
                />
              </label>
              <label>
                Почта
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mail@example.com"
                  type="email"
                />
              </label>
              <label>
                Примечания
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Дата, адрес, пожелания..."
                  rows={3}
                />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Отправляем..." : "Оформить заказ"}
              </button>
            </form>
          </>
        )}
      </aside>
    </div>
  );
}
