
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

    // Livestock (optional server-side pagination/sort/search)
    getLivestock: async (params?: { page?: number; limit?: number; sortBy?: string; sortDirection?: string; q?: string; farmId?: string; species?: string; category?: string; status?: string }): Promise<Livestock[] | { content: Livestock[]; totalElements: number; totalPages: number; number: number; size: number }> => {
        const search = params && (params.page != null || params.limit != null || params.q != null || params.sortBy != null || params.farmId != null || params.species != null || params.category != null || params.status != null)
            ? new URLSearchParams()
            : null;
        if (search) {
            if (params!.page != null) search.set('page', String(params!.page));
            if (params!.limit != null) search.set('limit', String(params!.limit));
            if (params!.sortBy) search.set('sortBy', params!.sortBy);
            if (params!.sortDirection) search.set('sortDirection', params!.sortDirection);
            if (params!.q) search.set('q', params!.q);
            if (params!.farmId) search.set('farmId', params!.farmId);
            if (params!.species) search.set('species', params!.species);
            if (params!.category) search.set('category', params!.category);
            if (params!.status) search.set('status', params!.status);
        }
        const url = search ? `${API_BASE_URL}/livestock?${search}` : `${API_BASE_URL}/livestock`;
        const res = await fetch(url, { headers: apiHeaders() });
        const data = await handleResponse(res);
        return data;
    },
    getLivestockById: async (id: string): Promise<Livestock | null> => {
        const res = await fetch(`${API_BASE_URL}/livestock/${id}`, { headers: apiHeaders() });
        if (!res.ok) return null;
        return handleResponse(res);
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
    bulkVaccinate: async (animalIds: string[], record: MedicalRecord): Promise<MedicalRecord[]> => {
        const res = await fetch(`${API_BASE_URL}/livestock/bulk/vaccinate`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify({ animalIds, record }),
        });
        return handleResponse(res);
    },
    bulkMove: async (animalIds: string[], location: string): Promise<Livestock[]> => {
        const res = await fetch(`${API_BASE_URL}/livestock/bulk/move`, {
            method: 'PUT',
            headers: apiHeaders(true),
            body: JSON.stringify({ animalIds, location }),
        });
        return handleResponse(res);
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
    deleteBreedingRecord: async (animalId: string, recordId: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/livestock/${animalId}/breeding-records/${recordId}`, {
            method: 'DELETE',
            headers: apiHeaders(),
        });
        await handleDeleteResponse(res);
    },
    addWeightRecord: async (animalId: string, record: WeightRecord): Promise<WeightRecord> => {
        const res = await fetch(`${API_BASE_URL}/livestock/${animalId}/weight-records`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(record),
        });
        return handleResponse(res);
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
    createSaleBulk: async (data: Sale): Promise<Sale> => {
        const res = await fetch(`${API_BASE_URL}/finance/sales/bulk`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    getDashboardSummary: async (dateRange: string = '30_DAYS'): Promise<{ totalExpenses: number; totalRevenue: number; netProfit: number; newAnimalsCount: number; sickConsultationsCount: number; activeLivestockCount: number }> => {
        const res = await fetch(`${API_BASE_URL}/dashboard/summary?dateRange=${encodeURIComponent(dateRange)}`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    getDashboardKpis: async (dateRange: string = '30_DAYS', species: string = 'ALL'): Promise<{ totalLivestock: number; activeAnimals: number; deceasedCount: number; sickCount: number; totalExpenses: number; totalRevenue: number; netProfit: number; newAnimalsCount: number }> => {
        const res = await fetch(`${API_BASE_URL}/dashboard/kpis?dateRange=${encodeURIComponent(dateRange)}&species=${encodeURIComponent(species)}`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    getDashboardMilkTrend: async (dateRange: string = '30_DAYS', species: string = 'ALL'): Promise<{ date: string; liters: number }[]> => {
        const res = await fetch(`${API_BASE_URL}/dashboard/milk-trend?dateRange=${encodeURIComponent(dateRange)}&species=${encodeURIComponent(species)}`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    getDashboardFeedCosts: async (dateRange: string = '30_DAYS'): Promise<{ date: string; amount: number }[]> => {
        const res = await fetch(`${API_BASE_URL}/dashboard/feed-costs?dateRange=${encodeURIComponent(dateRange)}`, { headers: apiHeaders() });
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
    getSaleInvoice: async (saleId: string): Promise<{ saleId: string; invoiceNumber: string; date: string; buyer: string; buyerContact?: string; itemType: string; description?: string; quantity?: number; amount: number; paymentStatus: string; amountPaid: number; balanceDue: number } | null> => {
        const res = await fetch(`${API_BASE_URL}/finance/sales/${saleId}/invoice`, { headers: apiHeaders() });
        if (!res.ok) return null;
        const d = await handleResponse(res);
        if (d && d.date) d.date = typeof d.date === 'string' ? d.date : (d.date as any).toString();
        return d;
    },

    // Financials (paginated, server KPIs, ledger)
    getFinancialsExpenses: async (params: { farmId?: string; startDate?: string; endDate?: string; search?: string; page?: number; limit?: number; sortBy?: string; sortDirection?: string }): Promise<{ content: Expense[]; totalElements: number; totalPages: number; number: number; size: number }> => {
        const sp = new URLSearchParams();
        if (params.farmId != null && params.farmId !== '') sp.set('farmId', params.farmId);
        if (params.startDate) sp.set('startDate', params.startDate);
        if (params.endDate) sp.set('endDate', params.endDate);
        if (params.search) sp.set('search', params.search);
        sp.set('page', String(params.page ?? 0));
        sp.set('limit', String(params.limit ?? 50));
        if (params.sortBy) sp.set('sortBy', params.sortBy);
        if (params.sortDirection) sp.set('sortDirection', params.sortDirection ?? 'desc');
        const res = await fetch(`${API_BASE_URL}/financials/expenses?${sp}`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    getFinancialsSales: async (params: { farmId?: string; startDate?: string; endDate?: string; search?: string; page?: number; limit?: number; sortBy?: string; sortDirection?: string }): Promise<{ content: Sale[]; totalElements: number; totalPages: number; number: number; size: number }> => {
        const sp = new URLSearchParams();
        if (params.farmId != null && params.farmId !== '') sp.set('farmId', params.farmId);
        if (params.startDate) sp.set('startDate', params.startDate);
        if (params.endDate) sp.set('endDate', params.endDate);
        if (params.search) sp.set('search', params.search);
        sp.set('page', String(params.page ?? 0));
        sp.set('limit', String(params.limit ?? 50));
        if (params.sortBy) sp.set('sortBy', params.sortBy);
        if (params.sortDirection) sp.set('sortDirection', params.sortDirection ?? 'desc');
        const res = await fetch(`${API_BASE_URL}/financials/sales?${sp}`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    getFinancialsKpis: async (params: { farmId?: string; startDate?: string; endDate?: string }): Promise<{ totalRevenue: number; totalExpenses: number; netProfit: number; totalExpensesCount: number; totalSalesCount: number }> => {
        const sp = new URLSearchParams();
        if (params.farmId != null && params.farmId !== '') sp.set('farmId', params.farmId);
        if (params.startDate) sp.set('startDate', params.startDate);
        if (params.endDate) sp.set('endDate', params.endDate);
        const res = await fetch(`${API_BASE_URL}/financials/kpis?${sp}`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    getFinancialsLedger: async (params: { farmId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }): Promise<{ content: { id: string; date: string; description: string; type: string; amount: number; balanceAfter: number; refId: string; farmId?: string }[]; totalElements: number; totalPages: number; number: number; size: number }> => {
        const sp = new URLSearchParams();
        if (params.farmId != null && params.farmId !== '') sp.set('farmId', params.farmId);
        if (params.startDate) sp.set('startDate', params.startDate);
        if (params.endDate) sp.set('endDate', params.endDate);
        sp.set('page', String(params.page ?? 0));
        sp.set('limit', String(params.limit ?? 50));
        const res = await fetch(`${API_BASE_URL}/financials/ledger?${sp}`, { headers: apiHeaders() });
        const data = await handleResponse(res);
        if (data.content && Array.isArray(data.content)) {
            data.content = data.content.map((r: any) => ({ ...r, date: r.date && typeof r.date === 'string' ? r.date : (r.date ? (r.date as any).toString?.() ?? '' : '') }));
        }
        return data;
    },
    getFinancialsPayments: async (refType: string, refId: string): Promise<{ id: string; refType: string; refId: string; amount: number; date: string; paymentMethod?: string; notes?: string }[]> => {
        const res = await fetch(`${API_BASE_URL}/financials/payments?refType=${encodeURIComponent(refType)}&refId=${encodeURIComponent(refId)}`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    addFinancialsPayment: async (payment: { refType: string; refId: string; amount: number; date: string; paymentMethod?: string; notes?: string }): Promise<{ id: string; refType: string; refId: string; amount: number; date: string }> => {
        const res = await fetch(`${API_BASE_URL}/financials/payments`, { method: 'POST', headers: apiHeaders(true), body: JSON.stringify(payment) });
        return handleResponse(res);
    },
    getVendorSummary: async (params: { farmId?: string; dateFilter?: string; startDate?: string; endDate?: string }): Promise<{ supplierId: string; supplierName: string; totalBills: number; totalAmount: number; paidAmount: number; balanceDue: number }[]> => {
        const sp = new URLSearchParams();
        if (params.farmId != null && params.farmId !== '') sp.set('farmId', params.farmId);
        if (params.dateFilter) sp.set('dateFilter', params.dateFilter);
        if (params.startDate) sp.set('startDate', params.startDate);
        if (params.endDate) sp.set('endDate', params.endDate);
        const res = await fetch(`${API_BASE_URL}/financials/vendor-summary?${sp}`, { headers: apiHeaders() });
        return handleResponse(res);
    },
    getExpenseAnalytics: async (params: { farmId?: string; dateFilter?: string; startDate?: string; endDate?: string }): Promise<{ byCategory: { category: string; totalCost: number }[]; byDay: { date: string; totalCost: number }[] }> => {
        const sp = new URLSearchParams();
        if (params.farmId != null && params.farmId !== '') sp.set('farmId', params.farmId);
        if (params.dateFilter) sp.set('dateFilter', params.dateFilter);
        if (params.startDate) sp.set('startDate', params.startDate);
        if (params.endDate) sp.set('endDate', params.endDate);
        const res = await fetch(`${API_BASE_URL}/financials/expense-analytics?${sp}`, { headers: apiHeaders() });
        return handleResponse(res);
    },

    // Categories (chart of accounts)
    getCategories: async (type?: string): Promise<{ id: string; type: string; name: string; code?: string; parentId?: string; sortOrder?: number }[]> => {
        const url = type ? `${API_BASE_URL}/categories?type=${encodeURIComponent(type)}` : `${API_BASE_URL}/categories`;
        const res = await fetch(url, { headers: apiHeaders() });
        return handleResponse(res);
    },
    createCategory: async (data: { type: string; name: string; code?: string; parentId?: string; sortOrder?: number }): Promise<{ id: string; type: string; name: string }> => {
        const res = await fetch(`${API_BASE_URL}/categories`, { method: 'POST', headers: apiHeaders(true), body: JSON.stringify(data) });
        return handleResponse(res);
    },
    updateCategory: async (id: string, data: { type?: string; name?: string; code?: string; parentId?: string; sortOrder?: number }): Promise<{ id: string }> => {
        const res = await fetch(`${API_BASE_URL}/categories/${id}`, { method: 'PUT', headers: apiHeaders(true), body: JSON.stringify(data) });
        return handleResponse(res);
    },
    deleteCategory: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/categories/${id}`, { method: 'DELETE', headers: apiHeaders() });
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
    updateFeedLedger: async (id: string, ledger: ProcessedFeedLedger): Promise<ProcessedFeedLedger> => {
        const res = await fetch(`${API_BASE_URL}/operations/feed-ledgers/${id}`, {
            method: 'PUT',
            headers: apiHeaders(true),
            body: JSON.stringify(ledger),
        });
        return handleResponse(res);
    },
    /** Reverse a processed feed ledger (restore inventory, reduce animal feed cost, delete linked expense). */
    reverseFeedLedger: async (id: string): Promise<ProcessedFeedLedger> => {
        const res = await fetch(`${API_BASE_URL}/operations/feed-ledgers/${id}/reverse`, {
            method: 'PUT',
            headers: apiHeaders(),
        });
        return handleResponse(res);
    },

    /** Atomic diet plan processing: inventory deduction, logs, ledger, expense, lastProcessedDate. */
    processDietPlans: async (request?: { dietPlanIds?: string[]; date?: string; animalIds?: string[] }): Promise<{
        success: boolean;
        message: string;
        plansProcessed: number;
        ledgersCreated: number;
        totalCost: number;
        ledgerIds: string[];
        totalAnimalsFed: number;
        planResults?: { dietPlanId: string; status: string; animalsFed?: number; cost?: number; message?: string }[];
      }> => {
        const res = await fetch(`${API_BASE_URL}/operations/diet-plan/process`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(request || {}),
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

    /** Bulk apply protocol to multiple animals (atomic: inventory, logs, expense). */
    applyProtocol: async (request: { protocolId: string; targetAnimalIds: string[]; performedBy?: string; date?: string }): Promise<{ success: boolean; message: string; animalsTreated: number; treatmentLogsCreated: number; totalCost: number; expenseId?: string }> => {
        const res = await fetch(`${API_BASE_URL}/operations/protocol/apply`, {
            method: 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify(request),
        });
        return handleResponse(res);
    },

    /** Medicine batches expiring within the given days (default 30). */
    getMedicineExpirations: async (days: number = 30): Promise<{ id: string; name: string; batchNumber: string; expiryDate: string; daysUntilExpiry: number; quantity: number; unit: string }[]> => {
        const res = await fetch(`${API_BASE_URL}/operations/medicine-expirations?days=${days}`, { headers: apiHeaders() });
        return handleResponse(res);
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
