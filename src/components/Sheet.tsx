import type { ReactNode } from "react";
import { Drawer } from "vaul";
import { X } from "lucide-react";
import { useI18n } from "../i18n";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// 统一的底部弹出面板，基于 Vaul（Radix Dialog 之上专门做移动端 bottom sheet 的库）。
// 之前手写版本踩过的坑（祖先 transform 劫持 position:fixed 的包含块，导致面板从顶部弹出）
// 在这里不会再出现：Vaul 内部用 Radix Portal 把内容挂到 document.body，且已经过大量生产验证。
// 额外收获：原生手势下拉关闭、滚动内容与拖拽手势的冲突检测，都不用自己再写一遍。
export default function Sheet({ title, onClose, children }: Props) {
  const { t } = useI18n();
  return (
    <Drawer.Root open onOpenChange={(open) => !open && onClose()} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px]" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex max-h-[94vh] w-full max-w-md flex-col rounded-t-[28px] bg-white shadow-2xl outline-none safe-bottom">
          <div className="flex shrink-0 justify-center pb-1 pt-2.5">
            <Drawer.Handle className="h-1.5 w-10 rounded-full bg-slate-200" />
          </div>
          <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-1">
            <Drawer.Title className="text-base font-semibold text-slate-800">{title}</Drawer.Title>
            <button onClick={onClose} aria-label={t("common.close")} className="rounded-full p-1.5 text-slate-400 active:bg-slate-100">
              <X size={20} />
            </button>
          </div>
          <Drawer.Description className="sr-only">{title}</Drawer.Description>
          <div className="flex-1 overflow-y-auto px-5 pb-6">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
