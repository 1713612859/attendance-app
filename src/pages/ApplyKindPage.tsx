import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Plus } from "lucide-react";
import type { ApplyKind, ApplyRecord } from "../types";
import { fetchApplies, submitApply } from "../lib/mockApi";
import StatusBadge from "../components/StatusBadge";
import ApplyForm from "../components/ApplyForm";
import ApplyDetail from "../components/ApplyDetail";
import { useI18n, leaveTypeLabel } from "../i18n";

const VALID_KINDS: ApplyKind[] = ["correction", "leave", "overtime", "shift", "resignation"];

export default function ApplyKindPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { kind: kindParam } = useParams<{ kind: string }>();
  const kind = (VALID_KINDS as string[]).includes(kindParam ?? "") ? (kindParam as ApplyKind) : null;

  const [list, setList] = useState<ApplyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<ApplyRecord | null>(null);

  async function load() {
    setLoading(true);
    setList(await fetchApplies());
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!kind) navigate("/apply", { replace: true });
  }, [kind, navigate]);

  if (!kind) return null;

  function summaryOf(r: ApplyRecord): string {
    if (r.kind === "correction") return `${r.date} · ${r.session === "in" ? t("applyForm.sessionIn") : t("applyForm.sessionOut")}`;
    if (r.kind === "leave") return `${leaveTypeLabel(lang, r.leaveType)} · ${t("applyDetail.daysUnit", { n: r.days })}`;
    if (r.kind === "overtime") return `${r.date} · ${r.hours}h`;
    if (r.kind === "shift") return `${r.effectiveDate} · ${r.requestedSegments.map((s) => `${s.startTime}-${s.endTime}`).join(", ")}`;
    return `${t("applyDetail.resignDate")} ${r.lastWorkingDate}`;
  }

  const filtered = list.filter((r) => r.kind === kind);

  return (
    <div className="mx-auto max-w-md animate-page-in px-4 pb-28 pt-6">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate("/apply")} aria-label="back" className="-ml-1.5 rounded-full p-1.5 text-slate-500 active:bg-slate-100">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold text-slate-800">{t(`applyKind.${kind}`)}</h1>
      </div>

      <button
        onClick={() => setShowForm(true)}
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-brand-600 py-3 text-sm font-semibold text-white active:bg-brand-700"
      >
        <Plus size={16} />
        {t("apply.newApply", { kind: t(`applyKind.${kind}`) })}
      </button>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-slate-400">{t("common.loading")}</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-400">
            {t("apply.emptyList", { kind: t(`applyKind.${kind}`) })}
          </div>
        ) : (
          filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => setDetail(r)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 text-left active:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-700">{summaryOf(r)}</p>
                <p className="mt-1 text-xs text-slate-400">{t("apply.submittedAt", { time: new Date(r.submittedAt).toLocaleString() })}</p>
              </div>
              <StatusBadge status={r.status} />
            </button>
          ))
        )}
      </div>

      {showForm && (
        <ApplyForm
          kind={kind}
          onClose={() => setShowForm(false)}
          onSubmit={async (record) => {
            await submitApply(record);
            setShowForm(false);
            load();
          }}
        />
      )}

      {detail && (
        <ApplyDetail
          record={detail}
          onClose={() => setDetail(null)}
          onChanged={async () => {
            await load();
            const fresh = (await fetchApplies()).find((r) => r.id === detail.id);
            setDetail(fresh ?? null);
          }}
        />
      )}
    </div>
  );
}
