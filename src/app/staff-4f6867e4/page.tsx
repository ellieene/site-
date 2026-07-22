"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageUploadField } from "@/components/ImageUploadField";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

type Product = {
  id: number;
  title: string;
  description: string;
  price: number;
  image: string | null;
  category: string;
  active: number;
};

type Order = {
  id: number;
  phone: string;
  email: string | null;
  notes: string | null;
  total: number;
  status: string;
  created_at: string;
  items: { title: string; qty: number; price: number }[];
};

type Manager = {
  id: number;
  username: string;
  chat_id: string | null;
  name: string | null;
  is_owner: number;
  active: number;
};

type RouletteItem = {
  id: number;
  title: string;
  image: string;
  sort_order: number;
  active: number;
};

type SocialsForm = {
  phone: string;
  telegramUrl: string;
  telegramLabel: string;
  vkUrl: string;
  instagramUrl: string;
  maxUrl: string;
};

type AboutBlockForm = { title: string; itemsText: string };

type FooterInfoForm = { city: string; tagline: string };

const EMPTY_SOCIALS: SocialsForm = {
  phone: "",
  telegramUrl: "",
  telegramLabel: "",
  vkUrl: "",
  instagramUrl: "",
  maxUrl: "",
};

const EMPTY_FOOTER_INFO: FooterInfoForm = {
  city: "",
  tagline: "",
};

const ORDERS_PAGE_SIZE = 5;

const ORDER_STATUSES: { value: string; label: string }[] = [
  { value: "new", label: "Новый" },
  { value: "processing", label: "В работе" },
  { value: "done", label: "Выполнен" },
  { value: "cancelled", label: "Отменён" },
];

const ORDER_SORTS: { value: string; label: string }[] = [
  { value: "date_desc", label: "Сначала новые" },
  { value: "date_asc", label: "Сначала старые" },
  { value: "total_desc", label: "Сумма: сначала большие" },
  { value: "total_asc", label: "Сумма: сначала маленькие" },
];

