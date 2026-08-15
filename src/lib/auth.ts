// 登录状态的本地 Mock 封装。正式版本这里会替换为企业 SSO / 短信验证码等真实登录方式，
// 目前仅用于打通「未登录 -> 登录 -> 使用 -> 退出登录」的产品流程演示。

import { PROFILE } from "./mockApi";
import { delay, loadValue, saveValue } from "./storage";

const KEY = "session";

export interface Session {
  employeeId: string;
  name: string;
  loggedInAt: string;
}

export function getSession(): Session | null {
  return loadValue<Session | null>(KEY, null);
}

export function isLoggedIn(): boolean {
  return getSession() !== null;
}

// Demo 账号固定为种子员工数据，工号任意 4 位以上 + 密码任意 6 位以上即可登录，
// 便于研发无需真实账号体系即可跑通全流程。
export async function login(
  employeeId: string,
  password: string
): Promise<{ ok: true } | { ok: false; message: "SHORT_ID" | "SHORT_PASSWORD" }> {
  await delay(500);
  if (employeeId.trim().length < 4) {
    return { ok: false, message: "SHORT_ID" };
  }
  if (password.length < 6) {
    return { ok: false, message: "SHORT_PASSWORD" };
  }
  const session: Session = {
    employeeId: employeeId.trim() || PROFILE.employeeId,
    name: PROFILE.name,
    loggedInAt: new Date().toISOString(),
  };
  saveValue(KEY, session);
  return { ok: true };
}

export async function logout(): Promise<void> {
  await delay(200);
  saveValue(KEY, null);
}
