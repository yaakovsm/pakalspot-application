import type { User } from '../types/spot';

/** Backend default admin email (must match Backend settings.ADMIN_EMAIL). */
export const ADMIN_EMAIL = 'yaakovsm@gmail.com';

/**
 * Normalize login/register/me payload so `is_admin` and `email` are reliable
 * (handles snake_case vs camelCase and older cached sessions).
 */
export function normalizeAuthUser(raw: unknown): User | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const emailRaw = o.email != null ? String(o.email).trim() : '';
  const emailLower = emailRaw.toLowerCase();
  const fromApi = Boolean(o.is_admin ?? o.isAdmin);
  const is_admin = fromApi || emailLower === ADMIN_EMAIL;

  return {
    id: String(o.id ?? ''),
    username: String(o.username ?? o.display_name ?? ''),
    email: emailRaw,
    avatar: o.avatar != null ? String(o.avatar) : undefined,
    createdAt: String(o.createdAt ?? o.created_at ?? ''),
    is_admin,
  };
}
