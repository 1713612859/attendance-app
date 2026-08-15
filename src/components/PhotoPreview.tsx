import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useI18n } from "../i18n";

interface Props {
  src: string;
  onClose: () => void;
}

// 打卡照片大图预览。用 Portal 直接挂到 document.body——原因同 Sheet 组件：
// 页面根节点有入场动画残留的 transform，会劫持 position:fixed 后代的定位基准。
export default function PhotoPreview({ src, onClose }: Props) {
  const { t } = useI18n();
  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90" role="dialog" aria-modal="true">
      <div className="flex shrink-0 items-center justify-end p-4 safe-top">
        <button onClick={onClose} aria-label={t("common.close")} className="rounded-full bg-white/10 p-2 text-white active:bg-white/20">
          <X size={22} />
        </button>
      </div>
      <button className="flex flex-1 items-center justify-center overflow-hidden p-2" onClick={onClose} aria-label={t("common.close")}>
        <img src={src} alt="" className="max-h-full max-w-full rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
      </button>
    </div>,
    document.body
  );
}
