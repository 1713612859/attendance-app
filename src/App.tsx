import { HashRouter, Route, Routes } from "react-router-dom";
import { ConfigProvider } from "antd-mobile";
import enUS from "antd-mobile/es/locales/en-US";
import zhCN from "antd-mobile/es/locales/zh-CN";
import RequireAuth from "./components/RequireAuth";
import Login from "./pages/Login";
import ClockIn from "./pages/ClockIn";
import Records from "./pages/Records";
import ApplyHub from "./pages/ApplyHub";
import ApplyKindPage from "./pages/ApplyKindPage";
import PayslipPage from "./pages/Payslip";
import Profile from "./pages/Profile";
import { useI18n } from "./i18n";

export default function App() {
  const { lang } = useI18n();

  return (
    <ConfigProvider locale={lang === "zh" ? zhCN : enUS}>
      <HashRouter>
        <div className="min-h-full bg-[#f4f6f5]">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <ClockIn />
                </RequireAuth>
              }
            />
            <Route
              path="/records"
              element={
                <RequireAuth>
                  <Records />
                </RequireAuth>
              }
            />
            <Route
              path="/apply"
              element={
                <RequireAuth>
                  <ApplyHub />
                </RequireAuth>
              }
            />
            <Route
              path="/apply/:kind"
              element={
                <RequireAuth>
                  <ApplyKindPage />
                </RequireAuth>
              }
            />
            <Route
              path="/payslip"
              element={
                <RequireAuth>
                  <PayslipPage />
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              }
            />
          </Routes>
        </div>
      </HashRouter>
    </ConfigProvider>
  );
}
