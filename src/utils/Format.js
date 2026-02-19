export const moneyCLP = (n = 0) => Number(n).toLocaleString("es-CL");

export const safeText = (s) => (s ?? "").toString();

export const slug = (s) =>
  safeText(s)
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
