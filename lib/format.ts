export function formatMoney(amount: number, currency = "USDC") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency === "USDC" ? "USD" : currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
