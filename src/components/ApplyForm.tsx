import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { LEAVE_TYPES } from "../types";
import type { ApplyKind, ApplyRecord, ClockSession, LeaveType, OvertimeType } from "../types";
import { uid } from "../lib/storage";
import { diffHours, todayStr } from "../lib/date";
import { calculateChargeableLeaveDays, getDayType } from "../domain/attendance/attendanceCalculator";
import { useI18n, leaveTypeLabel } from "../i18n";
import { PROFILE } from "../lib/mockApi";
import Sheet from "./Sheet";
import DateField from "./DateField";
import TimeField from "./TimeField";
import SelectField from "./SelectField";

interface Props {
  kind: ApplyKind;
  onClose: () => void;
  onSubmit: (record: ApplyRecord) => void;
}

function minDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 系统按日期自动识别加班类型（工作日/休息日/特殊非工作日/法定节假日），
// 不再让员工手动选——避免选择值和实际日期类型不一致
function dayTypeToOvertimeType(dateStr: string): OvertimeType {
  const dt = getDayType(dateStr);
  if (dt === "regular-holiday") return "regular-holiday";
  if (dt === "special-non-working-holiday") return "special-holiday";
  if (dt === "rest-day") return "restday";
  return "workday";
}

export default function ApplyForm({ kind, onClose, onSubmit }: Props) {
  const { t, lang } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 补卡
  const [correctionDate, setCorrectionDate] = useState(todayStr());
  const [correctionSession, setCorrectionSession] = useState<ClockSession>("in");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionFile, setCorrectionFile] = useState<string | undefined>();

  // 请假（拆分日期/时间两个字段，比原生 datetime-local 更贴合移动端交互习惯）
  const [leaveType, setLeaveType] = useState<LeaveType>(LEAVE_TYPES[0]);
  const [leaveStartDate, setLeaveStartDate] = useState(todayStr());
  const [leaveStartTime, setLeaveStartTime] = useState("09:00");
  const [leaveEndDate, setLeaveEndDate] = useState(todayStr());
  const [leaveEndTime, setLeaveEndTime] = useState("18:00");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveFile, setLeaveFile] = useState<string | undefined>();
  const leaveStart = `${leaveStartDate}T${leaveStartTime}`;
  const leaveEnd = `${leaveEndDate}T${leaveEndTime}`;

  // 加班：otType 不再手动选择，由日期自动推断（见下方 otTypeAuto）
  const [otDate, setOtDate] = useState(todayStr());
  const [otStart, setOtStart] = useState("19:00");
  const [otEnd, setOtEnd] = useState("21:00");
  const [otReason, setOtReason] = useState("");
  const otTypeAuto = dayTypeToOvertimeType(otDate);
  const OT_TYPE_LABEL: Record<OvertimeType, string> = {
    workday: t("applyForm.otTypeWorkday"),
    restday: t("applyForm.otTypeRestday"),
    "special-holiday": t("applyForm.otTypeSpecialHoliday"),
    "regular-holiday": t("applyForm.otTypeRegularHoliday"),
  };

  // 班次调整（结构化时间，便于考勤记录模块按生效日期联动迟到/早退判定）
  const [shiftDate, setShiftDate] = useState(todayStr());
  const [currentStart, setCurrentStart] = useState("09:00");
  const [currentEnd, setCurrentEnd] = useState("18:00");
  const [requestedStart, setRequestedStart] = useState("13:00");
  const [requestedEnd, setRequestedEnd] = useState("22:00");
  const [shiftReason, setShiftReason] = useState("");

  // 离职
  const [resignDate, setResignDate] = useState(todayStr());
  const [resignReason, setResignReason] = useState("");
  const [resignHandover, setResignHandover] = useState("");

  const needsAttachment = kind === "leave" && leaveType === "SL";

  const TITLES: Record<ApplyKind, string> = {
    correction: t("applyForm.titleCorrection"),
    leave: t("applyForm.titleLeave"),
    overtime: t("applyForm.titleOvertime"),
    shift: t("applyForm.titleShift"),
    resignation: t("applyForm.titleResignation"),
  };

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) {
    const file = e.target.files?.[0];
    if (!file) return;
    setter(await fileToDataUrl(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (kind === "correction") {
      if (!correctionReason.trim()) return setError(t("applyForm.errCorrectionReason"));
      if (correctionDate < minDate(3) || correctionDate > todayStr()) {
        return setError(t("applyForm.errCorrectionRange"));
      }
    }
    if (kind === "leave") {
      if (!leaveReason.trim()) return setError(t("applyForm.errLeaveReason"));
      if (leaveEnd < leaveStart) return setError(t("applyForm.errLeaveRange"));
      if (needsAttachment && !leaveFile) return setError(t("applyForm.errLeaveAttachment"));
    }
    if (kind === "overtime") {
      if (!otReason.trim()) return setError(t("applyForm.errOtReason"));
      if (otEnd === otStart) return setError(t("applyForm.errOtZero"));
    }
    if (kind === "shift") {
      if (!shiftReason.trim()) return setError(t("applyForm.errShiftFields"));
      if (requestedEnd === requestedStart) return setError(t("applyForm.errShiftRange"));
    }
    if (kind === "resignation") {
      if (!resignReason.trim()) return setError(t("applyForm.errResignReason"));
    }

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));

    const base = { id: uid(), employeeId: PROFILE.employeeId, status: "pending" as const, submittedAt: new Date().toISOString() };
    let record: ApplyRecord;
    if (kind === "correction") {
      record = { ...base, kind, date: correctionDate, session: correctionSession, reason: correctionReason, attachmentDataUrl: correctionFile };
    } else if (kind === "leave") {
      record = {
        ...base,
        kind,
        leaveType,
        startTime: leaveStart,
        endTime: leaveEnd,
        days: calculateChargeableLeaveDays(leaveStart, leaveEnd),
        reason: leaveReason,
        attachmentDataUrl: leaveFile,
      };
    } else if (kind === "overtime") {
      record = {
        ...base,
        kind,
        date: otDate,
        startTime: otStart,
        endTime: otEnd,
        hours: diffHours(otDate, otStart, otEnd),
        otType: otTypeAuto,
        reason: otReason,
      };
    } else if (kind === "shift") {
      record = {
        ...base,
        kind,
        effectiveDate: shiftDate,
        currentStart,
        currentEnd,
        requestedStart,
        requestedEnd,
        reason: shiftReason,
      };
    } else {
      record = {
        ...base,
        kind,
        lastWorkingDate: resignDate,
        reason: resignReason,
        handoverNotes: resignHandover || undefined,
      };
    }
    setSubmitting(false);
    onSubmit(record);
  }

  return (
    <Sheet title={TITLES[kind]} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {kind === "correction" && (
          <>
            <Field label={t("applyForm.correctionDate")} required>
              <DateField value={correctionDate} onChange={setCorrectionDate} min={minDate(3)} max={todayStr()} />
              <p className="mt-1 text-[11px] text-slate-400">{t("applyForm.correctionDateHint")}</p>
            </Field>
            <Field label={t("applyForm.correctionSession")} required>
              <div className="flex gap-2">
                {(["in", "out"] as ClockSession[]).map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setCorrectionSession(s)}
                    className={`flex-1 rounded-xl border py-2 text-sm ${
                      correctionSession === s ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500"
                    }`}
                  >
                    {s === "in" ? t("applyForm.sessionIn") : t("applyForm.sessionOut")}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t("applyForm.correctionReason")} required>
              <textarea
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={3}
                placeholder={t("applyForm.correctionReasonPlaceholder")}
                className="input resize-none"
              />
              <p className="mt-1 text-right text-[11px] text-slate-300">{correctionReason.length}/200</p>
            </Field>
            <Field label={`${t("applyForm.attachment")}${t("common.optional")}`}>
              <input type="file" accept="image/*" onChange={(e) => handleFile(e, setCorrectionFile)} className="text-xs" />
            </Field>
          </>
        )}

        {kind === "leave" && (
          <>
            <Field label={t("applyForm.leaveType")} required>
              <SelectField value={leaveType} onChange={(v) => setLeaveType(v as LeaveType)} options={LEAVE_TYPES.map((lt) => ({ value: lt, label: leaveTypeLabel(lang, lt) }))} />
            </Field>
            <Field label={t("applyForm.leaveStart")} required>
              <div className="grid grid-cols-2 gap-3">
                <DateField value={leaveStartDate} onChange={setLeaveStartDate} />
                <TimeField value={leaveStartTime} onChange={setLeaveStartTime} />
              </div>
            </Field>
            <Field label={t("applyForm.leaveEnd")} required>
              <div className="grid grid-cols-2 gap-3">
                <DateField value={leaveEndDate} onChange={setLeaveEndDate} min={leaveStartDate} />
                <TimeField value={leaveEndTime} onChange={setLeaveEndTime} />
              </div>
            </Field>
            <p className="text-xs text-slate-400">{t("applyForm.leaveDaysHint", { days: calculateChargeableLeaveDays(leaveStart, leaveEnd) })}</p>
            <Field label={t("applyForm.leaveReason")} required>
              <textarea
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={3}
                className="input resize-none"
              />
            </Field>
            <Field
              label={`${t("applyForm.leaveAttachment")}${needsAttachment ? t("applyForm.leaveAttachmentRequired") : t("common.optional")}`}
              required={needsAttachment}
            >
              <input type="file" accept="image/*" onChange={(e) => handleFile(e, setLeaveFile)} className="text-xs" />
            </Field>
          </>
        )}

        {kind === "overtime" && (
          <>
            <Field label={t("applyForm.otDate")} required>
              <DateField value={otDate} onChange={setOtDate} max={todayStr()} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("applyForm.otStart")} required>
                <TimeField value={otStart} onChange={setOtStart} />
              </Field>
              <Field label={t("applyForm.otEnd")} required>
                <TimeField value={otEnd} onChange={setOtEnd} />
              </Field>
            </div>
            <p className="text-xs text-slate-400">{t("applyForm.otHoursHint", { hours: diffHours(otDate, otStart, otEnd) })}</p>
            <Field label={t("applyForm.otType")}>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
                <span>{OT_TYPE_LABEL[otTypeAuto]}</span>
                <span className="text-[10px] text-slate-400">{t("applyForm.otTypeAutoHint")}</span>
              </div>
            </Field>
            <Field label={t("applyForm.otReason")} required>
              <textarea
                value={otReason}
                onChange={(e) => setOtReason(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={3}
                className="input resize-none"
              />
            </Field>
          </>
        )}

        {kind === "shift" && (
          <>
            <Field label={t("applyForm.shiftDate")} required>
              <DateField value={shiftDate} onChange={setShiftDate} min={todayStr()} />
            </Field>
            <Field label={t("applyForm.shiftCurrent")} required>
              <div className="grid grid-cols-2 gap-3">
                <TimeField value={currentStart} onChange={setCurrentStart} />
                <TimeField value={currentEnd} onChange={setCurrentEnd} />
              </div>
            </Field>
            <Field label={t("applyForm.shiftRequested")} required>
              <div className="grid grid-cols-2 gap-3">
                <TimeField value={requestedStart} onChange={setRequestedStart} />
                <TimeField value={requestedEnd} onChange={setRequestedEnd} />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">{t("applyForm.shiftStructuredHint")}</p>
            </Field>
            <Field label={t("applyForm.shiftReason")} required>
              <textarea
                value={shiftReason}
                onChange={(e) => setShiftReason(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={3}
                placeholder={t("applyForm.shiftReasonPlaceholder")}
                className="input resize-none"
              />
            </Field>
          </>
        )}

        {kind === "resignation" && (
          <>
            <Field label={t("applyForm.resignDate")} required>
              <DateField value={resignDate} onChange={setResignDate} min={todayStr()} />
            </Field>
            <Field label={t("applyForm.resignReason")} required>
              <textarea
                value={resignReason}
                onChange={(e) => setResignReason(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={3}
                placeholder={t("applyForm.resignReasonPlaceholder")}
                className="input resize-none"
              />
            </Field>
            <Field label={`${t("applyForm.resignHandover")}${t("common.optional")}`}>
              <textarea
                value={resignHandover}
                onChange={(e) => setResignHandover(e.target.value.slice(0, 300))}
                maxLength={300}
                rows={3}
                placeholder={t("applyForm.resignHandoverPlaceholder")}
                className="input resize-none"
              />
            </Field>
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-700">{t("applyForm.resignNote")}</p>
          </>
        )}

        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-brand-600 py-3 text-sm font-semibold text-white active:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? t("applyForm.submitting") : t("applyForm.submit")}
        </button>
      </form>
    </Sheet>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}
