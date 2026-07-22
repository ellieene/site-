"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type SocialLinks = {
  phone: string;
  telegramUrl: string;
  telegramLabel: string;
  vkUrl: string;
  instagramUrl: string;
  maxUrl: string;
};

export type AboutBlock = {
  title: string;
  items: string[];
};

export type FooterInfo = {
  city: string;
  tagline: string;
};

const DEFAULT_SOCIALS: SocialLinks = {
  phone: "+7 996 378-33-56",
  telegramUrl: "https://t.me/annbereg",
  telegramLabel: "@annbereg",
  vkUrl: "",
  instagramUrl: "",
  maxUrl: "",
};

const DEFAULT_FOOTER_INFO: FooterInfo = {
  city: "Краснообск / Новосибирск",
  tagline: "Заказ от одного бокса · предоплата от 50%",
};

const DEFAULT_ABOUT_BLOCKS: AboutBlock[] = [
  {
    title: "Заказ",
    items: [
      "Заказ от одного бокса",
      "Заказ за 2–3 дня (рекомендую бронировать нужную вам дату заранее, особенно выходные и праздничные дни)",
      "Заказ принимаю по предоплате от 50%. Остаток при доставке или до передачи заказа курьеру",
    ],
  },
  {
    title: "Доставка",
    items: [
      "Самовывоз Краснообск",
      "По Краснообску — бесплатно",
      "По Новосибирску и области: бесплатная доставка для заказов от 15 000₽ (за исключением отдаленных районов)",
      "Курьер Яндекс.Go по тарифам сервиса",
    ],
  },
  {
    title: "Работа с юрлицами",
    items: [
      "С юридическими лицами работаю — сформирую счет, договор, акт",
      "Отсрочку не предоставляю",
    ],
  },
];

type Settings = {
  siteName: string;
  secondaryName: string;
  socials: SocialLinks;
  aboutBlocks: AboutBlock[];
  footerInfo: FooterInfo;
  ready: boolean;
  refresh: () => Promise<void>;
};

const SettingsContext = createContext<Settings>({
  siteName: "",
  secondaryName: "",
  socials: DEFAULT_SOCIALS,
  aboutBlocks: DEFAULT_ABOUT_BLOCKS,
  footerInfo: DEFAULT_FOOTER_INFO,
  ready: false,
  refresh: async () => {},
});

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [siteName, setSiteName] = useState("");
  const [secondaryName, setSecondaryName] = useState("");
  const [socials, setSocials] = useState<SocialLinks>(DEFAULT_SOCIALS);
  const [aboutBlocks, setAboutBlocks] = useState<AboutBlock[]>(DEFAULT_ABOUT_BLOCKS);
  const [footerInfo, setFooterInfo] = useState<FooterInfo>(DEFAULT_FOOTER_INFO);
  const [ready, setReady] = useState(false);

  const refresh = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.siteName) setSiteName(String(data.siteName));
      setSecondaryName(data.secondaryName ? String(data.secondaryName) : "");
      if (data.socials && typeof data.socials === "object") {
        setSocials({ ...DEFAULT_SOCIALS, ...data.socials });
      }
      if (Array.isArray(data.aboutBlocks) && data.aboutBlocks.length > 0) {
        setAboutBlocks(data.aboutBlocks);
      }
      if (data.footerInfo && typeof data.footerInfo === "object") {
        setFooterInfo({ ...DEFAULT_FOOTER_INFO, ...data.footerInfo });
      }
    } catch {
      /* keep defaults */
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <SettingsContext.Provider
      value={{ siteName, secondaryName, socials, aboutBlocks, footerInfo, ready, refresh }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SettingsContext);
}
