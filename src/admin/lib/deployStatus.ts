/**
 * Persists deploy status across full page navigations (each admin route is a
 * separate document load, not a client-side route) so the "Building..." /
 * "Live" state survives a refresh or switching pages.
 */

export interface DeployRecord {
  status: 'building' | 'live' | 'failed';
  title: string;
  prNumber?: number;
  startedAt: number;
  resolvedAt?: number;
}

const KEY = 'admin:deployStatus';

export function getDeployRecord(): DeployRecord | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DeployRecord) : null;
  } catch {
    return null;
  }
}

export function setDeployRecord(record: DeployRecord | null): void {
  try {
    if (record) localStorage.setItem(KEY, JSON.stringify(record));
    else localStorage.removeItem(KEY);
  } catch { /* localStorage unavailable */ }
}
