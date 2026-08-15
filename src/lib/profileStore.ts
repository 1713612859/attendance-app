// 员工"可自助编辑"的基本信息（头像/姓名/性别），与 mockApi.PROFILE 分层存储。
// 工号/部门属于 HR/系统管理字段，现实系统中通常不允许员工自助修改，因此不放在这里，
// 仍以 mockApi.PROFILE 为准；这里只覆盖姓名/性别/头像三项，其余字段照旧引用 PROFILE。

import { useEffect, useState } from "react";
import { PROFILE } from "./mockApi";
import { loadValue, saveValue } from "./storage";

export type Gender = "male" | "female" | "unspecified";

export interface EditableProfile {
  name: string;
  gender: Gender;
  avatarDataUrl?: string;
}

const KEY = "profileOverrides";
const listeners = new Set<() => void>();

function defaults(): EditableProfile {
  return { name: PROFILE.name, gender: "unspecified", avatarDataUrl: undefined };
}

export function getEditableProfile(): EditableProfile {
  return loadValue<EditableProfile>(KEY, defaults());
}

export function saveEditableProfile(patch: Partial<EditableProfile>): EditableProfile {
  const next = { ...getEditableProfile(), ...patch };
  saveValue(KEY, next);
  listeners.forEach((fn) => fn());
  return next;
}

export function subscribeProfile(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 响应式读取"可自助编辑"的员工信息，任意组件调用 saveEditableProfile() 后所有订阅方自动刷新 */
export function useEditableProfile(): EditableProfile {
  const [profile, setProfile] = useState(getEditableProfile());
  useEffect(() => subscribeProfile(() => setProfile(getEditableProfile())), []);
  return profile;
}
