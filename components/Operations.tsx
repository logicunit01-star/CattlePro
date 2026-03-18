
import React, { useState, useEffect } from 'react';
import { AppState, Livestock, FeedInventory, Infrastructure, DietPlan, TreatmentProtocol, TreatmentLog, TreatmentItem, MaintenanceRecord, ExpenseCategory } from '../types';
import { backendService } from '../services/backendService';
import { Warehouse, Construction, AlertCircle, Plus, Trash2, Edit2, Tag, X, Save, CheckCircle, ArrowLeft, Utensils, CalendarClock, Beef, Upload, Image as ImageIcon, Stethoscope, Pill } from 'lucide-react';

export type OperationsTab = 'FEED' | 'MEDICINE' | 'SUPPLIES' | 'INFRA' | 'DIET';

interface Props {
    state: AppState;
    initialTab?: OperationsTab;
    onTabChange?: (tab: OperationsTab) => void;
    onAddFeed: (item: FeedInventory) => void | Promise<void>;
    onUpdateFeed: (item: FeedInventory) => void | Promise<void>;
    onDeleteFeed: (id: string) => void | Promise<void>;
    onAddInfrastructure: (item: Infrastructure) => void | Promise<void>;
    onUpdateInfrastructure: (item: Infrastructure) => void | Promise<void>;
    onDeleteInfrastructure: (id: string) => void | Promise<void>;
    onAddDietPlan: (plan: DietPlan) => void | Promise<void>;
    onUpdateDietPlan: (plan: DietPlan) => void | Promise<void>;
    onDeleteDietPlan: (id: string) => void | Promise<void>;
    onRunDailyProcessing: () => Promise<void>;
    onAddTreatmentProtocol: (plan: TreatmentProtocol) => void | Promise<void>;
    onUpdateTreatmentProtocol: (plan: TreatmentProtocol) => void | Promise<void>;
    onDeleteTreatmentProtocol: (id: string) => void | Promise<void>;
    onLogTreatment: (logs: TreatmentLog[]) => void | Promise<void>;
    /** When set, protocol apply uses atomic backend bulk endpoint instead of building logs client-side. */
    onApplyProtocol?: (protocolId: string, targetAnimalIds: string[], performedBy?: string) => Promise<void>;
    onAddExpense: (expense: any) => Promise<void>;
    onReverseFeedLedger: (ledgerId: string) => Promise<void>;
    onClearFeedLedger: () => Promise<void>;
}

