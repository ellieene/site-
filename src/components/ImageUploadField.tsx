"use client";

import { useState } from "react";

type Props = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
};

export function ImageUploadField({ value, onChange, label = "Картинка" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const upload = async (file: File | null) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
      onChange(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="image-upload-field">
      <span className="image-upload-label">{label}</span>

      {value && (
        <div className="image-upload-preview-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="image-upload-preview" />
          <p className="image-upload-status">✓ Фото сохранено на сайте</p>
        </div>
      )}

      <div className="image-upload-actions">
        <label className="image-upload-btn">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            disabled={uploading}
            onChange={(e) => upload(e.target.files?.[0] || null)}
          />
          {uploading ? "Загрузка..." : value ? "Заменить фото" : "Загрузить файл"}
        </label>
        {value && (
          <button type="button" className="image-upload-remove" onClick={() => onChange("")}>
            Удалить
          </button>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      <button
        type="button"
        className="image-upload-toggle"
        onClick={() => setShowUrlInput((v) => !v)}
      >
        {showUrlInput ? "Скрыть поле для ссылки" : "…или вставить ссылку на фото вручную"}
      </button>

      {showUrlInput && (
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
        />
      )}
    </div>
  );
}
