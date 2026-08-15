import type { ApplyRecord } from "../types";
import StatusBadge from "./StatusBadge";
import ProgressSteps from "./ProgressSteps";
import { demoDecide, withdrawApply } from "../lib/mockApi";
import { useState } from "react";
import { useI18n, leaveTypeLabel } from "../i18n";
import Sheet from "./Sheet";

interface Props {
  record: ApplyRecord;
  onClose: () => void;
  onChanged: () => void;
}

export default function ApplyDetail({ record, onClose, onChanged }: Props) {
  const { t, lang } = useI18n();
  const [busy, setBusy] = useState(false);

  const KIND_LABEL: Record<ApplyRecord["kind"], string> = {
    correction: t("applyKind.correction"),
    leave: t("applyKind.leave"),
    overtime: t("applyKind.overtime"),
    shift: t("applyKind.shift"),
    resignation: t("applyKind.resignation"),
  };

  const OT_TYPE_LABEL: Record<string, string> = {
    workday: t("applyForm.otTypeWorkday"),
    restday: t("applyForm.otTypeRestday"),
    "special-holiday": t("applyForm.otTypeSpecialHoliday"),
    "regular-holiday": t("applyForm.otTypeRegularHoliday"),
  };

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    await fn();
    setBusy(false);
    onChanged();
  }

  return (
    <Sheet title={`${KIND_LABEL[record.kind]} ${t("applyDetail.titleSuffix")}`} onClose={onClose}>
        <div className="mb-5 rounded-2xl bg-slate-50 p-4">
          <ProgressSteps status={record.status} />
        </div>

        <dl className="space-y-2 text-sm">
          {record.kind === "correction" && (
            <>
              <Row label={t("applyDetail.correctionDate")} value={record.date} />
              <Row label={t("applyDetail.session")} value={record.session === "in" ? t("applyForm.sessionIn") : t("applyForm.sessionOut")} />
              <Row label={t("applyDetail.reason")} value={record.reason} />
            </>
          )}
          {record.kind === "leave" && (
            <>
              <Row label={t("applyDetail.leaveType")} value={leaveTypeLabel(lang, record.leaveType)} />
              <Row label={t("applyDetail.start")} value={record.startTime.replace("T", " ")} />
              <Row label={t("applyDetail.end")} value={record.endTime.replace("T", " ")} />
              <Row label={t("applyDetail.days")} value={t("applyDetail.daysUnit", { n: record.days })} />
              <Row label={t("applyDetail.reason")} value={record.reason} />
            </>
          )}
          {record.kind === "overtime" && (
            <>
              <Row label={t("applyDetail.otDate")} value={record.date} />
              <Row label={t("applyDetail.otTime")} value={`${record.startTime} - ${record.endTime}`} />
              <Row label={t("applyDetail.otHours")} value={t("applyDetail.otHoursUnit", { n: record.hours })} />
              <Row label={t("applyDetail.otType")} value={OT_TYPE_LABEL[record.otType] ?? record.otType} />
              <Row label={t("applyDetail.reason")} value={record.reason} />
            </>
          )}
          {record.kind === "shift" && (
            <>
              <Row label={t("applyDetail.shiftDate")} value={record.effectiveDate} />
              <Row label={t("applyDetail.shiftCurrent")} value={`${record.currentStart} - ${record.currentEnd}`} />
              <Row label={t("applyDetail.shiftRequested")} value={`${record.requestedStart} - ${record.requestedEnd}`} />
              <Row label={t("applyDetail.reason")} value={record.reason} />
            </>
          )}
          {record.kind === "resignation" && (
            <>
              <Row label={t("applyDetail.resignDate")} value={record.lastWorkingDate} />
              <Row label={t("applyDetail.resignReason")} value={record.reason} />
              {record.handoverNotes && <Row label={t("applyDetail.resignHandover")} value={record.handoverNotes} />}
            </>
          )}
          <Row label={t("applyDetail.submittedAt")} value={new Date(record.submittedAt).toLocaleString()} />
          {record.decidedAt && <Row label={t("applyDetail.decidedAt")} value={new Date(record.decidedAt).toLocaleString()} />}
          {record.approver && <Row label={t("applyDetail.approver")} value={record.approver} />}
          {record.comment && <Row label={t("applyDetail.comment")} value={record.comment} />}
        </dl>

        <div className="mt-2">
          <span className="text-xs text-slate-400">{t("applyDetail.currentStatus")}</span>
          <StatusBadge status={record.status} />
        </div>

        {record.status === "pending" && (
          <button
            disabled={busy}
            onClick={() => act(() => withdrawApply(record.id))}
            className="mt-5 w-full rounded-2xl border border-slate-200 py-3 text-sm font-medium text-slate-600 active:bg-slate-50 disabled:opacity-60"
          >
            {t("applyDetail.withdraw")}
          </button>
        )}

        {record.status === "pending" && (
          <div className="mt-3 flex gap-2">
            <button
              disabled={busy}
              onClick={() => act(() => demoDecide(record.id, "approved"))}
              className="flex-1 rounded-xl bg-brand-50 py-2 text-xs font-medium text-brand-700"
            >
              {t("applyDetail.approve")}
            </button>
            <button
              disabled={busy}
              onClick={() => act(() => demoDecide(record.id, "rejected"))}
              className="flex-1 rounded-xl bg-rose-50 py-2 text-xs font-medium text-rose-600"
            >
              {t("applyDetail.reject")}
            </button>
          </div>
        )}
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-slate-400">{label}</dt>
      <dd className="flex-1 text-slate-700">{value}</dd>
    </div>
  );
}
