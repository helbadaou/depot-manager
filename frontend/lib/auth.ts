export type LoginResponse = {
  username: string;
  role: string;
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

export function getRole(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ROLE_KEY);
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}
