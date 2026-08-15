import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Pencil, RotateCcw, ShieldCheck, User } from "lucide-react";
import { PROFILE, resetDemoData } from "../lib/mockApi";
import { getSession, logout } from "../lib/auth";
import { useEditableProfile } from "../lib/profileStore";
import ProfileEditSheet from "../components/ProfileEditSheet";
import { useI18n } from "../i18n";
import type { Lang } from "../i18n";

export default function Profile() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const editable = useEditableProfile();
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const session = getSession();

  function handleReset() {
    resetDemoData();
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
          {editable.avatarDataUrl ? (
            <img src={editable.avatarDataUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <User size={26} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{editable.name}</p>
          <p className="mt-0.5 truncate text-xs text-white/75">{PROFILE.department}</p>
          <p className="text-xs text-white/75">{PROFILE.employeeId}</p>
        </div>
        <button
          onClick={() => setEditOpen(true)}
          aria-label={t("profile.editProfile")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
        >
          <Pencil size={14} />
        </button>
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

      <section className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-400">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" />
        {t("profile.privacyNote")}
      </section>

      {!resetConfirmOpen ? (
        <button
          onClick={() => setResetConfirmOpen(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3 text-sm font-medium text-slate-500 active:bg-slate-50"
        >
          <RotateCcw size={16} />
          {t("profile.resetDemo")}
        </button>
      ) : (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-sm text-slate-600">{t("profile.resetDemoConfirm")}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setResetConfirmOpen(false)}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm text-slate-600"
            >
              {t("profile.logoutCancel")}
            </button>
            <button onClick={handleReset} className="flex-1 rounded-xl bg-slate-700 py-2.5 text-sm font-medium text-white">
              {t("profile.resetDemoConfirmBtn")}
            </button>
          </div>
        </div>
      )}

      {!confirmOpen ? (
        <button
          onClick={() => setConfirmOpen(true)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 py-3 text-sm font-medium text-rose-600 active:bg-rose-50"
        >
          <LogOut size={16} />
          {t("profile.logout")}
        </button>
      ) : (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="mb-3 text-sm text-rose-700">{t("profile.logoutConfirmBody")}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm text-slate-600"
            >
              {t("profile.logoutCancel")}
            </button>
            <button
              disabled={loggingOut}
              onClick={handleLogout}
              className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {loggingOut ? t("profile.loggingOut") : t("profile.logoutConfirmBtn")}
            </button>
          </div>
        </div>
      )}

      {editOpen && <ProfileEditSheet onClose={() => setEditOpen(false)} />}
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
