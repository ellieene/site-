import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const ROUTES = [
  "",
  "/legal/offer",
  "/legal/privacy",
  "/legal/privacy-appendix",
  "/legal/terms",
  "/legal/storage",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified,
  }));
}
