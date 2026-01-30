import { Livestock, MedicalRecord, Expense, Sale, FeedInventory, Infrastructure, DietPlan, InseminationRecord, WeightRecord, MilkRecord } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8381/api';

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
    // Livestock
    getLivestock: async (): Promise<Livestock[]> => {
        const res = await fetch(`${API_BASE_URL}/livestock`);
        return handleResponse(res);
    },
    createLivestock: async (data: Livestock): Promise<Livestock> => {
        const res = await fetch(`${API_BASE_URL}/livestock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    addMedicalRecord: async (animalId: string, record: MedicalRecord): Promise<MedicalRecord> => {
        const res = await fetch(`${API_BASE_URL}/livestock/${animalId}/medical-records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record),
        });
        return handleResponse(res);
    },
    addBreedingRecord: async (animalId: string, record: InseminationRecord): Promise<InseminationRecord> => {
        const res = await fetch(`${API_BASE_URL}/livestock/${animalId}/breeding-records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record),
        });
        return handleResponse(res);
    },
    addWeightRecord: async (animalId: string, record: WeightRecord): Promise<WeightRecord> => {
        const res = await fetch(`${API_BASE_URL}/livestock/${animalId}/weight-records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record),
        });
        return handleResponse(res);
    },
    addMilkRecord: async (animalId: string, record: MilkRecord): Promise<MilkRecord> => {
        const res = await fetch(`${API_BASE_URL}/livestock/${animalId}/milk-records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record),
        });
        return handleResponse(res);
    },
    deleteLivestock: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/livestock/${id}`, { method: 'DELETE' });
        await handleDeleteResponse(res);
    },

    // Finance
    getExpenses: async (): Promise<Expense[]> => {
        const res = await fetch(`${API_BASE_URL}/finance/expenses`);
        return handleResponse(res);
    },
    createExpense: async (data: Expense): Promise<Expense> => {
        const res = await fetch(`${API_BASE_URL}/finance/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    getSales: async (): Promise<Sale[]> => {
        const res = await fetch(`${API_BASE_URL}/finance/sales`);
        return handleResponse(res);
    },
    createSale: async (data: Sale): Promise<Sale> => {
        const res = await fetch(`${API_BASE_URL}/finance/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    deleteExpense: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/finance/expenses/${id}`, { method: 'DELETE' });
        await handleDeleteResponse(res);
    },
    deleteSale: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/finance/sales/${id}`, { method: 'DELETE' });
        await handleDeleteResponse(res);
    },

    // Operations
    getFeed: async (): Promise<FeedInventory[]> => {
        const res = await fetch(`${API_BASE_URL}/operations/feed`);
        return handleResponse(res);
    },
    createFeed: async (data: FeedInventory): Promise<FeedInventory> => {
        const res = await fetch(`${API_BASE_URL}/operations/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    updateFeed: async (id: string, data: FeedInventory): Promise<FeedInventory> => {
        const res = await fetch(`${API_BASE_URL}/operations/feed/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    getInfrastructure: async (): Promise<Infrastructure[]> => {
        const res = await fetch(`${API_BASE_URL}/operations/infrastructure`);
        return handleResponse(res);
    },
    createInfrastructure: async (data: Infrastructure): Promise<Infrastructure> => {
        const res = await fetch(`${API_BASE_URL}/operations/infrastructure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    updateInfrastructure: async (id: string, data: Infrastructure): Promise<Infrastructure> => {
        const res = await fetch(`${API_BASE_URL}/operations/infrastructure/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    getDietPlans: async (): Promise<DietPlan[]> => {
        const res = await fetch(`${API_BASE_URL}/operations/diet-plans`);
        return handleResponse(res);
    },
    createDietPlan: async (data: DietPlan): Promise<DietPlan> => {
        const res = await fetch(`${API_BASE_URL}/operations/diet-plans`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    updateDietPlan: async (id: string, data: DietPlan): Promise<DietPlan> => {
        const res = await fetch(`${API_BASE_URL}/operations/diet-plans/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    deleteFeed: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/operations/feed/${id}`, { method: 'DELETE' });
        await handleDeleteResponse(res);
    },
    deleteInfrastructure: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/operations/infrastructure/${id}`, { method: 'DELETE' });
        await handleDeleteResponse(res);
    },
    deleteDietPlan: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/operations/diet-plans/${id}`, { method: 'DELETE' });
        await handleDeleteResponse(res);
    },

    // Auth (Mock)
    login: async (email: string, password: string): Promise<{ user: { name: string; email: string }, token: string }> => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock success
        return {
            user: { name: 'Farm Manager', email },
            token: 'mock-jwt-token'
        };
    }
};
