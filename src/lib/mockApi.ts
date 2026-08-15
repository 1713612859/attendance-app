import type {
  ApplyKind,
  ApplyRecord,
  ApplyStatus,
  ClockRecord,
  ClockSession,
  CorrectionApply,
  EmployeeProfile,
  EmployeeShiftAssignment,
  LeaveApply,
  Payslip,
  Shift,
} from "../types";
import { delay, loadList, loadValue, saveList, saveValue, uid } from "./storage";
import { addMonths, monthStr, pad, toDateStr } from "./date";
import { DEFAULT_SHIFT, calculateChargeableLeaveDays } from "../domain/attendance/attendanceCalculator";

const KEYS = {
  clock: "clockRecords",
  applies: "applies",
  payslips: "payslips",
  profile: "profile",
  shifts: "shifts",
  shiftAssignments: "shiftAssignments",
  seeded: "seeded_v3",
};

export const PROFILE: EmployeeProfile = {
  employeeId: "EMP-PH-10086",
  name: "Juan Dela Cruz",
  department: "Engineering Department · Makati Site",
};

const SAMPLE_ADDRESS = "Ayala Ave, Makati City, Metro Manila, Philippines (sample address)";

// ---------- 种子数据 ----------
function seedIfNeeded() {
  if (loadValue(KEYS.seeded, false)) return;

  saveList<Shift>(KEYS.shifts, [DEFAULT_SHIFT]);
  saveList<EmployeeShiftAssignment>(KEYS.shiftAssignments, [
    {
      id: uid(),
      employeeId: PROFILE.employeeId,
      shiftId: DEFAULT_SHIFT.id,
      effectiveFrom: "2000-01-01",
      source: "default",
    },
  ]);

  const clockRecords: ClockRecord[] = [];
  const today = new Date();
  for (let i = 1; i <= 20; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const day = d.getDay();
    if (day === 0 || day === 6) continue; // 跳过周末（默认排班休息日）
    const dateStr = toDateStr(d);
    const pattern = i % 7;
    if (pattern === 5) continue; // 模拟缺卡（该日无打卡记录）
    // 迟到样例覆盖 P0 修复前会漏判的场景：10:00（分钟位为 0）
    const inMinuteOffset = pattern === 3 ? 12 : pattern === 1 ? 0 : 0;
    const inHour = pattern === 1 ? 10 : 9;
    clockRecords.push({
      id: uid(),
      employeeId: PROFILE.employeeId,
      date: dateStr,
      attendanceDate: dateStr,
      session: "in",
      clockTime: `${dateStr}T${pad(inHour)}:${pad(inMinuteOffset)}:00`,
      photoDataUrl: "",
      photoStatus: "placeholder",
      latitude: 14.5547 + Math.random() * 0.01,
      longitude: 121.0244 + Math.random() * 0.01,
      address: SAMPLE_ADDRESS,
      locationAbnormal: false,
      source: "normal",
      status: "valid",
    });
    if (pattern !== 6) {
      clockRecords.push({
        id: uid(),
        employeeId: PROFILE.employeeId,
        date: dateStr,
        attendanceDate: dateStr,
        session: "out",
        clockTime: `${dateStr}T18:0${pattern}:00`,
        photoDataUrl: "",
        photoStatus: "placeholder",
        latitude: 14.5547 + Math.random() * 0.01,
        longitude: 121.0244 + Math.random() * 0.01,
        address: SAMPLE_ADDRESS,
        locationAbnormal: false,
        source: "normal",
        status: "valid",
      });
    }
  }
  saveList(KEYS.clock, clockRecords);

  const leaveStart = toDateStr(new Date(today.getTime() - 4 * 86400000));
  const applies: ApplyRecord[] = [
    {
      id: uid(),
      employeeId: PROFILE.employeeId,
      kind: "leave",
      status: "approved",
      submittedAt: new Date(today.getTime() - 6 * 86400000).toISOString(),
      decidedAt: new Date(today.getTime() - 5 * 86400000).toISOString(),
      approver: "Maria Santos (Supervisor)",
      comment: "Approved, take care.",
      leaveType: "VL",
      startTime: `${leaveStart}T09:00`,
      endTime: `${leaveStart}T18:00`,
      days: calculateChargeableLeaveDays(`${leaveStart}T09:00`, `${leaveStart}T18:00`),
      reason: "Family matters, requesting one day of vacation leave.",
    } as LeaveApply,
    {
      id: uid(),
      employeeId: PROFILE.employeeId,
      kind: "correction",
      status: "pending",
      submittedAt: new Date(today.getTime() - 1 * 86400000).toISOString(),
      date: toDateStr(new Date(today.getTime() - 2 * 86400000)),
      session: "in",
      reason: "MRT delay during rush hour, forgot to clock in — actual arrival was around 9:10.",
    } as CorrectionApply,
  ];
  saveList(KEYS.applies, applies);

  // 工资条金额示例：PHP，扣款项目按菲律宾法定项目命名，按当地常见"半月结"（1-15 / 16-月末）生成两期
  // 具体费率以官方 SSS/PhilHealth/Pag-IBIG 表及 BIR 预扣税表为准，此处仅为演示数值（isDemoData: true）
  const payslips: Payslip[] = [];
  for (let mOffset = 1; mOffset <= 2; mOffset++) {
    const m = addMonths(today, -mOffset);
    const y = m.getFullYear();
    const mm = m.getMonth();
    const lastDay = new Date(y, mm + 1, 0).getDate();
    const cutoffs: [number, number][] = [
      [1, 15],
      [16, lastDay],
    ];
    cutoffs.forEach(([startDay, endDay], half) => {
      const base = 16000;
      const bonus = mOffset === 1 && half === 1 ? 3000 : half === 0 ? 500 : 0;
      const otPay = half === 1 ? 850 : 0;
      const sss = 675;
      const philhealth = 400;
      const pagibig = 100;
      const tax = 725;
      const gross = base + bonus + otPay;
      const deduction = sss + philhealth + pagibig + tax;
      payslips.push({
        id: uid(),
        month: monthStr(m),
        cutoffStart: `${y}-${pad(mm + 1)}-${pad(startDay)}`,
        cutoffEnd: `${y}-${pad(mm + 1)}-${pad(endDay)}`,
        payDate: half === 0 ? `${y}-${pad(mm + 1)}-${pad(Math.min(20, lastDay))}` : toDateStr(new Date(y, mm + 1, 5)),
        grossItems: [
          { label: "Basic Pay", amount: base },
          { label: "Performance Bonus", amount: bonus },
          { label: "Overtime Pay", amount: otPay },
        ].filter((it) => it.amount > 0),
        deductionItems: [
          { label: "SSS Contribution", amount: sss },
          { label: "PhilHealth Contribution", amount: philhealth },
          { label: "Pag-IBIG Contribution", amount: pagibig },
          { label: "Withholding Tax", amount: tax },
        ],
        grossTotal: gross,
        deductionTotal: deduction,
        netTotal: gross - deduction,
        isDemoData: true,
      });
    });
  }
  saveList(KEYS.payslips, payslips);

  saveValue(KEYS.seeded, true);
}
seedIfNeeded();

