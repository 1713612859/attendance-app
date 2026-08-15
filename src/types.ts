// 数据模型 —— 字段设计对齐 PRD 3.3 节，方针后续替换为真实后端接口
// 假种、扣款项目命名已按菲律宾劳动法（Labor Code of the Philippines）惯例调整，
// 具体额度/资格条件仍需 HR/法务最终确认，App 仅做展示与流程演示，不做资格判定。
//
// v2 变更（业务逻辑审查后）：
// - ClockRecord 增加 employeeId / attendanceDate（考勤归属日，与 clockTime 自然日区分，
//   为跨夜班预留）/ status / sourceApplyId / photoStatus
// - 新增 Shift / EmployeeShiftAssignment：班次调整审批通过后生成"生效班次分配"，
//   考勤计算不再直接读自由文本申请记录
// - ApplyBase 增加 employeeId，为多员工/多级审批预留

export type ClockSession = "in" | "out";
export type ClockRecordStatus = "valid" | "invalidated";
export type PhotoStatus = "captured" | "placeholder" | "missing";

export interface ClockRecord {
  id: string;
  employeeId: string;
  date: string; // clockTime 对应的自然日 YYYY-MM-DD（展示用）
  attendanceDate: string; // 考勤归属日 YYYY-MM-DD（业务计算用，夜班跨日以此为准）
  session: ClockSession;
  clockTime: string; // ISO datetime，Demo 阶段用客户端时间模拟（非防篡改服务端时间）
  photoDataUrl: string;
  photoStatus: PhotoStatus;
  latitude?: number;
  longitude?: number;
  address?: string;
  locationAbnormal: boolean;
  source: "normal" | "correction";
  sourceApplyId?: string;
  status: ClockRecordStatus;
}

export type ApplyStatus = "pending" | "approved" | "rejected" | "withdrawn";

export interface ApplyBase {
  id: string;
  employeeId: string;
  status: ApplyStatus;
  submittedAt: string; // ISO
  approver?: string;
  comment?: string;
  decidedAt?: string;
}

export interface CorrectionApply extends ApplyBase {
  kind: "correction";
  date: string;
  session: ClockSession;
  reason: string;
  attachmentDataUrl?: string;
}

// 菲律宾劳动法（Labor Code）常见假种：
// VL = Vacation Leave（企业自设年假，非法定强制）
// SL = Sick Leave（企业自设病假，非法定强制）
// SIL = Service Incentive Leave（第95条法定最低5天/年，服务满1年员工）
// Maternity Leave（RA 11210，105天，SSS 报销）
// Paternity Leave（RA 8187，7天）
// Solo Parent Leave（RA 8972，7天，需 Solo Parent ID）
// Bereavement Leave（企业自设，非法定强制）
export const LEAVE_TYPES = [
  "VL",
  "SL",
  "SIL",
  "Maternity Leave",
  "Paternity Leave",
  "Solo Parent Leave",
  "Bereavement Leave",
] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export interface LeaveApply extends ApplyBase {
  kind: "leave";
  leaveType: LeaveType;
  startTime: string; // datetime-local string
  endTime: string;
  days: number; // 计算后的"可扣减天数"：仅统计排班工作日，剔除休息日与法定节假日
  reason: string;
  attachmentDataUrl?: string;
}

// 菲律宾常见加班/假日工资分类（App 不计算金额，仅作为分类标签，
// 实际倍率——如普通加班125%、休息日加班130%、法定假日200%等——由后端薪资系统核算）
export type OvertimeType = "workday" | "restday" | "special-holiday" | "regular-holiday";

export interface OvertimeApply extends ApplyBase {
  kind: "overtime";
  date: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  hours: number; // 申请时长，仅供参考，最终以审批结果为准
  otType: OvertimeType;
  reason: string;
}

export interface ShiftChangeApply extends ApplyBase {
  kind: "shift";
  effectiveDate: string; // YYYY-MM-DD，新班次生效日期（含当天）
  currentStart: string; // HH:mm，结构化时间，供考勤记录模块联动迟到/早退判定
  currentEnd: string;
  requestedStart: string;
  requestedEnd: string;
  reason: string;
}

export interface ResignationApply extends ApplyBase {
  kind: "resignation";
  lastWorkingDate: string; // YYYY-MM-DD
  reason: string;
  handoverNotes?: string;
}

export type ApplyRecord = CorrectionApply | LeaveApply | OvertimeApply | ShiftChangeApply | ResignationApply;
export type ApplyKind = ApplyRecord["kind"];

// ---------- 班次与排班（业务逻辑审查后新增）----------

export interface Shift {
  id: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  graceMinutes: number; // 迟到宽限分钟数
  crossesMidnight: boolean; // 是否跨夜（endTime < startTime）
}

export interface EmployeeShiftAssignment {
  id: string;
  employeeId: string;
  shiftId: string;
  effectiveFrom: string; // YYYY-MM-DD，含当天起生效
  source: "default" | "shift-change";
  sourceApplyId?: string;
}

// ---------- 工资条 ----------

export interface PayslipItem {
  label: string;
  amount: number;
}

export interface Payslip {
  id: string;
  month: string; // YYYY-MM，用于分组展示
  cutoffStart: string; // YYYY-MM-DD，薪资周期开始（菲律宾常见半月结：1-15 / 16-月末）
  cutoffEnd: string; // YYYY-MM-DD，薪资周期结束
  payDate: string; // YYYY-MM-DD，实际发放日期
  grossItems: PayslipItem[];
  deductionItems: PayslipItem[];
  grossTotal: number;
  deductionTotal: number;
  netTotal: number;
  isDemoData: true; // 恒为 true：提醒这是示例费率，不可当真实工资条使用
}

export interface EmployeeProfile {
  employeeId: string;
  name: string;
  department: string;
}