export const Operations: React.FC<Props> = ({
    state,
    initialTab = 'FEED',
    onTabChange,
    onAddFeed,
    onUpdateFeed,
    onDeleteFeed,
    onAddInfrastructure,
    onUpdateInfrastructure,
    onDeleteInfrastructure,
    onAddDietPlan,
    onUpdateDietPlan,
    onDeleteDietPlan,
    onRunDailyProcessing,
    onAddTreatmentProtocol,
    onUpdateTreatmentProtocol,
    onDeleteTreatmentProtocol,
    onLogTreatment,
    onApplyProtocol,
    onAddExpense,
    onReverseFeedLedger,
    onClearFeedLedger
}) => {
    const [activeTab, setActiveTab] = useState<OperationsTab>(initialTab);

    // Sync tab when parent (sidebar) sets initialTab
    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const setActiveTabAndNotify = (tab: OperationsTab) => {
        setActiveTab(tab);
        onTabChange?.(tab);
    };
    const [viewMode, setViewMode] = useState<'LIST' | 'FORM' | 'PROTOCOL' | 'SERVICE' | 'LEDGER'>('LIST');

    // --- SERVICE STATE ---
    const [servicingAsset, setServicingAsset] = useState<Infrastructure | null>(null);
    const [serviceForm, setServiceForm] = useState<Partial<MaintenanceRecord>>({
        date: new Date().toISOString().split('T')[0],
        type: 'PREVENTIVE',
        description: '',
        cost: 0,
        performedBy: '',
        nextServiceDate: ''
    });

    // --- FEED STATE ---
    const [editingFeed, setEditingFeed] = useState<FeedInventory | null>(null);
    const [feedForm, setFeedForm] = useState<Partial<FeedInventory>>({
        name: '', quantity: 0, unitCost: 0, reorderLevel: 0
    });

    // --- INFRASTRUCTURE STATE ---
    const [editingInfra, setEditingInfra] = useState<Infrastructure | null>(null);
    const [infraForm, setInfraForm] = useState<Partial<Infrastructure>>({
        name: '', assetTag: '', category: 'EQUIPMENT', status: 'OPERATIONAL', location: '', value: 0, purchaseDate: '', imageUrl: ''
    });

    // --- DIET PLAN STATE ---
    const [editingDiet, setEditingDiet] = useState<DietPlan | null>(null);
    const [dietForm, setDietForm] = useState<Partial<DietPlan>>({
        name: '', status: 'DRAFT', startDate: new Date().toISOString().split('T')[0], items: [], targetType: 'CATEGORY'
    });

    // --- TREATMENT PROTOCOL STATE ---
    const [editingProtocol, setEditingProtocol] = useState<TreatmentProtocol | null>(null);
    const [protocolForm, setProtocolForm] = useState<Partial<TreatmentProtocol>>({
        name: '', status: 'DRAFT', scheduleType: 'RECURRING', items: [], targetType: 'CATEGORY'
    });
    const [applyingProtocol, setApplyingProtocol] = useState<TreatmentProtocol | null>(null);
    const [medicineExpirations, setMedicineExpirations] = useState<{ id: string; name: string; batchNumber: string; expiryDate: string; daysUntilExpiry: number; quantity: number; unit: string }[]>([]);

    useEffect(() => {
        if (activeTab === 'MEDICINE') {
            backendService.getMedicineExpirations(30).then(setMedicineExpirations).catch(() => setMedicineExpirations([]));
        }
    }, [activeTab]);

    // --- HELPERS ---
    const openAddProtocol = () => {
        setEditingProtocol(null);
        setProtocolForm({ name: '', status: 'DRAFT', scheduleType: 'RECURRING', items: [], targetType: 'CATEGORY', targetId: '', frequency: 'Monthly' });
        setViewMode('PROTOCOL');
    };

    const handleApplyProtocol = async (protocol: TreatmentProtocol) => {
        if (!state.currentFarmId) return alert("Select a farm first");

        let animalsToTreat: Livestock[] = [];
        if (protocol.targetType === 'INDIVIDUAL') {
            const ids: string[] = (protocol as any).targetIds?.length ? (protocol as any).targetIds : (protocol.targetId ? [protocol.targetId] : []);
            if (ids.length) animalsToTreat = state.livestock.filter(l => ids.includes(l.id) && l.farmId === state.currentFarmId && l.status === 'ACTIVE');
        }
        if (animalsToTreat.length === 0 && protocol.targetType === 'CATEGORY' && protocol.targetName) {
            animalsToTreat = state.livestock.filter(l => l.category === protocol.targetName && l.farmId === state.currentFarmId && l.status === 'ACTIVE');
        }
        if (animalsToTreat.length === 0) {
            animalsToTreat = state.livestock.filter(l => l.farmId === state.currentFarmId && l.status === 'ACTIVE');
        }

        if (animalsToTreat.length === 0) {
            alert("No active animals found for this target.");
            return;
        }

        const confirmMsg = `Apply protocol "${protocol.name}" to ${animalsToTreat.length} animal(s)? This will deduct medicine stock and log treatments.`;
        if (!confirm(confirmMsg)) return;

        try {
            if (onApplyProtocol) {
                await onApplyProtocol(protocol.id, animalsToTreat.map(a => a.id), 'Manager');
                alert(`Protocol applied to ${animalsToTreat.length} animal(s).`);
                return;
            }
        } catch (e) {
            console.error(e);
            alert("Failed to apply protocol.");
            return;
        }

        const performDate = new Date().toISOString().split('T')[0];
        const logs: TreatmentLog[] = [];
        animalsToTreat.forEach(animal => {
            (protocol.items || []).forEach((item: TreatmentItem) => {
                const invItem = state.feed.find(f => f.id === item.inventoryId);
                const isBulkUnit = ['BOTTLE', 'VIAL', 'BOX', 'PACK'].includes(invItem?.unit?.toUpperCase() || '');
                const conversionFactor = (isBulkUnit && (invItem?.weightPerUnit || 0) > 0) ? invItem!.weightPerUnit! : 1;
                const costPerDosage = (invItem?.unitCost || 0) / conversionFactor;

                logs.push({
                    id: Math.random().toString(36).substr(2, 9),
                    farmId: state.currentFarmId!,
                    protocolId: protocol.id,
                    date: performDate,
                    animalId: animal.id,
                    itemId: item.inventoryId,
                    medicineName: item.inventoryName,
                    quantityUsed: item.dosage,
                    cost: costPerDosage * (item.dosage || 0),
                    performedBy: 'Manager'
                });
            });
        });
        try {
            await onLogTreatment(logs);
            alert(`Successfully logged treatments for ${animalsToTreat.length} animals.`);
        } catch (e) {
            console.error(e);
            alert("Failed to log treatments.");
        }
    };

    const handleInfraImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setInfraForm({ ...infraForm, imageUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const [createExpense, setCreateExpense] = useState(false);

    const openAddFeed = () => {
        setEditingFeed(null);
        setFeedForm({ name: '', quantity: 0, unitCost: 0, reorderLevel: 0, unit: 'KG', vendorId: '', batchNumber: '', expiryDate: '' });
        setCreateExpense(false);
        setViewMode('FORM');
    };

    const openEditFeed = (item: FeedInventory) => {
        setEditingFeed(item);
        setFeedForm({ ...item, vendorId: item.vendorId || item.defaultSupplier || '' });
        setViewMode('FORM');
    };

    const openAddInfra = () => {
        setEditingInfra(null);
        setInfraForm({ name: '', assetTag: '', category: 'EQUIPMENT', status: 'OPERATIONAL', location: '', value: 0, purchaseDate: new Date().toISOString().split('T')[0], imageUrl: '' });
        setCreateExpense(false);
        setViewMode('FORM');
    };

    const openEditInfra = (item: Infrastructure) => {
        setEditingInfra(item);
        setInfraForm({ ...item, purchaseDate: item.purchaseDate || new Date().toISOString().split('T')[0] });
        setViewMode('FORM');
    };

    const openAddDiet = () => {
        setEditingDiet(null);
        setDietForm({ name: '', status: 'DRAFT', targetType: 'CATEGORY', distributionMode: 'PER_ANIMAL', startDate: new Date().toISOString().split('T')[0], items: [] });
        setViewMode('FORM');
    };

    const openEditDiet = (plan: DietPlan) => {
        setEditingDiet(plan);
        const rawIds = plan.targetIds ?? (plan as any).assignedAnimalIds;
        const targetIds = Array.isArray(rawIds) ? rawIds : (rawIds ? [rawIds] : []);
        setDietForm({
            ...plan,
            targetIds,
            items: Array.isArray(plan.items) ? plan.items.map(i => ({
                ...i,
                id: (i as any).id || Math.random().toString(36).substr(2, 9),
                quantity: Number(i.quantity) ?? 0,
                unit: i.unit || 'kg',
            })) : [],
        });
        setViewMode('FORM');
    };

    const handleFeedSubmit = async () => {
        if (!feedForm.name || feedForm.quantity === undefined) return alert("Name and Quantity required");
        if (!state.currentFarmId) return alert("Please select a farm first.");

        const item: FeedInventory = {
            id: editingFeed ? editingFeed.id : Math.random().toString(36).substr(2, 9),
            farmId: state.currentFarmId,
            name: feedForm.name!,
            category: activeTab === 'MEDICINE' ? 'MEDICINE' : (activeTab === 'SUPPLIES' ? (feedForm.category || 'SUPPLY') : 'FEED'),
            quantity: Number(feedForm.quantity),
            unitCost: Number(feedForm.unitCost) || 0,
            reorderLevel: Number(feedForm.reorderLevel) || 0,
            unit: feedForm.unit || 'kg',
            batchNumber: feedForm.batchNumber,
            expiryDate: feedForm.expiryDate,
            vendorId: feedForm.vendorId,
            description: feedForm.description
        };
        try {
            if (editingFeed) await onUpdateFeed(item);
            else {
                await onAddFeed(item);
                if (createExpense && item.unitCost && item.quantity) {
                    const expenseCategory = item.category === 'MEDICINE' ? ExpenseCategory.MEDICAL : (item.category === 'FEED' ? ExpenseCategory.FEED : ExpenseCategory.PURCHASE);
                    await onAddExpense({
                        id: Math.random().toString(36).substr(2, 9),
                        farmId: state.currentFarmId!,
                        date: new Date().toISOString().split('T')[0],
                        amount: item.unitCost * item.quantity,
                        description: `Purchase of ${item.category}: ${item.name}`,
                        category: expenseCategory,
                        supplier: item.vendorId
                    });
                }
            }
            setViewMode('LIST');
        } catch (e) {
            console.error(e);
            alert("Failed to save feed item. Is the backend running?");
        }
    };

    const handleInfraSubmit = async () => {
        if (!infraForm.name || !infraForm.assetTag) return alert("Name and Asset Tag required");
        if (!state.currentFarmId) return alert("Please select a farm first.");

        const item: Infrastructure = {
            id: editingInfra ? editingInfra.id : Math.random().toString(36).substr(2, 9),
            farmId: state.currentFarmId,
            name: infraForm.name!,
            assetTag: infraForm.assetTag!,
            category: (infraForm.category as any) || 'EQUIPMENT',
            status: (infraForm.status as any) || 'OPERATIONAL',
            location: infraForm.location || 'Unknown',
            value: Number(infraForm.value) || 0,
            purchaseDate: infraForm.purchaseDate || new Date().toISOString().split('T')[0],
            imageUrl: infraForm.imageUrl,
            lifespanYears: Number(infraForm.lifespanYears) || 0,
            depreciationRate: Number(infraForm.depreciationRate) || 0,
            notes: infraForm.notes
        };
        try {
            if (editingInfra) await onUpdateInfrastructure(item);
            else {
                await onAddInfrastructure(item);
                if (createExpense && item.value) {
                    await onAddExpense({
                        id: Math.random().toString(36).substr(2, 9),
                        farmId: state.currentFarmId!,
                        date: item.purchaseDate!,
                        amount: item.value,
                        description: `Purchase of Asset: ${item.name} (${item.assetTag})`,
                        category: ExpenseCategory.INFRASTRUCTURE
                    });
                }
            }
            setViewMode('LIST');
            setInfraForm({ name: '', assetTag: '', category: 'EQUIPMENT', status: 'OPERATIONAL', location: '', value: 0, purchaseDate: '', imageUrl: '' });
        } catch (e) {
            console.error(e);
            alert("Failed to save asset. Is the backend running?");
        }
    };

    const openService = (item: Infrastructure) => {
        setServicingAsset(item);
        setServiceForm({
            date: new Date().toISOString().split('T')[0],
            type: 'PREVENTIVE',
            description: '',
            cost: 0,
            performedBy: '',
            nextServiceDate: ''
        });
        setCreateExpense(true); // Default to logging expense for service
        setViewMode('SERVICE');
    };

    const handleServiceSubmit = async () => {
        if (!servicingAsset || !serviceForm.date) return alert("Service date required");

        const record: MaintenanceRecord = {
            id: Math.random().toString(36).substr(2, 9),
            infrastructureId: servicingAsset.id,
            date: serviceForm.date!,
            type: (serviceForm.type as any) || 'PREVENTIVE',
            description: serviceForm.description || 'Routine Maintenance',
            cost: Number(serviceForm.cost) || 0,
            performedBy: serviceForm.performedBy || 'Unknown',
            nextServiceDate: serviceForm.nextServiceDate
        };

        const updatedAsset: Infrastructure = {
            ...servicingAsset,
            lastServiceDate: record.date,
            nextServiceDue: record.nextServiceDate,
            maintenanceLog: [...(servicingAsset.maintenanceLog || []), record],
            status: 'OPERATIONAL' // Assume operational after service
        };

        try {
            await onUpdateInfrastructure(updatedAsset);

            if (createExpense && record.cost > 0) {
                try {
                    await onAddExpense({
                        id: Math.random().toString(36).substr(2, 9),
                        farmId: state.currentFarmId!,
                        date: record.date!,
                        amount: record.cost,
                        description: `Service for ${updatedAsset.name}: ${record.description}`,
                        category: ExpenseCategory.MAINTENANCE
                    });
                } catch (err) { console.error("Expense log failed", err); }
            }

            setViewMode('LIST');
            setServicingAsset(null);
        } catch (e) {
            console.error(e);
            alert("Failed to log service.");
        }
    };

    const handleDietSubmit = async () => {
        if (!dietForm.name || (!dietForm.items || dietForm.items.length === 0)) return alert("Name and at least one ingredient required");
        if (!state.currentFarmId) return alert("Please select a farm first.");
        if ((dietForm.targetType || '') === 'INDIVIDUAL' && (!dietForm.targetIds || dietForm.targetIds.length === 0)) {
            return alert("Please select at least one animal under Target Selection when using Individual Animal.");
        }

        const rawItems = dietForm.items || [];
        const items = rawItems
            .filter(i => i.inventoryId && (Number(i.quantity) || 0) > 0)
            .map(i => ({
                id: (i as any).id || Math.random().toString(36).substr(2, 9),
                inventoryId: i.inventoryId,
                inventoryName: i.inventoryName || state.feed.find(f => f.id === i.inventoryId)?.name || '',
                quantity: Number(i.quantity) || 0,
                unit: i.unit || 'kg',
                costPerUnit: i.costPerUnit != null ? Number(i.costPerUnit) : undefined,
            }));

        const plan: DietPlan = {
            id: editingDiet ? editingDiet.id : Math.random().toString(36).substr(2, 9),
            farmId: state.currentFarmId,
            name: dietForm.name!,
            targetType: dietForm.targetType || 'CATEGORY',
            targetId: dietForm.targetId,
            targetIds: dietForm.targetIds || [],
            targetName: dietForm.targetName,
            status: dietForm.status || 'DRAFT',
            distributionMode: dietForm.distributionMode || 'PER_ANIMAL',
            startDate: dietForm.startDate || new Date().toISOString().split('T')[0],
            items,
        };
        try {
            if (editingDiet) await onUpdateDietPlan(plan);
            else await onAddDietPlan(plan);
            setViewMode('LIST');
        } catch (e) {
            console.error(e);
            alert("Failed to save diet plan. Is the backend running?");
        }
    };

    const handleProtocolSubmit = async () => {
        if (!protocolForm.name || (!protocolForm.items || protocolForm.items.length === 0)) return alert("Name and at least one medicine item required");
        if (!state.currentFarmId) return alert("Please select a farm first.");

        const protocol: TreatmentProtocol = {
            id: editingProtocol ? editingProtocol.id : Math.random().toString(36).substr(2, 9),
            farmId: state.currentFarmId,
            name: protocolForm.name!,
            targetType: protocolForm.targetType || 'CATEGORY',
            targetId: protocolForm.targetId,
            targetName: protocolForm.targetName,
            status: protocolForm.status || 'DRAFT',
            scheduleType: protocolForm.scheduleType || 'RECURRING',
            frequency: protocolForm.frequency,
            items: protocolForm.items || [],
        };

        try {
            if (editingProtocol) await onUpdateTreatmentProtocol(protocol);
            else await onAddTreatmentProtocol(protocol);
            setViewMode('LIST');
        } catch (e) {
            console.error(e);
            alert("Failed to save protocol.");
        }
    };

    const toggleAnimalAssignment = (animalId: string) => {
        setDietForm(prev => {
            const currentIds = prev.assignedAnimalIds || [];
            if (currentIds.includes(animalId)) {
                return { ...prev, assignedAnimalIds: currentIds.filter(id => id !== animalId) };
            } else {
                return { ...prev, assignedAnimalIds: [...currentIds, animalId] };
            }
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPERATIONAL': return 'text-green-600 bg-green-100';
            case 'NEEDS_REPAIR': return 'text-orange-600 bg-orange-100';
            case 'UNDER_MAINTENANCE': return 'text-blue-600 bg-blue-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getDietPlanAssignedCount = (plan: DietPlan): number => {
        const farmId = plan.farmId || state.currentFarmId;
        const activeOnFarm = state.livestock.filter(l => l.status === 'ACTIVE' && (!farmId || l.farmId === farmId));
        const t = (plan.targetType || '').toUpperCase();
        if (t === 'INDIVIDUAL') {
            const ids = plan.targetIds ?? (plan as any).assignedAnimalIds ?? [];
            return Array.isArray(ids) ? ids.length : 0;
        }
        if (t === 'CATEGORY' && (plan.targetName || plan.targetId)) {
            return activeOnFarm.filter(l => l.category === (plan.targetName || plan.targetId)).length;
        }
        if (t === 'ALL') return activeOnFarm.length;
        return 0;
    };

    const getDietPlanAssignedAnimals = (plan: DietPlan): Livestock[] => {
        const farmId = plan.farmId || state.currentFarmId;
        const activeOnFarm = state.livestock.filter(l => l.status === 'ACTIVE' && (!farmId || l.farmId === farmId));
        const t = (plan.targetType || '').toUpperCase();
        if (t === 'INDIVIDUAL') {
            const ids = plan.targetIds ?? (plan as any).assignedAnimalIds ?? [];
            const idSet = Array.isArray(ids) ? new Set(ids) : new Set<string>();
            return activeOnFarm.filter(l => idSet.has(l.id));
        }
        if (t === 'CATEGORY' && (plan.targetName || plan.targetId)) {
            return activeOnFarm.filter(l => l.category === (plan.targetName || plan.targetId));
        }
        if (t === 'ALL') return activeOnFarm;
        return [];
    };

    const getDietPlanDailyCost = (plan: DietPlan): number => {
        const animals = getDietPlanAssignedAnimals(plan);
        const aCount = animals.length;
        if (aCount === 0 || !plan.items?.length) return 0;
        const mode = (plan.distributionMode || 'PER_ANIMAL') as string;
        let total = 0;
        for (const it of plan.items) {
            if (!it.inventoryId || (it.quantity ?? 0) <= 0) continue;
            let deductTotal = 0;
            if (mode === 'TOTAL_DISTRIBUTED') deductTotal = it.quantity ?? 0;
            else if (mode === 'PER_HUNDRED_KG_BW') deductTotal = (it.quantity ?? 0) * (animals.reduce((s, a) => s + (a.weight ?? 0), 0) / 100);
            else deductTotal = (it.quantity ?? 0) * aCount;
            const fInv = state.feed.find(f => f.id === it.inventoryId);
            const uiInv = (fInv?.unit || '').toUpperCase();
            const uiItem = (it.unit || 'KG').toUpperCase();
            let inventoryDeductionCount = deductTotal;
            const wpu = (fInv?.weightPerUnit ?? 1) || 1;
            if (fInv && ['BAG', 'BUNDLE'].includes(uiInv)) {
                if (uiItem === 'KG') inventoryDeductionCount = deductTotal / wpu;
                else if (uiItem === 'G') inventoryDeductionCount = (deductTotal / 1000) / wpu;
            } else if (uiInv === 'TON') {
                if (uiItem === 'KG') inventoryDeductionCount = deductTotal / 1000;
                else if (uiItem === 'G') inventoryDeductionCount = deductTotal / 1000000;
            } else if (uiInv === 'KG') {
                if (uiItem === 'G') inventoryDeductionCount = deductTotal / 1000;
                else if (uiItem === 'TON') inventoryDeductionCount = (deductTotal ?? 0) * 1000;
            } else if (uiInv === 'G') {
                if (uiItem === 'KG') inventoryDeductionCount = (deductTotal ?? 0) * 1000;
                else if (uiItem === 'TON') inventoryDeductionCount = (deductTotal ?? 0) * 1000000;
            }
            total += inventoryDeductionCount * (fInv?.unitCost ?? 0);
        }
        return total;
    };

    return (
        <div className="space-y-6">
            {!state.currentFarmId && !state.currentLocationId && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-2">
                    <AlertCircle size={20} />
                    <span className="text-sm font-medium">Select a farm or city above to view and manage feed, infrastructure, diet plans, and treatments for that context only.</span>
                </div>
            )}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Operations & Resources</h2>
                    <p className="text-sm text-gray-500">Manage inventory, assets, and nutrition plans — scoped to selected farm</p>
                </div>
            </div>

            {/* Tabs - Only show if in LIST mode to avoid navigation confusion during edit */}
            {viewMode === 'LIST' && (
                <div className="border-b border-gray-200 flex space-x-6 overflow-x-auto">
                    <button
                        onClick={() => setActiveTabAndNotify('FEED')}
                        className={`pb-3 px-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'FEED' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Feed Stock
                    </button>
                    <button
                        onClick={() => setActiveTabAndNotify('MEDICINE')}
                        className={`pb-3 px-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'MEDICINE' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Medicine Cabinet
                    </button>
                    <button
                        onClick={() => setActiveTabAndNotify('SUPPLIES')}
                        className={`pb-3 px-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'SUPPLIES' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Farm Supplies
                    </button>
                    <button
                        onClick={() => setActiveTabAndNotify('INFRA')}
                        className={`pb-3 px-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'INFRA' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Fixed Assets
                    </button>
                    <button
                        onClick={() => setActiveTabAndNotify('DIET')}
                        className={`pb-3 px-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'DIET' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Diets
                    </button>
                </div>
            )}

            {/* --- MEDICINE CONTENT --- */}
            {activeTab === 'MEDICINE' && (
                <>
                    {viewMode === 'LIST' ? (
                        <div className="space-y-6 animate-fade-in">
                            {medicineExpirations.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-2">
                                        <AlertCircle size={18} /> Expiring Within 30 Days
                                    </h4>
                                    <ul className="space-y-1 text-sm text-amber-900">
                                        {medicineExpirations.map(m => (
                                            <li key={m.id} className="flex justify-between items-center">
                                                <span><strong>{m.name}</strong>{m.batchNumber ? ` (Batch ${m.batchNumber})` : ''} — expires {m.expiryDate}</span>
                                                <span className="font-bold">{m.daysUntilExpiry} days</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {/* Section 1: Medicine Inventory */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-blue-50">
                                    <h3 className="font-bold text-blue-800 flex items-center gap-2">
                                        <Pill size={18} /> Medicine Stock
                                    </h3>
                                    <button onClick={openAddFeed} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors text-xs font-medium">
                                        <Plus size={14} /> Add Medicine
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {state.feed.filter(i => i.category === 'MEDICINE').map((item) => (
                                                <tr key={item.id} className="hover:bg-blue-50/30">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <Pill size={16} className="text-blue-400" />
                                                                {item.name}
                                                            </div>
                                                            {item.batchNumber && <span className="text-[10px] text-gray-400 ml-6">Batch: {item.batchNumber}</span>}
                                                            {item.expiryDate && <span className="text-[10px] text-red-400 ml-6">Exp: {item.expiryDate}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-bold">{item.quantity} {item.unit}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {state.entities?.find(e => e.id === (item.vendorId || item.defaultSupplier))?.name || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">PKR {item.unitCost}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex gap-2">
                                                            <button onClick={() => openEditFeed(item)} className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded"><Edit2 size={16} /></button>
                                                            <button onClick={() => onDeleteFeed(item.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded"><Trash2 size={16} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {state.feed.filter(i => i.category === 'MEDICINE').length === 0 && (
                                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">No medicines in stock.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Section 2: Treatment Protocols */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-teal-50">
                                    <h3 className="font-bold text-teal-800 flex items-center gap-2">
                                        <Stethoscope size={18} /> Treatment Protocols (SOPs)
                                    </h3>
                                    <button onClick={openAddProtocol} className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors text-xs font-medium">
                                        <Plus size={14} /> Create Protocol
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                                    {state.treatmentProtocols && state.treatmentProtocols.map(protocol => (
                                        <div key={protocol.id} className="bg-white border boundary-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative">
                                            <div className="absolute top-4 right-4 flex gap-2">
                                                <button onClick={() => { setEditingProtocol(protocol); setProtocolForm(protocol); setViewMode('PROTOCOL'); }} className="text-gray-400 hover:text-teal-600"><Edit2 size={14} /></button>
                                                <button onClick={() => onDeleteTreatmentProtocol(protocol.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                                            </div>
                                            <h4 className="font-bold text-gray-800 mb-1">{protocol.name}</h4>
                                            <div className="flex gap-2 mb-3">
                                                <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-bold">{protocol.scheduleType}</span>
                                                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase">{protocol.targetType}</span>
                                            </div>

                                            <div className="space-y-1">
                                                {protocol.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                                        <span>{item.inventoryName}</span>
                                                        <span className="font-bold">{item.dosage} {item.unit}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                                                <span className="text-xs text-gray-500">{protocol.targetName || protocol.targetId || 'All Animals'}</span>
                                                <button onClick={() => handleApplyProtocol(protocol)} className="text-teal-600 text-xs font-bold hover:underline">Apply Treatment</button>
                                            </div>
                                        </div>
                                    ))}
                                    {(!state.treatmentProtocols || state.treatmentProtocols.length === 0) && (
                                        <div className="col-span-full text-center py-8 text-gray-400 italic">No standard treatment protocols defined.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        // If viewMode is FORM, it's handled by the specific FORM blocks below (Feed Form Reuse)
                        // But if viewMode is PROTOCOL, it will be handled by a separate block
                        null
                    )}
                </>
            )}

            {/* --- FEED CONTENT --- */}
            {activeTab === 'FEED' && (
                <>
                    {viewMode === 'LIST' ? (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-end">
                                <button onClick={openAddFeed} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors text-sm font-medium">
                                    <Plus size={16} /> Add Item
                                </button>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {state.feed.filter(i => (i.category || 'FEED') === 'FEED').map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                                                        <div className="flex items-center gap-2">
                                                            <Warehouse size={16} className="text-gray-400" />
                                                            {item.name}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-bold">
                                                        <div className="flex flex-col">
                                                            <span>{item.quantity.toLocaleString()} {item.unit?.toUpperCase() || 'KG'}</span>
                                                            {((['BAG', 'BUNDLE'].includes((item.unit || '').toUpperCase()) || ['WANDA', 'TMR'].includes(item.feedType || '')) && (item.weightPerUnit || 40) > 0) ? (
                                                                <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                                                                    (≈ {(item.quantity * (item.weightPerUnit || 40)).toLocaleString()} KG)
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {state.entities?.find(e => e.id === (item.vendorId || item.defaultSupplier))?.name || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        PKR {item.unitCost.toLocaleString()} / {item.unit?.toUpperCase() || 'KG'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {item.quantity <= item.reorderLevel ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                <AlertCircle size={12} /> Low Stock
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                <CheckCircle size={12} /> OK
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => openEditFeed(item)} className="text-emerald-600 hover:text-emerald-900 bg-emerald-50 p-1.5 rounded"><Edit2 size={16} /></button>
                                                            <button onClick={() => { if (confirm('Delete this item?')) onDeleteFeed(item.id); }} className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded"><Trash2 size={16} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {state.feed.filter(i => (i.category || 'FEED') === 'FEED').length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">No feed items recorded. Add some stock.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fade-in max-w-2xl mx-auto">
                            <div className="flex items-center gap-4 mb-6">
                                <button onClick={() => setViewMode('LIST')} className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                                    <ArrowLeft size={20} />
                                </button>
                                <h3 className="text-xl font-bold text-gray-800">{editingFeed ? 'Edit Inventory Item' : 'Add New Feed Stock'}</h3>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                        <input type="text" value={feedForm.name} onChange={e => setFeedForm({ ...feedForm, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. Alfalfa Hay" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Initial Quantity ({feedForm.unit || 'KG'})</label>
                                        <input type="number" value={feedForm.quantity} onChange={e => setFeedForm({ ...feedForm, quantity: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" disabled={!!editingFeed} title={editingFeed ? "Change stock via usage or procurement" : ""} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit Format</label>
                                        <select value={feedForm.unit} onChange={e => setFeedForm({ ...feedForm, unit: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                                            {['KG', 'TON', 'BUNDLE', 'BAG'].map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                    {['BAG', 'BUNDLE'].includes(feedForm.unit || '') && (
                                        <div className="animate-fade-in-up">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Weight Per {feedForm.unit} (KG)</label>
                                            <input type="number" min={0} step={0.1} value={feedForm.weightPerUnit || ''} onChange={e => setFeedForm({ ...feedForm, weightPerUnit: Number(e.target.value) || 0 })} className="w-full border border-emerald-200 bg-emerald-50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. 40" />
                                        </div>
                                    )}
                                    <div className="lg:col-span-1 border-t border-gray-100 pt-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Base Cost (PKR / {feedForm.unit || 'KG'})</label>
                                        <input type="number" value={feedForm.unitCost} onChange={e => setFeedForm({ ...feedForm, unitCost: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div className="lg:col-span-2 border-t border-gray-100 pt-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Alert Level ({feedForm.unit || 'KG'})</label>
                                        <input type="number" value={feedForm.reorderLevel} onChange={e => setFeedForm({ ...feedForm, reorderLevel: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <p className="text-xs text-gray-400 mt-1">System flags "Low Stock" when quantity drops below this.</p>
                                    </div>

                                    <div className="lg:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                                        <input type="text" value={feedForm.batchNumber || ''} onChange={e => setFeedForm({ ...feedForm, batchNumber: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. BTC-123" />
                                    </div>
                                    <div className="lg:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                                        <input type="date" value={feedForm.expiryDate || ''} onChange={e => setFeedForm({ ...feedForm, expiryDate: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div className="lg:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Supplier / Vendor</label>
                                        <select 
                                            value={feedForm.vendorId || ''} 
                                            onChange={e => setFeedForm({ ...feedForm, vendorId: e.target.value })} 
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                        >
                                            <option value="">Select Vendor...</option>
                                            {state.entities?.filter(e => e.type === 'VENDOR').map(v => (
                                                <option key={v.id} value={v.id}>{v.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="lg:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Description</label>
                                        <input type="text" value={feedForm.description || ''} onChange={e => setFeedForm({ ...feedForm, description: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Storage info or precautions" />
                                    </div>
                                    {!editingFeed && (
                                        <div className="lg:col-span-3 bg-emerald-50 p-3 rounded-lg flex items-center gap-2">
                                            <input type="checkbox" id="createExp" checked={createExpense} onChange={e => setCreateExpense(e.target.checked)} className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500" />
                                            <label htmlFor="createExp" className="text-sm font-bold text-emerald-700 cursor-pointer">Log as Financial Expense / Vendor Bill</label>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-4 flex justify-end gap-3">
                                    <button onClick={() => setViewMode('LIST')} className="px-6 py-2 text-gray-500 hover:text-gray-700 font-medium">Cancel</button>
                                    <button onClick={handleFeedSubmit} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm">Save Item</button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* --- SUPPLIES CONTENT --- */}
            {activeTab === 'SUPPLIES' && (
                <>
                    {viewMode === 'LIST' ? (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-amber-50">
                                    <h3 className="font-bold text-amber-800 flex items-center gap-2">
                                        <Warehouse size={18} /> Farm Supplies & Tools
                                    </h3>
                                    <button onClick={openAddFeed} className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors text-xs font-medium">
                                        <Plus size={14} /> Add Supply
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {state.feed.filter(i => ['SUPPLY', 'TOOL', 'EQUIPMENT', 'OTHER'].includes(i.category || '')).map((item) => (
                                                <tr key={item.id} className="hover:bg-amber-50/30">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                                                <div className="text-xs text-gray-500">ID: {item.id.substring(0, 6)}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                                                            {item.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className={`text-sm font-bold ${item.quantity <= item.reorderLevel ? 'text-red-600' : 'text-gray-900'}`}>
                                                            {item.quantity} <span className="text-gray-500 font-normal text-xs">{item.unit}</span>
                                                        </div>
                                                        {item.quantity <= item.reorderLevel && (
                                                            <div className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                                                <AlertCircle size={10} /> Low Stock
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        PKR {item.unitCost.toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => openEditFeed(item)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded"><Edit2 size={16} /></button>
                                                            <button onClick={() => onDeleteFeed(item.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded"><Trash2 size={16} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {state.feed.filter(i => ['SUPPLY', 'TOOL', 'EQUIPMENT', 'OTHER'].includes(i.category || '')).length === 0 && (
                                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">No supplies or tools registered.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </>
            )}

            {/* --- INFRASTRUCTURE CONTENT --- */}
            {activeTab === 'INFRA' && (
                <>
                    {viewMode === 'LIST' ? (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-end">
                                <button onClick={openAddInfra} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors text-sm font-medium">
                                    <Plus size={16} /> Add Asset
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {state.infrastructure.map(infra => (
                                    <div key={infra.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-3 opacity-5">
                                            <Construction size={80} />
                                        </div>
                                        <div className="flex justify-between items-start mb-3 relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                                                    {infra.imageUrl ? (
                                                        <img src={infra.imageUrl} alt="Asset" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Construction size={20} className="text-gray-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-800 text-lg">{infra.name}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="bg-gray-800 text-white text-xs font-mono px-2 py-0.5 rounded flex items-center gap-1">
                                                            <Tag size={10} /> {infra.assetTag}
                                                        </span>
                                                        <span className="text-xs text-gray-500 uppercase tracking-wide">{infra.category === 'MACHINERY' ? 'Heavy Machinery' : infra.category}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(infra.status)}`}>
                                                {infra.status.replace('_', ' ')}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-4 relative z-10 border-t border-gray-100 pt-3">
                                            <div>
                                                <p className="text-xs text-gray-400">Location</p>
                                                <p className="font-medium">{infra.location}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">Value</p>
                                                <p className="font-medium">PKR {infra.value.toLocaleString()}</p>
                                            </div>
                                            {infra.purchaseDate && (
                                                <div>
                                                    <p className="text-xs text-gray-400">Purchased</p>
                                                    <p className="font-medium">{infra.purchaseDate}</p>
                                                </div>
                                            )}
                                            {infra.nextServiceDue && (
                                                <div className="text-orange-600">
                                                    <p className="text-xs opacity-75">Service Due</p>
                                                    <p className="font-bold">{infra.nextServiceDue}</p>
                                                </div>
                                            )}
                                        </div>

                                        {infra.notes && (
                                            <div className="mt-2 text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">
                                                "{infra.notes.length > 50 ? infra.notes.substring(0, 50) + '...' : infra.notes}"
                                            </div>
                                        )}

                                        <div className="mt-4 pt-3 flex justify-end gap-2 relative z-10">
                                            <button onClick={() => openEditInfra(infra)} className="text-emerald-600 hover:text-emerald-800 text-sm flex items-center gap-1">
                                                <Edit2 size={14} /> Edit
                                            </button>
                                            <button onClick={async () => { if (confirm(`Remove asset ${infra.assetTag}?`)) await onDeleteInfrastructure(infra.id); }} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1">
                                                <Trash2 size={14} /> Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {state.infrastructure.length === 0 && (
                                    <div className="col-span-full p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center">
                                        <Construction className="mx-auto text-gray-300 mb-2" size={48} />
                                        <p className="text-gray-500">No infrastructure or assets tracked yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fade-in max-w-2xl mx-auto">
                            <div className="flex items-center gap-4 mb-6">
                                <button onClick={() => { setViewMode('LIST'); setEditingInfra(null); }} className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                                    <ArrowLeft size={20} />
                                </button>
                                <h3 className="text-xl font-bold text-gray-800">{editingInfra ? 'Edit Asset' : 'Register New Asset'}</h3>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">

                                {/* Image Upload Section */}
                                <div className="flex items-center gap-4">
                                    <div className="w-24 h-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-emerald-400 transition-colors">
                                        {infraForm.imageUrl ? (
                                            <img src={infraForm.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="text-gray-300" size={32} />
                                        )}
                                        <input type="file" accept="image/*" onChange={handleInfraImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <Upload className="text-white" size={20} />
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-500 flex-1">
                                        <p className="font-medium text-gray-800 mb-1">Asset Photo</p>
                                        <p>Upload a photo of the machinery, building, or equipment for identification.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Asset Tag *</label>
                                        <div className="relative">
                                            <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input type="text" value={infraForm.assetTag} onChange={e => setInfraForm({ ...infraForm, assetTag: e.target.value.toUpperCase() })} className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2 font-mono focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="TRAC-01" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                        <select value={infraForm.category} onChange={e => setInfraForm({ ...infraForm, category: e.target.value as any })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none">
                                            <option value="VEHICLE">Vehicle</option>
                                            <option value="EQUIPMENT">Equipment</option>
                                            <option value="BUILDING">Building</option>
                                            <option value="PASTURE">Pasture/Land</option>
                                            <option value="MACHINERY">Heavy Machinery</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
                                    <input type="text" value={infraForm.name} onChange={e => setInfraForm({ ...infraForm, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. John Deere Tractor" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select value={infraForm.status} onChange={e => setInfraForm({ ...infraForm, status: e.target.value as any })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none">
                                            <option value="OPERATIONAL">Operational</option>
                                            <option value="NEEDS_REPAIR">Needs Repair</option>
                                            <option value="UNDER_MAINTENANCE">Maintenance</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                        <input type="text" value={infraForm.location} onChange={e => setInfraForm({ ...infraForm, location: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Lifespan (Years)</label>
                                        <input type="number" value={infraForm.lifespanYears} onChange={e => setInfraForm({ ...infraForm, lifespanYears: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Depreciation Rate (%)</label>
                                        <input type="number" value={infraForm.depreciationRate} onChange={e => setInfraForm({ ...infraForm, depreciationRate: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Service History</label>
                                    <textarea value={infraForm.notes || ''} onChange={e => setInfraForm({ ...infraForm, notes: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none h-24" placeholder="Enter maintenance notes or details..."></textarea>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Value (PKR)</label>
                                        <input type="number" value={infraForm.value} onChange={e => setInfraForm({ ...infraForm, value: parseFloat(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                                        <input type="date" value={infraForm.purchaseDate} onChange={e => setInfraForm({ ...infraForm, purchaseDate: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                </div>

                                {!editingInfra && (
                                    <div className="flex items-center gap-2 mt-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <input
                                            type="checkbox"
                                            id="createInfraExpense"
                                            checked={createExpense}
                                            onChange={e => setCreateExpense(e.target.checked)}
                                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                        />
                                        <label htmlFor="createInfraExpense" className="text-sm text-gray-700 font-medium cursor-pointer">
                                            Log this asset purchase as an Expense automatically
                                        </label>
                                    </div>
                                )}

                                <div className="pt-4 flex justify-end gap-3">
                                    <button onClick={() => { setViewMode('LIST'); setEditingInfra(null); }} className="px-6 py-2 text-gray-500 hover:text-gray-700 font-medium">Cancel</button>
                                    <button onClick={handleInfraSubmit} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm">{editingInfra ? 'Update Asset' : 'Create Asset'}</button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )
            }

            {/* --- PROTOCOL FORM --- */}
            {
                viewMode === 'PROTOCOL' && (
                    <div className="animate-fade-in max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-6">
                            <button onClick={() => { setViewMode('LIST'); setEditingProtocol(null); }} className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                                <ArrowLeft size={20} />
                            </button>
                            <h3 className="text-xl font-bold text-gray-800">{editingProtocol ? 'Edit Protocol' : 'Create Treatment Protocol'}</h3>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                            {/* STEP 1: BASIC INFO */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Protocol Name</label>
                                    <input type="text" value={protocolForm.name} onChange={e => setProtocolForm({ ...protocolForm, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="e.g. Annual Vaccination" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Type</label>
                                    <select value={protocolForm.scheduleType || 'RECURRING'} onChange={e => setProtocolForm({ ...protocolForm, scheduleType: e.target.value as any })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 outline-none">
                                        <option value="RECURRING">Recurring (Regular Schedule)</option>
                                        <option value="ONE_OFF">One-off / As Needed</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Type</label>
                                    <select value={protocolForm.targetType || 'CATEGORY'} onChange={e => setProtocolForm({ ...protocolForm, targetType: e.target.value as any, targetId: '' })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 outline-none">
                                        <option value="CATEGORY">Category</option>
                                        <option value="INDIVIDUAL">Individual Animal</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Target</label>
                                    {protocolForm.targetType === 'CATEGORY' ? (
                                        <select value={protocolForm.targetId || ''} onChange={e => setProtocolForm({ ...protocolForm, targetId: e.target.value, targetName: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 outline-none">
                                            <option value="">Select Category...</option>
                                            {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    ) : (
                                        <select value={protocolForm.targetId || ''} onChange={e => {
                                            const animal = state.livestock.find(l => l.id === e.target.value);
                                            setProtocolForm({ ...protocolForm, targetId: e.target.value, targetName: animal?.tagId });
                                        }} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 outline-none">
                                            <option value="">Select Animal...</option>
                                            {state.livestock.map(l => <option key={l.id} value={l.id}>{l.tagId} ({l.name})</option>)}
                                        </select>
                                    )}
                                </div>
                            </div>

                            {/* STEP 2: Medicines */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700">Medicines / Vaccines</label>
                                    <button onClick={() => {
                                        const items = protocolForm.items || [];
                                        setProtocolForm({ ...protocolForm, items: [...items, { id: Math.random().toString(), inventoryId: '', check: false, inventoryName: '', dosage: 0, unit: 'ml' } as any] });
                                    }} className="text-sm text-teal-600 font-medium hover:text-teal-800">+ Add Medicine</button>
                                </div>
                                <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    {(!protocolForm.items || protocolForm.items.length === 0) && <p className="text-sm text-gray-400 italic text-center">No medicines added.</p>}
                                    {protocolForm.items?.map((item, idx) => (
                                        <div key={idx} className="flex gap-3 items-end">
                                            <div className="flex-1">
                                                <label className="block text-xs text-gray-500 mb-1">Medicine</label>
                                                <select value={item.inventoryId} onChange={e => {
                                                    const inv = state.feed.find(f => f.id === e.target.value);
                                                    const newItems = [...(protocolForm.items || [])];
                                                    newItems[idx] = { ...item, inventoryId: e.target.value, inventoryName: inv?.name || '', unit: inv?.unit || 'ml' };
                                                    setProtocolForm({ ...protocolForm, items: newItems });
                                                }} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                                                    <option value="">Select Item...</option>
                                                    {state.feed.filter(f => f.category === 'MEDICINE').map(f => (
                                                        <option key={f.id} value={f.id}>{f.name} ({f.quantity} {f.unit})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="w-24">
                                                <label className="block text-xs text-gray-500 mb-1">Dosage</label>
                                                <input type="number" value={item.dosage} onChange={e => {
                                                    const newItems = [...(protocolForm.items || [])];
                                                    newItems[idx] = { ...item, dosage: parseFloat(e.target.value) };
                                                    setProtocolForm({ ...protocolForm, items: newItems });
                                                }} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                                            </div>
                                            <div className="w-20">
                                                <label className="block text-xs text-gray-500 mb-1">Unit</label>
                                                <input type="text" value={item.unit} readOnly className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-500" />
                                            </div>
                                            <button onClick={() => {
                                                const newItems = (protocolForm.items || []).filter((_, i) => i !== idx);
                                                setProtocolForm({ ...protocolForm, items: newItems });
                                            }} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button onClick={() => { setViewMode('LIST'); setEditingProtocol(null); }} className="px-6 py-2 text-gray-500 hover:text-gray-700 font-medium">Cancel</button>
                                <button onClick={handleProtocolSubmit} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium shadow-sm">{editingProtocol ? 'Update Protocol' : 'Save Protocol'}</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- FEED & MEDICINE FORM REUSE --- */}
            {
                ((activeTab === 'MEDICINE' || activeTab === 'SUPPLIES') && viewMode === 'FORM') && (
                    <div className="animate-fade-in max-w-2xl mx-auto">
                        <div className="flex items-center gap-4 mb-6">
                            <button onClick={() => { setViewMode('LIST'); setEditingFeed(null); }} className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                                <ArrowLeft size={20} />
                            </button>
                            <h3 className="text-xl font-bold text-gray-800">
                                {editingFeed ? 'Edit Item' : (activeTab === 'MEDICINE' ? 'Register New Medicine' : (activeTab === 'SUPPLIES' ? 'Register New Supply/Tool' : 'Register New Feed Item'))}
                            </h3>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                                <input type="text" value={feedForm.name} onChange={e => setFeedForm({ ...feedForm, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder={activeTab === 'MEDICINE' ? "e.g. Ivermectin 1% Injection" : (activeTab === 'SUPPLIES' ? "e.g. Shovel, Tags" : "e.g. Corn Silage")} />
                                {activeTab === 'MEDICINE' && !editingFeed && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="text-xs text-gray-500 mt-1 w-full">Standard Presets (quick-add: configures as Bottle, 100ml default):</span>
                                        {[
                                            'FMD Vaccine (Foot & Mouth Disease)',
                                            'HS Vaccine (Haemorrhagic Septicaemia)',
                                            'BQ Vaccine (Black Quarter)',
                                            'LSD Vaccine (Lumpy Skin Disease)',
                                            'Ivermectin (Endectocide / Dewormer)',
                                            'Oxytetracycline (Broad-Spectrum Antibiotic)',
                                            'Multivitamin Injection'
                                        ].map(med => (
                                            <button key={med} type="button" onClick={() => setFeedForm({ ...feedForm, name: med, unit: 'bottle', weightPerUnit: 100, category: 'MEDICINE' })} className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded-full border border-blue-200 transition-colors">{med}</button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {activeTab === 'SUPPLIES' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category Type</label>
                                    <select value={feedForm.category || 'SUPPLY'} onChange={e => setFeedForm({ ...feedForm, category: e.target.value as any })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none">
                                        <option value="SUPPLY">General Supply</option>
                                        <option value="TOOL">Tool</option>
                                        <option value="EQUIPMENT">Small Equipment</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                                    <input type="number" value={feedForm.quantity} onChange={e => setFeedForm({ ...feedForm, quantity: parseFloat(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                                    <select value={feedForm.unit} onChange={e => setFeedForm({ ...feedForm, unit: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none">
                                        {activeTab === 'MEDICINE' ? (
                                            <>
                                                <option value="ml">ml / cc (Liquid measures)</option>
                                                <option value="mg">mg (Powders)</option>
                                                <option value="dose">Dose</option>
                                                <option value="tablet">Tablet / Bolus</option>
                                                <option value="bottle">Bottle (Bulk)</option>
                                                <option value="vial">Vial (Bulk)</option>
                                            </>
                                        ) : activeTab === 'SUPPLIES' ? (
                                            <>
                                                <option value="pcs">Pieces</option>
                                                <option value="box">Box</option>
                                                <option value="pack">Pack</option>
                                                <option value="set">Set</option>
                                                <option value="kg">kg</option>
                                                <option value="liter">Liter</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="kg">kg (Kilograms)</option>
                                                <option value="g">g (Grams)</option>
                                                <option value="bale">Bale</option>
                                                <option value="bag">Bag</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>

                            {activeTab === 'MEDICINE' && ['bottle', 'vial', 'box'].includes(feedForm.unit?.toLowerCase() || '') && (
                                <div className="animate-fade-in-up">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Volume/Doses per {feedForm.unit} (e.g. 100 for 100ml)</label>
                                    <input type="number" min={0} step={0.1} value={feedForm.weightPerUnit || ''} onChange={e => setFeedForm({ ...feedForm, weightPerUnit: Number(e.target.value) || 0 })} className="w-full border border-blue-200 bg-blue-50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 100" />
                                    <p className="text-xs text-blue-600 mt-1">Used to accurately deduct stock when administering specific dosages in ml/mg.</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier / Vendor</label>
                                <select value={feedForm.vendorId || ''} onChange={e => setFeedForm({ ...feedForm, vendorId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                                    <option value="">Select Vendor...</option>
                                    {state.entities?.filter(e => e.type === 'VENDOR').map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-400 mt-1">Add vendors in Financials &gt; Entity Registry (type VENDOR).</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (PKR)</label>
                                    <input type="number" value={feedForm.unitCost} onChange={e => setFeedForm({ ...feedForm, unitCost: parseFloat(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
                                    <input type="number" value={feedForm.reorderLevel} onChange={e => setFeedForm({ ...feedForm, reorderLevel: parseFloat(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                            </div>

                            {activeTab === 'MEDICINE' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <div>
                                        <label className="block text-sm font-medium text-blue-800 mb-1">Batch Number</label>
                                        <input type="text" value={feedForm.batchNumber || ''} onChange={e => setFeedForm({ ...feedForm, batchNumber: e.target.value })} className="w-full border border-blue-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Batch #" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-blue-800 mb-1">Expiry Date</label>
                                        <input type="date" value={feedForm.expiryDate || ''} onChange={e => setFeedForm({ ...feedForm, expiryDate: e.target.value })} className="w-full border border-blue-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                </div>
                            )}

                            {!editingFeed && (
                                <div className="flex items-center gap-2 mt-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <input
                                        type="checkbox"
                                        id="createExpense"
                                        checked={createExpense}
                                        onChange={e => setCreateExpense(e.target.checked)}
                                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                    />
                                    <label htmlFor="createExpense" className="text-sm text-gray-700 font-medium cursor-pointer">
                                        Log this purchase as an Expense automatically
                                    </label>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-3">
                                <button onClick={() => { setViewMode('LIST'); setEditingFeed(null); }} className="px-6 py-2 text-gray-500 hover:text-gray-700 font-medium">Cancel</button>
                                <button onClick={handleFeedSubmit} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm">{editingFeed ? 'Update Item' : 'Add Item'}</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- DIET PLAN CONTENT --- */}
            {
                activeTab === 'DIET' && (
                    <>
                        {(viewMode === 'LIST' || viewMode === 'LEDGER') ? (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        <button onClick={() => setViewMode('LIST')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'LIST' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                                            Active Diet Plans
                                        </button>
                                        <button onClick={() => setViewMode('LEDGER')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'LEDGER' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                                            Processing Ledger
                                        </button>
                                    </div>
                                    <button onClick={openAddDiet} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors text-sm font-medium">
                                        <Plus size={16} /> Create Plan
                                    </button>
                                </div>

                                {viewMode === 'LIST' && (
                                    <>
                                        <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
                                            <div>
                                                <h4 className="font-bold text-blue-800">Daily Feed Log</h4>
                                                <p className="text-xs text-blue-600">Click to process daily consumption for all active plans.</p>
                                            </div>
                                            <button onClick={onRunDailyProcessing} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors text-sm font-medium">
                                                <CalendarClock size={16} /> Process Today's Feed
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {state.dietPlans.map(plan => (
                                                <div key={plan.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                                    <div className="p-6 border-b border-gray-100">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                                                    <Utensils size={20} />
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-bold text-gray-800 text-lg">{plan.name}</h3>
                                                                    <div className="flex gap-2 mt-1">
                                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${plan.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                                            {plan.status}
                                                                        </span>
                                                                        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full uppercase">
                                                                            {plan.targetType}: {plan.targetName || plan.targetId || 'N/A'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => openEditDiet(plan)} className="text-gray-400 hover:text-emerald-600"><Edit2 size={16} /></button>
                                                                <button onClick={() => { if (confirm('Delete this diet plan?')) onDeleteDietPlan(plan.id); }} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2 mb-4">
                                                            {(plan.items || []).slice(0, 3).map((item, idx) => (
                                                                <div key={idx} className="flex justify-between text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded">
                                                                    <span>{item.inventoryName}</span>
                                                                    <span className="font-bold">{item.quantity} {item.unit}</span>
                                                                </div>
                                                            ))}
                                                            {(plan.items || []).length > 3 && <div className="text-xs text-center text-gray-400">+{(plan.items || []).length - 3} more ingredients</div>}
                                                        </div>

                                                        <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-gray-50">
                                                            <span className="font-bold text-gray-700">Cost: PKR {(plan.totalCostPerDay ?? getDietPlanDailyCost(plan)).toLocaleString()}/day</span>
                                                            <span className="text-xs">{getDietPlanAssignedCount(plan)} Animals Assigned</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {state.dietPlans.length === 0 && (
                                                <div className="col-span-full p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center">
                                                    <Utensils className="mx-auto text-gray-300 mb-2" size={48} />
                                                    <p className="text-gray-500">No diet plans created yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {viewMode === 'LEDGER' && (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                            <div>
                                                <h3 className="font-bold text-gray-800">Processed Feed Transactions</h3>
                                                <p className="text-xs text-gray-500 mt-1">History of all successfully processed daily diets and material deductions.</p>
                                            </div>
                                            {(state.processedFeedLedgers?.length > 0 || state.consumptionLogs?.length > 0) && (
                                                <button onClick={() => {
                                                    if (confirm('DANGER: Are you sure you want to completely PURGE all processing history? This will permanently delete the transaction logs. (Cost mapping on animals and inventory deductions will REMAIN INTACT, only the viewable history is deleted).')) {
                                                        onClearFeedLedger();
                                                    }
                                                }} className="bg-red-50 text-red-600 font-bold px-4 py-2 text-xs rounded-xl hover:bg-red-100 transition-colors border border-red-200">
                                                    CLEAR HISTORY
                                                </button>
                                            )}
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm text-gray-600">
                                                <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-6 py-3 font-semibold">Date</th>
                                                        <th className="px-6 py-3 font-semibold">Diet Plan</th>
                                                        <th className="px-6 py-3 font-semibold">Animals Fed</th>
                                                        <th className="px-6 py-3 font-semibold">Consumed Items</th>
                                                        <th className="px-6 py-3 font-semibold">Total Cost (PKR)</th>
                                                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {(() => {
                                                        const ledgers = state.processedFeedLedgers || [];
                                                        const legacyLogs = state.consumptionLogs?.filter(l => !l.processedLedgerId) || [];

                                                        // Group legacy logs by date + dietPlanId
                                                        const legacyGroups = new Map<string, typeof legacyLogs>();
                                                        legacyLogs.forEach(l => {
                                                            const key = `${l.date}_${l.dietPlanId}`;
                                                            if (!legacyGroups.has(key)) legacyGroups.set(key, []);
                                                            legacyGroups.get(key)!.push(l);
                                                        });

                                                        const virtualLedgers: any[] = [];
                                                        for (const [key, group] of legacyGroups.entries()) {
                                                            const [date, planId] = key.split('_');
                                                            const totalCost = group.reduce((sum, g) => sum + g.cost, 0);
                                                            // For legacy logs, we can guess animals fed if animalId exists
                                                            const uniqueAnimals = new Set(group.map(g => g.animalId).filter(Boolean));
                                                            virtualLedgers.push({
                                                                id: `legacy-${key}`,
                                                                date,
                                                                dietPlanId: planId,
                                                                status: 'PROCESSED',
                                                                totalCost,
                                                                totalAnimalsFed: uniqueAnimals.size || 0,
                                                                isLegacy: true,
                                                                _logs: group
                                                            });
                                                        }

                                                        const allLedgers = [...ledgers, ...virtualLedgers].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                                        if (allLedgers.length === 0) {
                                                            return <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No processing history recorded yet.</td></tr>;
                                                        }

                                                        return allLedgers.map(ledger => {
                                                            const plan = state.dietPlans.find(p => p.id === ledger.dietPlanId);
                                                            const logs = ledger.isLegacy ? ledger._logs : (state.consumptionLogs?.filter(l => l.processedLedgerId === ledger.id) || []);
                                                            return (
                                                                <tr key={ledger.id} className={`hover:bg-gray-50 transition-colors ${ledger.status === 'REVERSED' ? 'opacity-50' : ''}`}>
                                                                    <td className="px-6 py-4 whitespace-nowrap">{ledger.date}</td>
                                                                    <td className="px-6 py-4">
                                                                        <div className="font-bold text-gray-800">{plan?.name || 'Unknown Plan'}</div>
                                                                        <div className="text-xs text-gray-500 uppercase">{ledger.id.split('-')[2] || ledger.id}</div>
                                                                    </td>
                                                                    <td className="px-6 py-4">{ledger.totalAnimalsFed} Heads</td>
                                                                    <td className="px-6 py-4 max-w-xs">
                                                                        <div className="flex flex-col gap-1">
                                                                            {logs.map((L, i) => {
                                                                                const fItem = state.feed.find(F => F.id === L.itemId);
                                                                                return (
                                                                                    <span key={i} className="text-[11px] bg-gray-100 px-2 py-0.5 rounded text-gray-600 truncate">
                                                                                        {fItem?.name || L.itemId} ({L.quantityUsed} {L.unit})
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 font-bold text-emerald-600">
                                                                        {ledger.totalCost.toLocaleString()}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        {ledger.status === 'REVERSED' ? (
                                                                            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100">REVERSED</span>
                                                                        ) : ledger.isLegacy ? (
                                                                            <span className="text-[10px] text-gray-400 font-medium">LEGACY NO-REVERSE</span>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => {
                                                                                    if (confirm('Are you absolutely sure you want to REVERSE this transaction? This will instantly place inventory back into your physical stock and lower the accumulated cost mapping on the animals.')) {
                                                                                        onReverseFeedLedger(ledger.id);
                                                                                    }
                                                                                }}
                                                                                className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded transition-colors"
                                                                            >
                                                                                REVERSE
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        });
                                                    })()}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="animate-fade-in max-w-4xl mx-auto">
                                <div className="flex items-center gap-4 mb-6">
                                    <button onClick={() => setViewMode('LIST')} className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                                        <ArrowLeft size={20} />
                                    </button>
                                    <h3 className="text-xl font-bold text-gray-800">{editingDiet ? 'Edit Diet Plan' : 'Create Nutrition Plan'}</h3>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                                    {/* STEP 1: BASIC INFO */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                                            <input type="text" value={dietForm.name} onChange={e => setDietForm({ ...dietForm, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. Winter Milking Ration" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                            <select value={dietForm.status || 'DRAFT'} onChange={e => setDietForm({ ...dietForm, status: e.target.value as any })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none">
                                                <option value="DRAFT">Draft</option>
                                                <option value="ACTIVE">Active (Auto-Deduct)</option>
                                                <option value="ARCHIVED">Archived</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Distribution Mode <span className="text-red-500">*</span></label>
                                            <select value={dietForm.distributionMode || 'PER_ANIMAL'} onChange={e => setDietForm({ ...dietForm, distributionMode: e.target.value as any })} className="w-full border border-emerald-300 bg-emerald-50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none">
                                                <option value="PER_ANIMAL">Per Animal (Qty * Animals)</option>
                                                <option value="TOTAL_DISTRIBUTED">Total Distributed (Qty Split Equal)</option>
                                                <option value="PER_HUNDRED_KG_BW">Per 100kg Body Weight</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                                            <select value={dietForm.targetType || 'CATEGORY'} onChange={e => setDietForm({ ...dietForm, targetType: e.target.value as any, targetId: '', targetIds: [], targetName: '' })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none">
                                                <option value="ALL">All Animals (Farm)</option>
                                                <option value="CATEGORY">Category (e.g. Milking)</option>
                                                <option value="INDIVIDUAL">Individual Animal</option>
                                                <option value="GROUP">Group (Specific Set)</option>
                                            </select>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Target Selection</label>
                                            {dietForm.targetType === 'ALL' ? (
                                                <p className="text-sm text-gray-500 py-2">All active animals on the selected farm will receive this ration when you run Process Today&apos;s Feed.</p>
                                            ) : dietForm.targetType === 'CATEGORY' ? (
                                                <select value={dietForm.targetId || ''} onChange={e => setDietForm({ ...dietForm, targetId: e.target.value, targetName: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none">
                                                    <option value="">Select Category...</option>
                                                    {Array.from(new Set(state.livestock.filter(l => l.status === 'ACTIVE' && (!state.currentFarmId || l.farmId === state.currentFarmId)).map(l => l.category).filter(Boolean))).map((catName) => (
                                                        <option key={catName as string} value={catName as string}>{catName as string}</option>
                                                    ))}
                                                </select>
                                            ) : dietForm.targetType === 'INDIVIDUAL' ? (
                                                <div className="border border-gray-300 rounded-lg max-h-40 overflow-y-auto p-2">
                                                    {(state.livestock.filter(l => l.status === 'ACTIVE' && (!state.currentFarmId || l.farmId === state.currentFarmId))).map(l => (
                                                        <label key={l.id} htmlFor={`diet-target-${l.id}`} className="flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer text-sm">
                                                            <input
                                                                id={`diet-target-${l.id}`}
                                                                type="checkbox"
                                                                checked={(dietForm.targetIds || []).includes(l.id)}
                                                                onChange={e => {
                                                                    setDietForm(prev => {
                                                                        const set = new Set(prev.targetIds || []);
                                                                        if (e.target.checked) set.add(l.id);
                                                                        else set.delete(l.id);
                                                                        return { ...prev, targetIds: Array.from(set) };
                                                                    });
                                                                }}
                                                            />
                                                            {l.tagId} ({l.breed})
                                                        </label>
                                                    ))}
                                                    {(state.livestock.filter(l => l.status === 'ACTIVE' && (!state.currentFarmId || l.farmId === state.currentFarmId))).length === 0 && <span className="text-gray-400 italic text-sm">No active animals. Select a farm from the header to list animals.</span>}
                                                </div>
                                            ) : (
                                                <input type="text" disabled placeholder="Group selection logic here..." className="w-full border border-gray-300 bg-gray-100 rounded-lg px-4 py-2 outline-none" />
                                            )}
                                        </div>
                                    </div>

                                    {/* STEP 2: INGREDIENTS */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-medium text-gray-700">Ration Formulation (Daily per Head)</label>
                                            <button
                                                onClick={() => {
                                                    const newItem = { id: Math.random().toString(36).substr(2, 9), inventoryId: '', inventoryName: '', quantity: 0, unit: 'kg' };
                                                    setDietForm(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
                                                }}
                                                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded font-bold transition-colors"
                                            >
                                                + Add Ingredient
                                            </button>
                                        </div>

                                        <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
                                            {(dietForm.items || []).length === 0 && <p className="text-sm text-gray-400 italic text-center py-2">No ingredients added.</p>}

                                            {dietForm.items?.map((item, index) => (
                                                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                                                    <div className="col-span-5">
                                                        <select
                                                            value={item.inventoryId}
                                                            onChange={e => {
                                                                const inv = state.feed.find(f => f.id === e.target.value);
                                                                const newItems = [...(dietForm.items || [])];
                                                                const isBagOrBundle = ['BAG', 'BUNDLE'].includes((inv?.unit || '').toUpperCase());
                                                                const initialUnit = isBagOrBundle ? 'kg' : (inv?.unit || 'kg');
                                                                newItems[index] = { ...item, inventoryId: e.target.value, inventoryName: inv?.name || '', unit: initialUnit, costPerUnit: inv?.unitCost };
                                                                setDietForm({ ...dietForm, items: newItems });
                                                            }}
                                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                                        >
                                                            <option value="">Select Feed...</option>
                                                            {state.feed.filter(f => (f.category || 'FEED') === 'FEED').map(f => (
                                                                <option key={f.id} value={f.id}>{f.name} (Stock: {f.quantity} {f.unit || 'kg'})</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="col-span-3">
                                                        <div className="flex gap-1 border border-gray-300 rounded overflow-hidden p-0.5">
                                                            <input
                                                                type="number"
                                                                value={item.quantity}
                                                                onChange={e => {
                                                                    const newItems = [...(dietForm.items || [])];
                                                                    newItems[index] = { ...item, quantity: parseFloat(e.target.value) };
                                                                    setDietForm({ ...dietForm, items: newItems });
                                                                }}
                                                                className="w-full px-2 py-1 text-sm outline-none bg-transparent"
                                                                placeholder="0.00"
                                                            />
                                                            <select
                                                                value={item.unit}
                                                                onChange={e => {
                                                                    const newItems = [...(dietForm.items || [])];
                                                                    newItems[index] = { ...item, unit: e.target.value };
                                                                    setDietForm({ ...dietForm, items: newItems });
                                                                }}
                                                                className="bg-gray-100 text-xs px-1 border-l border-gray-200 outline-none"
                                                            >
                                                                <option value={state.feed.find(f => f.id === item.inventoryId)?.unit || 'kg'}>{state.feed.find(f => f.id === item.inventoryId)?.unit || 'kg'}</option>
                                                                {state.feed.find(f => f.id === item.inventoryId)?.unit?.toUpperCase() !== 'KG' && <option value="kg">kg</option>}
                                                                {state.feed.find(f => f.id === item.inventoryId)?.unit?.toUpperCase() !== 'G' && <option value="g">g</option>}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-3 text-right text-xs text-gray-500">
                                                        {(() => {
                                                            let c = 0;
                                                            if (item.costPerUnit) {
                                                                const fInv = state.feed.find(f => f.id === item.inventoryId);
                                                                const uiInv = (fInv?.unit || '').toUpperCase();
                                                                const uiItem = (item.unit || '').toUpperCase();
                                                                const wpu = fInv?.weightPerUnit || 1;
                                                                let nativeQty = item.quantity || 0;

                                                                if (['BAG', 'BUNDLE'].includes(uiInv)) {
                                                                    if (uiItem === 'KG') nativeQty = (item.quantity || 0) / wpu;
                                                                    else if (uiItem === 'G') nativeQty = ((item.quantity || 0) / 1000) / wpu;
                                                                } else if (uiInv === 'TON') {
                                                                    if (uiItem === 'KG') nativeQty = (item.quantity || 0) / 1000;
                                                                    else if (uiItem === 'G') nativeQty = (item.quantity || 0) / 1000000;
                                                                } else if (uiInv === 'KG') {
                                                                    if (uiItem === 'G') nativeQty = (item.quantity || 0) / 1000;
                                                                    else if (uiItem === 'TON') nativeQty = (item.quantity || 0) * 1000;
                                                                } else if (uiInv === 'G') {
                                                                    if (uiItem === 'KG') nativeQty = (item.quantity || 0) * 1000;
                                                                    else if (uiItem === 'TON') nativeQty = (item.quantity || 0) * 1000000;
                                                                }

                                                                c = nativeQty * item.costPerUnit;
                                                            }
                                                            return <>Est. Cost: <span className="font-bold text-emerald-600">{c.toFixed(1)}</span></>;
                                                        })()}
                                                    </div>
                                                    <div className="col-span-1 text-right">
                                                        <button onClick={() => setDietForm(prev => ({ ...prev, items: prev.items?.filter((_, i) => i !== index) }))} className="text-red-400 hover:text-red-600"><X size={16} /></button>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* LIVE CALCULATION PREVIEW */}
                                            {(() => {
                                                let previewAnimals: Livestock[] = [];
                                                if (dietForm.targetType === 'CATEGORY' && dietForm.targetId) {
                                                    previewAnimals = state.livestock.filter(l => l.category === dietForm.targetName && l.farmId === state.currentFarmId && l.status === 'ACTIVE');
                                                } else if (dietForm.targetType === 'INDIVIDUAL' && dietForm.targetIds && dietForm.targetIds.length > 0) {
                                                    previewAnimals = state.livestock.filter(l => dietForm.targetIds!.includes(l.id) && l.status === 'ACTIVE');
                                                } else if (dietForm.targetType === 'ALL') {
                                                    previewAnimals = state.livestock.filter(l => l.farmId === state.currentFarmId && l.status === 'ACTIVE');
                                                }
                                                const aCount = previewAnimals.length;
                                                const mode = dietForm.distributionMode || 'PER_ANIMAL';

                                                let totalDailyPlanCost = 0;

                                                const previewItemsJsx = dietForm.items?.map(it => {
                                                    let deductTotal = 0;
                                                    if (mode === 'TOTAL_DISTRIBUTED') deductTotal = it.quantity;
                                                    else if (mode === 'PER_HUNDRED_KG_BW') deductTotal = it.quantity * (previewAnimals.reduce((s, a) => s + (a.weight || 0), 0) / 100);
                                                    else deductTotal = it.quantity * aCount;

                                                    let totalReq = deductTotal; // requested locally
                                                    let inventoryDeductionCount = deductTotal; // in native units mapped for stock reduction

                                                    const fInv = state.feed.find(f => f.id === it.inventoryId);
                                                    const uiInv = (fInv?.unit || '').toUpperCase();
                                                    const uiItem = (it.unit || '').toUpperCase();
                                                    const isBag = fInv ? ['BAG', 'BUNDLE'].includes(uiInv) : false;
                                                    const wpu = fInv?.weightPerUnit || 1;
                                                    const isMissingWpu = isBag && (!fInv?.weightPerUnit || fInv.weightPerUnit <= 0);

                                                    if (isBag) {
                                                        if (uiItem === 'KG') inventoryDeductionCount = deductTotal / wpu;
                                                        else if (uiItem === 'G') inventoryDeductionCount = (deductTotal / 1000) / wpu;
                                                    } else if (uiInv === 'TON') {
                                                        if (uiItem === 'KG') inventoryDeductionCount = deductTotal / 1000;
                                                        else if (uiItem === 'G') inventoryDeductionCount = deductTotal / 1000000;
                                                    } else if (uiInv === 'KG') {
                                                        if (uiItem === 'G') inventoryDeductionCount = deductTotal / 1000;
                                                        else if (uiItem === 'TON') inventoryDeductionCount = deductTotal * 1000;
                                                    } else if (uiInv === 'G') {
                                                        if (uiItem === 'KG') inventoryDeductionCount = deductTotal * 1000;
                                                        else if (uiItem === 'TON') inventoryDeductionCount = deductTotal * 1000000;
                                                    }

                                                    const warn = inventoryDeductionCount > (fInv?.quantity || 0);

                                                    totalDailyPlanCost += inventoryDeductionCount * (fInv?.unitCost || 0);

                                                    return (
                                                        <div key={it.id} className="flex flex-col text-xs text-emerald-900 border-b border-emerald-50/50 pb-1.5 mb-1.5 last:mb-0 last:pb-0 last:border-0">
                                                            <div className="flex justify-between items-center">
                                                                <span>{it.inventoryName || 'Unknown'} (In Stock: {fInv?.quantity?.toFixed(2)}{fInv?.unit}{wpu > 1 ? ` - ${(wpu) * (fInv?.quantity || 0)}kg` : ''}):</span>
                                                                <span className={warn ? "text-red-500 font-bold" : "font-medium"}>Require {deductTotal.toFixed(2)} {it.unit}  =  (-{inventoryDeductionCount.toFixed(2)} {fInv?.unit || 'units'})</span>
                                                            </div>
                                                            {isMissingWpu && (it.unit === 'kg' || it.unit === 'g') && (
                                                                <span className="text-red-500 block text-[10px] mt-1 font-bold italic bg-red-50 px-2 py-1 rounded inline-flex w-fit">*Warning: "Weight Per Unit" missing for {fInv?.name}. System assuming 1 {fInv?.unit} = 1 kg. Please configure in inventory to accurately convert fractions.*</span>
                                                            )}
                                                        </div>
                                                    );
                                                });

                                                return (
                                                    <>
                                                        <div className="border-t border-gray-200 mt-2 pt-2 bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                                                            <div className="flex justify-between items-center mb-2 border-b border-emerald-200 pb-2">
                                                                <span className="text-sm font-bold text-emerald-800">Processing Preview (Targeting {aCount} Animals)</span>
                                                                <span className="text-xs font-bold px-2 py-1 rounded bg-white text-emerald-700 border border-emerald-200">{mode.replace(/_/g, ' ')}</span>
                                                            </div>
                                                            <div className="space-y-1">
                                                                {previewItemsJsx}
                                                            </div>
                                                        </div>

                                                        {/* TOTALS */}
                                                        <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between items-center bg-white p-2 rounded border-emerald-100">
                                                            <span className="text-sm font-bold text-gray-700">Total Est. Daily Cost (for {aCount} head):</span>
                                                            <span className="text-lg font-black text-emerald-600">
                                                                PKR {totalDailyPlanCost.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs text-gray-400 font-medium">total plan / day</span>
                                                            </span>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    <div className="pt-4 flex justify-end gap-3">
                                        <button onClick={() => setViewMode('LIST')} className="px-6 py-2 text-gray-500 hover:text-gray-700 font-medium">Cancel</button>
                                        <button onClick={handleDietSubmit} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm">Save Plan</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>

                )
            }
        </div >
    );
};
