import { useState } from "react";
import { Camera, User } from "lucide-react";
import Sheet from "./Sheet";
import { getEditableProfile, saveEditableProfile } from "../lib/profileStore";
import type { Gender } from "../lib/profileStore";
import { useI18n } from "../i18n";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfileEditSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const current = getEditableProfile();
  const [name, setName] = useState(current.name);
  const [gender, setGender] = useState<Gender>(current.gender);
  const [avatar, setAvatar] = useState<string | undefined>(current.avatarDataUrl);
  const [saving, setSaving] = useState(false);

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatar(await fileToDataUrl(file));
  }

  function handleSave() {
    setSaving(true);
    saveEditableProfile({ name: name.trim() || current.name, gender, avatarDataUrl: avatar });
    setSaving(false);
    onClose();
  }

  const GENDER_OPTIONS: { value: Gender; label: string }[] = [
    { value: "male", label: t("profile.genderMale") },
    { value: "female", label: t("profile.genderFemale") },
    { value: "unspecified", label: t("profile.genderUnspecified") },
  ];

  return (
    <Sheet title={t("profile.editProfile")} onClose={onClose}>
      <div className="flex flex-col items-center">
        <label className="relative cursor-pointer">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-brand-500 ring-4 ring-brand-50">
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <User size={32} />}
          </div>
          <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-white">
            <Camera size={14} />
          </span>
          <input type="file" accept="image/*" onChange={handleAvatarPick} className="hidden" />
        </label>
        <p className="mt-2 text-[11px] text-slate-400">{t("profile.avatarHint")}</p>
      </div>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{t("profile.name")}</span>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} className="input" maxLength={60} />
        </label>

        <div>
          <span className="mb-1 block text-xs font-medium text-slate-600">{t("profile.gender")}</span>
          <div className="flex gap-2">
            {GENDER_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setGender(o.value)}
                className={`flex-1 rounded-xl border py-2 text-sm ${
                  gender === o.value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <p className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-400">{t("profile.editNote")}</p>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-brand-600 py-3 text-sm font-semibold text-white active:bg-brand-700 disabled:opacity-60"
        >
          {saving ? t("common.loading") : t("profile.save")}
        </button>
      </div>
    </Sheet>
  );
}
