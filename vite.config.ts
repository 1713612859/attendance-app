import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "考勤打卡 Demo",
        short_name: "考勤打卡",
        description: "考勤打卡 App Demo —— 打卡 / 考勤记录 / 补卡 / 请假 / 加班 / 工资条",
        theme_color: "#0f8a3d",
        background_color: "#f4f6f5",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
    }),
  ],
  server: {
    host: true,
  },
});
