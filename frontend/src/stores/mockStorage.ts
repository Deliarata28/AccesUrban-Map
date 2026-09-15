const dataSubscribers = new Set<() => void>();

export function subscribeMockData(listener: () => void) {
  dataSubscribers.add(listener);
  return () => dataSubscribers.delete(listener);
}

function notifyMockData() {
  dataSubscribers.forEach((listener) => listener());
}
export function readCollection<T>(key: string, fallback: T[]): T[] {
  const raw = window.localStorage.getItem(key);
  if (raw === null) return structuredClone(fallback);
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error();
    return data as T[];
  } catch {
    throw new Error(
      "Datele locale nu pot fi citite. Verifică stocarea browserului înainte de a continua.",
    );
  }
}
export function writeCollection<T>(key: string, data: T[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    throw new Error(
      "Nu mai este spațiu în browser. Încearcă o fotografie mai mică.",
    );
  }
  notifyMockData();
}
