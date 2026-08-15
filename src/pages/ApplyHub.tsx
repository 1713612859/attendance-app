import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, ChevronRight, Clock3, LogOut as LogOutIcon, PenSquare, UserMinus } from "lucide-react";
import type { ApplyKind, ApplyRecord } from "../types";
import { fetchApplies } from "../lib/mockApi";
import { useI18n } from "../i18n";

const ENTRIES: { kind: ApplyKind; icon: typeof Clock3 }[] = [
  { kind: "correction", icon: PenSquare },
  { kind: "leave", icon: CalendarClock },
  { kind: "overtime", icon: Clock3 },
  { kind: "shift", icon: LogOutIcon },
  { kind: "resignation", icon: UserMinus },
];

export default function ApplyHub() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [list, setList] = useState<ApplyRecord[]>([]);

  useEffect(() => {
    fetchApplies().then(setList);
  }, []);

  return (
    <div className="mx-auto max-w-md animate-page-in px-4 pb-28 pt-6">
      <h1 className="text-lg font-semibold text-slate-800">{t("apply.title")}</h1>
      <p className="mt-1 text-xs text-slate-400">{t("apply.hubSubtitle")}</p>

      <div className="mt-4 space-y-2.5">
        {ENTRIES.map(({ kind, icon: Icon }) => {
          const items = list.filter((r) => r.kind === kind);
          const pending = items.filter((r) => r.status === "pending").length;
          return (
            <button
              key={kind}
              onClick={() => navigate(`/apply/${kind}`)}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm shadow-slate-100 active:bg-slate-50"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-800">{t(`applyKind.${kind}`)}</span>
                <span className="block text-xs text-slate-400">
                  {items.length === 0
                    ? t("apply.hubNoRecords")
                    : pending > 0
                      ? t("apply.hubPendingCount", { count: pending })
                      : t("apply.hubTotalCount", { count: items.length })}
                </span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-slate-300" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
