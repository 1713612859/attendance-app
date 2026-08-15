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
  // 班次含多段时间时，必须指明补的是哪一段——不指明就没法知道该按哪一段的应出勤时间回填，
  // 审批通过后也没法把生成的打卡记录正确匹配回目标段（而不是被窗口匹配逻辑配到别的段去）。
  // 单段班次下可以为空，审批时退回第 1 段。
  segmentId?: string;
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

export interface ShiftTimeRange {
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface ShiftChangeApply extends ApplyBase {
  kind: "shift";
  effectiveDate: string; // YYYY-MM-DD，新班次生效日期（含当天）
  // 数组而不是单个 start/end——班次本身已经支持多段（见 Shift.segments），
  // 申请调整的目标理应能同样表达多段，否则员工永远没法通过申请流程换成分段班次，
  // 多段班次就只能停留在写死的种子数据里。currentSegments 只是提交当下"生效班次"的快照，仅展示用。
  currentSegments: ShiftTimeRange[];
  requestedSegments: ShiftTimeRange[];
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
//
// 多段班次模型：参照真实后端系统的班次配置（工作日 + 多段打卡时间 + 每段独立的
// 打卡窗口——最早/最晚可打卡时间），而不是简单的一条 startTime/endTime。
// 关键点：员工"应出勤时间"（startTime/endTime，用于迟到/早退判定）
// 和"允许打卡的时间窗口"（clockInWindowStart/clockOutWindowEnd，用于控制打卡按钮是否可点）
// 是两个独立概念——允许提前一段时间打上班卡，也允许下班后一段时间内补打下班卡，
// 但迟到/早退仍然按"应出勤时间"判定，不能因为打卡窗口宽松就误判成正常。

export interface ShiftSegment {
  id: string;
  startTime: string; // HH:mm，应上班时间（迟到判定基准）
  endTime: string; // HH:mm，应下班时间（早退判定基准）
  clockInRequired: boolean;
  clockInWindowStart: string; // HH:mm，最早可打上班卡时间
  clockOutRequired: boolean;
  clockOutWindowEnd: string; // HH:mm，最晚可打下班卡时间
  clockOutWindowCrossesMidnight: boolean; // 最晚可打卡时间是否为"次日"（夜班场景）
}

export interface Shift {
  id: string;
  name: string;
  graceMinutes: number; // 迟到宽限分钟数，应用于每段的 startTime
  segments: ShiftSegment[]; // 一天可有多段（如上午/下午两段），按 startTime 升序排列
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

/**
 * Payslip 数据模型设计对齐 PRD 3.3 节，方针后续替换为真实后端接口
 */
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

export type Gender = "male" | "female" | "unspecified";
export type PayCycle = "weekly" | "semi-monthly" | "monthly";

// 全部字段均来自 HR/后端系统，员工端只读展示，不提供自助编辑入口
// （工号/部门历来如此；姓名/性别/头像/手机号/发薪周期原先误做成了员工可编辑，现已改为只读）。
export interface EmployeeProfile {
  employeeId: string;
  name: string;
  department: string;
  gender: Gender;
  avatarDataUrl?: string;
  phoneNumber: string;
  payCycle: PayCycle;
}
