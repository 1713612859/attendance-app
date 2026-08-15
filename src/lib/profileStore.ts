// 员工基本信息（姓名/性别/头像/手机号/发薪周期/工号/部门）全部来自 HR/后端系统 mock 数据
// （见 mockApi.PROFILE），员工端只读展示，不提供自助编辑入口——历史上姓名/性别/头像曾经
// 做成过可编辑，现已改为只读，此文件保留一个稳定的读取入口，避免调用方直接散落导入 PROFILE。

import { PROFILE } from "./mockApi";

export function useEmployeeProfile() {
  return PROFILE;
}
