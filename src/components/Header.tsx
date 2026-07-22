"use client";

import { usePathname } from "next/navigation";
import { useSiteSettings } from "./SiteSettingsProvider";

export function Header() {
  const { siteName, secondaryName } = useSiteSettings();
  const pathname = usePathname();
  const solid = pathname !== "/";
  const mark = (siteName.trim()[0] || "Ф").toUpperCase();

  return (
    <header className={`site-header${solid ? " site-header-solid" : ""}`}>
      <nav className="nav">
        <a href={solid ? "/#about" : "#about"}>О заказе</a>
        <a href={solid ? "/#menu" : "#menu"}>Ассортимент</a>
        <a href={solid ? "/#contacts" : "#contacts"}>Контакты</a>
      </nav>
    </header>
  );
}