// ---------- 班次 ----------
export async function fetchShifts(): Promise<Shift[]> {
  await delay(100);
  return loadList<Shift>(KEYS.shifts);
}

/** 按日期查询生效班次：取该员工 effectiveFrom <= date 的最近一条分配，无匹配则回退默认班次 */
export async function getEffectiveShift(employeeId: string, date: string): Promise<Shift> {
  const assignments = loadList<EmployeeShiftAssignment>(KEYS.shiftAssignments).filter(
    (a) => a.employeeId === employeeId && a.effectiveFrom <= date
  );
  if (assignments.length === 0) return DEFAULT_SHIFT;
  const latest = assignments.sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))[0];
  const shifts = loadList<Shift>(KEYS.shifts);
  return shifts.find((s) => s.id === latest.shiftId) ?? DEFAULT_SHIFT;
}

export function getEffectiveShiftSync(employeeId: string, date: string): Shift {
  const assignments = loadList<EmployeeShiftAssignment>(KEYS.shiftAssignments).filter(
    (a) => a.employeeId === employeeId && a.effectiveFrom <= date
  );
  if (assignments.length === 0) return DEFAULT_SHIFT;
  const latest = assignments.sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))[0];
  const shifts = loadList<Shift>(KEYS.shifts);
  return shifts.find((s) => s.id === latest.shiftId) ?? DEFAULT_SHIFT;
}

// ---------- 打卡 ----------
export async function fetchClockRecords(): Promise<ClockRecord[]> {
  await delay();
  return loadList<ClockRecord>(KEYS.clock).sort((a, b) => (a.clockTime < b.clockTime ? 1 : -1));
}

export function findActiveClockRecord(employeeId: string, attendanceDate: string, session: ClockSession): ClockRecord | undefined {
  return loadList<ClockRecord>(KEYS.clock).find(
    (r) => r.employeeId === employeeId && r.attendanceDate === attendanceDate && r.session === session && r.status === "valid"
  );
}

export async function submitClock(
  input: Omit<ClockRecord, "id" | "source" | "employeeId" | "attendanceDate" | "status" | "photoStatus"> & {
    photoStatus?: ClockRecord["photoStatus"];
  }
): Promise<ClockRecord> {
  await delay(500);
  const list = loadList<ClockRecord>(KEYS.clock);
  // 考勤归属日：默认与打卡自然日一致；夜班（跨夜班次）的下班打卡应归属"上班当天"，
  // 此处按 in/out 均使用 input.date（调用方已按班次判断传入）作为归属日，避免直接用 clockTime 的自然日。
  const record: ClockRecord = {
    ...input,
    id: uid(),
    employeeId: PROFILE.employeeId,
    attendanceDate: input.date,
    source: "normal",
    status: "valid",
    photoStatus: input.photoStatus ?? (input.photoDataUrl ? "captured" : "missing"),
  };
  list.push(record);
  saveList(KEYS.clock, list);
  return record;
}

