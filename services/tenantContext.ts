/**
 * Tenant context: companyName, instanceId, appType from URL.
 * Persisted in localStorage so API calls use correct X-Tenant after refresh.
 */

const STORAGE_KEY = 'cattleops_tenant';
const isDemoMode = (): boolean => (import.meta as any).env.VITE_DEMO_MODE === 'true';

export interface TenantState {
  companyName: string | null;
  instanceId: string | null;
  appType: string | null;
}

function parseStored(): TenantState {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return { companyName: null, instanceId: null, appType: null };
    const o = JSON.parse(raw) as Partial<TenantState>;
    return {
      companyName: o.companyName ?? null,
      instanceId: o.instanceId ?? null,
      appType: o.appType ?? null
    };
  } catch {
    return { companyName: null, instanceId: null, appType: null };
  }
}

/** Read tenant from URL (?companyName=...&instanceId=...&appType=...) */
export function getTenantFromUrl(): TenantState {
  if (typeof window === 'undefined' || !window.location?.search) return { companyName: null, instanceId: null, appType: null };
  const params = new URLSearchParams(window.location.search);
  return {
    companyName: params.get('companyName') ?? null,
    instanceId: params.get('instanceId') ?? null,
    appType: params.get('appType') ?? null
  };
}

/** Persist tenant to localStorage */
export function setTenant(tenant: Partial<TenantState>): void {
  const prev = parseStored();
  const next: TenantState = {
    companyName: tenant.companyName ?? prev.companyName,
    instanceId: tenant.instanceId ?? prev.instanceId,
    appType: tenant.appType ?? prev.appType
  };
  // If the active company actually changes, drop the previous tenant's cached blobs so they don't
  // leak into the new session (sales, livestock status overrides, etc.).
  if (prev.companyName && next.companyName && prev.companyName !== next.companyName) {
    try {
      localStorage.removeItem(SALES_STORAGE_PREFIX + prev.companyName);
      localStorage.removeItem(LIVESTOCK_STATUS_PREFIX + prev.companyName);
    } catch (_) {}
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (_) {}
}

/** Get current tenant: from localStorage, or from URL if not yet saved (e.g. first load / refresh) */
export function getTenant(): TenantState {
  const stored = parseStored();
  if (stored.companyName) return stored;
  const fromUrl = getTenantFromUrl();
  if (fromUrl.companyName || fromUrl.instanceId || fromUrl.appType) {
    setTenant(fromUrl);
    return fromUrl;
  }
  return stored;
}

/** Headers for tenant-scoped API (X-Tenant = company name for backend routing) */
export function getTenantHeaders(): Record<string, string> {
  const t = getTenant();
  const companyName = t.companyName?.trim();
  if (!companyName) return {};
  return { 'X-Tenant': companyName };
}

const SALES_STORAGE_PREFIX = 'cattleops_sales_';

/** Get persisted sales for current tenant (survives refresh when backend doesn't return them) */
export function getPersistedSales(): unknown[] {
  if (!isDemoMode()) return [];
  try {
    const t = getTenant();
    const key = SALES_STORAGE_PREFIX + (t.companyName || 'default');
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (!raw) return [];
    const a = JSON.parse(raw);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

/** Persist sales for current tenant */
export function setPersistedSales(sales: unknown[]): void {
  if (!isDemoMode()) return;
  try {
    const t = getTenant();
    const key = SALES_STORAGE_PREFIX + (t.companyName || 'default');
    localStorage.setItem(key, JSON.stringify(sales));
  } catch (_) {}
}

/**
 * Per-tenant key namespace for livestock status overrides. The previous global key
 * (`cattleops_livestock_status`) was shared across all tenants in the browser, so opening a second
 * tenant could see "SOLD" overrides from the first one. We now scope by company name and also
 * migrate any legacy global blob into the currently active tenant on first read.
 */
const LIVESTOCK_STATUS_PREFIX = 'cattleops_livestock_status_';
const LEGACY_LIVESTOCK_STATUS_KEY = 'cattleops_livestock_status';

function livestockStatusKey(): string {
  const t = getTenant();
  return LIVESTOCK_STATUS_PREFIX + (t.companyName || 'default');
}

/** Get persisted livestock status overrides (id -> status) so SOLD etc. survive refresh */
export function getPersistedLivestockStatus(): Record<string, string> {
  if (!isDemoMode()) return {};
  try {
    const key = livestockStatusKey();
    let raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    // One-time migration: pull legacy global blob into the active tenant namespace so existing
    // installations don't lose their offline overrides on first load after this fix.
    if (!raw && typeof localStorage !== 'undefined') {
      const legacy = localStorage.getItem(LEGACY_LIVESTOCK_STATUS_KEY);
      if (legacy) {
        localStorage.setItem(key, legacy);
        localStorage.removeItem(LEGACY_LIVESTOCK_STATUS_KEY);
        raw = legacy;
      }
    }
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

/** Persist livestock status overrides (e.g. after marking animal SOLD) */
export function setPersistedLivestockStatus(updates: Record<string, string>): void {
  if (!isDemoMode()) return;
  try {
    const prev = getPersistedLivestockStatus();
    const next = { ...prev, ...updates };
    localStorage.setItem(livestockStatusKey(), JSON.stringify(next));
  } catch (_) {}
}

/**
 * Drop all per-tenant cached state for the current tenant. Intended for sign-out or "switch tenant"
 * flows so a follow-up login doesn't see the previous tenant's stale livestock overrides / sales.
 */
export function clearTenantCachedData(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const t = getTenant();
    const company = t.companyName || 'default';
    localStorage.removeItem(SALES_STORAGE_PREFIX + company);
    localStorage.removeItem(LIVESTOCK_STATUS_PREFIX + company);
    localStorage.removeItem(LEGACY_LIVESTOCK_STATUS_KEY);
  } catch (_) {}
}
