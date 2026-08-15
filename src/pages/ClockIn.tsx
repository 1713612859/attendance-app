import { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, LogIn, MapPin } from "lucide-react";
import CameraCapture from "../components/CameraCapture";
import PhotoPreview from "../components/PhotoPreview";
import { PROFILE, fetchClockRecords, getEffectiveShiftSync, getTodaySessions, submitClock } from "../lib/mockApi";
import type { ClockRecord, ClockSession } from "../types";
import { toDateStr, toDateTimeStr, todayStr } from "../lib/date";
import { toMinutes } from "../domain/attendance/attendanceCalculator";
import { useEditableProfile } from "../lib/profileStore";
import { useI18n } from "../i18n";

/** 夜班归属日：跨夜班次的下班打卡（凌晨时段）应归属"班次开始的那一天"，而不是打卡时的自然日 */
function computeAttendanceDate(shiftStartTime: string, crossesMidnight: boolean): string {
  if (!crossesMidnight) return todayStr();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (nowMinutes < toMinutes(shiftStartTime)) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return toDateStr(y);
  }
  return todayStr();
}

export default function ClockIn() {
  const { t, lang } = useI18n();
  const editable = useEditableProfile();
  const SESSION_LABEL: Record<ClockSession, string> = { in: t("clockIn.inLabel"), out: t("clockIn.outLabel") };
  const [records, setRecords] = useState<ClockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<ClockSession | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function load() {
    setLoading(true);
    setRecords(await fetchClockRecords());
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const attendanceDate = useMemo(() => {
    const shift = getEffectiveShiftSync(PROFILE.employeeId, todayStr());
    return computeAttendanceDate(shift.startTime, shift.crossesMidnight);
  }, [now.getMinutes()]);

  const todaySessions = useMemo(() => getTodaySessions(records, attendanceDate), [records, attendanceDate]);
  const nextSession: ClockSession = todaySessions.includes("in") ? "out" : "in";
  const todayRecords = records.filter((r) => r.attendanceDate === attendanceDate);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  function openCamera(session: ClockSession) {
    if (todaySessions.includes(session)) {
      setToast(t("clockIn.duplicateToast", { label: SESSION_LABEL[session] }));
      return;
    }
    setActiveSession(session);
  }

  async function handleConfirm(result: {
    photoDataUrl: string;
    geo: { latitude?: number; longitude?: number; address?: string; abnormal: boolean };
    clockTime: Date;
  }) {
    if (!activeSession) return;
    const record = await submitClock({
      date: attendanceDate,
      session: activeSession,
      clockTime: result.clockTime.toISOString(),
      photoDataUrl: result.photoDataUrl,
      latitude: result.geo.latitude,
      longitude: result.geo.longitude,
      address: result.geo.address,
      locationAbnormal: result.geo.abnormal,
    });
    setActiveSession(null);
    setToast(
      t("clockIn.successToast", {
        label: SESSION_LABEL[record.session],
        time: toDateTimeStr(new Date(record.clockTime)).slice(11),
      }) + (result.geo.abnormal ? t("clockIn.abnormalSuffix") : "")
    );
    load();
  }

  return (
    <div className="mx-auto max-w-md animate-page-in px-4 pb-28 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{t("clockIn.greeting", { name: editable.name })}</p>
          <p className="text-xs text-slate-400">
            {PROFILE.department} · {PROFILE.employeeId}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold tabular-nums text-slate-800">
            {now.toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-PH", { hour12: false })}
          </p>
          <p className="text-xs text-slate-400">{now.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-PH", { weekday: "long" })}</p>
        </div>
      </header>

      <section className="mt-6 rounded-3xl bg-gradient-to-br from-[#123A28] via-[#2A6E45] to-[#4F9A48] p-6 text-white shadow-lg shadow-brand-700/20">
        <p className="text-sm text-white/80">{nextSession === "in" ? t("clockIn.notYetIn") : t("clockIn.inDoneReminder")}</p>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-semibold">{SESSION_LABEL[nextSession]}</p>
            <p className="mt-1 text-xs text-white/70">{t("clockIn.tapHint")}</p>
          </div>
          <button
            onClick={() => openCamera(nextSession)}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand-700 shadow-md active:scale-95"
            aria-label={SESSION_LABEL[nextSession]}
          >
            <Camera size={26} />
          </button>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        {(["in", "out"] as ClockSession[]).map((s) => {
          const done = todaySessions.includes(s);
          return (
            <button
              key={s}
              onClick={() => openCamera(s)}
              className={`rounded-2xl border p-4 text-left transition ${
                done ? "border-brand-100 bg-brand-50" : "border-slate-200 bg-white active:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  {/* 用同一个图标做镜像，保证"进/出"视觉上互为反向，而不是两个观感不一致的图标 */}
                  <LogIn size={15} className={`${s === "out" ? "-scale-x-100" : ""} ${done ? "text-brand-600" : "text-slate-400"}`} />
                  {SESSION_LABEL[s]}
                </span>
                {done && <CheckCircle2 size={16} className="text-brand-600" />}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {done ? toDateTimeStr(new Date(todayRecords.find((r) => r.session === s)!.clockTime)).slice(11) : t("clockIn.notClocked")}
              </p>
            </button>
          );
        })}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">{t("clockIn.todayRecords")}</h2>
        {loading ? (
          <p className="text-sm text-slate-400">{t("common.loading")}</p>
        ) : todayRecords.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-8 text-center text-sm text-slate-400">
            {t("clockIn.noRecordsToday")}
          </div>
        ) : (
          <ul className="space-y-2">
            {todayRecords
              .slice()
              .sort((a, b) => (a.clockTime < b.clockTime ? 1 : -1))
              .map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3">
                  {r.photoDataUrl ? (
                    <button onClick={() => setPreviewSrc(r.photoDataUrl)} aria-label={t("clockIn.viewPhoto")} className="shrink-0">
                      <img src={r.photoDataUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
                    </button>
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                      <Camera size={18} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700">{SESSION_LABEL[r.session]}</span>
                      {r.source === "correction" && (
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{t("clockIn.correctionTag")}</span>
                      )}
                      {r.locationAbnormal && (
                        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-600">{t("clockIn.abnormalTag")}</span>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-400">
                      {toDateTimeStr(new Date(r.clockTime)).slice(11)}
                      {r.address ? ` · ${r.address}` : ""}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      {activeSession && (
        <CameraCapture sessionLabel={SESSION_LABEL[activeSession]} onCancel={() => setActiveSession(null)} onConfirm={handleConfirm} />
      )}

      {previewSrc && <PhotoPreview src={previewSrc} onClose={() => setPreviewSrc(null)} />}

      {toast && (
        <div className="fixed left-1/2 top-6 z-[60] -translate-x-1/2 rounded-full bg-slate-900/90 px-4 py-2 text-xs text-white shadow-lg">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={12} />
            {toast}
          </span>
        </div>
      )}
    </div>
  );
}