export function getTodaySessions(records: ClockRecord[], dateStr: string): ClockSession[] {
  return records.filter((r) => r.attendanceDate === dateStr && r.status === "valid").map((r) => r.session);
}

// ---------- 补卡 / 请假 / 加班 / 班次调整 / 离职 申请 ----------
export async function fetchApplies(): Promise<ApplyRecord[]> {
  await delay();
  return loadList<ApplyRecord>(KEYS.applies).sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
}

export async function submitApply(record: ApplyRecord): Promise<ApplyRecord> {
  await delay(500);
  const list = loadList<ApplyRecord>(KEYS.applies);
  list.push({ ...record, employeeId: PROFILE.employeeId });
  saveList(KEYS.applies, list);
  return record;
}

export async function withdrawApply(id: string): Promise<void> {
  await delay(300);
  const list = loadList<ApplyRecord>(KEYS.applies);
  const idx = list.findIndex((a) => a.id === id);
  if (idx >= 0 && list[idx].status === "pending") {
    list[idx] = { ...list[idx], status: "withdrawn" as ApplyStatus };
    saveList(KEYS.applies, list);
  }
}

/**
 * 仅用于 Demo 演示审批流转，真实项目中审批发生在后端系统，App 不提供审批操作入口。
 * P0 修复：
 * - 幂等：非 pending 状态的申请再次调用直接返回，避免连续点击生成重复联动数据
 * - 补卡通过前检查 employeeId+attendanceDate+session 是否已存在有效打卡，存在则不重复创建，
 *   而是把冲突信息写进审批意见里，避免出现"同一天同一时段两条有效打卡记录"
 * - 班次调整通过后生成 EmployeeShiftAssignment，而不是让 Records 直接读申请记录
 */
export async function demoDecide(id: string, decision: "approved" | "rejected"): Promise<void> {
  await delay(400);
  const list = loadList<ApplyRecord>(KEYS.applies);
  const idx = list.findIndex((a) => a.id === id);
  if (idx < 0) return;
  const item = list[idx];
  if (item.status !== "pending") return; // 幂等保护

  let comment = decision === "approved" ? "Approved." : "Insufficient details — please resubmit with more information.";

  if (item.kind === "correction" && decision === "approved") {
    const existing = findActiveClockRecord(item.employeeId, item.date, item.session);
    if (existing && existing.source === "normal") {
      // 已存在正常打卡，不重复生成，仅在审批意见中记录冲突，供 HR 人工复核
      comment = "Approved, but a normal clock record already exists for this date/session — no duplicate record was created.";
    } else if (!existing) {
      const clock = loadList<ClockRecord>(KEYS.clock);
      clock.push({
        id: uid(),
        employeeId: item.employeeId,
        date: item.date,
        attendanceDate: item.date,
        session: item.session,
        clockTime: `${item.date}T${item.session === "in" ? "09:00" : "18:00"}:00`,
        photoDataUrl: "",
        photoStatus: "missing",
        locationAbnormal: false,
        source: "correction",
        sourceApplyId: item.id,
        status: "valid",
      });
      saveList(KEYS.clock, clock);
    }
    // existing && existing.source === 'correction'：同一补卡已生成过记录，不重复创建（幂等保护已在上层拦截，这里是双保险）
  }

  if (item.kind === "shift" && decision === "approved") {
    const assignments = loadList<EmployeeShiftAssignment>(KEYS.shiftAssignments);
    const shifts = loadList<Shift>(KEYS.shifts);
    const shiftId = `shift-${item.id}`;
    shifts.push({
      id: shiftId,
      name: "Adjusted Shift",
      startTime: item.requestedStart,
      endTime: item.requestedEnd,
      graceMinutes: 5,
      crossesMidnight: toMinutesLocal(item.requestedEnd) <= toMinutesLocal(item.requestedStart),
    });
    saveList(KEYS.shifts, shifts);
    assignments.push({
      id: uid(),
      employeeId: item.employeeId,
      shiftId,
      effectiveFrom: item.effectiveDate,
      source: "shift-change",
      sourceApplyId: item.id,
    });
    saveList(KEYS.shiftAssignments, assignments);
  }

  list[idx] = {
    ...item,
    status: decision,
    decidedAt: new Date().toISOString(),
    approver: item.approver ?? "Maria Santos (Supervisor)",
    comment,
  };
  saveList(KEYS.applies, list);
}

function toMinutesLocal(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function countByKind(list: ApplyRecord[], kind: ApplyKind): ApplyRecord[] {
  return list.filter((a) => a.kind === kind);
}

// ---------- 工资条 ----------
export async function fetchPayslips(): Promise<Payslip[]> {
  await delay();
  return loadList<Payslip>(KEYS.payslips).sort((a, b) => (a.month < b.month ? 1 : -1));
}

// ---------- Demo 数据管理 ----------
export function resetDemoData(): void {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(`attendance-demo:${k}`));
  localStorage.removeItem("attendance-demo:session");
  localStorage.removeItem("attendance-demo:profileOverrides");
}
