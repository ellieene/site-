import type { Metadata } from "next";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { CartDrawer } from "@/components/CartDrawer";
import { FloatingCart } from "@/components/FloatingCart";
import { SiteSettingsProvider } from "@/components/SiteSettingsProvider";
import { SITE_URL } from "@/lib/site";

const display = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const sans = Source_Sans_3({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Фуршетное меню | НОВОСИБИРСК",
  description:
    "Фуршетное меню в Новосибирске — фуршетные боксы с доставкой по городу и Краснообску. Заказ от одного бокса, предоплата от 50%.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${display.variable} ${sans.variable}`}>
        <SiteSettingsProvider>
          <CartProvider>
            {children}
            <FloatingCart />
            <CartDrawer />
          </CartProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
