import type { SyntheticEvent } from "react";

export const FALLBACK_PRODUCT_IMAGE =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='360' viewBox='0 0 480 360'%3E%3Crect width='480' height='360' rx='16' fill='%23f3f6fb'/%3E%3Cpath d='M166 225l38-45 45 55 28-32 37 47H166z' fill='%23cbd5e1'/%3E%3Ccircle cx='312' cy='155' r='24' fill='%23cbd5e1'/%3E%3Crect x='130' y='105' width='220' height='170' rx='14' fill='none' stroke='%2394a3b8' stroke-width='12'/%3E%3Ctext x='50%25' y='320' dominant-baseline='middle' text-anchor='middle' fill='%23667085' font-family='Arial,sans-serif' font-size='22'%3ENo Image%3C/text%3E%3C/svg%3E";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export const API_FILE_BASE_URL = API_BASE_URL.replace(/\/$/, "");

export const resolveImageUrl = (url?: string | null) => {
  const imagePath = String(url || "").trim().replace(/\\/g, "/");

  if (!imagePath) return FALLBACK_PRODUCT_IMAGE;

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  if (imagePath.startsWith("/")) {
    return `${API_FILE_BASE_URL}${encodeURI(imagePath)}`;
  }

  if (imagePath.startsWith("uploads/")) {
    return `${API_FILE_BASE_URL}/${encodeURI(imagePath)}`;
  }

  return `${API_FILE_BASE_URL}/uploads/${encodeURI(imagePath)}`;
};

export const handleImageError = (
  event: SyntheticEvent<HTMLImageElement, Event>,
) => {
  event.currentTarget.onerror = null;
  event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
};
