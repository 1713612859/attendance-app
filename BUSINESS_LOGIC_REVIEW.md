# E-TECH PAYROLL SYSTEM · 考勤打卡 Demo — 业务逻辑现状与待审查清单

> 目的：本文档供交叉审查（如 Codex）使用，梳理当前 Demo 的业务规则、数据模型和已知存疑点。
> 定位：这是一个**纯前端 + localStorage Mock 数据**的可运行原型，用于产品验证交互流程，
> 不是生产系统。所有"业务规则"目前都是**写死在前端代码里的示例值**，未来必须由后端 / 排班系统 / HR 规则引擎驱动。

代码位置：`D:\Dev_project\attendance-app-demo`（独立仓库，与 ap-power-web 无关）

---

## 1. 技术架构现状

- Vite + React + TypeScript + Tailwind v4，`HashRouter` 路由，纯客户端渲染
- 无真实后端；所有数据经 `src/lib/mockApi.ts` 读写 `localStorage`，函数签名已按未来真实 API 设计（`async`、统一返回结构），便于后续替换为 `fetch`
- 登录态：`src/lib/auth.ts`，`localStorage` 存 session，无真实鉴权、无 Token 过期机制
- i18n：`src/i18n/`，`en`/`zh` 两套字典 + Context，默认英文；**尚未做字典 key 完整性校验**，两语言字典是否 100% 对齐未做自动化检查
- 5 个业务模块：打卡（ClockIn）、考勤记录（Records）、申请中心（Apply：补卡/请假/加班/班次调整/离职）、工资条（Payslip）、我的（Profile）

## 2. 数据模型现状（`src/types.ts`）

```
ClockRecord      打卡记录：日期/时段/时间/照片/经纬度/地址/定位异常标记/来源(normal|correction)
ApplyRecord      联合类型：CorrectionApply | LeaveApply | OvertimeApply | ShiftChangeApply | ResignationApply
Payslip          工资条：month + cutoffStart/cutoffEnd/payDate + grossItems[] + deductionItems[]
EmployeeProfile  仅 employeeId/name/department，无角色、无部门层级、无直属主管字段
```

**存疑点**：
- `ApplyBase.approver` 是自由文本字符串（如 `"Maria Santos (Supervisor)"`），没有真实的审批人/审批链数据结构，无法支撑多级审批
- 没有 `Shift`（班次配置）实体——"迟到/早退"判定目前硬编码假设所有人朝九晚六，与新增的"班次调整申请"功能在逻辑上是脱节的（见第 4.3 节）

## 3. 打卡模块（ClockIn）

- 拍照 → Canvas 叠加水印（姓名/工号/时间/地址）→ 存本地
- 定位：`navigator.geolocation`，8 秒超时，失败/拒绝则标记 `locationAbnormal: true` 但**仍允许打卡**（不阻断流程）
- 重复打卡拦截：同一天同一 session（上/下班）只能提交一次，否则弹 toast 拒绝，**没有"强制重新打卡覆盖"的选项**
- 无相机权限时降级为占位图片，保证流程可测

**存疑点 / 待确认**：
- 定位异常时是否应该阻断打卡而非仅标记？目前策略是"不阻断，事后由后端复核"，需 HR/合规确认是否可接受
- 打卡时间戳目前用**客户端本地时间**（`new Date()`），PRD 中明确要求"以服务器时间为准，防篡改"——这是 Demo 阶段的已知简化，正式版必须改为服务端时间戳
- 未做"代打卡"技术防范说明之外的任何限制（如设备指纹绑定）

## 4. 考勤记录模块（Records）

### 4.1 迟到/早退判定规则（`src/pages/Records.tsx`）

```
硬编码：上班 09:00（5 分钟宽限）/ 下班 18:00
迟到 = in 记录的小时 >= 9 且分钟 > 5
早退 = out 记录的小时 < 18
```

**这是本次审查中最需要 Codex 复核的一处**：
- 所有员工共用同一套朝九晚六假设，**没有读取"班次调整申请"批准后的新班次**，也没有区分部门/岗位班次
- 一旦批准了班次调整申请（`ShiftChangeApply`），Records 模块完全不感知，仍按默认 9-6 判迟到——**这是一个功能孤岛，两个模块之间没有打通**
- 缺勤（absent）判定＝当天非周末、非请假、且无任何打卡记录；**没有考虑法定节假日**（菲律宾常规假日/特殊非工作日），法定假日当天没打卡不应计为缺勤

### 4.2 请假联动

- 请假区间用 `startTime`~`endTime`（datetime-local）逐日展开成已批准请假日期集合，覆盖到的自然日在日历上标记为"请假"，优先级高于迟到/缺勤判定
- **未处理半天假**：请假的开始/结束时间虽然精确到分钟，但日历只做"整天覆盖"展示，半天请假当天仍会被完整标记为"请假"，可能掩盖当天实际出勤的迟到/早退情况

### 4.3 加班统计

- 加班小时数只统计**已批准**的加班申请，按 `date` 汇总到当月
- 与打卡记录之间没有交叉校验（例如加班申请的时间段是否与实际下班打卡时间吻合），纯粹是"申请了多少算多少"

## 5. 申请中心（Apply）— 5 类申请

