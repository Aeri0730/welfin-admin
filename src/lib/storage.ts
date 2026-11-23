/**
 * localStorage 읽기·쓰기. 저장이 막힌 브라우저(사생활 보호 모드, 용량 초과)에서도
 * 화면이 깨지지 않게 실패하면 기본값을 돌려주거나 조용히 넘어간다.
 */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const text = localStorage.getItem(key);
    return text ? (JSON.parse(text) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 못 하면 이번 화면에서만 유지된다
  }
}

export function readText(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeText(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장 못 하면 이번 화면에서만 유지된다
  }
}
