import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import en from "./en";
import zh from "./zh";
import { loadValue, saveValue } from "../lib/storage";

export type Lang = "en" | "zh";

// en/zh 各自用 `as const` 声明，字面量类型不同（同一个 key 中英文文案不一样），
// 这里统一"抹平"成 string，只用来校验两份字典的 key 结构必须一致，不比较具体文案内容
type DeepStringify<T> = { [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]> };
const DICTS: Record<Lang, DeepStringify<typeof en>> = { en, zh };

type DotPaths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends Record<string, unknown>
    ? DotPaths<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}`;
}[keyof T & string];

export type TKey = DotPaths<typeof en>;

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TKey | string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const LANG_KEY = "lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => loadValue<Lang>(LANG_KEY, "en"));

  function setLang(next: Lang) {
    setLangState(next);
    saveValue(LANG_KEY, next);
  }

  const t = useMemo(() => {
    return (key: TKey | string, vars?: Record<string, string | number>) => {
      const raw = getByPath(DICTS[lang], key) ?? getByPath(DICTS.en, key);
      let str = typeof raw === "string" ? raw : key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(new RegExp(`{{${k}}}`, "g"), String(v));
        });
      }
      return str;
    };
  }, [lang]);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

// 便捷方法：翻译"假种代码"这类以数据值本身作为字典 key 的场景
export function leaveTypeLabel(lang: Lang, code: string): string {
  const dict = DICTS[lang].leaveTypeLabel as Record<string, string>;
  return dict[code] ?? code;
}

export function genderLabel(lang: Lang, code: string): string {
  const dict = DICTS[lang].genderLabel as Record<string, string>;
  return dict[code] ?? code;
}

export function payCycleLabel(lang: Lang, code: string): string {
  const dict = DICTS[lang].payCycleLabel as Record<string, string>;
  return dict[code] ?? code;
}
