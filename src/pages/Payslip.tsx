import { useEffect, useState } from "react";
import { CalendarRange, ChevronRight, Wallet } from "lucide-react";
import { fetchPayslips } from "../lib/mockApi";
import type { Payslip } from "../types";
import { useI18n } from "../i18n";
import Sheet from "../components/Sheet";

function money(n: number): string {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PayslipPage() {
  const { t } = useI18n();
  const [list, setList] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Payslip | null>(null);

  useEffect(() => {
    fetchPayslips().then((d) => {
      setList(d);
      setLoading(false);
    });
  }, []);

  return (
    <div className="mx-auto max-w-md animate-page-in px-4 pb-28 pt-6">
      <h1 className="text-lg font-semibold text-slate-800">{t("payslip.title")}</h1>
      <p className="mt-1 text-xs text-slate-400">{t("payslip.subtitle")}</p>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-slate-400">{t("common.loading")}</p>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-400">
            {t("payslip.emptyList")}
          </div>
        ) : (
          list.map((p) => (
            <button
              key={p.id}
              onClick={() => setDetail(p)}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm shadow-slate-100 active:bg-slate-50"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Wallet size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xs text-slate-400">
                  <CalendarRange size={12} />
                  {t("payslip.cutoffLabel", { start: p.cutoffStart, end: p.cutoffEnd })}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{t("payslip.netTotalLabel", { amount: money(p.netTotal) })}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{t("payslip.payDateLabel", { date: p.payDate })}</p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-slate-300" />
            </button>
          ))
        )}
      </div>

      {detail && <PayslipDetail payslip={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function PayslipDetail({ payslip, onClose }: { payslip: Payslip; onClose: () => void }) {
  const { t } = useI18n();

  return (
    <Sheet onClose={onClose} title={t("payslip.detailTitle")}>
      <p className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
        <CalendarRange size={13} />
        {t("payslip.cutoffLabel", { start: payslip.cutoffStart, end: payslip.cutoffEnd })} ·{" "}
        {t("payslip.payDateLabel", { date: payslip.payDate })}
      </p>

      <Section title={t("payslip.grossSection")} items={payslip.grossItems} total={payslip.grossTotal} subtotalLabel={t("payslip.subtotal")} tone="pos" />
      <Section
        title={t("payslip.deductionSection")}
        items={payslip.deductionItems}
        total={payslip.deductionTotal}
        subtotalLabel={t("payslip.subtotal")}
        tone="neg"
      />
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3">
        <span className="text-sm font-medium text-brand-700">{t("payslip.netTotal")}</span>
        <span className="text-lg font-semibold text-brand-700">{money(payslip.netTotal)}</span>
      </div>
    </Sheet>
  );
}

function Section({
  title,
  items,
  total,
  subtotalLabel,
  tone,
}: {
  title: string;
  items: { label: string; amount: number }[];
  total: number;
  subtotalLabel: string;
  tone: "pos" | "neg";
}) {
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-xs font-semibold text-slate-500">{title}</h3>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="text-slate-500">{it.label}</span>
            <span className="text-slate-700">{money(it.amount)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-2.5 text-sm font-medium">
          <span className="text-slate-600">{subtotalLabel}</span>
          <span className={tone === "pos" ? "text-brand-600" : "text-rose-500"}>{money(total)}</span>
        </div>
      </div>
    </div>
  );
}
