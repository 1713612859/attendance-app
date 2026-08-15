// 考勤计算领域层：迟到/早退/缺勤/请假天数等规则集中在此，禁止在页面组件里散落计算公式。
// P0 修复记录：
// - 迟到判断此前是 `hour >= 9 && minute > 5`，导致 10:00、11:03 等被误判为"未迟到"
//   （因为这些时间的 minute 部分本身 <=5 或恰好卡在边界）。现在统一换算成"当天分钟数"比较。

import type { ClockRecord, ClockSession, Shift } from "../../types";
import { getHoliday } from "../../lib/holidays";

export const DEFAULT_SHIFT: Shift = {
  id: "default",
  name: "Day Shift",
  startTime: "09:00",
  endTime: "18:00",
  graceMinutes: 5,
  crossesMidnight: false,
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
export function isLateClockIn(clockTimeIso: string, shift: Shift): boolean {
  const actual = clockTimeMinutes(clockTimeIso);
  const scheduledStart = toMinutes(shift.startTime);
  return actual > scheduledStart + shift.graceMinutes;
}

/** 早退判断：下班打卡早于班次结束时间 */
export function isEarlyLeaveClockOut(clockTimeIso: string, shift: Shift): boolean {
  const actual = clockTimeMinutes(clockTimeIso);
  const scheduledEnd = toMinutes(shift.endTime);
  return actual < scheduledEnd;
}

export interface DailyPunchResult {
  clockIn?: ClockRecord;
  clockOut?: ClockRecord;
  allRecords: ClockRecord[];
}

/**
 * 打卡记录选择策略：上班取当天所有有效(valid) in 记录中最早一条，
 * 下班取最晚一条。不再直接使用数组第一个元素。
 */
export function selectDailyPunches(records: ClockRecord[], attendanceDate: string): DailyPunchResult {
  const dayRecords = records.filter((r) => r.attendanceDate === attendanceDate && r.status === "valid");
  const ins = dayRecords.filter((r) => r.session === "in").sort((a, b) => (a.clockTime < b.clockTime ? -1 : 1));
  const outs = dayRecords.filter((r) => r.session === "out").sort((a, b) => (a.clockTime < b.clockTime ? -1 : 1));
  return {
    clockIn: ins[0],
    clockOut: outs[outs.length - 1],
    allRecords: dayRecords,
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
  const punches = selectDailyPunches(records, date);
  const tags: AttendanceTag[] = [];

  const isHoliday = dayType === "regular-holiday" || dayType === "special-non-working-holiday";
  if (isHoliday) tags.push("holiday");
  if (isFullDayLeave) tags.push("on-leave");
  if (punches.clockIn && isLateClockIn(punches.clockIn.clockTime, shift)) tags.push("late");
  if (punches.clockOut && isEarlyLeaveClockOut(punches.clockOut.clockTime, shift)) tags.push("early-leave");
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
