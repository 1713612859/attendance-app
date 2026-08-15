import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Camera, AlertTriangle, Clock3, LogOut, Moon, PartyPopper } from "lucide-react";
import { fetchApplies, fetchClockRecords, getEffectiveShiftSync, PROFILE } from "../lib/mockApi";
import type { ApplyRecord, ClockRecord } from "../types";
import { addMonths, daysInMonth, firstWeekdayOfMonth, formatMonthLabel, pad, toDateStr, toDateTimeStr, todayStr } from "../lib/date";
import { computeDailyAttendance, getDayType } from "../domain/attendance/attendanceCalculator";
import type { DailyAttendanceResult } from "../domain/attendance/attendanceCalculator";
import { getHoliday } from "../lib/holidays";
import { useI18n, leaveTypeLabel } from "../i18n";
import PhotoPreview from "../components/PhotoPreview";

// 迟到/早退分别给独立颜色块，不再合并成一种颜色——两者是不同性质的问题，
// 合并展示会让日历上看不出当天具体是哪一种（甚至两者都有）
const CELL_STYLE: Record<string, string> = {
  absent: "bg-rose-100 text-rose-700",
  "on-leave": "bg-sky-100 text-sky-700",
  holiday: "bg-indigo-100 text-indigo-700",
  late: "bg-amber-100 text-amber-700",
  earlyLeave: "bg-orange-100 text-orange-700",
  normal: "bg-brand-50 text-brand-700",
  none: "text-slate-600",
};

function primaryCellClass(result: DailyAttendanceResult): string {
  if (result.tags.includes("absent")) return CELL_STYLE.absent;
  if (result.tags.includes("on-leave")) return CELL_STYLE["on-leave"];
  if (result.tags.includes("holiday")) return CELL_STYLE.holiday;
  // 两者都发生时，迟到作为主色，早退用小圆点在角上叠加提示（见 dotColorsFor）
  if (result.tags.includes("late")) return CELL_STYLE.late;
  if (result.tags.includes("early-leave")) return CELL_STYLE.earlyLeave;
  if (result.tags.includes("normal")) return CELL_STYLE.normal;
  return CELL_STYLE.none;
}

