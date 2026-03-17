export function formatMoney(amount: number, currency = "cUSD") {
  const displayCurrency = currency === "USDC" || currency === "cUSD" ? "USD" : currency;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: displayCurrency,
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
