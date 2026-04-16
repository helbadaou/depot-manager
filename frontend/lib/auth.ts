export type UserRole = 'manager' | 'sales';

export type LoginResponse = {
  username: string;
  role: UserRole;
  token: string;
};

const TOKEN_KEY = 'pos_token';
const ROLE_KEY = 'pos_role';

export function saveSession(res: LoginResponse) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, res.token);
  localStorage.setItem(ROLE_KEY, res.role);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRole(): UserRole | null {
  if (typeof window === 'undefined') return null;
  const role = localStorage.getItem(ROLE_KEY);
  return role === 'manager' || role === 'sales' ? role : null;
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}
