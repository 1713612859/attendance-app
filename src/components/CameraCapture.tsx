import { useEffect, useRef, useState } from "react";
import { Camera, MapPin, RotateCcw, X } from "lucide-react";
import { getGeoLocation } from "../lib/geo";
import type { GeoResult } from "../lib/geo";
import { drawPlaceholderPhoto, drawWatermark } from "../lib/watermark";
import { toDateTimeStr } from "../lib/date";
import { PROFILE } from "../lib/mockApi";
import { useI18n } from "../i18n";

interface Props {
  sessionLabel: string;
  onCancel: () => void;
  onConfirm: (result: { photoDataUrl: string; geo: GeoResult; clockTime: Date }) => void;
}

export default function CameraCapture({ sessionLabel, onCancel, onConfirm }: Props) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [geo, setGeo] = useState<GeoResult>({ abnormal: true, address: t("camera.locating") });
  const [geoLoading, setGeoLoading] = useState(true);
  const [captured, setCaptured] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getGeoLocation().then((g) => {
      if (!cancelled) {
        setGeo(g);
        setGeoLoading(false);
      }
    });

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
      } catch {
        setCameraError(t("camera.noCamera"));
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function capture() {
    const canvas = document.createElement("canvas");
    const now = new Date();

    if (cameraReady && videoRef.current) {
      const video = videoRef.current;
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 960;
      const ctx = canvas.getContext("2d");
      ctx?.translate(canvas.width, 0);
      ctx?.scale(-1, 1); // 镜像修正，前置摄像头自拍效果
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx?.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      drawPlaceholderPhoto(canvas, t("camera.placeholderTitle"), t("camera.placeholderSubtitle"));
    }

    const dataUrl = drawWatermark(canvas, {
      dateTimeStr: toDateTimeStr(now),
      address: geo.address ?? "-",
      name: PROFILE.name,
      employeeId: PROFILE.employeeId,
      sessionLabel,
      brandLabel: t("camera.watermarkBrand"),
    });
    setCaptured(dataUrl);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }

  function retake() {
    setCaptured(null);
    setCameraReady(false);
    setCameraError(null);
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
      } catch {
        setCameraError(t("camera.noCamera"));
      }
    })();
  }

  function confirm() {
    if (!captured) return;
    onConfirm({ photoDataUrl: captured, geo, clockTime: new Date() });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black safe-top safe-bottom">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button onClick={onCancel} aria-label={t("common.close")} className="rounded-full bg-white/10 p-2">
          <X size={20} />
        </button>
        <span className="text-sm font-medium">
          {sessionLabel} · {t("camera.subtitle")}
        </span>
        <span className="w-9" />
      </div>

      <div className="relative flex-1 overflow-hidden bg-neutral-900">
        {captured ? (
          <img src={captured} alt="" className="h-full w-full object-cover" />
        ) : (
          <>
            <video ref={videoRef} className="h-full w-full object-cover [transform:scaleX(-1)]" playsInline muted />
            {!cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-white/80">
                <Camera size={36} />
                <p className="text-sm">{cameraError ?? t("camera.opening")}</p>
              </div>
            )}
          </>
        )}

        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs text-white">
          <MapPin size={13} />
          {geoLoading ? t("camera.locating") : geo.address}
        </div>
      </div>

      <div className="flex items-center justify-center gap-10 bg-black py-6">
        {captured ? (
          <>
            <button onClick={retake} className="flex flex-col items-center gap-1 text-white/80">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                <RotateCcw size={20} />
              </span>
              <span className="text-xs">{t("camera.retake")}</span>
            </button>
            <button
              onClick={confirm}
              className="rounded-full bg-brand-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30"
            >
              {t("camera.confirmClock")}
            </button>
          </>
        ) : (
          <button
            onClick={capture}
            aria-label={t("camera.subtitle")}
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-white/20"
          >
            <span className="h-12 w-12 rounded-full bg-white" />
          </button>
        )}
      </div>
    </div>
  );
}
