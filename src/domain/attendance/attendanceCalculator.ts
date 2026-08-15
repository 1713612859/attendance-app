// 考勤计算领域层：迟到/早退/缺勤/请假天数等规则集中在此，禁止在页面组件里散落计算公式。
// P0 修复记录：
// - 迟到判断此前是 `hour >= 9 && minute > 5`，导致 10:00、11:03 等被误判为"未迟到"
//   （因为这些时间的 minute 部分本身 <=5 或恰好卡在边界）。现在统一换算成"当天分钟数"比较。

import type { ClockRecord, ClockSession, Shift, ShiftSegment } from "../../types";
import { getHoliday } from "../../lib/holidays";

// 默认班次：两段式（上午/下午），数值参照真实后端系统常见配置——
// 允许提前 3 小时打上班卡，下班卡窗口延后到下一段开始前 / 跨夜到次日。
export const DEFAULT_SHIFT: Shift = {
  id: "default",
  name: "Day Shift (Two Segments)",
  graceMinutes: 5,
  segments: [
    {
      id: "seg-am",
      startTime: "08:00",
      endTime: "12:00",
      clockInRequired: true,
      clockInWindowStart: "05:00",
      clockOutRequired: true,
      clockOutWindowEnd: "12:29",
      clockOutWindowCrossesMidnight: false,
    },
    {
      id: "seg-pm",
      startTime: "13:00",
      endTime: "18:00",
      clockInRequired: true,
      clockInWindowStart: "12:30",
      clockOutRequired: true,
      clockOutWindowEnd: "23:59",
      clockOutWindowCrossesMidnight: false,
    },
  ],
};

// 默认排班：周一至周五为工作日，周六周日为休息日。
// 这是一个可替换的集中配置点——真实系统应按员工/部门维度做排班，而不是全局硬编码，
// 但至少此处统一了"哪里判断休息日"的唯一入口，不再散落在各组件里各自写 isWeekend()。
export function isScheduledRestDay(dateStr: string): boolean {
  const day = new Date(dateStr + "T00:00:00").getDay();
  return day === 0 || day === 6; // Sun / Sat
}

export type DayType = "workday" | "rest-day" | "regular-holiday" | "special-non-working-holiday";

