import { useState } from "react";
import { Picker } from "antd-mobile";
import { ChevronDown } from "lucide-react";
import { useI18n } from "../i18n";

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}

// 单列滚轮选择器（antd-mobile Picker），替代原生 <select> ——原生下拉列表在桌面浏览器上
// 是操作系统级弹层，宽度按最长选项文字撑开，会溢出移动端卡片布局，且视觉风格与全局不统一。
export default function SelectField({ value, onChange, options }: Props) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const current = options.find((o) => o.value === value);
  const columns = options.map((o) => ({ label: o.label, value: o.value }));

  return (
    <>
      <button type="button" onClick={() => setVisible(true)} className="input flex items-center justify-between text-left">
        <span>{current?.label ?? value}</span>
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </button>
      <Picker
        columns={[columns]}
        visible={visible}
        value={[value]}
        onClose={() => setVisible(false)}
        onConfirm={(v) => {
          onChange(String(v[0]));
          setVisible(false);
        }}
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
      />
    </>
  );
}
