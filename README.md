# E-TECH PAYROLL SYSTEM · 考勤打卡 Demo

面向菲律宾员工的移动端考勤 App 原型（PWA）。产品侧可运行 Demo，用于验证交互流程和业务规则，
**不接真实后端**，所有数据存在浏览器 `localStorage` 里，用于演示和团队评审。

> ⚠️ 本项目是 Demo，不是生产系统。数据模型、示例费率、假期日历等细节见下方「已知限制」。

**在线预览**：[http://120.24.144.173:9090/#/login](http://120.24.144.173:9090/#/login) —— push 到 `main` 分支后由 GitHub Actions 自动构建并部署到该地址，无需手动操作，部署配置见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

---

## 功能一览

| 模块 | 说明 |
|---|---|
| 打卡 | 拍照打卡 + 水印（时间/地点/姓名工号）+ 定位，支持分段班次（同一天多组上下班） |
| 考勤记录 | 月历视图，正常/异常/请假/节假日分色标记，支持点开当天明细 |
| 申请中心 | 补卡 / 请假 / 加班 / 班次调整 / 离职 5 类申请，入口按钮 + 独立子页面 |
| 工资条 | 按半月结（Cutoff）展示应发/扣款明细 |
| 我的 | 姓名/性别/部门/手机号/发薪周期只读展示（数据来自 HR 系统）、切换中英文、重置本地数据、退出登录 |

登录为本地模拟登录（任意工号+6 位以上密码即可），默认账号见登录页提示。

---

## 技术栈

- **框架**：Vite + React 19 + TypeScript
- **样式**：Tailwind CSS v4
- **路由**：React Router（HashRouter）
- **移动端 UI 组件**：[antd-mobile](https://mobile.ant.design/)（日期/时间/单列选择器）+ [Vaul](https://vaul.emilkowal.ski/)（底部弹出面板）
- **图标**：lucide-react
- **i18n**：自研轻量方案（`src/i18n`），默认英文，可切换简体中文
- **PWA**：vite-plugin-pwa，支持添加到主屏幕

## 目录结构

```text
src/
├── App.tsx                 # 路由配置
├── components/              # 通用组件（Sheet、DateField、TimeField、SelectField...）
├── domain/attendance/       # 考勤计算领域层（迟到/早退/缺勤/请假天数等规则）
├── i18n/                    # en/zh 字典 + Context
├── lib/                     # mockApi（本地数据层）、auth、holidays、profileStore...
├── pages/                   # 页面级组件
└── types.ts                 # 数据模型
```

---

## 快速开始

```bash
npm install
npm run dev       # 本地开发，默认 http://localhost:5173
npm run build      # 生产构建（含 TypeScript 类型检查），产物在 dist/
npm run lint        # oxlint
```

打包成安装包（PWA 或原生 .apk）见 **[PACKAGING.md](./PACKAGING.md)**。

---

## 相关文档

- **[FEATURES.md](./FEATURES.md)** —— 完整功能列表，按模块整理
- **[PACKAGING.md](./PACKAGING.md)** —— 打包说明（PWA 部署 + 真实 APK 打包两条路线）
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** —— GitHub Actions 自动部署说明（push 到 main 自动构建并通过 SSH 部署到源站）
- **[BUSINESS_LOGIC_REVIEW.md](./BUSINESS_LOGIC_REVIEW.md)** —— 业务逻辑现状与待审查清单，记录了考勤计算规则、跨模块联动逻辑、以及明确标注为"Demo 阶段简化"的部分，供后续开发/审查参考

---

## 已知限制（Demo 阶段，非缺陷）

- 无真实后端、无真实鉴权、无多级审批流程
- 工资条金额/费率为示例值，非官方 SSS/PhilHealth/Pag-IBIG/BIR 费率表计算结果
- 打卡时间戳使用客户端本地时间，非防篡改的服务端时间
- 法定节假日日历为固定节日 + 复活节相关日期算法计算，农历新年等按阴历排定的节日未列入（需官方公告确认）
- 离职申请不校验菲律宾 DOLE「提前 30 天书面通知」规则，交由 HR 后台人工处理

详细清单见 [BUSINESS_LOGIC_REVIEW.md](./BUSINESS_LOGIC_REVIEW.md)。
