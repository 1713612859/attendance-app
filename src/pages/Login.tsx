import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User2 } from "lucide-react";
import { login } from "../lib/auth";
import { PROFILE } from "../lib/mockApi";
import { useI18n } from "../i18n";

export default function Login() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const [employeeId, setEmployeeId] = useState(PROFILE.employeeId);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(employeeId, password);
    setLoading(false);
    if (result.ok) {
      navigate("/", { replace: true });
    } else {
      setError(result.message === "SHORT_ID" ? t("login.errEmployeeId") : t("login.errPassword"));
    }
  }

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-gradient-to-br from-[#0d2e1f] via-[#1c5636] to-[#4F9A48] safe-top safe-bottom">
      {/* 装饰性光斑，仅视觉，不承载信息 */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />

      <button
        onClick={() => setLang(lang === "en" ? "zh" : "en")}
        className="relative z-10 mt-4 self-end mr-4 rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 active:bg-white/20"
      >
        {lang === "en" ? "中文" : "EN"}
      </button>

      <div className="relative flex flex-1 flex-col justify-center px-6 pb-10 pt-2">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 text-center text-white">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-inner shadow-black/10 ring-1 ring-white/20">
              <img src="/etech-logo.png" alt="" className="h-11 w-11 object-contain" />
            </div>
            <h1 className="text-lg font-semibold leading-snug tracking-tight">{t("common.appName")}</h1>
            <p className="mt-1 text-xs text-white/60">{t("common.appSubName")} · {t("login.subtitle")}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-[28px] bg-white/95 p-6 shadow-2xl shadow-black/30 backdrop-blur"
          >
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">{t("login.employeeId")}</span>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus-within:border-brand-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/15">
                <User2 size={16} className="shrink-0 text-slate-400" />
                <input
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder={t("login.employeeIdPlaceholder")}
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-300"
                  autoComplete="username"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">{t("login.password")}</span>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus-within:border-brand-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/15">
                <Lock size={16} className="shrink-0 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login.passwordPlaceholder")}
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-300"
                  autoComplete="current-password"
                />
              </div>
            </label>

            {error && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-brand-600 to-[#123A28] py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-700/25 transition active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? t("login.loggingIn") : t("login.loginButton")}
            </button>

            <p className="text-center text-[11px] leading-relaxed text-slate-400">
              {t("login.demoHint", { id: PROFILE.employeeId })}
            </p>
          </form>

          <p className="mt-6 text-center text-[11px] text-white/40">{t("login.footerNote")}</p>
        </div>
      </div>
    </div>
  );
}
