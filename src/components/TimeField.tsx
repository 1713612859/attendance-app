import { useState } from "react";
import { Picker } from "antd-mobile";
import { Clock3 } from "lucide-react";
import { useI18n } from "../i18n";

interface Props {
  value: string; // HH:mm
  onChange: (v: string) => void;
}

const HOUR_COLUMN = Array.from({ length: 24 }, (_, h) => ({ label: h.toString().padStart(2, "0"), value: h.toString().padStart(2, "0") }));
const MINUTE_COLUMN = ["00", "15", "30", "45"].map((m) => ({ label: m, value: m }));

// 移动端惯用的时间滚轮选择器（antd-mobile Picker，双列时/分），替代原生 <input type="time">。
export default function TimeField({ value, onChange }: Props) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [hh, mm] = value.split(":");
  // 若当前值不在 15 分钟步进网格上（如种子数据里的 09:05），临时插入精确匹配项，避免显示错位
  const minuteOptions = MINUTE_COLUMN.some((o) => o.value === mm) ? MINUTE_COLUMN : [...MINUTE_COLUMN, { label: mm, value: mm }].sort((a, b) => (a.value < b.value ? -1 : 1));

  return (
    <>
      <button type="button" onClick={() => setVisible(true)} className="input flex items-center gap-2 text-left">
        <Clock3 size={15} className="shrink-0 text-slate-400" />
        <span>{value}</span>
      </button>
      <Picker
        columns={[HOUR_COLUMN, minuteOptions]}
        visible={visible}
        value={[hh, mm]}
        onClose={() => setVisible(false)}
        onConfirm={(v) => {
          onChange(`${v[0]}:${v[1]}`);
          setVisible(false);
        }}
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
      />
    </>
  );
}
