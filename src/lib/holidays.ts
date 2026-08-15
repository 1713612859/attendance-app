// 菲律宾法定节假日（Regular Holiday）与特殊非工作日（Special Non-Working Day）
// 固定日期项按官方历年惯例列出；复活节相关日期（圣周四/圣周五/黑色星期六）用高斯算法计算，
// 可复现且不依赖硬编码猜测。农历新年（Lunar New Year）等按阴历排定的节日未列入——
// 这类日期每年由菲律宾总统正式公告（Proclamation）确定，避免在此处编造未经确认的日期，
// 正式上线前需接入官方节假日数据源或人工按年维护。

export type HolidayType = "regular" | "special";

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  type: HolidayType;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

// 高斯复活节算法（西历，Anonymous Gregorian algorithm）
function computeEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function lastWeekdayOfMonth(year: number, month0: number, weekday: number): Date {
  const last = new Date(year, month0 + 1, 0);
  const diff = (last.getDay() - weekday + 7) % 7;
  return addDays(last, -diff);
}

const cache = new Map<number, Holiday[]>();

export function getPHHolidays(year: number): Holiday[] {
  if (cache.has(year)) return cache.get(year)!;

  const easter = computeEaster(year);
  const maundyThursday = addDays(easter, -3);
  const goodFriday = addDays(easter, -2);
  const blackSaturday = addDays(easter, -1);
  const nationalHeroesDay = lastWeekdayOfMonth(year, 7, 1); // 8月最后一个星期一

  const regular = (date: string, name: string): Holiday => ({ date, name, type: "regular" });
  const special = (date: string, name: string): Holiday => ({ date, name, type: "special" });

  const list: Holiday[] = [
    regular(`${year}-01-01`, "New Year's Day"),
    special(`${year}-02-25`, "EDSA People Power Anniversary"),
    regular(toDateStr(maundyThursday), "Maundy Thursday"),
    regular(toDateStr(goodFriday), "Good Friday"),
    special(toDateStr(blackSaturday), "Black Saturday"),
    regular(`${year}-04-09`, "Araw ng Kagitingan"),
    regular(`${year}-05-01`, "Labor Day"),
    regular(`${year}-06-12`, "Independence Day"),
    special(`${year}-08-21`, "Ninoy Aquino Day"),
    regular(toDateStr(nationalHeroesDay), "National Heroes Day"),
    special(`${year}-11-01`, "All Saints' Day"),
    regular(`${year}-11-30`, "Bonifacio Day"),
    special(`${year}-12-08`, "Feast of the Immaculate Conception"),
    regular(`${year}-12-25`, "Christmas Day"),
    regular(`${year}-12-30`, "Rizal Day"),
    special(`${year}-12-31`, "Last Day of the Year"),
  ].sort((a, b) => (a.date < b.date ? -1 : 1));

  cache.set(year, list);
  return list;
}

export function getHoliday(dateStr: string): Holiday | undefined {
  const year = Number(dateStr.slice(0, 4));
  return getPHHolidays(year).find((h) => h.date === dateStr);
}
