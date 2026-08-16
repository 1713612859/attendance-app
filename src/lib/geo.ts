import { loadValue } from "./storage";

export interface GeoResult {
  latitude?: number;
  longitude?: number;
  address?: string;
  abnormal: boolean;
}

// 这几条状态文案之前是写死的中文，不跟随语言切换——即使把 App 语言切成英文，
// 定位失败时也会突然冒出一句中文。这里跟 i18n/index.tsx 用同一个 storage key 直接读当前语言，
// 不引入完整的 I18nProvider 依赖（geo.ts 是普通函数，不在 React 组件树里，拿不到 useI18n()）。
const MESSAGES = {
  en: {
    unsupported: "This device does not support geolocation",
    timeout: "Location request timed out — marked as abnormal clock-in",
    denied: "Location permission denied or unavailable",
    approxAddress: (lat: number, lng: number) => `Approx. ${lat.toFixed(5)}, ${lng.toFixed(5)} (sample — needs a reverse-geocoding service for a real address)`,
  },
  zh: {
    unsupported: "当前设备不支持定位",
    timeout: "定位超时，已标记为异常打卡",
    denied: "定位权限被拒绝或获取失败",
    approxAddress: (lat: number, lng: number) => `约 ${lat.toFixed(5)}, ${lng.toFixed(5)}（示例：需接入逆地理编码服务解析为详细地址）`,
  },
} as const;

function msgs() {
  return MESSAGES[loadValue<"en" | "zh">("lang", "en")];
}

// 演示环境通常没有可用的逆地理编码 Key，这里仅做坐标 -> 文本的占位展示，
// 正式对接时替换为企业已选定的地图供应商（高德/腾讯位置服务等）。
export function getGeoLocation(): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve({ abnormal: true, address: msgs().unsupported });
      return;
    }
    const timer = setTimeout(() => {
      resolve({ abnormal: true, address: msgs().timeout });
    }, 8000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        const { latitude, longitude } = pos.coords;
        resolve({
          latitude,
          longitude,
          address: msgs().approxAddress(latitude, longitude),
          abnormal: false,
        });
      },
      () => {
        clearTimeout(timer);
        resolve({ abnormal: true, address: msgs().denied });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}
