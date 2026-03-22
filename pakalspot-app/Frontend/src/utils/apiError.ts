import { isAxiosError } from 'axios';

/** Extract FastAPI `detail` (string or validation list) for user-visible errors */
export function getApiErrorDetail(err: unknown, fallback: string): string {
  if (!isAxiosError(err)) return fallback;
  const data = err.response?.data as { detail?: unknown } | undefined;
  const d = data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) {
    return d
      .map((item) => (typeof item === 'object' && item && 'msg' in item ? String((item as { msg: string }).msg) : JSON.stringify(item)))
      .filter(Boolean)
      .join(', ');
  }
  if (err.response?.status === 401) return 'Session expired. Please sign in again.';
  return fallback;
}
