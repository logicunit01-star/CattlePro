/**
 * Tenant context: companyName, instanceId, appType from URL.
 * Persisted in localStorage so API calls use correct X-Tenant after refresh.
 */

const STORAGE_KEY = 'cattleops_tenant';

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
  try {
    const t = getTenant();
    const key = SALES_STORAGE_PREFIX + (t.companyName || 'default');
    localStorage.setItem(key, JSON.stringify(sales));
  } catch (_) {}
}

const LIVESTOCK_STATUS_KEY = 'cattleops_livestock_status';

/** Get persisted livestock status overrides (id -> status) so SOLD etc. survive refresh */
export function getPersistedLivestockStatus(): Record<string, string> {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LIVESTOCK_STATUS_KEY) : null;
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

/** Persist livestock status overrides (e.g. after marking animal SOLD) */
export function setPersistedLivestockStatus(updates: Record<string, string>): void {
  try {
    const prev = getPersistedLivestockStatus();
    const next = { ...prev, ...updates };
    localStorage.setItem(LIVESTOCK_STATUS_KEY, JSON.stringify(next));
  } catch (_) {}
}
