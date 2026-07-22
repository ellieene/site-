"use client";

import type { ReactNode } from "react";
import { legalLinks } from "@/lib/contacts";
import { useSiteSettings } from "./SiteSettingsProvider";

function phoneToTelHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits;
}

function IconTelegram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.488.02.752-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.695.064-1.226-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function IconMax({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M4 4h4.2l3.8 7.2L15.8 4H20v16h-3.4V9.6L13.2 16h-2.4L7.4 9.6V20H4V4z" />
    </svg>
  );
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
    </svg>
  );
}

function IconVk({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.586-1.496c.596-.19 1.363 1.26 2.174 1.816.613.42 1.078.328 1.078.328l2.163-.03s1.13-.07.594-.958c-.044-.072-.312-.658-1.608-1.86-1.356-1.258-1.174-.055-.47-.86.22-.25 1.52-1.8 1.52-1.8.42-.72.03-.99.03-.99s-.34-.027-.94.03c-.596.056-1.04.36-1.04.36s-.72.48-1.36 1.55c-.54.91-.76.95-.94.76-.22-.21-.17-.82-.17-1.26 0-1.37.208-1.94-.404-2.09-.204-.05-.354-.082-.9-.088-.69-.01-1.274.002-1.606.16-.22.105-.39.34-.286.354.13.016.424.08.58.292.202.274.194 1.03.194 1.03s.116 1.87-.27 2.1c-.266.158-.63-.164-1.412-1.176-.4-.52-.702-1.094-.702-1.094s-.058-.226-.162-.346c-.126-.146-.304-.192-.304-.192s-.91-.027-1.366.27c-.34.222-.256.55-.256.55s1.12 2.62 2.39 3.94c1.164 1.21 2.486 1.13 2.486 1.13z" />
    </svg>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  const ready = Boolean(href);
  if (!ready) {
    return (
      <span className="social-link social-link-muted" title={`${label} — ссылка будет добавлена`}>
        {children}
      </span>
    );
  }
  return (
    <a
      className="social-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
    >
      {children}
    </a>
  );
}

export function SiteFooter() {
  const { siteName, secondaryName, socials, footerInfo } = useSiteSettings();

  return (
    <footer id="contacts" className="site-footer">
      <div className="footer-main">
        <div className="footer-brand-block">
          <p className="footer-brand">
            {siteName}
            {secondaryName && <> · {secondaryName}</>}
          </p>
          <p className="muted">{footerInfo.city}</p>
          <p className="muted">{footerInfo.tagline}</p>
        </div>

        <div className="footer-contacts">
          <p className="footer-label">Контакты</p>
          {socials.phone && (
            <a className="footer-phone" href={`tel:${phoneToTelHref(socials.phone)}`}>
              {socials.phone}
            </a>
          )}
          <div className="social-row">
            <SocialLink href={socials.telegramUrl} label={`Telegram ${socials.telegramLabel}`}>
              <IconTelegram />
            </SocialLink>
            <SocialLink href={socials.maxUrl} label="MAX">
              <IconMax />
            </SocialLink>
            <SocialLink href={socials.instagramUrl} label="Instagram">
              <IconInstagram />
            </SocialLink>
            <SocialLink href={socials.vkUrl} label="ВКонтакте">
              <IconVk />
            </SocialLink>
          </div>
        </div>
      </div>

      <nav className="footer-legal" aria-label="Юридические документы">
        {legalLinks.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