export function getDayType(dateStr: string): DayType {
  const holiday = getHoliday(dateStr);
  if (holiday) return holiday.type === "regular" ? "regular-holiday" : "special-non-working-holiday";
  if (isScheduledRestDay(dateStr)) return "rest-day";
  return "workday";
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function clockTimeMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/** 迟到判断：以"当天分钟数"整体比较，而非只比较分钟位，避免 10:00/11:03 被漏判 */
export function isLateForSegment(clockTimeIso: string, segment: ShiftSegment, graceMinutes: number): boolean {
  const actual = clockTimeMinutes(clockTimeIso);
  return actual > toMinutes(segment.startTime) + graceMinutes;
}

/** 早退判断：下班打卡早于该段应下班时间 */
export function isEarlyLeaveForSegment(clockTimeIso: string, segment: ShiftSegment): boolean {
  const actual = clockTimeMinutes(clockTimeIso);
  return actual < toMinutes(segment.endTime);
}

/** 某一段的打卡窗口（相对当天 0 点的分钟数），跨夜时 outEnd 会 >1440 */
export function segmentWindowMinutes(segment: ShiftSegment): { inStart: number; outEnd: number } {
  const inStart = toMinutes(segment.clockInWindowStart);
  const outEnd = toMinutes(segment.clockOutWindowEnd) + (segment.clockOutWindowCrossesMidnight ? 1440 : 0);
  return { inStart, outEnd };
}

/** 当前时间（当天 0 点起的分钟数）是否落在该段的打卡窗口内；跨夜段会额外按 +1440 再判一次，
 *  这样"凌晨 0:30"既能匹配"今天开始、跨夜到明天"的段，也不会漏判本来就该在今天判断的段 */
export function isNowInSegmentWindow(segment: ShiftSegment, nowMinutes: number): boolean {
  const { inStart, outEnd } = segmentWindowMinutes(segment);
  if (nowMinutes >= inStart && nowMinutes <= outEnd) return true;
  if (segment.clockOutWindowCrossesMidnight && nowMinutes + 1440 >= inStart && nowMinutes + 1440 <= outEnd) return true;
  return false;
}

/** 当前生效的段序号：窗口包含"现在"的那一段；不存在（比如两段之间的间隙）时返回 -1 */
export function getActiveSegmentIndex(shift: Shift, now: Date = new Date()): number {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return shift.segments.findIndex((seg) => isNowInSegmentWindow(seg, nowMinutes));
}

export interface SegmentPunchResult {
  segment: ShiftSegment;
  index: number;
  clockIn?: ClockRecord;
  clockOut?: ClockRecord;
}

export interface DailyPunchResult {
  clockIn?: ClockRecord; // 全天最早一次上班打卡（用于迟到判定兜底/展示）
  clockOut?: ClockRecord; // 全天最晚一次下班打卡（用于早退判定兜底/展示）
  allRecords: ClockRecord[];
  bySegment: SegmentPunchResult[];
}

/**
 * 打卡记录按"段"配对：按打卡时间落在哪一段的打卡窗口内匹配，而不是按当天第几次打卡简单排序配对——
 * 顺序配对在非工作时间测试打卡、补卡等场景下会把打卡错配到错误的段（比如 22:34 的打卡被当成
 * "今天第一次上班卡"就配进了第 1 段 08:00–12:00，尽管这个时间明显落在第 2 段的窗口里）。
 * 窗口外的打卡（理论上不应出现，兜底处理）退化为"应出勤时间最接近"的那一段。
 */
export function selectDailyPunches(records: ClockRecord[], attendanceDate: string, shift: Shift = DEFAULT_SHIFT): DailyPunchResult {
  const dayRecords = records
    .filter((r) => r.attendanceDate === attendanceDate && r.status === "valid")
    .sort((a, b) => (a.clockTime < b.clockTime ? -1 : 1));

  function matchSegmentIndex(record: ClockRecord): number {
    const recordMinutes = clockTimeMinutes(record.clockTime);
    const byWindow = shift.segments.findIndex((seg) => isNowInSegmentWindow(seg, recordMinutes));
    if (byWindow >= 0) return byWindow;
    let best = 0;
    let bestDiff = Infinity;
    shift.segments.forEach((seg, i) => {
      const diff = Math.abs(toMinutes(seg.startTime) - recordMinutes);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    });
    return best;
  }

  const bySegment: SegmentPunchResult[] = shift.segments.map((segment, index) => ({ segment, index }));
  dayRecords.forEach((r) => {
    const slot = bySegment[matchSegmentIndex(r)];
    if (r.session === "in") {
      if (!slot.clockIn || r.clockTime < slot.clockIn.clockTime) slot.clockIn = r; // 同段多次上班卡取最早
    } else {
      if (!slot.clockOut || r.clockTime > slot.clockOut.clockTime) slot.clockOut = r; // 同段多次下班卡取最晚
    }
  });

  const ins = dayRecords.filter((r) => r.session === "in");
  const outs = dayRecords.filter((r) => r.session === "out");

  return {
    clockIn: ins[0],
    clockOut: outs[outs.length - 1],
    allRecords: dayRecords,
    bySegment,
  };
}

export type AttendanceTag = "late" | "early-leave" | "overtime" | "on-leave" | "holiday" | "absent" | "normal";

export interface DailyAttendanceResult {
  date: string;
  dayType: DayType;
  shift: Shift;
  punches: DailyPunchResult;
  tags: AttendanceTag[];
  isAbsent: boolean;
}

interface ComputeInput {
  date: string;
  records: ClockRecord[];
  shift: Shift;
  isFullDayLeave: boolean;
  overtimeHours: number;
  isFuture: boolean;
}

export function computeDailyAttendance(input: ComputeInput): DailyAttendanceResult {
  const { date, records, shift, isFullDayLeave, overtimeHours, isFuture } = input;
  const dayType = getDayType(date);
  const punches = selectDailyPunches(records, date, shift);
  const tags: AttendanceTag[] = [];

  const isHoliday = dayType === "regular-holiday" || dayType === "special-non-working-holiday";
  if (isHoliday) tags.push("holiday");
  if (isFullDayLeave) tags.push("on-leave");
  // 迟到/早退按段分别判定，任意一段出现即算当天迟到/早退（日历只做"当天是否有问题"的粗粒度展示，
  // 具体是哪一段、迟到几分钟，在当天详情里按段展开）
  const anyLate = punches.bySegment.some((s) => s.clockIn && isLateForSegment(s.clockIn.clockTime, s.segment, shift.graceMinutes));
  const anyEarly = punches.bySegment.some((s) => s.clockOut && isEarlyLeaveForSegment(s.clockOut.clockTime, s.segment));
  if (anyLate) tags.push("late");
  if (anyEarly) tags.push("early-leave");
  if (overtimeHours > 0) tags.push("overtime");

  // 缺勤：仅工作日、非请假覆盖、且没有任何有效打卡时成立；节假日/休息日/未来日期均不算缺勤
  const isAbsent =
    !isFuture && dayType === "workday" && !isFullDayLeave && punches.allRecords.length === 0;
  if (isAbsent) tags.push("absent");
  if (tags.length === 0 && punches.allRecords.length > 0) tags.push("normal");

  return { date, dayType, shift, punches, tags, isAbsent };
}

/**
 * 请假可扣减天数：仅统计区间内的"排班工作日"，剔除休息日与法定节假日，
 * 不再用自然日 ceil 把周末/节假日也算进请假天数。
 * 仍为日粒度近似（半天假/分钟级重叠计算列为后续 P1，见 BUSINESS_LOGIC_REVIEW.md）。
 */
export function calculateChargeableLeaveDays(startISO: string, endISO: string): number {
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (end < start) return 0;
  let count = 0;
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor <= endDay) {
    const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (getDayType(dateStr) === "workday") count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function otherSession(session: ClockSession): ClockSession {
  return session === "in" ? "out" : "in";
}

/** 把 HH:mm 时间平移 deltaMinutes 分钟，返回平移后的 HH:mm 和"是否跨到了另一天"。
 *  之前 mockApi.ts 里有一份几乎一样的 shiftTimeBy/toMinutesLocal，属于重复实现，统一收到这里。 */
export function shiftTimeByMinutes(time: string, deltaMinutes: number): { time: string; crossedMidnight: boolean } {
  const total = toMinutes(time) + deltaMinutes;
  const crossedMidnight = total >= 1440 || total < 0;
  const norm = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return { time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, crossedMidnight };
}

/**
 * 由"应出勤开始/结束时间"生成一条完整 ShiftSegment：打卡窗口默认提前 2 小时开放上班卡、
 * 下班后延后 4 小时仍可补下班卡（企业可配置的经验值，这里只是合理默认）。
 *
 * 提前窗口如果算出来会跨到前一天（比如应出勤 01:00，提前 2 小时变成前一天 23:00），
 * 这里收敛到当天 00:00，不做真正的"跨天到前一天"窗口——isNowInSegmentWindow 只按
 * "当天分钟数"判断，没有日期上下文，勉强支持反向跨天只会更容易出错。收敛到 00:00
 * 至少保证窗口不是空的（此前的 bug：不做收敛时，窗口区间会变成 [1380, 840] 这种
 * start>end 的空区间，导致整个提前打卡窗口完全打不开）。
 */
export function buildSegmentFromRange(id: string, startTime: string, endTime: string): ShiftSegment {
  const crossesMidnight = toMinutes(endTime) <= toMinutes(startTime);
  const inRaw = shiftTimeByMinutes(startTime, -120);
  const outRaw = shiftTimeByMinutes(endTime, 240);
  return {
    id,
    startTime,
    endTime,
    clockInRequired: true,
    clockInWindowStart: inRaw.crossedMidnight ? "00:00" : inRaw.time,
    clockOutRequired: true,
    clockOutWindowEnd: outRaw.time,
    clockOutWindowCrossesMidnight: crossesMidnight || outRaw.crossedMidnight,
  };
}
