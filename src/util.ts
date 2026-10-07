export function required<T>(value: T | null | undefined, name: string): T {
  if (value === undefined || value === null) {
    throw new TypeError(`${name} is required`);
  }
  return value;
}

export function pathSegment(value: string, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} must not be blank`);
  }
  return encodeURIComponent(value);
}

export function compact(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null) out[key] = value;
  }
  return out;
}

export function nonEmpty<T extends object>(value: T | undefined): T | undefined {
  return value && Object.keys(value).length > 0 ? value : undefined;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatDateTime(value: Date | string | undefined): string | undefined {
  if (value === undefined || typeof value === 'string') return value;
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
    + `T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatFilterDate(value: Date | string | undefined, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') {
    const m = ISO_DATE.exec(value);
    if (!m) throw new TypeError(`${name} must be a Date or a YYYY-MM-DD string`);
    return `${m[3]}.${m[2]}.${m[1]}`;
  }
  return `${pad(value.getDate())}.${pad(value.getMonth() + 1)}.${value.getFullYear()}`;
}