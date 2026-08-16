import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, RotateCcw, User } from "lucide-react";
import { PROFILE, resetLocalData } from "../lib/mockApi";
import { getSession, logout } from "../lib/auth";
import { useI18n, payCycleLabel, genderLabel } from "../i18n";
import type { Lang } from "../i18n";
import ConfirmDialog from "../components/ConfirmDialog";

export default function Profile() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const session = getSession();

  function handleReset() {
    resetLocalData();
    navigate("/login", { replace: true });
    window.location.reload();
  }

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    navigate("/login", { replace: true });
  }

  return (
    <div className="mx-auto max-w-md animate-page-in px-4 pb-28 pt-6">
      <h1 className="text-lg font-semibold text-slate-800">{t("profile.title")}</h1>

      <section className="relative mt-4 flex items-center gap-4 rounded-3xl bg-gradient-to-br from-[#123A28] via-[#2A6E45] to-[#4F9A48] p-5 text-white">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15">
          {PROFILE.avatarDataUrl ? <img src={PROFILE.avatarDataUrl} alt="" className="h-full w-full object-cover" /> : <User size={26} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{PROFILE.name}</p>
          <p className="mt-0.5 truncate text-xs text-white/75">{PROFILE.department}</p>
          <p className="text-xs text-white/75">{PROFILE.employeeId}</p>
        </div>
      </section>

      {/* 员工基本信息：全部来自 HR 系统，只读展示，员工端不提供自助编辑入口 */}
      <section className="mt-4 space-y-2 rounded-2xl bg-white p-4 text-sm">
        <Row label={t("profile.fieldName")} value={PROFILE.name} />
        <Row label={t("profile.gender")} value={genderLabel(lang, PROFILE.gender)} />
        <Row label={t("profile.fieldDepartment")} value={PROFILE.department} />
        <Row label={t("profile.fieldPhone")} value={PROFILE.phoneNumber} />
        <Row label={t("profile.fieldPayCycle")} value={payCycleLabel(lang, PROFILE.payCycle)} />
      </section>

      <section className="mt-4 rounded-2xl bg-white p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">{t("profile.language")}</span>
          <div className="flex overflow-hidden rounded-full border border-slate-200 text-xs">
            {(["en", "zh"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1.5 font-medium ${lang === l ? "bg-brand-600 text-white" : "text-slate-500"}`}
              >
                {l === "en" ? "EN" : "中文"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl bg-white p-4 text-sm">
        <Row label={t("profile.loginMethod")} value={t("profile.loginMethodValue")} />
        <Row label={t("profile.loginTime")} value={session ? new Date(session.loggedInAt).toLocaleString() : "-"} />
      </section>

      <button
        onClick={() => setResetConfirmOpen(true)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3 text-sm font-medium text-slate-500 active:bg-slate-50"
      >
        <RotateCcw size={16} />
        {t("profile.resetLocalData")}
      </button>

      <button
        onClick={() => setConfirmOpen(true)}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3 text-sm font-medium text-white active:bg-rose-700"
      >
        <LogOut size={16} />
        {t("profile.logout")}
      </button>

      {resetConfirmOpen && (
        <ConfirmDialog
          body={t("profile.resetLocalDataConfirm")}
          cancelLabel={t("profile.logoutCancel")}
          confirmLabel={t("profile.resetLocalDataConfirmBtn")}
          onCancel={() => setResetConfirmOpen(false)}
          onConfirm={handleReset}
        />
      )}

      {confirmOpen && (
        <ConfirmDialog
          body={t("profile.logoutConfirmBody")}
          cancelLabel={t("profile.logoutCancel")}
          confirmLabel={loggingOut ? t("profile.loggingOut") : t("profile.logoutConfirmBtn")}
          tone="danger"
          busy={loggingOut}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleLogout}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}
