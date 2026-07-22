"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ru">
      <body>
        <main className="error-page error-page-standalone">
          <p className="error-code">Упс</p>
          <h1>Что-то пошло не так</h1>
          <p className="error-text">
            Произошла непредвиденная ошибка. Попробуйте обновить страницу — если не
            поможет, вернитесь на главную.
          </p>
          <div className="error-actions">
            <button type="button" className="btn btn-primary" onClick={() => reset()}>
              Попробовать снова
            </button>
            <a href="/" className="btn btn-ghost">
              На главную
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
