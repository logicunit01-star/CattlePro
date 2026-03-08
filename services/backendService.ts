
import { Livestock, MedicalRecord, Expense, Sale, FeedInventory, Infrastructure, DietPlan, InseminationRecord, WeightRecord, MilkRecord, Entity, LedgerRecord, ConsumptionLog, TreatmentProtocol, TreatmentLog, Location, Farm, ProcessedFeedLedger } from '../types';
import { getTenantHeaders, getTenant } from './tenantContext';

// const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8381/api';
// const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/livestock';

//  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/livestock';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'https://api.hulmsolutions.com/livestock';

function apiHeaders(json = false): Record<string, string> {
    const h: Record<string, string> = { ...getTenantHeaders() };
    if (json) h['Content-Type'] = 'application/json';
    return h;
}

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
    }
    return response.json();
};

const handleDeleteResponse = async (response: Response) => {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
    }
};

export const backendService = {
    /**
     * Ensure tenant database exists for the company. Call when app loads with a company (e.g. from URL).
     * Creates DB and all tables if not already created. Idempotent.
     */
    ensureTenantSetup: async (companyName?: string): Promise<{ success: boolean; message?: string; database?: string }> => {
        const name = companyName ?? getTenant().companyName;
        if (!name?.trim()) return { success: false, message: 'No company name' };
        const res = await fetch(`${API_BASE_URL}/tenant/setup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getTenantHeaders() },
            body: JSON.stringify({ companyName: name.trim() }),
        });
        return res.json();
    },

    // Locations & Farms (tenant-scoped)
    getLocations: async (): Promise<Location[]> => {
        const res = await fetch(`${API_BASE_URL}/operations/locations`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    createLocation: async (data: Location): Promise<Location> => {
        const res = await fetch(`${API_BASE_URL}/operations/locations`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    getFarms: async (): Promise<Farm[]> => {
        const res = await fetch(`${API_BASE_URL}/operations/farms`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    createFarm: async (data: Farm): Promise<Farm> => {
        const res = await fetch(`${API_BASE_URL}/operations/farms`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },

    // Livestock
    getLivestock: async (): Promise<Livestock[]> => {
        const res = await fetch(`${API_BASE_URL}/livestock`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    getLivestockById: async (id: string): Promise<Livestock | null> => {
        const list = await backendService.getLivestock();
        return list.find(l => l.id === id) || null;
    },
    createLivestock: async (data: Livestock): Promise<Livestock> => {
        const res = await fetch(`${API_BASE_URL}/livestock`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    updateLivestock: async (id: string, data: Livestock): Promise<Livestock> => {
        const res = await fetch(`${API_BASE_URL}/livestock/${id}`, {
            method: 'PUT',
            headers: apiHeaders(true),
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    deleteLivestock: async (id: string, force = false): Promise<void> => {
        const query = force ? '?force=true' : '';
        const res = await fetch(`${API_BASE_URL}/livestock/${id}${query}`, { method: 'DELETE', headers: apiHeaders() });
        await handleDeleteResponse(res);
    },

    // Detailed Records – use dedicated POST endpoints so backend persists with correct FK
    addMedicalRecord: async (animalId: string, record: MedicalRecord): Promise<MedicalRecord> => {
        const res = await fetch(`${API_BASE_URL}/livestock/${animalId}/medical-records`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(record),
        });
        return handleResponse(res);
    },
    addBreedingRecord: async (animalId: string, record: InseminationRecord): Promise<InseminationRecord> => {
        const res = await fetch(`${API_BASE_URL}/livestock/${animalId}/breeding-records`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(record),
        });
        return handleResponse(res);
    },
    updateBreedingRecord: async (animalId: string, record: InseminationRecord): Promise<InseminationRecord> => {
        const res = await fetch(`${API_BASE_URL}/livestock/${animalId}/breeding-records`, {
            method: 'PUT',
            headers: apiHeaders(true),
            body: JSON.stringify(record),
        });
        return handleResponse(res);
    },
    addWeightRecord: async (animalId: string, record: WeightRecord): Promise<WeightRecord> => {
        const animal = await backendService.getLivestockById(animalId);
        if (!animal) throw new Error("Animal not found");
        const updated = { ...animal, weightHistory: [...(animal.weightHistory || []), record], weight: record.weight };
        await backendService.updateLivestock(animalId, updated);
        return record;
    },
    addMilkRecord: async (animalId: string, record: MilkRecord): Promise<MilkRecord> => {
        const animal = await backendService.getLivestockById(animalId);
        if (!animal) throw new Error("Animal not found");
        const updated = { ...animal, milkProductionHistory: [...(animal.milkProductionHistory || []), record] };
        await backendService.updateLivestock(animalId, updated);
        return record;
    },

    // Finance (Unified with Ledger)
    getExpenses: async (): Promise<Expense[]> => {
        const res = await fetch(`${API_BASE_URL}/finance/expenses`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    createExpense: async (data: Expense): Promise<Expense> => {
        const res = await fetch(`${API_BASE_URL}/finance/expenses`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    updateExpense: async (id: string, data: Expense): Promise<Expense> => {
        const res = await fetch(`${API_BASE_URL}/finance/expenses/${id}`, {
            method: 'PUT',
            headers: apiHeaders(true),
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    getSales: async (): Promise<Sale[]> => {
        const res = await fetch(`${API_BASE_URL}/finance/sales`, { headers: apiHeaders() });
        const data = await handleResponse(res);
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object' && Array.isArray((data as any).data)) return (data as any).data;
        if (data && typeof data === 'object' && Array.isArray((data as any).content)) return (data as any).content;
        return [];
    },
    createSale: async (data: Sale): Promise<Sale> => {
        const res = await fetch(`${API_BASE_URL}/finance/sales`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    deleteExpense: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/finance/expenses/${id}`, { method: 'DELETE', headers: apiHeaders() });
        await handleDeleteResponse(res);
    },
    deleteSale: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/finance/sales/${id}`, { method: 'DELETE', headers: apiHeaders() });
        await handleDeleteResponse(res);
    },

    // Entities & Ledger
    getEntities: async (): Promise<Entity[]> => {
        const res = await fetch(`${API_BASE_URL}/entities`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    createEntity: async (data: Entity): Promise<Entity> => {
        const res = await fetch(`${API_BASE_URL}/entities`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    updateEntity: async (id: string, data: Entity): Promise<Entity> => {
        const res = await fetch(`${API_BASE_URL}/entities/${id}`, {
            method: 'PUT',
            headers: apiHeaders(true),
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    deleteEntity: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/entities/${id}`, { method: 'DELETE', headers: apiHeaders() });
        await handleDeleteResponse(res);
    },
    getLedger: async (): Promise<LedgerRecord[]> => {
        const res = await fetch(`${API_BASE_URL}/finance/ledger`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    createPayment: async (payment: { entityId: string, amount: number, date: string, notes?: string, type?: string }): Promise<LedgerRecord> => {
        const res = await fetch(`${API_BASE_URL}/finance/payments`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(payment),
        });
        return handleResponse(res);
    },

    // Operations
    getFeed: async (): Promise<FeedInventory[]> => {
        const res = await fetch(`${API_BASE_URL}/operations/feed`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    createFeed: async (data: FeedInventory): Promise<FeedInventory> => {
        const res = await fetch(`${API_BASE_URL}/operations/feed`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    updateFeed: async (id: string, data: FeedInventory): Promise<FeedInventory> => {
        const res = await fetch(`${API_BASE_URL}/operations/feed/${id}`, {
            method: 'PUT',
            headers: apiHeaders(true),
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    getInfrastructure: async (): Promise<Infrastructure[]> => {
        const res = await fetch(`${API_BASE_URL}/operations/infrastructure`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    createInfrastructure: async (data: Infrastructure): Promise<Infrastructure> => {
        const res = await fetch(`${API_BASE_URL}/operations/infrastructure`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    updateInfrastructure: async (id: string, data: Infrastructure): Promise<Infrastructure> => {
        const res = await fetch(`${API_BASE_URL}/operations/infrastructure/${id}`, {
            method: 'PUT',
            headers: apiHeaders(true),
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    getDietPlans: async (): Promise<DietPlan[]> => {
        const res = await fetch(`${API_BASE_URL}/operations/diet-plans`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    createDietPlan: async (data: DietPlan): Promise<DietPlan> => {
        const res = await fetch(`${API_BASE_URL}/operations/diet-plans`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    updateDietPlan: async (id: string, data: DietPlan): Promise<DietPlan> => {
        const res = await fetch(`${API_BASE_URL}/operations/diet-plans/${id}`, {
            method: 'PUT',
            headers: apiHeaders(true),
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    deleteFeed: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/operations/feed/${id}`, { method: 'DELETE', headers: apiHeaders() });
        await handleDeleteResponse(res);
    },
    deleteInfrastructure: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/operations/infrastructure/${id}`, { method: 'DELETE', headers: apiHeaders() });
        await handleDeleteResponse(res);
    },
    deleteDietPlan: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/operations/diet-plans/${id}`, { method: 'DELETE', headers: apiHeaders() });
        await handleDeleteResponse(res);
    },

    // Consumption Logs
    getConsumptionLogs: async (): Promise<ConsumptionLog[]> => {
        const res = await fetch(`${API_BASE_URL}/operations/consumption-logs`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    logConsumption: async (logs: ConsumptionLog[]): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/operations/consumption-logs/batch`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(logs),
        });
        if (!res.ok) throw new Error(await res.text() || res.statusText);
        if (res.status !== 204) await res.json();
    },
    getFeedLedgers: async (): Promise<ProcessedFeedLedger[]> => {
        const res = await fetch(`${API_BASE_URL}/operations/feed-ledgers`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    createFeedLedger: async (ledger: ProcessedFeedLedger): Promise<ProcessedFeedLedger> => {
        const res = await fetch(`${API_BASE_URL}/operations/feed-ledgers`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(ledger),
        });
        return handleResponse(res);
    },
    reverseFeedLedger: async (id: string): Promise<ProcessedFeedLedger> => {
        const res = await fetch(`${API_BASE_URL}/operations/feed-ledgers/${encodeURIComponent(id)}/reverse`, {
            method: 'PUT',
            headers: apiHeaders(),
        });
        return handleResponse(res);
    },

    // Medicine Module
    getTreatmentProtocols: async (): Promise<TreatmentProtocol[]> => {
        const res = await fetch(`${API_BASE_URL}/operations/treatment-protocols`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    createTreatmentProtocol: async (data: TreatmentProtocol): Promise<TreatmentProtocol> => {
        const res = await fetch(`${API_BASE_URL}/operations/treatment-protocols`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    updateTreatmentProtocol: async (id: string, data: TreatmentProtocol): Promise<TreatmentProtocol> => {
        const res = await fetch(`${API_BASE_URL}/operations/treatment-protocols/${id}`, {
            method: 'PUT',
            headers: apiHeaders(true),
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    deleteTreatmentProtocol: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/operations/treatment-protocols/${id}`, { method: 'DELETE', headers: apiHeaders() });
        await handleDeleteResponse(res);
    },

    getTreatmentLogs: async (): Promise<TreatmentLog[]> => {
        const res = await fetch(`${API_BASE_URL}/operations/treatment-logs`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    logTreatment: async (logs: TreatmentLog[]): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/operations/treatment-logs/batch`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(logs),
        });
        await handleResponse(res);
    },

    // Auth (Mock – used when no URL params)
    login: async (email: string, password: string): Promise<{ user: { name: string; email: string }, token: string }> => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            user: { name: 'Farm Manager', email },
            token: 'mock-jwt-token'
        };
    },

    /**
     * Keycloak login for URL-param flow (?companyName=...&instanceId=...&appType=...).
     * POST https://keycloak.hulmsolutions.com/api/keycloak/login
     * Body: { realm, username, password, clientId } where clientId = `${appType}-${instanceId}`
     */
    keycloakLogin: async (
        realm: string,
        username: string,
        password: string,
        clientId: string
    ): Promise<{ user: { name: string; email: string }; token: string }> => {
        const url = 'https://keycloak.hulmsolutions.com/api/keycloak/login';
        const body = JSON.stringify({ realm, username, password, clientId });

        let response: Response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Network error';
            throw new Error('Unable to reach login service. Check your connection and try again.');
        }

        const text = await response.text();
        let data: Record<string, unknown> = {};
        try {
            if (text) data = JSON.parse(text) as Record<string, unknown>;
        } catch {
            // non-JSON response
        }

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid username or password.');
            }
            if (response.status === 400) {
                const msg = (data?.message as string) || (data?.error as string) || 'Invalid request.';
                throw new Error(typeof msg === 'string' ? msg : 'Invalid request.');
            }
            if (response.status >= 500) {
                throw new Error('Login service is temporarily unavailable. Please try again later.');
            }
            const msg = (data?.message as string) || (data?.error as string) || text || response.statusText;
            throw new Error(typeof msg === 'string' ? msg : 'Login failed.');
        }

        // Normalize response: support access_token or token, user or username
        const token = (data?.access_token as string) ?? (data?.token as string) ?? '';
        const name = (data?.user as { name?: string })?.name ?? (data?.username as string) ?? username;
        const email = (data?.user as { email?: string })?.email ?? (data?.email as string) ?? username;
        if (!token) {
            throw new Error('Login succeeded but no token was returned. Please try again.');
        }
        return {
            user: { name: String(name), email: String(email) },
            token: String(token),
        };
    },
};
