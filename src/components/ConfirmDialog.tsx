import { createPortal } from "react-dom";
import { useI18n } from "../i18n";

interface Props {
  title?: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: "default" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// 二次确认弹框：居中卡片 + 半透明遮罩，用于退出登录、重置数据等有一定后果的操作。
// 同 Sheet 一样用 createPortal 挂到 document.body，避免祖先节点的 transform/动画
// 劫持 position:fixed 的包含块（同一个坑，见 Sheet.tsx 里的说明）。
export default function ConfirmDialog({ title, body, confirmLabel, cancelLabel, tone = "default", busy, onConfirm, onCancel }: Props) {
  const { t } = useI18n();
  return createPortal(
    <>
      <button aria-label={t("common.close")} onClick={onCancel} className="fixed inset-0 z-[70] h-full w-full border-0 bg-black/45 p-0" />
      <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-[70] flex items-center justify-center px-6">
        <div className="w-full max-w-xs rounded-3xl bg-white p-5 shadow-2xl">
          {title && <h2 className="mb-1.5 text-sm font-semibold text-slate-800">{title}</h2>}
          <p className="text-sm leading-relaxed text-slate-500">{body}</p>
          <div className="mt-5 flex gap-2">
            <button onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm text-slate-600 active:bg-slate-50">
              {cancelLabel}
            </button>
            <button
              disabled={busy}
              onClick={onConfirm}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium text-white disabled:opacity-60 ${
                tone === "danger" ? "bg-rose-600 active:bg-rose-700" : "bg-slate-700 active:bg-slate-800"
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
