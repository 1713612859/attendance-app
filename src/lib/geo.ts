export interface GeoResult {
  latitude?: number;
  longitude?: number;
  address?: string;
  abnormal: boolean;
}

// 演示环境通常没有可用的逆地理编码 Key，这里仅做坐标 -> 文本的占位展示，
// 正式对接时替换为企业已选定的地图供应商（高德/腾讯位置服务等）。
export function getGeoLocation(): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve({ abnormal: true, address: "当前设备不支持定位" });
      return;
    }
    const timer = setTimeout(() => {
      resolve({ abnormal: true, address: "定位超时，已标记为异常打卡" });
    }, 8000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        const { latitude, longitude } = pos.coords;
        resolve({
          latitude,
          longitude,
          address: `约 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}（示例：需接入逆地理编码服务解析为详细地址）`,
          abnormal: false,
        });
      },
      () => {
        clearTimeout(timer);
        resolve({ abnormal: true, address: "定位权限被拒绝或获取失败" });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}