export default function Records() {
  const { t, lang } = useI18n();

  const [cursor, setCursor] = useState(new Date());
  const [clockRecords, setClockRecords] = useState<ClockRecord[]>([]);
  const [applies, setApplies] = useState<ApplyRecord[]>([]);
  const [selected, setSelected] = useState(todayStr());
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  useEffect(() => {
    fetchClockRecords().then(setClockRecords);
    fetchApplies().then(setApplies);
  }, []);

  const approvedLeaveDates = useMemo(() => {
    const set = new Set<string>();
    applies
      .filter((a): a is Extract<ApplyRecord, { kind: "leave" }> => a.kind === "leave" && a.status === "approved")
      .forEach((a) => {
        const start = new Date(a.startTime);
        const end = new Date(a.endTime);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          set.add(toDateStr(d));
        }
      });
    return set;
  }, [applies]);

  const overtimeByDate = useMemo(() => {
    const map = new Map<string, number>();
    applies
      .filter((a): a is Extract<ApplyRecord, { kind: "overtime" }> => a.kind === "overtime" && a.status === "approved")
      .forEach((a) => map.set(a.date, (map.get(a.date) ?? 0) + a.hours));
    return map;
  }, [applies]);

  function computeFor(dateStr: string): DailyAttendanceResult {
    const shift = getEffectiveShiftSync(PROFILE.employeeId, dateStr);
    return computeDailyAttendance({
      date: dateStr,
      records: clockRecords,
      shift,
      isFullDayLeave: approvedLeaveDates.has(dateStr),
      overtimeHours: overtimeByDate.get(dateStr) ?? 0,
      isFuture: dateStr > todayStr(),
    });
  }

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const total = daysInMonth(cursor);
  const offset = firstWeekdayOfMonth(cursor);
  const cells: (string | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: total }, (_, i) => `${year}-${pad(month + 1)}-${pad(i + 1)}`),
  ];

  const monthPrefix = `${year}-${pad(month + 1)}`;
  const stats = useMemo(() => {
    const days = Array.from({ length: total }, (_, i) => `${monthPrefix}-${pad(i + 1)}`).filter((d) => d <= todayStr());
    const workdays = days.filter((d) => getDayType(d) === "workday");
    let normal = 0,
      late = 0,
      earlyLeave = 0,
      absent = 0,
      leave = 0;
    workdays.forEach((d) => {
      const r = computeFor(d);
      if (r.tags.includes("on-leave")) leave++;
      else if (r.isAbsent) absent++;
      else if (r.punches.allRecords.length > 0) {
        normal++;
        if (r.tags.includes("late")) late++;
        if (r.tags.includes("early-leave")) earlyLeave++;
      }
    });
    let overtimeHours = 0;
    overtimeByDate.forEach((h, d) => {
      if (d.startsWith(monthPrefix)) overtimeHours += h;
    });
    return { should: workdays.length, normal, late, earlyLeave, absent, leave, overtimeHours };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockRecords, applies, monthPrefix, total]);

  const selectedResult = computeFor(selected);
  const selectedHoliday = getHoliday(selected);
  const selectedRecords = selectedResult.punches.allRecords.sort((a, b) => (a.clockTime > b.clockTime ? 1 : -1));
  const selectedLeaves = applies.filter(
    (a): a is Extract<ApplyRecord, { kind: "leave" }> =>
      a.kind === "leave" &&
      a.status === "approved" &&
      selected >= toDateStr(new Date(a.startTime)) &&
      selected <= toDateStr(new Date(a.endTime))
  );

  const weekdayLabels = lang === "zh" ? ["日", "一", "二", "三", "四", "五", "六"] : ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="mx-auto max-w-md animate-page-in px-4 pb-28 pt-6">
      <h1 className="text-lg font-semibold text-slate-800">{t("records.title")}</h1>

      <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm shadow-slate-200">
        <div className="flex items-center justify-between">
          <button onClick={() => setCursor(addMonths(cursor, -1))} className="rounded-full p-2 text-slate-400 active:bg-slate-100" aria-label="prev">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-slate-700">{formatMonthLabel(cursor, lang)}</span>
          <button onClick={() => setCursor(addMonths(cursor, 1))} className="rounded-full p-2 text-slate-400 active:bg-slate-100" aria-label="next">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-[11px] text-slate-400">
          {weekdayLabels.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1.5 text-center">
          {cells.map((dateStr, i) => {
            if (!dateStr) return <span key={i} />;
            const isFuture = dateStr > todayStr();
            const result = isFuture ? null : computeFor(dateStr);
            const isSelected = dateStr === selected;
            const isToday = dateStr === todayStr();
            const cls = result ? primaryCellClass(result) : "text-slate-300";
            const notAbsent = !result?.tags.includes("absent");
            const showOvertimeDot = result?.tags.includes("overtime") && notAbsent;
            // 迟到是主色时，若当天同时早退，用一个橙色小圆点在角上补充提示（反之亦然）
            const showEarlyLeaveDot = result?.tags.includes("late") && result.tags.includes("early-leave") && notAbsent;
            return (
              <button
                key={dateStr}
                onClick={() => setSelected(dateStr)}
                className={`relative mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-2xl text-sm font-medium transition ${
                  isSelected
                    ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30"
                    : isToday
                      ? `ring-2 ring-brand-400 ${cls}`
                      : cls
                }`}
              >
                <span>{Number(dateStr.slice(-2))}</span>
                <span className="absolute right-1 top-1 flex gap-0.5">
                  {showEarlyLeaveDot && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-orange-500"}`} />}
                  {showOvertimeDot && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-violet-500"}`} />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          <LegendChip cls={CELL_STYLE.normal} label={t("records.legendNormal")} />
          <LegendChip cls={CELL_STYLE.late} label={t("records.legendLate")} />
          <LegendChip cls={CELL_STYLE.earlyLeave} label={t("records.legendEarlyLeave")} />
          <LegendChip cls={CELL_STYLE["on-leave"]} label={t("records.legendLeave")} />
          <LegendChip cls={CELL_STYLE.holiday} label={t("records.legendHoliday")} />
          <LegendChip cls={CELL_STYLE.absent} label={t("records.legendAbsent")} />
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            {t("records.legendOvertime")}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatCard label={t("records.should")} value={`${stats.should}`} />
        <StatCard label={t("records.actual")} value={`${stats.normal}`} />
        <StatCard label={t("records.late")} value={`${stats.late}`} warn={stats.late > 0} />
        <StatCard label={t("records.earlyLeave")} value={`${stats.earlyLeave}`} warn={stats.earlyLeave > 0} />
        <StatCard label={t("records.absent")} value={`${stats.absent}`} warn={stats.absent > 0} />
        <StatCard label={t("records.leave")} value={`${stats.leave}`} />
        <StatCard label={t("records.overtime")} value={`${stats.overtimeHours}h`} />
      </div>

      <section className="mt-4">
        {/* 日期标题和标签分两行堆叠，而不是挤在同一个 items-center 行里——
            标签多到换行时，单行布局会互相压住甚至盖到日期上面 */}
        <div className="mb-2">
          <h2 className="text-sm font-semibold text-slate-700">{selected}</h2>
          {(selectedResult.tags.includes("late") ||
            selectedResult.tags.includes("early-leave") ||
            selectedResult.tags.includes("overtime") ||
            selectedResult.tags.includes("on-leave") ||
            selectedHoliday) && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {selectedResult.tags.includes("late") && <Tag icon={Clock3} label={t("records.tagLate")} tone="amber" />}
              {selectedResult.tags.includes("early-leave") && <Tag icon={LogOut} label={t("records.tagEarlyLeave")} tone="orange" />}
              {selectedResult.tags.includes("overtime") && (
                <Tag icon={Moon} label={t("records.tagOvertime", { hours: overtimeByDate.get(selected) ?? 0 })} tone="violet" />
              )}
              {selectedResult.tags.includes("on-leave") && <Tag label={t("records.tagLeave")} tone="sky" />}
              {selectedHoliday && <Tag icon={PartyPopper} label={selectedHoliday.name} tone="indigo" />}
            </div>
          )}
        </div>

        <p className="mb-2 text-xs text-slate-400">
          {t("records.shiftLabel", {
            start: selectedResult.shift.startTime,
            end: selectedResult.shift.endTime,
            name: selectedResult.shift.name,
          })}
        </p>

        {selectedLeaves.length > 0 && (
          <div className="mb-2 rounded-2xl bg-sky-50 p-3 text-xs text-sky-700">
            {t("records.dayLeaveOn", { types: selectedLeaves.map((l) => leaveTypeLabel(lang, l.leaveType)).join("、") })}
          </div>
        )}

        {selectedRecords.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-8 text-center text-sm text-slate-400">
            {selectedResult.isAbsent ? <AlertTriangle size={20} className="text-rose-400" /> : null}
            {selectedResult.isAbsent ? t("records.absentHint") : t("records.noRecord")}
          </div>
        ) : (
          <ul className="space-y-2">
            {selectedRecords.map((r) => {
              const flagged =
                (r.session === "in" && selectedResult.punches.clockIn?.id === r.id && selectedResult.tags.includes("late")) ||
                (r.session === "out" && selectedResult.punches.clockOut?.id === r.id && selectedResult.tags.includes("early-leave"));
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3">
                  {r.photoDataUrl ? (
                    <button onClick={() => setPreviewSrc(r.photoDataUrl)} aria-label={t("clockIn.viewPhoto")} className="shrink-0">
                      <img src={r.photoDataUrl} className="h-12 w-12 rounded-xl object-cover" alt="" />
                    </button>
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                      <Camera size={18} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-slate-700">{r.session === "in" ? t("applyForm.sessionIn") : t("applyForm.sessionOut")}</p>
                      {flagged && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            r.session === "in" ? "bg-amber-50 text-amber-600" : "bg-orange-50 text-orange-600"
                          }`}
                        >
                          {r.session === "in" ? t("records.tagLate") : t("records.tagEarlyLeave")}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-400">
                      {toDateTimeStr(new Date(r.clockTime)).slice(11)}
                      {r.address ? ` · ${r.address}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {previewSrc && <PhotoPreview src={previewSrc} onClose={() => setPreviewSrc(null)} />}
    </div>
  );
}

function LegendChip({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-3 w-3 rounded-md ${cls.split(" ")[0]}`} />
      {label}
    </span>
  );
}

function Tag({ icon: Icon, label, tone }: { icon?: typeof Clock3; label: string; tone: "amber" | "orange" | "violet" | "sky" | "indigo" }) {
  const cls = {
    amber: "bg-amber-50 text-amber-700",
    orange: "bg-orange-50 text-orange-700",
    violet: "bg-violet-50 text-violet-700",
    sky: "bg-sky-50 text-sky-700",
    indigo: "bg-indigo-50 text-indigo-700",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${cls}`}>
      {Icon && <Icon size={11} />}
      {label}
    </span>
  );
}

function StatCard({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm shadow-slate-100">
      <p className={`text-base font-semibold ${warn ? "text-rose-500" : "text-slate-800"}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{label}</p>
    </div>
  );
}