| 类型 | 关键字段 | 校验规则 | 备注 |
|---|---|---|---|
| 补卡 Correction | date/session/reason/attachment | 仅限最近 3 天内 | "3 天"是示例值，需企业确认 |
| 请假 Leave | leaveType(VL/SL/SIL/Maternity/Paternity/Solo Parent/Bereavement)/start/end/reason | 结束不早于开始；SL 必须附件 | 天数=自然日 ceil 差值，**非按实际排班工作日计算** |
| 加班 Overtime | date/start/end/otType(workday/restday/special-holiday/regular-holiday)/reason | 时长不为 0 | 时长仅展示，不做倍率计算 |
| 班次调整 Shift | effectiveDate/currentShift/requestedShift/reason | 三项均必填 | **currentShift/requestedShift 是自由文本输入**，无标准班次库可选，容易脏数据 |
| 离职 Resignation | lastWorkingDate/reason/handoverNotes | 仅 reason 必填 | 按你的决定：**不校验 DOLE 30 天提前通知规则**，由 HR 后台处理；前端仅展示一行说明文字 |

**审批全部是本地模拟**（`demoDecide`），审批人固定字符串，审批意见固定两句模板文案，仅用于演示状态机流转，**没有真实审批人身份、没有多级审批、没有审批权限校验**。

**存疑点**：
- 5 类申请是否都需要"撤回"功能？目前统一允许 `pending` 状态下撤回，未按类型区分（例如离职申请撤回在真实场景中通常需要更严格的流程）
- 补卡审批通过后会自动生成一条 `ClockRecord`（`source: "correction"`），但**没有反向校验**——如果同一天同一 session 已经存在正常打卡记录，批准补卡会造成同日同 session 两条记录，Records 页目前按"取最早的 in 记录"逻辑，可能导致状态判断混乱

## 6. 工资条模块（Payslip）

- 按半月结（Cutoff：1–15 / 16–月末）生成，字段：`cutoffStart/cutoffEnd/payDate` + `grossItems[]`（Basic/Bonus/OT）+ `deductionItems[]`（SSS/PhilHealth/Pag-IBIG/Withholding Tax）
- 金额为 PHP，格式化用 `en-PH` locale
- 查看详情前有一层"模拟指纹验证"的伪二次校验（无真实生物识别，纯 UI 演示）

**存疑点 / 待确认**：
- SSS/PhilHealth/Pag-IBIG/Withholding Tax 的具体费率是写死的示例数字，**不是按官方费率表算出来的**，正式上线前必须对接真实薪资系统或至少按最新官方费率表校正示例值，避免被误当作真实数据
- 13th Month Pay（菲律宾法定，每年 12 月发放）**目前完全没有体现**，是否需要在工资条列表中单独作为一期特殊展示，需产品确认
- 半月结的第二期 payDate 计算用了 `new Date(y, mm+1, 5)`（次月 5 号），第一期用 `min(20, lastDay)`（当月 20 号），这两个日期同样是**示例值**，非官方标准

## 7. 登录 / 我的（Auth & Profile）

- 登录校验：工号 ≥4 位 + 密码 ≥6 位，**任意值都能登录成功**，无真实账号库
- 语言切换存在 `localStorage`，跟随全局，不跟随账号（清缓存即重置为默认英文）
- 无"忘记密码""多设备登录管理""账号锁定"等安全机制（Demo 阶段合理，但需在正式需求中列出）

## 8. 跨模块一致性问题汇总（建议 Codex 重点复核）

1. **班次数据孤岛**：班次调整申请批准后，Records 的迟到/早退判定不读取新班次，两者数据模型未打通
2. **法定假日缺失**：整个系统没有"菲律宾法定节假日/特殊非工作日"日历数据源，直接影响缺勤判定、加班分类（`regular-holiday`/`special-holiday` 选项存在但无日历校验用户选的类型是否与实际日期匹配）
3. **半天请假 vs 整天日历标记**的精度损失
4. **补卡通过后可能产生同日重复打卡记录**，无去重/覆盖逻辑
5. **工资条扣款科目为示例费率**，非官方公式计算，存在被误用为真实数据的风险，需要更显著的"示例数据"标注（目前仅页面说明文字提及，无强视觉警示）
6. **打卡时间戳用客户端时间**而非服务端时间，与 PRD 防篡改要求不符（Demo 阶段已知简化）
7. **离职申请不做 30 天通知校验**（产品决定如此，非缺陷，仅记录以便 Codex 不要"修复"这一行为）

## 9. 明确不在本轮范围内（避免 Codex 误判为缺陷）

- 无后端、无真实鉴权、无真实审批链 —— 这是 Demo 阶段的既定范围，不是待修复问题
- 工资条金额/费率为示例值 —— 已知，需产品/财务提供真实费率后替换
- 班次调整、补卡时间窗口等"示例规则"数值 —— 已知占位，需企业规则确认后替换

---

**建议 Codex 输出格式**：按"跨模块一致性问题"逐条给出具体代码修改建议（文件+函数级别），如涉及数据模型变更（例如新增 `Shift` 实体、`PublicHoliday` 数据源），请一并给出 TypeScript 类型定义草案，我会基于该输出在本仓库中实施。
