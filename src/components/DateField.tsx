import { useState } from "react";
import { DatePicker } from "antd-mobile";
import { Calendar } from "lucide-react";
import { useI18n } from "../i18n";

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parseDate(s: string): Date {
  return new Date(s + "T00:00:00");
}

// 移动端惯用的日期滚轮选择器（antd-mobile DatePicker），替代原生 <input type="date">
// 在桌面浏览器上会弹出、且不受 CSS/i18n 控制的操作系统级日历控件。
export default function DateField({ value, onChange, min, max }: Props) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setVisible(true)} className="input flex items-center gap-2 text-left">
        <Calendar size={15} className="shrink-0 text-slate-400" />
        <span>{value}</span>
      </button>
      <DatePicker
        visible={visible}
        precision="day"
        value={parseDate(value)}
        min={min ? parseDate(min) : undefined}
        max={max ? parseDate(max) : undefined}
        onClose={() => setVisible(false)}
        onConfirm={(d) => {
          onChange(toDateStr(d));
          setVisible(false);
        }}
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
      />
    </>
  );
}