function formatPrice(n: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function AdminPage() {
  const {
    siteName: liveSiteName,
    secondaryName: liveSecondaryName,
    refresh: refreshSiteName,
  } = useSiteSettings();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<
    | "settings"
    | "socials"
    | "footer"
    | "about"
    | "products"
    | "roulette"
    | "orders"
    | "managers"
    | "reports"
    | "password"
  >("products");

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearchInput, setOrderSearchInput] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderSort, setOrderSort] = useState("date_desc");
  const [managers, setManagers] = useState<Manager[]>([]);
  const [roulette, setRoulette] = useState<RouletteItem[]>([]);
  const [siteNameInput, setSiteNameInput] = useState("Фуршетное меню");
  const [secondaryNameInput, setSecondaryNameInput] = useState("");
  const [socialsForm, setSocialsForm] = useState<SocialsForm>(EMPTY_SOCIALS);
  const [aboutBlocksForm, setAboutBlocksForm] = useState<AboutBlockForm[]>([]);
  const [footerInfoForm, setFooterInfoForm] = useState<FooterInfoForm>(EMPTY_FOOTER_INFO);
  const [reportEmailInput, setReportEmailInput] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "Бокс",
    image: "",
  });

  const [rouletteForm, setRouletteForm] = useState({
    title: "",
    image: "",
    sort_order: "0",
  });
  const [editingRoulette, setEditingRoulette] = useState<RouletteItem | null>(null);

  const [managerForm, setManagerForm] = useState({ username: "", name: "" });

  const loadAll = useCallback(async () => {
    const [p, m, r, s, rep] = await Promise.all([
      fetch("/api/admin/products"),
      fetch("/api/admin/managers"),
      fetch("/api/admin/roulette"),
      fetch("/api/admin/settings"),
      fetch("/api/admin/reports"),
    ]);
    if (p.status === 401) {
      setAuthed(false);
      return;
    }
    setAuthed(true);
    setProducts(await p.json());
    setManagers(await m.json());
    setRoulette(await r.json());
    const settings = await s.json();
    if (settings.siteName) setSiteNameInput(String(settings.siteName));
    setSecondaryNameInput(settings.secondaryName ? String(settings.secondaryName) : "");
    if (settings.socials) setSocialsForm({ ...EMPTY_SOCIALS, ...settings.socials });
    if (Array.isArray(settings.aboutBlocks)) {
      setAboutBlocksForm(
        settings.aboutBlocks.map((b: { title: string; items: string[] }) => ({
          title: b.title,
          itemsText: b.items.join("\n"),
        }))
      );
    }
    if (settings.footerInfo) {
      setFooterInfoForm({ ...EMPTY_FOOTER_INFO, ...settings.footerInfo });
    }
    const reports = await rep.json();
    if (reports.reportEmail) setReportEmailInput(String(reports.reportEmail));
  }, []);

  useEffect(() => {
    loadAll().finally(() => setChecking(false));
  }, [loadAll]);

  useEffect(() => {
    const t = setTimeout(() => setOrderSearch(orderSearchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [orderSearchInput]);

  const fetchOrders = useCallback(
    async (offset: number, reset: boolean) => {
      setOrdersLoading(true);
      const params = new URLSearchParams();
      if (orderSearch) params.set("q", orderSearch);
      if (orderStatusFilter !== "all") params.set("status", orderStatusFilter);
      params.set("sort", orderSort);
      params.set("limit", String(ORDERS_PAGE_SIZE));
      params.set("offset", String(offset));

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (res.status === 401) {
        setAuthed(false);
        setOrdersLoading(false);
        return;
      }
      const data = await res.json();
      setOrders((prev) => (reset ? data.orders : [...prev, ...data.orders]));
      setOrdersTotal(data.total);
      setOrdersLoading(false);
    },
    [orderSearch, orderStatusFilter, orderSort]
  );

  useEffect(() => {
    if (authed) fetchOrders(0, true);
  }, [authed, fetchOrders]);

  const changeOrderStatus = async (id: number, status: string) => {
    const prevOrders = orders;
    setOrders((cur) => cur.map((o) => (o.id === id ? { ...o, status } : o)));
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      setOrders(prevOrders);
      const data = await res.json().catch(() => ({}));
      setMsg(data.error || "Не удалось изменить статус");
    }
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setLoginError("Неверный пароль");
      return;
    }
    setAuthed(true);
    await loadAll();
  };

  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthed(false);
  };

  const saveSiteName = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteName: siteNameInput, secondaryName: secondaryNameInput }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Ошибка");
      return;
    }
    setSiteNameInput(data.siteName);
    setSecondaryNameInput(data.secondaryName || "");
    await refreshSiteName();
    setMsg(`Название сайта: «${data.siteName}»${data.secondaryName ? ` · ${data.secondaryName}` : ""}`);
  };

  const saveSocials = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socials: socialsForm }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Ошибка");
      return;
    }
    setSocialsForm({ ...EMPTY_SOCIALS, ...data.socials });
    await refreshSiteName();
    setMsg("Контакты сохранены");
  };

  const saveFooterInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ footerInfo: footerInfoForm }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Ошибка");
      return;
    }
    setFooterInfoForm({ ...EMPTY_FOOTER_INFO, ...data.footerInfo });
    await refreshSiteName();
    setMsg("Текст в футере сохранён");
  };

  const saveReportEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/admin/reports", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportEmail: reportEmailInput }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Ошибка");
      return;
    }
    setReportEmailInput(data.reportEmail);
    setMsg(`Почта для отчётов: «${data.reportEmail}»`);
  };

  const sendReportNow = async () => {
    setMsg("");
    setReportSending(true);
    const res = await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period: "current" }),
    });
    const data = await res.json();
    setReportSending(false);
    if (!res.ok) {
      setMsg(data.error || "Не удалось отправить отчёт");
      return;
    }
    setMsg(`Отчёт за ${data.label} отправлен на ${data.to} (заказов: ${data.ordersCount})`);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMsg("Новый пароль и подтверждение не совпадают");
      return;
    }

    setPasswordSaving(true);
    const res = await fetch("/api/admin/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }),
    });
    const data = await res.json();
    setPasswordSaving(false);
    if (!res.ok) {
      setMsg(data.error || "Не удалось сменить пароль");
      return;
    }
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setMsg("Пароль изменён");
  };

  const addAboutBlock = () => {
    setAboutBlocksForm((prev) => [...prev, { title: "", itemsText: "" }]);
  };

  const updateAboutBlock = (idx: number, patch: Partial<AboutBlockForm>) => {
    setAboutBlocksForm((prev) =>
      prev.map((b, i) => (i === idx ? { ...b, ...patch } : b))
    );
  };

  const removeAboutBlock = (idx: number) => {
    setAboutBlocksForm((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveAboutBlocks = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    const payload = aboutBlocksForm.map((b) => ({
      title: b.title,
      items: b.itemsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    }));
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aboutBlocks: payload }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Ошибка");
      return;
    }
    setAboutBlocksForm(
      data.aboutBlocks.map((b: { title: string; items: string[] }) => ({
        title: b.title,
        itemsText: b.items.join("\n"),
      }))
    );
    await refreshSiteName();
    setMsg("Блок «Заказ, доставка и юрлица» обновлён");
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Ошибка");
      return;
    }
    setForm({ title: "", description: "", price: "", category: "Бокс", image: "" });
    setMsg("Карточка добавлена");
    await loadAll();
  };

  const removeProduct = async (id: number) => {
    if (!confirm("Удалить карточку?")) return;
    await fetch(`/api/admin/products?id=${id}`, { method: "DELETE" });
    await loadAll();
  };

  const toggleProduct = async (p: Product) => {
    await fetch("/api/admin/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, active: p.active ? 0 : 1 }),
    });
    await loadAll();
  };

  const saveRoulette = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    const payload = {
      title: rouletteForm.title,
      image: rouletteForm.image,
      sort_order: Number(rouletteForm.sort_order) || 0,
      ...(editingRoulette
        ? { id: editingRoulette.id, active: editingRoulette.active }
        : {}),
    };
    const res = await fetch("/api/admin/roulette", {
      method: editingRoulette ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Ошибка");
      return;
    }
    setRouletteForm({ title: "", image: "", sort_order: "0" });
    setEditingRoulette(null);
    setMsg(editingRoulette ? "Слот рулетки обновлён" : "Слот добавлен в рулетку");
    await loadAll();
  };

  const editRoulette = (item: RouletteItem) => {
    setEditingRoulette(item);
    setRouletteForm({
      title: item.title,
      image: item.image,
      sort_order: String(item.sort_order),
    });
    setTab("roulette");
  };

  const removeRoulette = async (id: number) => {
    if (!confirm("Удалить из рулетки?")) return;
    await fetch(`/api/admin/roulette?id=${id}`, { method: "DELETE" });
    if (editingRoulette?.id === id) {
      setEditingRoulette(null);
      setRouletteForm({ title: "", image: "", sort_order: "0" });
    }
    await loadAll();
  };

  const toggleRoulette = async (item: RouletteItem) => {
    await fetch("/api/admin/roulette", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, active: item.active ? 0 : 1 }),
    });
    await loadAll();
  };

  const addManager = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/admin/managers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(managerForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Ошибка");
      return;
    }
    setMsg(data.hint || "Менеджер добавлен");
    setManagerForm({ username: "", name: "" });
    await loadAll();
  };

  const removeManager = async (id: number) => {
    if (!confirm("Удалить менеджера?")) return;
    const res = await fetch(`/api/admin/managers?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Ошибка");
      return;
    }
    await loadAll();
  };

  const testNotify = async () => {
    setMsg("");
    const res = await fetch("/api/admin/managers", { method: "PUT" });
    const data = await res.json();
    setMsg(data.error || "Тестовые уведомления отправлены");
  };

  if (checking) {
    return (
      <main className="admin-page">
        <p>Загрузка...</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="admin-page">
        <form className="admin-login" onSubmit={login}>
          <h1>Админ-панель</h1>
          <p className="muted">Вход для менеджера</p>
          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </label>
          {loginError && <p className="form-error">{loginError}</p>}
          <button type="submit" className="btn btn-primary">
            Войти
          </button>
          <a href="/" className="admin-back">
            ← На сайт
          </a>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-top">
        <div>
          <h1>Админ-панель</h1>
          <p className="muted">Карточки, рулетка, заказы и Telegram</p>
        </div>
        <div className="admin-top-actions">
          <a href="/" className="btn btn-ghost">
            На сайт
          </a>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Выйти
          </button>
        </div>
      </header>

      <div className="admin-tabs">
        <button
          type="button"
          className={tab === "settings" ? "active" : ""}
          onClick={() => setTab("settings")}
        >
          Настройки
        </button>
        <button
          type="button"
          className={tab === "socials" ? "active" : ""}
          onClick={() => setTab("socials")}
        >
          Контакты
        </button>
        <button
          type="button"
          className={tab === "footer" ? "active" : ""}
          onClick={() => setTab("footer")}
        >
          Футер
        </button>
        <button
          type="button"
          className={tab === "about" ? "active" : ""}
          onClick={() => setTab("about")}
        >
          Инфо-блоки ({aboutBlocksForm.length})
        </button>
        <button
          type="button"
          className={tab === "products" ? "active" : ""}
          onClick={() => setTab("products")}
        >
          Карточки
        </button>
        <button
          type="button"
          className={tab === "roulette" ? "active" : ""}
          onClick={() => setTab("roulette")}
        >
          Рулетка ({roulette.length})
        </button>
        <button
          type="button"
          className={tab === "orders" ? "active" : ""}
          onClick={() => setTab("orders")}
        >
          Заказы ({ordersTotal})
        </button>
        <button
          type="button"
          className={tab === "managers" ? "active" : ""}
          onClick={() => setTab("managers")}
        >
          Менеджеры TG
        </button>
        <button
          type="button"
          className={tab === "reports" ? "active" : ""}
          onClick={() => setTab("reports")}
        >
          Отчёты
        </button>
        <button
          type="button"
          className={tab === "password" ? "active" : ""}
          onClick={() => setTab("password")}
        >
          Пароль
        </button>
      </div>

      {msg && <p className="admin-msg">{msg}</p>}

      {tab === "settings" && (
        <form className="admin-card" onSubmit={saveSiteName} style={{ maxWidth: 420 }}>
          <h2>Название сайта</h2>
          <p className="muted">
            Меняется везде: шапка, герой, футер. Сейчас на сайте: «{liveSiteName}
            {liveSecondaryName ? ` · ${liveSecondaryName}` : ""}».
          </p>
          <label>
            Основное название (рус.)
            <input
              required
              minLength={2}
              maxLength={80}
              value={siteNameInput}
              onChange={(e) => setSiteNameInput(e.target.value)}
            />
          </label>
          <label>
            Доп. название-дубль (необязательно)
            <input
              maxLength={70}
              placeholder="UKUSI"
              value={secondaryNameInput}
              onChange={(e) => setSecondaryNameInput(e.target.value)}
            />
          </label>
          <p className="muted">
            Показывается рядом с основным тем же размером и цветом — например, для
            использования незарегистрированного названия только как дубль к
            основному русскому.
          </p>
          <button type="submit" className="btn btn-primary">
            Сохранить
          </button>
        </form>
      )}

      {tab === "socials" && (
        <form className="admin-card" onSubmit={saveSocials} style={{ maxWidth: 420 }}>
          <h2>Контакты</h2>
          <p className="muted">
            Телефон и ссылки на соцсети в футере сайта. Оставьте поле пустым — телефон
            или иконка скроются.
          </p>
          <label>
            Телефон
            <input
              value={socialsForm.phone}
              onChange={(e) => setSocialsForm({ ...socialsForm, phone: e.target.value })}
              placeholder="+7 996 378-33-56"
            />
          </label>
          <label>
            Telegram — ссылка
            <input
              value={socialsForm.telegramUrl}
              onChange={(e) =>
                setSocialsForm({ ...socialsForm, telegramUrl: e.target.value })
              }
              placeholder="https://t.me/username"
            />
          </label>
          <label>
            Telegram — подпись
            <input
              value={socialsForm.telegramLabel}
              onChange={(e) =>
                setSocialsForm({ ...socialsForm, telegramLabel: e.target.value })
              }
              placeholder="@username"
            />
          </label>
          <label>
            ВКонтакте — ссылка
            <input
              value={socialsForm.vkUrl}
              onChange={(e) => setSocialsForm({ ...socialsForm, vkUrl: e.target.value })}
              placeholder="https://vk.com/..."
            />
          </label>
          <label>
            Instagram — ссылка
            <input
              value={socialsForm.instagramUrl}
              onChange={(e) =>
                setSocialsForm({ ...socialsForm, instagramUrl: e.target.value })
              }
              placeholder="https://instagram.com/..."
            />
          </label>
          <label>
            MAX — ссылка
            <input
              value={socialsForm.maxUrl}
              onChange={(e) => setSocialsForm({ ...socialsForm, maxUrl: e.target.value })}
              placeholder="https://max.ru/u/..."
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Сохранить контакты
          </button>
        </form>
      )}

      {tab === "footer" && (
        <form className="admin-card" onSubmit={saveFooterInfo} style={{ maxWidth: 420 }}>
          <h2>Футер</h2>
          <p className="muted">
            Город и короткая подпись под названием сайта в футере.
          </p>
          <label>
            Город
            <input
              maxLength={120}
              value={footerInfoForm.city}
              onChange={(e) => setFooterInfoForm({ ...footerInfoForm, city: e.target.value })}
              placeholder="Краснообск / Новосибирск"
            />
          </label>
          <label>
            Подпись
            <input
              maxLength={160}
              value={footerInfoForm.tagline}
              onChange={(e) =>
                setFooterInfoForm({ ...footerInfoForm, tagline: e.target.value })
              }
              placeholder="Заказ от одного бокса · предоплата от 50%"
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Сохранить
          </button>
        </form>
      )}

      {tab === "about" && (
        <form className="admin-card" onSubmit={saveAboutBlocks}>
          <h2>Блок «Заказ, доставка и юрлица»</h2>
          <p className="muted">
            Каждая строка в поле «Пункты» — отдельная строка списка. Блоки можно
            добавлять, удалять и переименовывать.
          </p>
          {aboutBlocksForm.map((b, idx) => (
            <div
              key={idx}
              className="admin-row"
              style={{ flexDirection: "column", alignItems: "stretch", gap: "0.5rem" }}
            >
              <label>
                Заголовок блока
                <input
                  required
                  value={b.title}
                  onChange={(e) => updateAboutBlock(idx, { title: e.target.value })}
                />
              </label>
              <label>
                Пункты (по одному на строку)
                <textarea
                  rows={4}
                  value={b.itemsText}
                  onChange={(e) => updateAboutBlock(idx, { itemsText: e.target.value })}
                />
              </label>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => removeAboutBlock(idx)}
              >
                Удалить блок
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost" onClick={addAboutBlock}>
            + Добавить блок
          </button>
          <button type="submit" className="btn btn-primary">
            Сохранить блоки
          </button>
        </form>
      )}

      {tab === "products" && (
        <div className="admin-grid">
          <form className="admin-card" onSubmit={addProduct}>
            <h2>Новая карточка</h2>
            <label>
              Название
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Описание
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label>
              Цена, ₽
              <input
                required
                type="number"
                min={0}
                step={1}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>
            <label>
              Категория
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </label>
            <ImageUploadField
              label="Картинка"
              value={form.image}
              onChange={(url) => setForm({ ...form, image: url })}
            />
            <button type="submit" className="btn btn-primary">
              Добавить
            </button>
          </form>

          <div className="admin-list">
            {products.map((p) => (
              <article key={p.id} className="admin-row">
                <div>
                  <strong>{p.title}</strong>
                  <div className="muted">
                    {formatPrice(p.price)} · {p.active ? "на сайте" : "скрыта"}
                  </div>
                  <p>{p.description}</p>
                </div>
                <div className="admin-row-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => toggleProduct(p)}>
                    {p.active ? "Скрыть" : "Показать"}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => removeProduct(p.id)}>
                    Удалить
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === "roulette" && (
        <div className="admin-grid">
          <form className="admin-card" onSubmit={saveRoulette}>
            <h2>{editingRoulette ? "Изменить слот" : "Новый слот рулетки"}</h2>
            <p className="muted">Название и ссылка на фото — появятся в бегущей ленте на главной.</p>
            <label>
              Название
              <input
                required
                value={rouletteForm.title}
                onChange={(e) =>
                  setRouletteForm({ ...rouletteForm, title: e.target.value })
                }
                placeholder="Канапе"
              />
            </label>
            <ImageUploadField
              label="Картинка"
              value={rouletteForm.image}
              onChange={(url) => setRouletteForm({ ...rouletteForm, image: url })}
            />
            <label>
              Порядок (число)
              <input
                type="number"
                value={rouletteForm.sort_order}
                onChange={(e) =>
                  setRouletteForm({ ...rouletteForm, sort_order: e.target.value })
                }
              />
            </label>
            <button type="submit" className="btn btn-primary">
              {editingRoulette ? "Сохранить" : "Добавить"}
            </button>
            {editingRoulette && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setEditingRoulette(null);
                  setRouletteForm({ title: "", image: "", sort_order: "0" });
                }}
              >
                Отмена
              </button>
            )}
          </form>

          <div className="admin-list">
            {roulette.length === 0 && <p className="muted">Рулетка пустая</p>}
            {roulette.map((item) => (
              <article key={item.id} className="admin-row">
                <div className="roulette-row-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt="" className="admin-roulette-preview" />
                  <div>
                    <strong>{item.title}</strong>
                    <div className="muted">
                      порядок {item.sort_order} · {item.active ? "на сайте" : "скрыт"}
                    </div>
                  </div>
                </div>
                <div className="admin-row-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => editRoulette(item)}>
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => toggleRoulette(item)}
                  >
                    {item.active ? "Скрыть" : "Показать"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => removeRoulette(item.id)}
                  >
                    Удалить
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === "orders" && (
        <div>
          <div className="admin-filters">
            <input
              type="search"
              inputMode="tel"
              placeholder="Поиск по номеру телефона"
              value={orderSearchInput}
              onChange={(e) => setOrderSearchInput(e.target.value)}
            />
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
            >
              <option value="all">Все статусы</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select value={orderSort} onChange={(e) => setOrderSort(e.target.value)}>
              {ORDER_SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-list">
            {orders.length === 0 && !ordersLoading && (
              <p className="muted">Ничего не найдено</p>
            )}
            {orders.map((o) => (
              <article key={o.id} className="admin-row">
                <div>
                  <strong>Заказ #{o.id}</strong>
                  <div className="muted">{o.created_at}</div>
                  <p>
                    📞 {o.phone}
                    {o.email ? ` · ✉️ ${o.email}` : ""}
                  </p>
                  {o.notes && <p>📝 {o.notes}</p>}
                  <ul>
                    {o.items.map((i, idx) => (
                      <li key={idx}>
                        {i.title} × {i.qty} — {formatPrice(i.price * i.qty)}
                      </li>
                    ))}
                  </ul>
                  <p>
                    <strong>Итого: {formatPrice(o.total)}</strong>
                  </p>
                </div>
                <div className="admin-row-actions">
                  <select
                    value={o.status}
                    onChange={(e) => changeOrderStatus(o.id, e.target.value)}
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </article>
            ))}
          </div>

          {ordersLoading && <p className="muted">Загрузка...</p>}

          {!ordersLoading && orders.length < ordersTotal && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: "1rem" }}
              onClick={() => fetchOrders(orders.length, false)}
            >
              Показать ещё ({ordersTotal - orders.length})
            </button>
          )}
        </div>
      )}

      {tab === "managers" && (
        <div className="admin-grid">
          <form className="admin-card" onSubmit={addManager}>
            <h2>Добавить менеджера</h2>
            <p className="muted">
              Укажите Telegram-username. После добавления человек должен написать
              боту /start — тогда ему начнут приходить заказы.
            </p>
            <label>
              Username
              <input
                required
                value={managerForm.username}
                onChange={(e) =>
                  setManagerForm({ ...managerForm, username: e.target.value })
                }
                placeholder="@username"
              />
            </label>
            <label>
              Имя (необязательно)
              <input
                value={managerForm.name}
                onChange={(e) => setManagerForm({ ...managerForm, name: e.target.value })}
              />
            </label>
            <button type="submit" className="btn btn-primary">
              Добавить менеджера
            </button>
            <button type="button" className="btn btn-ghost" onClick={testNotify}>
              Тест уведомления
            </button>
          </form>

          <div className="admin-list">
            {managers.map((m) => (
              <article key={m.id} className="admin-row">
                <div>
                  <strong>
                    @{m.username}
                    {m.is_owner ? " · владелец" : ""}
                  </strong>
                  <div className="muted">
                    {m.name || "—"} · {m.chat_id ? "уведомления подключены" : "ждёт /start"} ·{" "}
                    {m.active ? "активен" : "выкл"}
                  </div>
                </div>
                {!m.is_owner && (
                  <div className="admin-row-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => removeManager(m.id)}
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === "reports" && (
        <form className="admin-card" onSubmit={saveReportEmail} style={{ maxWidth: 420 }}>
          <h2>Отчёты по заказам</h2>
          <p className="muted">
            Каждое 1-е число месяца на эту почту автоматически отправляется
            Excel-таблица со всеми заказами за прошлый месяц.
          </p>
          <label>
            Email для отчётов
            <input
              required
              type="email"
              value={reportEmailInput}
              onChange={(e) => setReportEmailInput(e.target.value)}
              placeholder="mail@example.com"
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Сохранить
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={sendReportNow}
            disabled={reportSending}
          >
            {reportSending ? "Отправляем..." : "Отправить тестовый отчёт сейчас"}
          </button>
          <p className="muted">
            Тестовая отправка соберёт заказы с начала текущего месяца по сегодня.
          </p>
        </form>
      )}

      {tab === "password" && (
        <form className="admin-card" onSubmit={changePassword} style={{ maxWidth: 420 }}>
          <h2>Смена пароля</h2>
          <p className="muted">
            Пароль для входа в эту панель. После смены старый пароль перестанет
            работать сразу.
          </p>
          <label>
            Текущий пароль
            <input
              required
              type="password"
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
              }
            />
          </label>
          <label>
            Новый пароль
            <input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, newPassword: e.target.value })
              }
            />
          </label>
          <label>
            Повторите новый пароль
            <input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
              }
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={passwordSaving}>
            {passwordSaving ? "Сохраняем..." : "Сменить пароль"}
          </button>
        </form>
      )}
    </main>
  );
}
