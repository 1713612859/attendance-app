import { CalendarCheck2, Camera, ClipboardList, User, Wallet2 } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useI18n } from "../i18n";

const items = [
  { to: "/", key: "nav.clock", icon: Camera, end: true },
  { to: "/records", key: "nav.records", icon: CalendarCheck2, end: false },
  { to: "/apply", key: "nav.apply", icon: ClipboardList, end: false },
  { to: "/payslip", key: "nav.payslip", icon: Wallet2, end: false },
  { to: "/profile", key: "nav.profile", icon: User, end: false },
] as const;

export default function BottomNav() {
  const { t } = useI18n();
  const location = useLocation();
  const activeIndex = Math.max(
    0,
    items.findIndex((it) => (it.end ? location.pathname === it.to : location.pathname.startsWith(it.to)))
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 bg-white/95 backdrop-blur safe-bottom">
      <div className="relative mx-auto flex max-w-md">
        {/* 聚焦指示条：随激活项平滑滑动，而非瞬间跳变 */}
        <span
          className="absolute top-1 h-0.5 rounded-full bg-brand-600 transition-transform duration-300 ease-out"
          style={{ width: `${100 / items.length}%`, transform: `translateX(${activeIndex * 100}%)` }}
        />
        {items.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              // antd-mobile 会注入全局样式给 <a> 设置默认蓝色，且用 a:link/a:visited 这类
              // 元素+伪类选择器，特异度比单个 Tailwind 类还高，普通写法会被覆盖成蓝色。
              // 用 `!` 前缀让 Tailwind 生成 !important，确保导航栏颜色始终是我们的品牌色。
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-200 ${
                isActive ? "!text-brand-600" : "!text-slate-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex items-center justify-center rounded-xl px-3 py-0.5 transition-all duration-300 ${
                    isActive ? "-translate-y-0.5 bg-brand-50" : "translate-y-0 bg-transparent"
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 2} className="transition-transform duration-300" />
                </span>
                <span>{t(key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
