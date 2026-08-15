# 打包说明

本项目当前是一个 Vite + React + TypeScript 的移动端 PWA（渐进式 Web 应用）。
有两条打包路线，按需选择。

---

## 路线 A：Web / PWA（推荐，已经可用）

```bash
npm run build
```

产物在 `dist/` 目录，是一个完整的静态站点，已包含 Service Worker 和 `manifest.webmanifest`（PWA 配置）。

### 部署方式（任选其一）

- **本地/内网预览**：
  ```bash
  npx serve dist
  ```
- **公网部署**：把 `dist/` 部署到 Vercel / Netlify / Nginx 等静态托管环境
- **装到手机主屏幕**：手机浏览器打开部署好的地址 → 浏览器菜单选"添加到主屏幕" → 图标、启动画面、离线缓存都已配置好，不需要应用商店

---

## 路线 B：真实 .apk 安装包

当前构建产物是 H5/PWA，不是原生 APK。如果需要能直接安装到 Android 手机的 `.apk` 文件，用 **Capacitor** 把这个 Web 应用包一层原生壳（套壳，不是重写）。

### 步骤

1. **安装 Capacitor**
   ```bash
   npm install @capacitor/core @capacitor/android
   npx cap init
   ```

2. **构建 Web 产物**
   ```bash
   npm run build
   ```

3. **接入原生壳**
   ```bash
   npx cap add android
   npx cap sync
   ```
   这会把 `dist/` 的内容拷进生成的 `android/` 原生项目里。

4. **准备 Android Studio + Android SDK**
   唯一比较重的依赖，没装过大概需要下载 1-2GB。

5. **打包 APK**
   - 在 Android Studio 中打开 `android/` 项目，点 **Build → Build APK(s)**
   - 或命令行：
     ```bash
     cd android
     ./gradlew assembleDebug
     ```
   - 几分钟后在 `android/app/build/outputs/apk/debug/` 生成 `app-debug.apk`

6. **上架应用商店（可选）**
   需要额外生成签名 keystore，并执行 `./gradlew assembleRelease` 生成签名版 APK。

### 关键点

- 业务代码不用改，Capacitor 只是把现成页面套进原生 WebView 壳里
- 定位（`navigator.geolocation`）、相机（`getUserMedia`）等权限走原生 WebView 桥接，和浏览器里用的是同一套 Web API，不需要额外适配
