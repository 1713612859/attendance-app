import { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, Clock3, MapPin } from "lucide-react";
import CameraCapture from "../components/CameraCapture";
import PhotoPreview from "../components/PhotoPreview";
import { PROFILE, fetchClockRecords, getEffectiveShiftSync, submitClock } from "../lib/mockApi";
import type { ClockRecord, ClockSession, Shift } from "../types";
import { toDateStr, toDateTimeStr, todayStr } from "../lib/date";
import { getActiveSegmentIndex, selectDailyPunches, toMinutes } from "../domain/attendance/attendanceCalculator";
import { useI18n } from "../i18n";

/** 夜班归属日：只要班次里任意一段的下班打卡窗口会跨夜，且现在时间早于第一段应上班时间，
 *  就把"现在"归到"昨天"的考勤日——即跨夜段的下班打卡应算作昨晚那个班次的收尾。 */
function computeAttendanceDate(shift: Shift): string {
  const crossesMidnight = shift.segments.some((s) => s.clockOutWindowCrossesMidnight);
  if (!crossesMidnight) return todayStr();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const firstStart = toMinutes(shift.segments[0]?.startTime ?? "00:00");
  if (nowMinutes < firstStart) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return toDateStr(y);
  }
  return todayStr();
}

function fmtWindowTime(t: string): string {
  return t;
}

export default function ClockIn() {
  const { t, lang } = useI18n();
  const SESSION_LABEL: Record<ClockSession, string> = { in: t("clockIn.inLabel"), out: t("clockIn.outLabel") };
  const [records, setRecords] = useState<ClockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<ClockSession | null>(null);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
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

  const shift = useMemo(() => getEffectiveShiftSync(PROFILE.employeeId, todayStr()), [now.getMinutes()]);
  const attendanceDate = useMemo(() => computeAttendanceDate(shift), [shift, now.getMinutes()]);
  const todayRecords = records.filter((r) => r.attendanceDate === attendanceDate);
  const punches = useMemo(() => selectDailyPunches(records, attendanceDate, shift), [records, attendanceDate, shift]);
  const activeSegmentIndex = useMemo(() => getActiveSegmentIndex(shift, now), [shift, now]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  function openCamera(segmentId: string, session: ClockSession) {
    setActiveSegmentId(segmentId);
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
    setActiveSegmentId(null);
    setToast(
      t("clockIn.successToast", {
        label: SESSION_LABEL[record.session],
        time: toDateTimeStr(new Date(record.clockTime)).slice(11),
      }) + (result.geo.abnormal ? t("clockIn.abnormalSuffix") : "")
    );
    load();
  }

  // 当前生效段的下一步动作：该段还没打上班卡 → in；已打上班卡但没打下班卡 → out；都打了 → null
  const activeSegmentResult = activeSegmentIndex >= 0 ? punches.bySegment[activeSegmentIndex] : undefined;
  const activeNextSession: ClockSession | null = activeSegmentResult
    ? !activeSegmentResult.clockIn
      ? "in"
      : !activeSegmentResult.clockOut
        ? "out"
        : null
    : null;

  return (
    <div className="mx-auto max-w-md animate-page-in px-4 pb-28 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{t("clockIn.greeting", { name: PROFILE.name })}</p>
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
        {activeSegmentResult && activeNextSession ? (
          <>
            <p className="text-sm text-white/80">
              {t("clockIn.segmentLabel", { n: activeSegmentIndex + 1 })} · {t("clockIn.statusActive")}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold">{SESSION_LABEL[activeNextSession]}</p>
                <p className="mt-1 text-xs text-white/70">{t("clockIn.tapHint")}</p>
              </div>
              <button
                onClick={() => openCamera(activeSegmentResult.segment.id, activeNextSession)}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand-700 shadow-md active:scale-95"
                aria-label={SESSION_LABEL[activeNextSession]}
              >
                <Camera size={26} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
              <Clock3 size={20} />
            </span>
            <div>
              <p className="text-sm font-medium">{t("clockIn.noActiveWindow")}</p>
              {(() => {
                // 找下一个"打卡窗口还没开放"的段，按窗口开放时间是否还没到来判断——不依赖 activeSegmentIndex，
                // 之前那版写法在 activeSegmentIndex 恒为 -1 的分支里用 `activeSegmentIndex < 0` 当筛选条件，
                // 对每个 i 都成立，结果永远只会命中第 1 段，哪怕第 1 段窗口早就关了
                const nowMinutes = now.getHours() * 60 + now.getMinutes();
                const upcoming = shift.segments.find((seg) => nowMinutes < toMinutes(seg.clockInWindowStart));
                return upcoming ? (
                  <p className="mt-0.5 text-xs text-white/70">{t("clockIn.nextWindowHint", { time: upcoming.clockInWindowStart })}</p>
                ) : null;
              })()}
            </div>
          </div>
        )}
      </section>

      <section className="mt-4 space-y-2.5">
        {shift.segments.map((segment, i) => {
          const seg = punches.bySegment[i];
          const doneIn = !!seg?.clockIn;
          const doneOut = !!seg?.clockOut;
          const isFullyDone = doneIn && (!segment.clockOutRequired || doneOut);
          const isActive = i === activeSegmentIndex;
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          const isUpcoming = !isActive && !isFullyDone && nowMinutes < toMinutes(segment.clockInWindowStart);
          const isMissed = !isActive && !isFullyDone && !isUpcoming;

          return (
            <div
              key={segment.id}
              className={`rounded-2xl border p-4 transition ${
                isActive ? "border-brand-200 bg-brand-50" : isFullyDone ? "border-slate-100 bg-white" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  {isFullyDone && <CheckCircle2 size={15} className="text-brand-600" />}
                  {t("clockIn.segmentLabel", { n: i + 1 })}
                  <span className="font-normal text-slate-400">
                    {fmtWindowTime(segment.startTime)}–{fmtWindowTime(segment.endTime)}
                  </span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    isActive
                      ? "bg-brand-100 text-brand-700"
                      : isFullyDone
                        ? "bg-slate-100 text-slate-500"
                        : isMissed
                          ? "bg-rose-50 text-rose-500"
                          : "bg-slate-50 text-slate-400"
                  }`}
                >
                  {isFullyDone ? t("clockIn.statusDone") : isActive ? t("clockIn.statusActive") : isMissed ? t("clockIn.statusMissed") : t("clockIn.statusUpcoming", { time: segment.clockInWindowStart })}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div>
                  {t("clockIn.inLabel")}：
                  {doneIn ? <span className="text-slate-700">{toDateTimeStr(new Date(seg!.clockIn!.clockTime)).slice(11)}</span> : t("clockIn.notClocked")}
                </div>
                <div>
                  {t("clockIn.outLabel")}：
                  {doneOut ? <span className="text-slate-700">{toDateTimeStr(new Date(seg!.clockOut!.clockTime)).slice(11)}</span> : t("clockIn.notClocked")}
                </div>
              </div>
            </div>
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

      {activeSession && activeSegmentId && (
        <CameraCapture
          sessionLabel={`${SESSION_LABEL[activeSession]} · ${t("clockIn.segmentLabel", {
            // findIndex 找不到时返回 -1（不是 null/undefined），`?? 0` 接不住 -1，
            // 用 Math.max 兜底，避免生效班次在相机弹层打开期间发生变化时显示出 "Segment 0"
            n: Math.max(shift.segments.findIndex((s) => s.id === activeSegmentId), 0) + 1,
          })}`}
          onCancel={() => {
            setActiveSession(null);
            setActiveSegmentId(null);
          }}
          onConfirm={handleConfirm}
        />
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
