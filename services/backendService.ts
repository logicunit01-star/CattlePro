
import { Livestock, MedicalRecord, Expense, Sale, FeedInventory, Infrastructure, DietPlan, InseminationRecord, WeightRecord, MilkRecord, Entity, LedgerRecord, ConsumptionLog, TreatmentProtocol, TreatmentLog } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

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
    getLivestockById: async (id: string): Promise<Livestock | null> => {
        const list = await backendService.getLivestock();
        return list.find(l => l.id === id) || null;
    },
    createLivestock: async (data: Livestock): Promise<Livestock> => {
        const res = await fetch(`${API_BASE_URL}/livestock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    updateLivestock: async (id: string, data: Livestock): Promise<Livestock> => {
        const res = await fetch(`${API_BASE_URL}/livestock/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    deleteLivestock: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/livestock/${id}`, { method: 'DELETE' });
        await handleDeleteResponse(res);
    },

    // Detailed Records (Updates the main livestock object as sub-resources are not separate in lightweight backend)
    addMedicalRecord: async (animalId: string, record: MedicalRecord): Promise<MedicalRecord> => {
        const animal = await backendService.getLivestockById(animalId);
        if (!animal) throw new Error("Animal not found");
        const updated = { ...animal, medicalHistory: [...(animal.medicalHistory || []), record] };
        await backendService.updateLivestock(animalId, updated);
        return record;
    },
    addBreedingRecord: async (animalId: string, record: InseminationRecord): Promise<InseminationRecord> => {
        const animal = await backendService.getLivestockById(animalId);
        if (!animal) throw new Error("Animal not found");
        const updated = { ...animal, breedingHistory: [...(animal.breedingHistory || []), record] };
        await backendService.updateLivestock(animalId, updated);
        return record;
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

    // Entities & Ledger
    getEntities: async (): Promise<Entity[]> => {
        const res = await fetch(`${API_BASE_URL}/entities`);
        return handleResponse(res);
    },
    createEntity: async (data: Entity): Promise<Entity> => {
        const res = await fetch(`${API_BASE_URL}/entities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    updateEntity: async (id: string, data: Entity): Promise<Entity> => {
        const res = await fetch(`${API_BASE_URL}/entities/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    deleteEntity: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/entities/${id}`, { method: 'DELETE' });
        await handleDeleteResponse(res);
    },
    getLedger: async (): Promise<LedgerRecord[]> => {
        const res = await fetch(`${API_BASE_URL}/finance/ledger`);
        return handleResponse(res);
    },
    createPayment: async (payment: { entityId: string, amount: number, date: string, notes?: string, type?: string }): Promise<LedgerRecord> => {
        const res = await fetch(`${API_BASE_URL}/finance/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payment),
        });
        return handleResponse(res);
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

    // Consumption Logs
    getConsumptionLogs: async (): Promise<ConsumptionLog[]> => {
        const res = await fetch(`${API_BASE_URL}/operations/consumption-logs`);
        return handleResponse(res);
    },
    logConsumption: async (logs: ConsumptionLog[]): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/operations/consumption-logs/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logs),
        });
        await handleResponse(res);
    },

    // Medicine Module
    getTreatmentProtocols: async (): Promise<TreatmentProtocol[]> => {
        const res = await fetch(`${API_BASE_URL}/operations/treatment-protocols`);
        return handleResponse(res);
    },
    createTreatmentProtocol: async (data: TreatmentProtocol): Promise<TreatmentProtocol> => {
        const res = await fetch(`${API_BASE_URL}/operations/treatment-protocols`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    updateTreatmentProtocol: async (id: string, data: TreatmentProtocol): Promise<TreatmentProtocol> => {
        const res = await fetch(`${API_BASE_URL}/operations/treatment-protocols/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },
    deleteTreatmentProtocol: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/operations/treatment-protocols/${id}`, { method: 'DELETE' });
        await handleDeleteResponse(res);
    },

    getTreatmentLogs: async (): Promise<TreatmentLog[]> => {
        const res = await fetch(`${API_BASE_URL}/operations/treatment-logs`);
        return handleResponse(res);
    },
    logTreatment: async (logs: TreatmentLog[]): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/operations/treatment-logs/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logs),
        });
        await handleResponse(res);
    },

    // Auth (Mock)
    login: async (email: string, password: string): Promise<{ user: { name: string; email: string }, token: string }> => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            user: { name: 'Farm Manager', email },
            token: 'mock-jwt-token'
        };
    }
};
