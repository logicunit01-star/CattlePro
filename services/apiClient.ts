import { getTenantHeaders } from './tenantContext';

export const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'https://api.hulmsolutions.com/livestock';

export const isDemoMode = (): boolean => (import.meta as any).env.VITE_DEMO_MODE === 'true';

export function buildQuery(params: Record<string, string | number | boolean | null | undefined>): string {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') sp.set(key, String(value));
    });
    const query = sp.toString();
    return query ? `?${query}` : '';
}

export function apiHeaders(json = false): Record<string, string> {
    const h: Record<string, string> = { ...getTenantHeaders() };
    if (json) h['Content-Type'] = 'application/json';
    return h;
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
}

export async function apiRequest<T>(path: string, options: RequestInit & { json?: unknown } = {}): Promise<T> {
    const { json, headers, ...rest } = options;
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        headers: {
            ...apiHeaders(json !== undefined),
            ...(headers || {}),
        },
        body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
    return parseApiResponse<T>(response);
}
