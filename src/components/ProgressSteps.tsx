import type { ApplyStatus } from "../types";
import { Check, X } from "lucide-react";
import { useI18n } from "../i18n";

export default function ProgressSteps({ status }: { status: ApplyStatus }) {
  const { t } = useI18n();
  const rejected = status === "rejected";
  const withdrawn = status === "withdrawn";
  const steps = [t("progress.submitted"), t("progress.reviewing"), rejected ? t("progress.rejected") : t("progress.approved")];
  const activeIndex = withdrawn ? 1 : rejected || status === "approved" ? 2 : status === "pending" ? 1 : 0;

  return (
    <div className="flex items-center">
      {steps.map((label, i) => {
        const done = i < activeIndex || (i === activeIndex && (rejected || status === "approved"));
        const isCurrent = i === activeIndex && status === "pending";
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                  rejected && i === 2
                    ? "border-rose-400 bg-rose-400 text-white"
                    : done
                      ? "border-brand-500 bg-brand-500 text-white"
                      : isCurrent
                        ? "border-brand-500 text-brand-600 animate-pulse"
                        : "border-slate-200 text-slate-300"
                }`}
              >
                {rejected && i === 2 ? <X size={14} /> : done ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-[11px] ${done || isCurrent ? "text-slate-700" : "text-slate-300"}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-1 h-0.5 flex-1 rounded ${i < activeIndex ? "bg-brand-500" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
      {withdrawn && <span className="ml-2 text-[11px] font-medium text-slate-400">{t("progress.withdrawnSuffix")}</span>}
    </div>
  );
}
