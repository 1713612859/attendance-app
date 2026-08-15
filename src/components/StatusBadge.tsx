import type { ApplyStatus } from "../types";
import { CheckCircle2, Clock3, RotateCcw, XCircle } from "lucide-react";
import { useI18n } from "../i18n";

const CONFIG: Record<ApplyStatus, { key: string; cls: string; icon: typeof Clock3 }> = {
  pending: { key: "status.pending", cls: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock3 },
  approved: { key: "status.approved", cls: "bg-brand-50 text-brand-700 border-brand-100", icon: CheckCircle2 },
  rejected: { key: "status.rejected", cls: "bg-rose-50 text-rose-700 border-rose-200", icon: XCircle },
  withdrawn: { key: "status.withdrawn", cls: "bg-slate-100 text-slate-500 border-slate-200", icon: RotateCcw },
};

export default function StatusBadge({ status }: { status: ApplyStatus }) {
  const { t } = useI18n();
  const c = CONFIG[status];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${c.cls}`}>
      <Icon size={13} />
      {t(c.key)}
    </span>
  );
}
