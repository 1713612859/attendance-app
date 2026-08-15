export function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toTimeStr(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function toDateTimeStr(d: Date): string {
  return `${toDateStr(d)} ${toTimeStr(d)}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function monthStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function firstWeekdayOfMonth(d: Date): number {
  // 0 = Sunday
  return new Date(d.getFullYear(), d.getMonth(), 1).getDay();
}

export function isSameDate(a: string, b: string): boolean {
  return a === b;
}

export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatMonthLabel(d: Date, lang: "en" | "zh" = "zh"): string {
  if (lang === "en") return `${EN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

export function diffDaysInclusive(startISO: string, endISO: string): number {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function diffHours(dateStr: string, startHHmm: string, endHHmm: string): number {
  const start = new Date(`${dateStr}T${startHHmm}:00`);
  let end = new Date(`${dateStr}T${endHHmm}:00`);
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return Math.round(hours * 10) / 10;
}
