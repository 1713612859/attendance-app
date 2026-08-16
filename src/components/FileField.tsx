import { useRef } from "react";
import { Paperclip } from "lucide-react";
import { useI18n } from "../i18n";

interface Props {
  fileName?: string;
  onChange: (dataUrl: string, fileName: string) => void;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 原生 <input type="file"> 的按钮文案（"选择文件"/"Choose File"）跟随操作系统或浏览器语言，
// 不受我们自己的语言切换控制——App 切成英文，这颗按钮还是会显示中文。用隐藏的原生 input
// 触发选择，按钮和文件名展示全部自己画，才能跟着 App 语言走。
export default function FileField({ fileName, onChange }: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 active:bg-slate-50"
      >
        <Paperclip size={13} />
        {t("common.chooseFile")}
      </button>
      <span className="truncate text-xs text-slate-400">{fileName ?? t("common.noFileChosen")}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          onChange(await fileToDataUrl(file), file.name);
        }}
      />
    </div>
  );
}
