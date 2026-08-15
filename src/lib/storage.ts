// 极简本地持久化封装，模拟未来会被替换为真实接口调用的数据层。
// 所有读写都经过这里，方便日后整体换成 fetch('/api/...')。

const NS = "attendance-demo:";

export function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function saveList<T>(key: string, list: T[]): void {
  localStorage.setItem(NS + key, JSON.stringify(list));
}

export function loadValue<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveValue<T>(key: string, value: T): void {
  localStorage.setItem(NS + key, JSON.stringify(value));
}

// 模拟网络延迟，让 loading 态在 Demo 中可见
export function delay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
