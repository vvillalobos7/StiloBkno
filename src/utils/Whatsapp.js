export function buildWhatsAppMessage({ storeName, customer, items, total, notes }) {
  const lines = [];
  lines.push(`Pedido - ${storeName}`);
  lines.push(`Cliente: ${customer?.name || "—"}`);
  if (customer?.phone) lines.push(`Tel: ${customer.phone}`);
  lines.push("");

  items.forEach((it) => {
    lines.push(`• ${it.name} x${it.qty} = $${it.price * it.qty}`);
  });

  lines.push("");
  lines.push(`TOTAL: $${total}`);

  if (notes?.trim()) {
    lines.push("");
    lines.push(`Notas: ${notes.trim()}`);
  }

  return lines.join("\n");
}

export function waLink(phoneInternationalNoPlus, message) {
  return `https://wa.me/${phoneInternationalNoPlus}?text=${encodeURIComponent(message)}`;
}
