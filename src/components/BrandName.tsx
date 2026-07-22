"use client";

import { useSiteSettings } from "./SiteSettingsProvider";

export function BrandName({
  as: Tag = "span",
  className,
}: {
  as?: "span" | "p" | "h1" | "strong";
  className?: string;
}) {
  const { siteName, secondaryName } = useSiteSettings();
  return (
    <Tag className={className}>
      {siteName}
      {secondaryName && <> · {secondaryName}</>}
    </Tag>
  );
}
