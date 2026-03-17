export interface ParsedInvoiceDraft {
  clientName: string;
  clientEmail: string;
  projectName: string;
  description: string;
  amount: string;
  currency: string;
  dueDate: string;
  notes: string[];
  confidence: "low" | "medium" | "high";
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toDateInput(value: Date) {
  const normalized = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  return normalized.toISOString().slice(0, 10);
}

function nextWeekday(baseDate: Date, weekday: number) {
  const current = baseDate.getDay();
  let delta = (weekday - current + 7) % 7;
  if (delta === 0) delta = 7;
  const next = new Date(baseDate);
  next.setDate(baseDate.getDate() + delta);
  return next;
}

function tryParseDueDate(prompt: string) {
  const lowered = prompt.toLowerCase();
  const now = new Date();

  if (lowered.includes("tomorrow")) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return { dueDate: toDateInput(tomorrow), label: "tomorrow" };
  }

  const nextWeekdayMatch = lowered.match(/due\s+(?:on\s+)?next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (nextWeekdayMatch) {
    const weekday = WEEKDAYS.indexOf(nextWeekdayMatch[1].toLowerCase());
    if (weekday >= 0) {
      return { dueDate: toDateInput(nextWeekday(now, weekday)), label: `next ${nextWeekdayMatch[1]}` };
    }
  }

  const inDaysMatch = lowered.match(/due\s+(?:in\s+)?(\d{1,2})\s+days?/i);
  if (inDaysMatch) {
    const due = new Date(now);
    due.setDate(now.getDate() + Number(inDaysMatch[1]));
    return { dueDate: toDateInput(due), label: `in ${inDaysMatch[1]} days` };
  }

  const inWeeksMatch = lowered.match(/due\s+(?:in\s+)?(\d{1,2})\s+weeks?/i);
  if (inWeeksMatch) {
    const due = new Date(now);
    due.setDate(now.getDate() + Number(inWeeksMatch[1]) * 7);
    return { dueDate: toDateInput(due), label: `in ${inWeeksMatch[1]} weeks` };
  }

  const explicitMatch = prompt.match(/due\s+(?:on\s+)?([A-Za-z]+\s+\d{1,2}(?:,\s*\d{4})?)/i);
  if (explicitMatch) {
    const parsed = new Date(explicitMatch[1]);
    if (!Number.isNaN(parsed.getTime())) {
      return { dueDate: toDateInput(parsed), label: explicitMatch[1] };
    }
  }

  const isoMatch = prompt.match(/(20\d{2}-\d{2}-\d{2})/);
  if (isoMatch) {
    return { dueDate: isoMatch[1], label: isoMatch[1] };
  }

  return null;
}

export function parseInvoicePrompt(prompt: string): ParsedInvoiceDraft {
  const cleanedPrompt = prompt.replace(/\s+/g, " ").trim();
  const notes: string[] = [];
  const lowered = cleanedPrompt.toLowerCase();

  const amountMatch = cleanedPrompt.match(/(?:€|eur\s?)(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s?(?:€|eur)|(?:\$|usd\s?)(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s?(?:\$|usd)|(?:usdc\s?)(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s?usdc/i);

  let amount = "";
  let currency = "USDC";

  if (amountMatch) {
    const rawAmount = amountMatch.slice(1).find(Boolean)?.replace(",", ".") ?? "";
    amount = rawAmount;
    if (/[€]|\beur\b/i.test(amountMatch[0])) currency = "EUR";
    if (/[\$]|\busd\b/i.test(amountMatch[0])) currency = "USD";
    if (/usdc/i.test(amountMatch[0])) currency = "USDC";
  } else {
    notes.push("Could not confidently detect the amount.");
  }

  const due = tryParseDueDate(cleanedPrompt);
  if (!due) {
    notes.push("Could not parse the due date, so it needs a quick manual check.");
  }

  const clientMatch = cleanedPrompt.match(/invoice\s+(.+?)\s+(?:for\s+|€|\$|\d)/i);
  const clientName = clientMatch ? titleCase(clientMatch[1].replace(/\bto\b/i, "").trim()) : "";
  if (!clientName) {
    notes.push("Client name was not obvious from the prompt.");
  }

  const emailMatch = cleanedPrompt.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const clientEmail = emailMatch?.[0] ?? "";

  let description = "";
  const forMatch = cleanedPrompt.match(/for\s+(.+?)(?:\s+due\s+|$)/i);
  if (forMatch) {
    description = forMatch[1].trim();
  }

  let projectName = description ? titleCase(description.split(/,| and /i)[0].trim()) : "";

  if (!projectName && cleanedPrompt) {
    projectName = "Freelance project";
    notes.push("Added a generic project title because the work description was vague.");
  }

  if (!description && projectName) {
    description = projectName;
    notes.push("Using the project title as the description. You can make it more specific.");
  }

  const confidence: ParsedInvoiceDraft["confidence"] =
    clientName && amount && due?.dueDate && description ? "high" : clientName && amount ? "medium" : "low";

  if (lowered.includes("next friday") && due) {
    notes.push(`Interpreted due date as ${due.label}.`);
  }

  if (!clientEmail) {
    notes.push("Email is optional here — leave it blank for the demo or add one manually.");
  }

  return {
    clientName,
    clientEmail,
    projectName,
    description,
    amount,
    currency,
    dueDate: due?.dueDate ?? "",
    notes,
    confidence,
  };
}
