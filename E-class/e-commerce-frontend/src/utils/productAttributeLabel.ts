export const PRODUCT_ATTRIBUTE_LABELS: Record<string, string> = {
  COLOR: "Màu sắc",
  Color: "Màu sắc",
  color: "Màu sắc",
  SIZE: "Kích cỡ",
  Size: "Kích cỡ",
  size: "Kích cỡ",
  MATERIAL: "Chất liệu",
  Material: "Chất liệu",
  material: "Chất liệu",
};

export function getProductAttributeLabel(code?: string | null): string {
  if (!code) return "";
  return PRODUCT_ATTRIBUTE_LABELS[code] || code;
}

export function formatVariantAttributes(attributes: Array<[string, unknown]>): string {
  return attributes
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
    .map(([key, value]) => `${getProductAttributeLabel(key)}: ${value}`)
    .join(" | ");
}

export function formatKnownVariantAttributes(values: {
  color?: string | null;
  size?: string | null;
  material?: string | null;
}): string {
  return formatVariantAttributes([
    ["COLOR", values.color],
    ["SIZE", values.size],
    ["MATERIAL", values.material],
  ]);
}

export function normalizeProductAttributeText(text?: string | null): string {
  if (!text) return "";

  return String(text)
    .replace(/\bCOLOR\b|\bColor\b|\bcolor\b/g, "Màu sắc")
    .replace(/\bMàu\b/g, "Màu sắc")
    .replace(/\bSIZE\b|\bSize\b|\bsize\b/g, "Kích cỡ")
    .replace(/\bMATERIAL\b|\bMaterial\b|\bmaterial\b/g, "Chất liệu");
}
