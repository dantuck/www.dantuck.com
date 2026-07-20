const TOKEN_KEY = 'admin_token';

export function getAdminToken(): string {
  if (typeof sessionStorage === 'undefined') return '';
  return sessionStorage.getItem(TOKEN_KEY) ?? '';
}

export function setAdminToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

/** Returns Authorization header object if a token is stored, otherwise empty. */
export function authHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
