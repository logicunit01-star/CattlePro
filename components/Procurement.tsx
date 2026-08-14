import React, { useState, useMemo, useEffect } from 'react';
import { backendService } from '../services/backendService';
import { AppState, Expense, FeedInventory } from '../types';
import { Truck, ShoppingCart, User, AlertTriangle, CheckCircle, Clock, Search, Layers, Archive, Activity, RefreshCw, MinusCircle, Edit2, X, Save, Plus, Package, TrendingUp, BarChart, DollarSign, ArrowRight, Filter, Download, RotateCcw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart as RechartsBarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';

interface Props {
    state: AppState;
    onAddExpense: (e: Expense) => void | Promise<void>;
    onUpdateExpense: (e: Expense) => void | Promise<void>;
    onAddFeed: (f: FeedInventory) => void | Promise<void>;
    onUpdateInventory: (item: FeedInventory) => void | Promise<void>;
    onDeleteFeed: (id: string) => void;
    onRefreshProcurement?: () => void | Promise<void>;
}

const FEED_TYPES = ['GRASS', 'TMR', 'WANDA', 'OTHER'];
const UNIT_OPTIONS = ['KG', 'TON', 'BUNDLE', 'BAG'];

const normalizeText = (value: unknown) => String(value ?? '').trim().toLowerCase();

const isSystemFeedUsage = (expense: Expense) => {
    const description = normalizeText(expense.description);
    const supplier = normalizeText(expense.supplier);
    const referenceType = normalizeText((expense as any).referenceType);
    return supplier === 'internal inventory'
        || referenceType.includes('diet')
        || referenceType.includes('consumption')
        || description.includes('daily feed allocation')
        || description.includes('diet consumption')
        || description.includes('feed consumption');
};

const isFeedPurchase = (expense: Expense) => expense.category === 'FEED'
    && !isSystemFeedUsage(expense)
    && Boolean(
        expense.feedItemId
        || normalizeText((expense as any).referenceType).includes('purchase')
        || normalizeText(expense.description).startsWith('purchase:')
    );

const purchaseWeightKg = (expense: Expense, item?: FeedInventory) => {
    if (Number(expense.weight) > 0) return Number(expense.weight);
    const quantity = Number(expense.quantity);
    if (!(quantity > 0)) return 0;
    if (Number(item?.weightPerUnit) > 0) return quantity * Number(item?.weightPerUnit);
    return normalizeText(item?.unit) === 'kg' ? quantity : 0;
};

const createMutationId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `feed-purchase-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const Procurement: React.FC<Props> = ({ state, onAddFeed, onUpdateInventory, onDeleteFeed, onRefreshProcurement }) => {
    const toast = useToast();
    const { confirm: confirmDialog, prompt: promptDialog } = useConfirm();
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PROCUREMENT' | 'INVENTORY' | 'SUPPLIERS' | 'ANALYTICS'>('DASHBOARD');

    // VENDOR ENTITIES LOGIC - STRICT INTEGRATION
    const vendorEntities = useMemo(() => state.entities.filter(ent => ent.type === 'VENDOR'), [state.entities]);
    const CASH_LABEL = 'CASH'; // Hardcoded ID for walk-in

    const vendorOptionsList = [
        { value: CASH_LABEL, label: 'Cash / Walk-in' },
        ...vendorEntities.map(v => ({ value: v.id, label: v.name }))
    ];

    // PROCUREMENT STATE
    const [procurementForm, setProcurementForm] = useState({
        date: new Date().toISOString().split('T')[0],
        vendorId: '', // Strict Link
        feedTypeId: '', // FeedInventory Master Item ID
        feedCategory: 'GRASS' as 'GRASS' | 'TMR' | 'WANDA',
        weight: 0,
        quantity: 0,
        rate: 0,
        location: 'Feed Store',
        paymentStatus: 'PENDING'
    });

    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    // INVENTORY MASTER FORM
    const [newItemForm, setNewItemForm] = useState<Partial<FeedInventory>>({
        name: '', category: 'FEED', feedType: 'TMR', quantity: 0, unit: 'KG', weightPerUnit: 0, unitCost: 0, reorderLevel: 100, location: 'Feed Store', defaultSupplier: ''
    });
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [editingItem, setEditingItem] = useState<FeedInventory | null>(null);
    /** In-flight guards only — same labels/buttons; prevents duplicate API posts. */
    const [deployingMaterial, setDeployingMaterial] = useState(false);
    const [recordingPurchase, setRecordingPurchase] = useState(false);
    const [purchaseMutationId, setPurchaseMutationId] = useState(createMutationId);
    const [repairingData, setRepairingData] = useState(false);
    const [movementItem, setMovementItem] = useState<FeedInventory | null>(null);
    const [inventoryMovements, setInventoryMovements] = useState<any[]>([]);
    const [movementsLoading, setMovementsLoading] = useState(false);
    const [movementsError, setMovementsError] = useState<string | null>(null);
    const [selectedMovement, setSelectedMovement] = useState<any | null>(null);
    const [movementAuditRows, setMovementAuditRows] = useState<any[]>([]);
    const [movementAuditLoading, setMovementAuditLoading] = useState(false);
    const [movementAuditError, setMovementAuditError] = useState<string | null>(null);

    // Filtered Feed items
    const feedItems = useMemo(() => state.feed.filter(f => f.category === 'FEED'), [state.feed]);

    // Derived dashboard data
    const totalStockValue = feedItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    const lowStockCount = feedItems.filter(i => i.quantity <= i.reorderLevel).length;
    const [lowStockItems, setLowStockItems] = useState<FeedInventory[] | undefined>(undefined);
    const [inventoryValuation, setInventoryValuation] = useState<any[] | undefined>(undefined);
    const [procurementRefreshKey, setProcurementRefreshKey] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [purchaseReportPeriod, setPurchaseReportPeriod] = useState<'MONTH' | 'QUARTER' | 'YEAR' | 'ALL'>('MONTH');
    const [purchaseReportMonth, setPurchaseReportMonth] = useState(new Date().toISOString().slice(0, 7));
    const apiLowStockCount = lowStockItems?.length ?? lowStockCount;
    const feedNames = useMemo(() => new Set(feedItems.map(item => normalizeText(item.name))), [feedItems]);
    const feedValuationRows = inventoryValuation?.filter(row => feedNames.has(normalizeText(row.itemName ?? row.name ?? row.feedItemName))) ?? [];
    const apiStockValue = inventoryValuation ? feedValuationRows.reduce((sum, row) => {
        const value = row.stockValue ?? row.totalValue ?? row.value ?? row.quantity * row.unitCost ?? 0;
        return sum + (Number.isFinite(Number(value)) ? Number(value) : 0);
    }, 0) : totalStockValue;

    useEffect(() => {
        if (!state.currentFarmId) {
            setLowStockItems(undefined);
            setInventoryValuation(undefined);
            return;
        }
        let cancelled = false;
        Promise.all([
            backendService.getLowStockFeed(state.currentFarmId),
            backendService.getInventoryValuation(state.currentFarmId)
        ])
            .then(([lowStock, valuation]) => {
                if (cancelled) return;
                setLowStockItems(Array.isArray(lowStock) ? lowStock : undefined);
                setInventoryValuation(Array.isArray(valuation) ? valuation : undefined);
            })
            .catch(() => {
                if (!cancelled) {
                    setLowStockItems(undefined);
                    setInventoryValuation(undefined);
                }
            });
        return () => { cancelled = true; };
    }, [state.currentFarmId, state.expenses.length, state.feed.length, procurementRefreshKey]);

    const vendorExpenses = useMemo(() => {
        let expenses = state.expenses.filter(isFeedPurchase);
        if (searchTerm) {
            expenses = expenses.filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [state.expenses, searchTerm]);
    const purchaseIdForExpense = (expense: Expense) => String((expense as any).feedPurchaseId ?? (expense as any).purchaseId ?? (expense as any).procurementId ?? expense.id);

    const dashboardVendorExpenses = state.expenses.filter(isFeedPurchase);
    const pendingBills = dashboardVendorExpenses
        .filter(e => e.paymentStatus === 'PENDING' || e.paymentStatus === 'PARTIAL')
        .reduce((sum, e) => sum + Math.max(0, e.amount - (e.amountPaid || 0)), 0);
    const monthlySpend = dashboardVendorExpenses.filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7))).reduce((sum, e) => sum + e.amount, 0);

    const priceTrendData = useMemo(() => {
        const grouped: Record<string, any> = {};
        vendorExpenses.forEach(e => {
            const item = state.feed.find(f => f.id === e.feedItemId);
            if (!item) return;
            const weightKg = purchaseWeightKg(e, item);
            if (!(weightKg > 0)) return;
            const month = e.date.substring(0, 7);
            if (!grouped[month]) grouped[month] = { month };
            if (!grouped[month][item.name]) grouped[month][item.name] = { cost: 0, kg: 0 };
            grouped[month][item.name].cost += Number(e.amount) || 0;
            grouped[month][item.name].kg += weightKg;
        });
        return Object.values(grouped).sort((a: any, b: any) => a.month.localeCompare(b.month)).map((g: any) => {
            const finalObj: any = {
                month: g.month,
                name: new Date(`${g.month}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
            };
            Object.keys(g).forEach(k => {
                if (k !== 'month' && g[k].kg > 0) finalObj[k] = Number((g[k].cost / g[k].kg).toFixed(2));
            });
            return finalObj;
        });
    }, [vendorExpenses, state.feed]);

    const itemVendorComparisonData = useMemo(() => {
        const itemVendors: Record<string, any> = {};
        const vendorsSet = new Set<string>();

        vendorExpenses.forEach(e => {
            const item = state.feed.find(f => f.id === e.feedItemId);
            if (!item) return;
            const vendorObj = vendorEntities.find(v => v.id === e.supplier);
            const vendorName = vendorObj ? vendorObj.name : (e.supplier === 'CASH' ? 'Cash' : 'Unknown');
            vendorsSet.add(vendorName);
            const weightKg = purchaseWeightKg(e, item);
            if (!(weightKg > 0)) return;

            if (!itemVendors[item.name]) itemVendors[item.name] = { name: item.name };
            if (!itemVendors[item.name][`${vendorName}_cost`]) {
                itemVendors[item.name][`${vendorName}_cost`] = 0;
                itemVendors[item.name][`${vendorName}_kg`] = 0;
            }
            itemVendors[item.name][`${vendorName}_cost`] += Number(e.amount) || 0;
            itemVendors[item.name][`${vendorName}_kg`] += weightKg;
        });

        const chartData = Object.values(itemVendors).map((iv: any) => {
            const finalObj: any = { name: iv.name };
            vendorsSet.forEach((v: string) => {
                if (iv[`${v}_kg`]) {
                    finalObj[v] = Number((iv[`${v}_cost`] / iv[`${v}_kg`]).toFixed(2));
                }
            });
            return finalObj;
        });

        return { data: chartData, vendors: Array.from(vendorsSet) };
    }, [vendorExpenses, state.feed, vendorEntities]);

    // NEW EXOTIC procurement data stats
    const monthlySpendTrend = useMemo(() => {
        const m = new Map<string, number>();
        vendorExpenses.forEach(e => {
            const month = e.date.substring(0, 7);
            m.set(month, (m.get(month) || 0) + e.amount);
        });
        return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([month, Total]) => ({ name: month, Total })).slice(-12);
    }, [vendorExpenses]);

    const topPurchasedItems = useMemo(() => {
        const m = new Map<string, { qty: number, cost: number, bg: string }>();
        vendorExpenses.forEach(e => {
            const item = state.feed.find(f => f.id === e.feedItemId);
            if (!item) return;
            const ex = m.get(item.name) || { qty: 0, cost: 0, bg: item.feedType === 'GRASS' ? 'bg-emerald-500' : item.feedType === 'TMR' ? 'bg-blue-500' : 'bg-amber-500' };
            m.set(item.name, { ...ex, qty: ex.qty + purchaseWeightKg(e, item), cost: ex.cost + e.amount });
        });
        return Array.from(m.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.cost - a.cost).slice(0, 5);
    }, [vendorExpenses, state.feed]);

    const purchaseReport = useMemo(() => {
        const safeReferenceMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(purchaseReportMonth) ? purchaseReportMonth : new Date().toISOString().slice(0, 7);
        const [referenceYear, referenceMonth] = safeReferenceMonth.split('-').map(Number);
        const quarterStartMonth = Math.floor((referenceMonth - 1) / 3) * 3;
        const toDateKey = (year: number, zeroBasedMonth: number) => `${year + Math.floor(zeroBasedMonth / 12)}-${String(((zeroBasedMonth % 12) + 12) % 12 + 1).padStart(2, '0')}-01`;

        let start = '';
        let end = '9999-12-31';
        let previousStart = '';
        let previousEnd = '';
        let label = 'All recorded history';

        if (purchaseReportPeriod === 'MONTH') {
            start = toDateKey(referenceYear, referenceMonth - 1);
            end = toDateKey(referenceYear, referenceMonth);
            previousStart = toDateKey(referenceYear, referenceMonth - 2);
            previousEnd = start;
            label = new Date(`${safeReferenceMonth}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        } else if (purchaseReportPeriod === 'QUARTER') {
            start = toDateKey(referenceYear, quarterStartMonth);
            end = toDateKey(referenceYear, quarterStartMonth + 3);
            previousStart = toDateKey(referenceYear, quarterStartMonth - 3);
            previousEnd = start;
            label = `Q${Math.floor(quarterStartMonth / 3) + 1} ${referenceYear}`;
        } else if (purchaseReportPeriod === 'YEAR') {
            start = `${referenceYear}-01-01`;
            end = `${referenceYear + 1}-01-01`;
            previousStart = `${referenceYear - 1}-01-01`;
            previousEnd = start;
            label = String(referenceYear);
        }

        const inRange = (expense: Expense, rangeStart: string, rangeEnd: string) => expense.date >= rangeStart && expense.date < rangeEnd;
        const currentExpenses = purchaseReportPeriod === 'ALL' ? vendorExpenses : vendorExpenses.filter(expense => inRange(expense, start, end));
        const previousExpenses = previousStart ? vendorExpenses.filter(expense => inRange(expense, previousStart, previousEnd)) : [];
        const previousCostByItem = new Map<string, number>();
        previousExpenses.forEach(expense => previousCostByItem.set(expense.feedItemId || '', (previousCostByItem.get(expense.feedItemId || '') || 0) + Number(expense.amount || 0)));

        const grouped = new Map<string, { itemId: string; name: string; quantityKg: number; cost: number; purchases: number }>();
        currentExpenses.forEach(expense => {
            const item = state.feed.find(feed => feed.id === expense.feedItemId);
            if (!item) return;
            const existing = grouped.get(item.id) || { itemId: item.id, name: item.name, quantityKg: 0, cost: 0, purchases: 0 };
            existing.quantityKg += purchaseWeightKg(expense, item);
            existing.cost += Number(expense.amount || 0);
            existing.purchases += 1;
            grouped.set(item.id, existing);
        });

        const rows = Array.from(grouped.values()).map(row => {
            const previousCost = previousCostByItem.get(row.itemId) || 0;
            return {
                ...row,
                averageRate: row.quantityKg > 0 ? row.cost / row.quantityKg : null,
                changePct: purchaseReportPeriod !== 'ALL' && previousCost > 0 ? ((row.cost - previousCost) / previousCost) * 100 : null
            };
        }).sort((a, b) => b.cost - a.cost);

        return {
            label,
            rows,
            totalCost: rows.reduce((sum, row) => sum + row.cost, 0),
            totalKg: rows.reduce((sum, row) => sum + row.quantityKg, 0),
            transactionCount: currentExpenses.length
        };
    }, [purchaseReportMonth, purchaseReportPeriod, vendorExpenses, state.feed]);

    const vendorSpendDist = useMemo(() => {
        const m = new Map<string, number>();
        vendorExpenses.forEach(e => {
            const vendorName = e.supplier === CASH_LABEL ? 'Cash' : (vendorEntities.find(v => v.id === e.supplier)?.name || 'Unknown');
            m.set(vendorName, (m.get(vendorName) || 0) + e.amount);
        });
        return Array.from(m.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [vendorExpenses, vendorEntities]);

    const payablesAging = useMemo(() => {
        const pending = vendorExpenses.filter(e => e.paymentStatus !== 'PAID');
        const now = new Date().getTime();
        let current = 0, days30 = 0, days60 = 0, days90 = 0;
        pending.forEach(e => {
            const diff = (now - new Date(e.date).getTime()) / (1000 * 3600 * 24);
            const outstanding = Math.max(0, Number(e.amount) - Number(e.amountPaid || 0));
            if (diff <= 30) current += outstanding;
            else if (diff <= 60) days30 += outstanding;
            else if (diff <= 90) days60 += outstanding;
            else days90 += outstanding;
        });
        return [
            { name: '0-30 Days', amount: current, fill: '#10b981' },
            { name: '31-60 Days', amount: days30, fill: '#f59e0b' },
            { name: '61-90 Days', amount: days60, fill: '#f97316' },
            { name: '> 90 Days', amount: days90, fill: '#ef4444' }
        ].filter(x => x.amount > 0);
    }, [vendorExpenses]);

    const feedVendorPayables = useMemo(() => {
        const grouped = new Map<string, { vendorId: string; vendorName: string; totalBilled: number; totalPaid: number; outstanding: number }>();
        dashboardVendorExpenses.forEach(expense => {
            const vendorId = expense.supplier || CASH_LABEL;
            const vendorName = vendorId === CASH_LABEL
                ? 'Cash / Walk-in'
                : (vendorEntities.find(v => v.id === vendorId)?.name || 'Unknown vendor');
            const row = grouped.get(vendorId) || { vendorId, vendorName, totalBilled: 0, totalPaid: 0, outstanding: 0 };
            row.totalBilled += Number(expense.amount) || 0;
            row.totalPaid += Math.min(Number(expense.amount) || 0, Number(expense.amountPaid || (expense.paymentStatus === 'PAID' ? expense.amount : 0)));
            row.outstanding = Math.max(0, row.totalBilled - row.totalPaid);
            grouped.set(vendorId, row);
        });
        return Array.from(grouped.values()).filter(row => row.outstanding > 0.005).sort((a, b) => b.outstanding - a.outstanding);
    }, [dashboardVendorExpenses, vendorEntities]);

    // Available items for procurement depending on category
    const availableProcurementItems = feedItems.filter(f => f.feedType === procurementForm.feedCategory || (!f.feedType && procurementForm.feedCategory === 'OTHER'));

    // --- ACTIONS ---

    const handleProcurementSubmit = async () => {
        if (recordingPurchase) return;
        if (!state.currentFarmId) { toast.warning('Select a farm context first.'); return; }
        if (!procurementForm.vendorId || !procurementForm.rate || !procurementForm.feedTypeId) { toast.warning('Please fill all required highlighted fields.'); return; }

        const selectedItem = state.feed.find(f => f.id === procurementForm.feedTypeId);
        if (!selectedItem) { toast.error('Invalid feed item selected.'); return; }

        // Unit behavior follows the inventory master's native unit, never a feed-type assumption.
        const isQtyBased = ['BAG', 'BUNDLE'].includes((selectedItem.unit || '').toUpperCase());
        const addedValue = isQtyBased ? procurementForm.quantity : procurementForm.weight;
        const totalWeight = Number(procurementForm.weight) > 0
            ? Number(procurementForm.weight)
            : (isQtyBased && Number(selectedItem.weightPerUnit) > 0 ? Number(procurementForm.quantity) * Number(selectedItem.weightPerUnit) : 0);

        if (isQtyBased && !procurementForm.quantity) { toast.warning('Quantity (bags/bundles) is required.'); return; }
        if (isQtyBased && !totalWeight) { toast.warning('Enter total weight or configure weight per unit for this item.'); return; }
        if (!isQtyBased && !procurementForm.weight) { toast.warning('Total Weight is required.'); return; }

        // CORRECTED COST FORMULA:
        // If it's bag-based, the user enters Rate per Bag. If KG-based, Rate per KG.
        const totalCost = isQtyBased && procurementForm.quantity > 0
            ? procurementForm.quantity * procurementForm.rate
            : procurementForm.weight * procurementForm.rate;

        const desc = isQtyBased ? `Purchase: ${selectedItem.name} (Qty: ${procurementForm.quantity} ${selectedItem.unit}s, Wt: ${totalWeight} kg)` : `Purchase: ${selectedItem.name} (${totalWeight} kg)`;

        setRecordingPurchase(true);
        try {
            await backendService.feedPurchase({
                farmId: state.currentFarmId,
                feedItemId: selectedItem.id,
                vendorId: procurementForm.vendorId,
                quantity: addedValue,
                unitCost: procurementForm.rate,
                amount: totalCost,
                amountPaid: procurementForm.paymentStatus === 'PAID' ? totalCost : 0,
                date: procurementForm.date,
                description: desc,
                clientMutationId: purchaseMutationId
            });
            await onRefreshProcurement?.();
            setProcurementRefreshKey(key => key + 1);
            setPurchaseMutationId(createMutationId());

            const vName = procurementForm.vendorId === CASH_LABEL ? 'Cash' : vendorEntities.find(v => v.id === procurementForm.vendorId)?.name;
            toast.success(`Procurement recorded from ${vName}.`);
            setProcurementForm({ ...procurementForm, weight: 0, quantity: 0 });
        } catch (e: any) {
            toast.error(e?.message || 'Failed to record the feed purchase. You can retry safely.');
        } finally {
            setRecordingPurchase(false);
        }
    };

    const handleUpdateExpenseSubmit = async () => {
        if (recordingPurchase) return;
        if (!editingExpense || !state.currentFarmId) return;

        if (!procurementForm.vendorId || !procurementForm.rate || !procurementForm.feedTypeId) { toast.warning('Missing required fields.'); return; }

        const selectedItem = state.feed.find(f => f.id === procurementForm.feedTypeId);
        if (!selectedItem) return;

        const isQtyBased = ['BAG', 'BUNDLE'].includes((selectedItem.unit || '').toUpperCase());
        const totalWeight = Number(procurementForm.weight) > 0
            ? Number(procurementForm.weight)
            : (isQtyBased && Number(selectedItem.weightPerUnit) > 0 ? Number(procurementForm.quantity) * Number(selectedItem.weightPerUnit) : 0);

        if (isQtyBased && (!procurementForm.quantity || !totalWeight)) { toast.warning('Quantity and total weight are required.'); return; }
        if (!isQtyBased && !procurementForm.weight) { toast.warning('Weight is required.'); return; }

        // CORRECTED COST FORMULA:
        const totalCost = isQtyBased && procurementForm.quantity > 0
            ? procurementForm.quantity * procurementForm.rate
            : procurementForm.weight * procurementForm.rate;

        const desc = isQtyBased ? `Purchase: ${selectedItem.name} (Qty: ${procurementForm.quantity} ${selectedItem.unit}s, Wt: ${totalWeight} kg)` : `Purchase: ${selectedItem.name} (${totalWeight} kg)`;

        const updated: Expense = {
            ...editingExpense,
            date: procurementForm.date,
            description: desc,
            supplier: procurementForm.vendorId,
            amount: totalCost,
            paymentStatus: procurementForm.paymentStatus as 'PAID' | 'PENDING' | 'PARTIAL',
            feedCategory: procurementForm.feedCategory,
            feedItemId: selectedItem.id,
            weight: totalWeight,
            quantity: isQtyBased ? procurementForm.quantity : undefined,
            rate: procurementForm.rate
        };

        setRecordingPurchase(true);
        try {
            await backendService.updateFeedPurchase(purchaseIdForExpense(editingExpense), {
                ...updated,
                vendorId: procurementForm.vendorId,
                feedItemId: selectedItem.id,
                quantity: isQtyBased ? procurementForm.quantity : procurementForm.weight,
                weight: totalWeight,
                rate: procurementForm.rate,
                unitCost: procurementForm.rate,
                amount: totalCost,
                amountPaid: procurementForm.paymentStatus === 'PAID' ? totalCost : Number(editingExpense.amountPaid || 0),
                date: procurementForm.date,
                description: desc,
                paymentStatus: procurementForm.paymentStatus,
            });
            await onRefreshProcurement?.();
            setEditingExpense(null);
            setProcurementForm({ ...procurementForm, weight: 0, quantity: 0 });
            toast.success('Record updated successfully.');
        } catch (e) {
            console.error(e);
        } finally {
            setRecordingPurchase(false);
        }
    };

    const reversePurchase = async (expense: Expense) => {
        const ok = await confirmDialog({
            title: 'Reverse feed purchase',
            message: 'Reverse this purchase? Backend will adjust inventory, payable balance, ledger, and movement history.',
            confirmLabel: 'Reverse',
            danger: true,
        });
        if (!ok) return;
        try {
            await backendService.reverseFeedPurchase(purchaseIdForExpense(expense));
            await onRefreshProcurement?.();
            setProcurementRefreshKey(key => key + 1);
            toast.success('Feed purchase reversed.');
        } catch (e: any) {
            toast.error(e?.message || 'Failed to reverse feed purchase.');
        }
    };

    const openInventoryMovements = async (item: FeedInventory) => {
        setMovementItem(item);
        setMovementsLoading(true);
        setMovementsError(null);
        try {
            const rows = await backendService.getInventoryMovementsByItem(item.id);
            const sortedRows = Array.isArray(rows) ? [...rows].sort((a, b) => {
                const aTime = new Date(a.movementDate ?? a.date ?? a.createdAt ?? 0).getTime();
                const bTime = new Date(b.movementDate ?? b.date ?? b.createdAt ?? 0).getTime();
                return bTime - aTime || String(b.id ?? '').localeCompare(String(a.id ?? ''));
            }) : [];
            setInventoryMovements(sortedRows);
        } catch (e: any) {
            setInventoryMovements([]);
            setMovementsError(e?.message || 'Unable to load inventory movement history.');
        } finally {
            setMovementsLoading(false);
        }
    };

    const openMovementAudit = async (movement: any) => {
        setSelectedMovement(movement);
        setMovementAuditRows([]);
        setMovementAuditError(null);
        setMovementAuditLoading(true);
        try {
            const movementId = String(movement.id ?? movement.movementId);
            const rows = await backendService.getInventoryMovementAudit(movementId);
            setMovementAuditRows(Array.isArray(rows) ? rows : []);
        } catch (e: any) {
            setMovementAuditError(e?.message || 'Unable to load movement audit trail.');
        } finally {
            setMovementAuditLoading(false);
        }
    };

    const startEditExpense = (e: Expense) => {
        setEditingExpense(e);
        let actualFeedCategory = (e.feedCategory || 'GRASS').toUpperCase();
        if (e.feedItemId) {
            const fd = state.feed.find(f => f.id === e.feedItemId);
            if (fd && fd.feedType) actualFeedCategory = fd.feedType.toUpperCase();
        }

        setProcurementForm(prev => ({
            ...prev,
            date: e.date || new Date().toISOString().split('T')[0],
            vendorId: e.supplier || '',
            feedCategory: actualFeedCategory as any,
            feedTypeId: e.feedItemId || '',
            weight: e.weight || 0,
            quantity: e.quantity || 0,
            rate: e.rate || 0,
            paymentStatus: e.paymentStatus || 'PENDING'
        }));
    };

    const handleRepairMissedData = async () => {
        if (!state.currentFarmId) {
            toast.warning('Select a farm first.');
            return;
        }
        setRepairingData(true);
        try {
            const preview = await backendService.repairProcurement(state.currentFarmId, true);
            if ((preview.stockRowsFixed || 0) === 0 && (preview.ledgerRowsFixed || 0) === 0) {
                toast.success('No missed procurement rows found for this farm.');
                return;
            }
            const detail = (preview.items || [])
                .slice(0, 5)
                .map((item) => `• ${item.feedName || item.feedItemId || item.expenseId}: ${item.message}`)
                .join('\n');
            const ok = await confirmDialog({
                title: 'Repair missed procurement data',
                message: `${preview.summary}\n\n${detail}${(preview.items?.length || 0) > 5 ? '\n• …' : ''}\n\nApply these fixes? Expenses are not deleted or duplicated.`,
                confirmLabel: 'Apply repairs',
            });
            if (!ok) return;
            const applied = await backendService.repairProcurement(state.currentFarmId, false);
            toast.success(applied.summary || 'Repairs applied.');
            await onRefreshProcurement?.();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Repair failed.');
        } finally {
            setRepairingData(false);
        }
    };

    const handleSaveInventoryItem = async () => {
        if (deployingMaterial) return;
        if (!newItemForm.name) { toast.warning('Item name is required.'); return; }
        setDeployingMaterial(true);
        try {
            if (editingItem) {
                await onUpdateInventory({ ...editingItem, ...newItemForm } as FeedInventory);
                setEditingItem(null);
            } else {
                await onAddFeed({ ...newItemForm, id: Math.random().toString(36).substr(2, 9), farmId: state.currentFarmId! } as FeedInventory);
            }
            setIsAddingItem(false);
            setNewItemForm({ name: '', category: 'FEED', feedType: 'TMR', quantity: 0, unit: 'KG', weightPerUnit: 0, unitCost: 0, reorderLevel: 100, location: 'Feed Store', defaultSupplier: '' });
        } catch (e) {
            console.error(e);
        } finally {
            setDeployingMaterial(false);
        }
    };

    const startEditItem = (item: FeedInventory) => {
        setEditingItem(item);
        setNewItemForm(item);
        setIsAddingItem(true);
    };

    const handleFeedItemSelection = (id: string) => {
        const item = state.feed.find(f => f.id === id);
        if (!item) return;
        setProcurementForm(prev => {
            const isQtyBased = ['BAG', 'BUNDLE'].includes((item.unit || '').toUpperCase());
            return {
                ...prev,
                feedTypeId: id,
                rate: item.unitCost || 0,
                vendorId: item.defaultSupplier && item.defaultSupplier !== 'N/A' ? item.defaultSupplier : prev.vendorId,
                weight: (isQtyBased && item.weightPerUnit && prev.quantity > 0) ? (prev.quantity * item.weightPerUnit) : prev.weight
            };
        });
    };

    const handleRecordUsage = async (item: FeedInventory) => {
        const isQtyBased = ['BAG', 'BUNDLE'].includes((item.unit || '').toUpperCase());
        const wpu = Number(item.weightPerUnit) || 0;
        if (isQtyBased && wpu <= 0) {
            toast.warning('Configure an exact weight per bag/bundle before recording consumption in kilograms.');
            return;
        }
        const stockDisplay = isQtyBased
            ? `${item.quantity.toLocaleString()} ${item.unit}s (≈ ${(item.quantity * wpu).toLocaleString()} KG total)`
            : `${item.quantity.toLocaleString()} KG`;
        const qtyStr = await promptDialog({
            title: `Record usage – ${item.name}`,
            message: `Current stock: ${stockDisplay}`,
            label: 'Amount consumed (KG)',
            inputType: 'number',
            placeholder: '0',
            confirmLabel: 'Deduct',
            validate: v => {
                const n = parseFloat(v);
                if (!Number.isFinite(n) || n <= 0) return 'Enter a positive amount.';
                const deduct = isQtyBased ? n / wpu : n;
                if (deduct > (item.quantity ?? 0)) return 'Cannot consume more than available stock.';
                return null;
            },
        });
        if (!qtyStr) return;
        const consumedKg = parseFloat(qtyStr);
        const toDeduct = isQtyBased ? consumedKg / wpu : consumedKg;
        if (toDeduct > (item.quantity ?? 0)) { toast.warning('Cannot consume more than available stock.'); return; }
        try {
            const updated = await backendService.adjustFeed({
                feedItemId: item.id,
                direction: 'DECREASE',
                quantity: toDeduct,
                reason: `Manual outgoing recorded from Procurement (${consumedKg} KG)`
            });
            onUpdateInventory(updated?.id ? updated : { ...item, quantity: (item.quantity ?? 0) - toDeduct });
            await onRefreshProcurement?.();
            setProcurementRefreshKey(key => key + 1);
            toast.success(`Deducted ${consumedKg} KG${isQtyBased ? ` (${toDeduct.toFixed(3)} ${item.unit}s)` : ''} of ${item.name}.`);
        } catch (e) {
            console.error(e);
            toast.error('Failed to record outgoing stock.');
        }
    };

    // Helper: Map Vendor ID to display Name
    const getVendorName = (id?: string) => {
        if (id === CASH_LABEL) return 'Cash / Walk-in';
        const v = vendorEntities.find(ent => ent.id === id);
        return v ? v.name : (id || 'Unknown');
    };

    return (
        <div className="space-y-5 animate-fade-in">
            {!state.currentFarmId && !state.currentLocationId && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-2">
                    <AlertTriangle size={20} />
                    <span className="text-sm font-medium">Select a farm or city context from the header to view and manage procurement.</span>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <ShoppingCart className="text-emerald-500" size={28} /> Procurement & Store
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Logistics, Raw Materials, Inventory Rations, and Supplier Management</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 shadow-md flex items-center gap-2">
                        <Activity size={16} className="text-emerald-400" />
                        TOTAL FEED STOCK VALUE: <span className="text-emerald-400 text-sm">PKR {apiStockValue.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Premium Navigation Tabs */}
            <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
                {[
                    { id: 'DASHBOARD', label: 'Overview', icon: BarChart },
                    { id: 'ANALYTICS', label: 'Analytics', icon: Activity },
                    { id: 'PROCUREMENT', label: 'Procure', icon: Truck },
                    { id: 'INVENTORY', label: 'Inventory', icon: Package },
                    { id: 'SUPPLIERS', label: 'Vendors', icon: User }
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${isActive ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                            <Icon size={16} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'DASHBOARD' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-wrap">
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-3xl border border-emerald-400 shadow-lg text-white relative overflow-hidden group">
                            <DollarSign className="absolute -right-6 -bottom-6 text-white/10 group-hover:scale-110 transition-transform duration-500" size={120} />
                            <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider relative z-10">Monthly Feed Purchases</p>
                            <h3 className="text-3xl font-black mt-2 relative z-10">PKR {monthlySpend.toLocaleString()}</h3>
                            <div className="mt-4 flex items-center text-xs font-medium text-emerald-100 bg-black/10 w-fit px-2 py-1 rounded-lg">
                                <TrendingUp size={12} className="mr-1" /> This month
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-red-200 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Payables</p>
                                    <h3 className="text-3xl font-black text-red-500 mt-2">PKR {pendingBills.toLocaleString()}</h3>
                                </div>
                                <div className="bg-red-50 p-3 rounded-2xl text-red-500 group-hover:scale-110 transition-transform"><CheckCircle size={24} /></div>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-4">For active feed vendors</p>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-200 transition-colors cursor-pointer" onClick={() => setActiveTab('INVENTORY')}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Low Stock Items</p>
                                    <h3 className="text-3xl font-black text-amber-500 mt-2">{apiLowStockCount} items <span className="text-sm font-medium text-slate-400 animate-pulse">Critical</span></h3>
                                </div>
                                <div className="bg-amber-50 p-3 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform"><Layers size={24} /></div>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-4 flex items-center gap-1 hover:text-amber-600">Restock needed <ArrowRight size={12} /></p>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab('SUPPLIERS')}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Vendors</p>
                                    <h3 className="text-3xl font-black text-blue-600 mt-2">{vendorEntities.length} <span className="text-sm font-medium text-slate-400">Total</span></h3>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform"><User size={24} /></div>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-4">Linked entity accounts</p>
                        </div>
                    </div>

                    {feedVendorPayables.length > 0 && (
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm overflow-x-auto">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><DollarSign size={18} className="text-indigo-500" /> Feed purchase payables</h3>
                            <p className="text-xs text-slate-500 mb-3">Purchase bills only. Internal diet consumption is excluded and no overdue status is inferred without payment terms.</p>
                            <table className="min-w-full text-xs">
                                <thead>
                                    <tr className="text-left text-slate-500 border-b border-slate-100">
                                        <th className="py-2 pr-4">Vendor</th>
                                        <th className="py-2 pr-4 text-right">Total billed</th>
                                        <th className="py-2 pr-4 text-right">Total paid</th>
                                        <th className="py-2 pr-4 text-right">Outstanding</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {feedVendorPayables.slice(0, 12).map(row => (
                                        <tr key={row.vendorId} className="border-b border-slate-50 hover:bg-slate-50/80">
                                            <td className="py-2.5 font-semibold text-slate-700">{row.vendorName}</td>
                                            <td className="py-2.5 text-right text-slate-600">{row.totalBilled.toLocaleString()}</td>
                                            <td className="py-2.5 text-right text-emerald-600">{row.totalPaid.toLocaleString()}</td>
                                            <td className="py-2.5 text-right font-bold text-amber-600">{row.outstanding.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500" /> Monthly Feed Purchase Spend</h3>
                            <div className="h-64">
                                {monthlySpendTrend.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={monthlySpendTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(value) => `PKR ${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`} />
                                            <Tooltip formatter={(value: number) => `PKR ${value.toLocaleString()}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                                            <Line type="monotone" dataKey="Total" stroke="#10b981" strokeWidth={4} dot={{ stroke: '#10b981', strokeWidth: 2, r: 6, fill: '#fff' }} activeDot={{ r: 8 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                        <TrendingUp size={48} className="mb-2 opacity-20" />
                                        <p className="text-sm font-bold">No procurement history</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="lg:col-span-1 bg-gradient-to-b from-slate-50 to-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Package size={18} className="text-slate-500" /> Inventory Value Spread</h3>
                            <div className="space-y-4">
                                {FEED_TYPES.map(cat => {
                                    const value = feedItems.filter(f => f.feedType === cat).reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
                                    const percentage = apiStockValue ? (value / apiStockValue) * 100 : 0;
                                    return (
                                        <div key={cat}>
                                            <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                                <span>{cat}</span>
                                                <span>{percentage.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                                            </div>
                                            <div className="text-[10px] font-medium text-slate-400 mt-1 text-right">PKR {value.toLocaleString()}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex flex-col xl:flex-row xl:items-end justify-between gap-4">
                            <div>
                                <h3 className="font-black text-slate-800 flex items-center gap-2"><Layers size={18} className="text-blue-500" /> Top Purchased Feed Items</h3>
                                <p className="text-xs text-slate-500 mt-1">Genuine vendor purchases ranked by spend for {purchaseReport.label}. Diet consumption is excluded.</p>
                            </div>
                            <div className="flex flex-wrap items-end gap-2">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Reference month</label>
                                    <input
                                        aria-label="Top purchase report reference month"
                                        type="month"
                                        value={purchaseReportMonth}
                                        disabled={purchaseReportPeriod === 'ALL'}
                                        onChange={event => { if (event.target.value) setPurchaseReportMonth(event.target.value); }}
                                        className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-40"
                                    />
                                </div>
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    {([
                                        ['MONTH', 'Month'],
                                        ['QUARTER', 'Quarter'],
                                        ['YEAR', 'Year'],
                                        ['ALL', 'All time']
                                    ] as const).map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setPurchaseReportPeriod(value)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${purchaseReportPeriod === value ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const latestMonth = vendorExpenses[0]?.date?.slice(0, 7);
                                        if (latestMonth) setPurchaseReportMonth(latestMonth);
                                        setPurchaseReportPeriod('MONTH');
                                    }}
                                    className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                                >
                                    Latest data
                                </button>
                                <button
                                    type="button"
                                    disabled={purchaseReport.rows.length === 0}
                                    onClick={() => {
                                        const rows = purchaseReport.rows.map((row, index) => ({
                                            Rank: index + 1,
                                            Item: row.name,
                                            Purchases: row.purchases,
                                            QuantityKg: row.quantityKg.toFixed(2),
                                            TotalCostPKR: row.cost.toFixed(2),
                                            WeightedRatePKRKg: row.averageRate?.toFixed(2) || '',
                                            SpendChangePct: row.changePct?.toFixed(2) || ''
                                        }));
                                        if (rows.length === 0) return;
                                        const csv = [Object.keys(rows[0]).join(','), ...rows.map(row => Object.values(row).map(value => `"${value}"`).join(','))].join('\n');
                                        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                                        const anchor = document.createElement('a');
                                        anchor.href = url;
                                        anchor.download = `top-feed-purchases-${purchaseReportMonth}-${purchaseReportPeriod.toLowerCase()}.csv`;
                                        anchor.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                    className="h-9 px-3 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5 hover:bg-emerald-700 disabled:opacity-40"
                                >
                                    <Download size={13} /> Export
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-slate-100 bg-slate-50/60">
                            <div className="p-4 sm:border-r border-slate-100">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Purchase spend</p>
                                <p className="text-xl font-black text-slate-800 mt-1">PKR {purchaseReport.totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                            </div>
                            <div className="p-4 sm:border-r border-slate-100">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recorded weight</p>
                                <p className="text-xl font-black text-slate-800 mt-1">{purchaseReport.totalKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</p>
                            </div>
                            <div className="p-4">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Purchase transactions</p>
                                <p className="text-xl font-black text-slate-800 mt-1">{purchaseReport.transactionCount}</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-sm">
                                <thead className="bg-white border-b border-slate-100">
                                    <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                        <th className="px-5 py-3 text-left w-16">Rank</th>
                                        <th className="px-5 py-3 text-left">Feed item</th>
                                        <th className="px-5 py-3 text-right">Purchases</th>
                                        <th className="px-5 py-3 text-right">Weight (kg)</th>
                                        <th className="px-5 py-3 text-right">Total spend</th>
                                        <th className="px-5 py-3 text-right">Weighted PKR/kg</th>
                                        <th className="px-5 py-3 text-right">Spend vs prior period</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {purchaseReport.rows.slice(0, 10).map((row, index) => (
                                        <tr key={row.itemId} className="hover:bg-slate-50/70">
                                            <td className="px-5 py-3 font-black text-slate-400">#{index + 1}</td>
                                            <td className="px-5 py-3 font-bold text-slate-800">{row.name}</td>
                                            <td className="px-5 py-3 text-right text-slate-600">{row.purchases}</td>
                                            <td className="px-5 py-3 text-right text-slate-600">{row.quantityKg > 0 ? row.quantityKg.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'Weight missing'}</td>
                                            <td className="px-5 py-3 text-right font-black text-emerald-700">PKR {row.cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                            <td className="px-5 py-3 text-right font-bold text-slate-700">{row.averageRate === null ? '—' : `PKR ${row.averageRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</td>
                                            <td className={`px-5 py-3 text-right font-black ${row.changePct === null ? 'text-slate-400' : row.changePct > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                {row.changePct === null ? '—' : `${row.changePct > 0 ? '+' : ''}${row.changePct.toFixed(1)}%`}
                                            </td>
                                        </tr>
                                    ))}
                                    {purchaseReport.rows.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-10 text-center">
                                                <Package size={28} className="mx-auto text-slate-200 mb-2" />
                                                <p className="text-sm font-bold text-slate-500">No feed purchases recorded for {purchaseReport.label}.</p>
                                                <p className="text-xs text-slate-400 mt-1">Choose another period or use “Latest data”.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'ANALYTICS' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Price Trend Chart */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500" /> Weighted Purchase Rate (PKR/kg)</h3>
                            <p className="text-xs text-slate-500 mb-5">Monthly total purchase cost divided by recorded kilograms. Gaps remain visible.</p>
                            <div className="h-72">
                                {priceTrendData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={priceTrendData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip contentStyle={{ borderRadius: '12px' }} />
                                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                                            {topPurchasedItems.map((item, idx) => (
                                                <Line key={item.name} type="monotone" dataKey={item.name} stroke={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'][idx % 5]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400">No sufficient data for pricing trend</div>
                                )}
                            </div>
                        </div>

                        {/* Payables Aging */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2"><Clock size={18} className="text-red-500" /> Outstanding Balance by Invoice Age</h3>
                            <p className="text-xs text-slate-500 mb-5">Age is measured from the purchase date; it is not an overdue determination.</p>
                            <div className="h-72">
                                {payablesAging.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsBarChart data={payablesAging} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" tickFormatter={(v) => `PKR ${v >= 1000 ? v/1000+'k' : v}`} />
                                            <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fontWeight: 600 }} width={80} />
                                            <Tooltip formatter={(value: number) => `PKR ${value.toLocaleString()}`} cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px' }} />
                                            <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={32}>
                                                {payablesAging.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </RechartsBarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-emerald-500 font-bold gap-2">
                                        <CheckCircle size={24} /> No aging payables
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Vendor Spend Dist */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><User size={18} className="text-blue-500" /> Spend by Vendor</h3>
                            <div className="h-72">
                                {vendorSpendDist.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={vendorSpendDist} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                                                {vendorSpendDist.map((_, i) => <Cell key={i} fill={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'][i % 6]} />)}
                                            </Pie>
                                            <Tooltip formatter={(v: number) => `PKR ${v.toLocaleString()}`} contentStyle={{ borderRadius: '12px' }} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400">No spend data</div>
                                )}
                            </div>
                        </div>

                        {/* Vendor Comparison Chart */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2"><BarChart size={18} className="text-purple-500" /> Weighted Vendor Rate (PKR/kg)</h3>
                            <p className="text-xs text-slate-500 mb-5">Comparable only where a purchase has a reliable kilogram weight.</p>
                            <div className="h-72">
                                {itemVendorComparisonData.data.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsBarChart data={itemVendorComparisonData.data}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip contentStyle={{ borderRadius: '12px' }} />
                                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                                            {itemVendorComparisonData.vendors.map((vendor, index) => (
                                                <Bar key={vendor} dataKey={vendor} fill={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'][index % 4]} radius={[4, 4, 0, 0]} />
                                            ))}
                                        </RechartsBarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400">No vendor data</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Analytics Summary */}
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Archive size={16} /> Feed Purchase History Detail</h3>
                            <button onClick={() => {
                                const rows = vendorExpenses.map(e => ({ Date: e.date, Item: state.feed.find(x => x.id === e.feedItemId)?.name || '-', Vendor: vendorEntities.find(x => x.id === e.supplier)?.name || 'Cash', Rate: e.rate, Amount: e.amount, QtyWt: e.weight > 0 ? e.weight + ' kg' : e.quantity, Status: e.paymentStatus }));
                                const csvStr = [Object.keys(rows[0] || {}).join(','), ...rows.map(r => Object.values(r).map(x => `"${x}"`).join(','))].join('\n');
                                const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csvStr], { type: 'text/csv' })); a.download = 'history.csv'; a.click();
                            }} className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors">
                                <Download size={13} /> Export Data
                            </button>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white sticky top-0 border-b border-slate-200">
                                    <tr className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Item</th>
                                        <th className="p-4">Vendor</th>
                                        <th className="p-4 text-right">Qty/Wt</th>
                                        <th className="p-4 text-right">Total (PKR)</th>
                                        <th className="p-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {vendorExpenses.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-8 text-slate-400 font-medium">No procurement logs found.</td></tr>
                                    ) : (
                                        vendorExpenses.map((exp, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 font-medium text-slate-700">{exp.date}</td>
                                                <td className="p-4 font-bold text-slate-800">{state.feed.find(x => x.id === exp.feedItemId)?.name || '-'}</td>
                                                <td className="p-4 text-slate-600">{exp.supplier === CASH_LABEL ? 'Cash' : vendorEntities.find(v => v.id === exp.supplier)?.name}</td>
                                                <td className="p-4 text-right text-slate-600">{exp.weight > 0 ? `${exp.weight} kg` : exp.quantity}</td>
                                                <td className="p-4 text-right font-bold text-emerald-600">{exp.amount.toLocaleString()}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`text-[10px] font-black px-2 py-1 rounded-full ${exp.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : exp.paymentStatus === 'PENDING' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{exp.paymentStatus}</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'PROCUREMENT' && (
                <div className="space-y-6 animate-fade-in-up">
                    {/* Procurement Entry Form - Wide Design */}
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-emerald-100 shadow-sm relative">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-black text-emerald-800 flex items-center gap-2">
                                    {editingExpense ? <><Edit2 size={24} className="text-amber-500" /> Editing Procurement Record</> : <><Truck size={24} className="text-emerald-500" /> New Supply Entry</>}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mt-1">One submission records the purchase, inventory receipt, payable and ledger reference together.</p>
                            </div>
                            {editingExpense && (
                                <button onClick={() => setEditingExpense(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-bold transition-colors flex items-center gap-2"><X size={16} /> Cancel Edit</button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Col 1: Material Selection */}
                            <div className="space-y-4">
                                <div className="p-1 bg-slate-100 rounded-xl flex items-center justify-between">
                                    {FEED_TYPES.map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setProcurementForm(prev => ({ ...prev, feedCategory: type as any, feedTypeId: '', quantity: 0 }))}
                                            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all ${procurementForm.feedCategory === type ? 'bg-white text-emerald-700 shadow shadow-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Select Feed Item <span className="text-red-500">*</span></label>
                                    <select
                                        value={procurementForm.feedTypeId}
                                        onChange={e => handleFeedItemSelection(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm font-bold text-slate-700 rounded-xl px-4 py-2.5 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="">Select Option...</option>
                                        {availableProcurementItems.map(f => (
                                            <option key={f.id} value={f.id}>{f.name} ({f.unit})</option>
                                        ))}
                                    </select>
                                    {availableProcurementItems.length === 0 && <p className="text-[10px] text-amber-500 mt-1.5 font-medium">No items found.</p>}
                                </div>
                            </div>

                            {/* Col 2: Date & Vendor */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Record Date</label>
                                    <input type="date" value={procurementForm.date} onChange={e => setProcurementForm({ ...procurementForm, date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 text-sm font-bold text-slate-700 rounded-xl px-4 py-2.5 outline-none transition-all cursor-pointer" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Supplier (Vendor) <span className="text-red-500">*</span></label>
                                    <select value={procurementForm.vendorId} onChange={e => setProcurementForm({ ...procurementForm, vendorId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 text-sm font-bold text-slate-700 rounded-xl px-4 py-2.5 outline-none transition-all cursor-pointer">
                                        <option value="">Select Vendor...</option>
                                        {vendorOptionsList.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Col 3: Measures */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                                {(() => {
                                    const selectedItem = state.feed.find(f => f.id === procurementForm.feedTypeId);
                                    const isQtyBased = selectedItem && ['BAG', 'BUNDLE'].includes((selectedItem.unit || '').toUpperCase());
                                    const configuredWeightPerUnit = Number(selectedItem?.weightPerUnit) || 0;

                                    if (isQtyBased) {
                                        return (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Qty ({selectedItem?.unit === 'kg' ? 'BAGs' : (selectedItem?.unit || 'BAGs')}) <span className="text-red-500">*</span></label>
                                                    <input type="number" min={0} value={procurementForm.quantity || ''} onChange={e => {
                                                        const q = parseFloat(e.target.value) || 0;
                                                        setProcurementForm(p => ({ ...p, quantity: q, weight: configuredWeightPerUnit > 0 ? q * configuredWeightPerUnit : p.weight }));
                                                    }} className="w-full border border-slate-200 focus:border-emerald-500 text-sm font-bold text-slate-700 rounded-xl px-3 py-2 outline-none" placeholder="0" />
                                                    {configuredWeightPerUnit <= 0 && <p className="text-[9px] text-amber-600 mt-1">No weight/unit configured; enter total weight.</p>}
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Total Wt. <span className="text-red-500">*</span></label>
                                                    <input type="number" min={0} step={0.1} value={procurementForm.weight || ''} onChange={e => setProcurementForm({ ...procurementForm, weight: parseFloat(e.target.value) || 0 })} className="w-full border border-slate-200 focus:border-emerald-500 text-sm font-bold text-slate-700 rounded-xl px-3 py-2 outline-none" placeholder="kg" />
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div>
                                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Total Weight ({selectedItem?.unit || 'kg'}) <span className="text-red-500">*</span></label>
                                                <input type="number" min={0} step={0.1} value={procurementForm.weight || ''} onChange={e => setProcurementForm({ ...procurementForm, weight: parseFloat(e.target.value) || 0 })} className="w-full border border-slate-200 focus:border-emerald-500 text-sm font-bold text-slate-700 rounded-xl px-4 py-2.5 outline-none" placeholder={`Quantity in ${selectedItem?.unit || 'kg'}`} />
                                            </div>
                                        );
                                    }
                                })()}
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Rate per {(() => {
                                        const i = state.feed.find(f => f.id === procurementForm.feedTypeId);
                                        return i && ['BAG', 'BUNDLE'].includes((i.unit || '').toUpperCase()) ? (i.unit || 'BAG') : 'KG';
                                    })()} (PKR) <span className="text-red-500">*</span></label>
                                    <input type="number" min={0} value={procurementForm.rate || ''} onChange={e => setProcurementForm({ ...procurementForm, rate: parseFloat(e.target.value) || 0 })} className="w-full border border-slate-200 focus:border-emerald-500 text-sm font-bold text-slate-700 rounded-xl px-4 py-2.5 outline-none" placeholder="0.00" />
                                </div>
                            </div>

                            {/* Col 4: State & Submit */}
                            <div className="flex flex-col h-full space-y-4">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Invoice State</label>
                                    <div className="flex gap-2">
                                        {[
                                            { val: 'PENDING', label: 'Credit', class: 'bg-amber-100 text-amber-700 border-amber-200' },
                                            { val: 'PAID', label: 'Paid', class: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
                                        ].map(st => (
                                            <button
                                                key={st.val}
                                                onClick={() => setProcurementForm({ ...procurementForm, paymentStatus: st.val as any })}
                                                className={`flex-1 py-2 text-xs font-black rounded-xl border ${procurementForm.paymentStatus === st.val ? st.class + ' ring-2 ring-offset-1 ring-' + st.class.split(' ')[1].split('-')[1] : 'bg-white border-slate-200 text-slate-400'}`}
                                            >
                                                {st.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-auto bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex-1 flex flex-col justify-center relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 opacity-10"><DollarSign size={48} /></div>
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Total Value</span>
                                    <span className="text-2xl font-black text-emerald-800 mb-3 block">
                                        PKR {(() => {
                                            const i = state.feed.find(f => f.id === procurementForm.feedTypeId);
                                            const isQ = i && ['BAG', 'BUNDLE'].includes((i.unit || '').toUpperCase());
                                            return (isQ && (procurementForm.quantity || 0) > 0) ? ((procurementForm.quantity || 0) * (procurementForm.rate || 0)).toLocaleString() : ((procurementForm.weight || 0) * (procurementForm.rate || 0)).toLocaleString();
                                        })()}
                                    </span>
                                    {editingExpense ? (
                                        <button type="button" onClick={handleUpdateExpenseSubmit} disabled={recordingPurchase} className="w-full bg-slate-800 text-white font-bold py-2.5 rounded-xl hover:bg-slate-700 disabled:opacity-60 flex items-center justify-center gap-2 shadow-md transition-all z-10"><Save size={16} /> Update</button>
                                    ) : (
                                        <button type="button" onClick={handleProcurementSubmit} disabled={recordingPurchase} className="w-full bg-emerald-600 text-white font-black py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2 shadow-md hover:shadow-emerald-200/50 transition-all z-10"><Plus size={16} /> RECORD ENTRY</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Procurement Logs - Full Width */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">Feed Purchase History</h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Vendor purchases and store receipts only; generated diet usage is excluded</p>
                            </div>
                            <div className="flex gap-3 items-center">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input type="text" placeholder="Search by name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="text-sm bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 focus:border-emerald-500 outline-none w-48 transition-all" />
                                </div>
                                <div className="text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
                                    <Truck size={16} /> {vendorExpenses.length} Records
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto p-2">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-slate-500 text-xs font-black uppercase tracking-wider border-b border-slate-100 text-left">
                                        <th className="px-6 py-4 w-32">Tx Date</th>
                                        <th className="px-6 py-4">Item Identity</th>
                                        <th className="px-6 py-4">Linked Vendor</th>
                                        <th className="px-6 py-4 text-right">Invoice Val</th>
                                        <th className="px-6 py-4 text-center">Settlement</th>
                                        <th className="px-6 py-4 text-center">Act</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {vendorExpenses.slice(0, 50).map(e => (
                                        <tr key={e.id} className={`hover:bg-slate-50 transition-colors group ${editingExpense?.id === e.id ? 'bg-emerald-50/50' : ''}`}>
                                            <td className="px-6 py-4 text-slate-500 font-medium text-xs font-mono">{new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                                            <td className="px-6 py-4 text-slate-800 font-bold text-sm">{e.description}</td>
                                            <td className="px-6 py-4 text-slate-600 font-medium text-sm">
                                                <span className="flex items-center gap-2"><User size={14} className="text-slate-300" /> {getVendorName(e.supplier)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-emerald-700 font-black text-right text-sm">PKR {e.amount.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full ${e.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : e.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                                    {e.paymentStatus || 'CREDIT'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => {
                                                        startEditExpense(e);
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }} className="text-slate-400 hover:text-emerald-600 bg-white shadow-sm border border-slate-100 p-2 rounded-xl transition-colors" title="Edit purchase"><Edit2 size={16} /></button>
                                                    <button onClick={() => void reversePurchase(e)} className="text-slate-400 hover:text-amber-600 bg-white shadow-sm border border-slate-100 p-2 rounded-xl transition-colors" title="Reverse purchase"><RotateCcw size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {vendorExpenses.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-medium text-sm">
                                                <Truck className="mx-auto mb-4 text-slate-200" size={48} />
                                                No procurement records found for this location.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'INVENTORY' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-5 rounded-3xl text-white shadow-md flex justify-between items-center">
                        <div>
                            <h3 className="font-black text-xl flex items-center gap-2"><Package size={20} className="text-emerald-400" /> Master Materials List</h3>
                            <p className="text-xs text-slate-400 font-medium mt-1">Unified view of definitions, rates, and active stock quantities.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => void handleRepairMissedData()} disabled={repairingData} title="Fix stock and ledger gaps from failed saves (preview first)" className="bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-black tracking-wider hover:bg-slate-600 disabled:opacity-60 transition-all flex items-center gap-2 border border-slate-600">
                                <RefreshCw size={16} className={repairingData ? 'animate-spin' : ''} /> {repairingData ? 'CHECKING…' : 'SYNC MISSED DATA'}
                            </button>
                            <button onClick={() => { setIsAddingItem(!isAddingItem); setEditingItem(null); setNewItemForm({ name: '', category: 'FEED', feedType: 'TMR', quantity: 0, unit: 'KG', weightPerUnit: 0, unitCost: 0, reorderLevel: 100, location: 'Feed Store', defaultSupplier: '' }); }} className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-black tracking-wider hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/30">
                                {isAddingItem ? 'CANCEL' : <><Plus size={16} /> NEW MATERIAL DEFINITION</>}
                            </button>
                        </div>
                    </div>

                    {isAddingItem && (
                        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 transform origin-top animate-fade-in mb-8">
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                                <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                                    {editingItem ? <Edit2 className="text-amber-500" /> : <Plus className="text-emerald-500" />}
                                    {editingItem ? 'Modify Material Parameters' : 'Register New Farm Material'}
                                </h4>
                                <button onClick={() => setIsAddingItem(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Nomenclature <span className="text-red-500">*</span></label>
                                        <input type="text" value={newItemForm.name} onChange={e => setNewItemForm({ ...newItemForm, name: e.target.value })} className="w-full border border-slate-200 focus:border-emerald-500 text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none bg-slate-50 focus:bg-white transition-colors" placeholder="e.g. Wanda Premium..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Class / Type</label>
                                            <select value={newItemForm.feedType} onChange={e => setNewItemForm({ ...newItemForm, feedType: e.target.value as any })} className="w-full border border-slate-200 focus:border-emerald-500 text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none bg-slate-50 focus:bg-white transition-colors">
                                                {FEED_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Purchase Unit Format</label>
                                            <select value={newItemForm.unit} onChange={e => setNewItemForm({ ...newItemForm, unit: e.target.value })} className="w-full border border-slate-200 focus:border-emerald-500 text-sm font-bold text-slate-700 rounded-xl px-3 py-3 outline-none bg-slate-50 focus:bg-white transition-colors">
                                                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    {['BAG', 'BUNDLE'].includes(newItemForm.unit || '') && (
                                        <div className="animate-fade-in-up">
                                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Standard Weight per {newItemForm.unit} (kg)</label>
                                            <input type="number" min={0} step={0.1} value={newItemForm.weightPerUnit || ''} onChange={e => setNewItemForm({ ...newItemForm, weightPerUnit: parseFloat(e.target.value) || 0 })} className="w-full border border-emerald-200 focus:border-emerald-500 text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none bg-emerald-50/50 focus:bg-white transition-colors" placeholder="e.g. 40" />
                                        </div>
                                    )}
                                </div>

                                {/* Stock Parameters */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Limit/Alert ({newItemForm.unit || 'KG'})</label>
                                            <input type="number" min={0} value={newItemForm.reorderLevel} onChange={e => setNewItemForm({ ...newItemForm, reorderLevel: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 focus:border-emerald-500 text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none bg-slate-50 focus:bg-white transition-colors" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Initial Stock ({newItemForm.unit})</label>
                                            <input type="number" min={0} value={newItemForm.quantity} onChange={e => setNewItemForm({ ...newItemForm, quantity: parseFloat(e.target.value) || 0 })} className="w-full border border-slate-200 focus:border-emerald-500 text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none bg-slate-50 focus:bg-white transition-colors disabled:opacity-50" disabled={!!editingItem} title={editingItem ? "Update quantity via Purchase or Usage" : ""} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Base Rate (PKR / {newItemForm.unit})</label>
                                        <input type="number" min={0} value={newItemForm.unitCost} onChange={e => setNewItemForm({ ...newItemForm, unitCost: parseFloat(e.target.value) || 0 })} className="w-full border border-slate-200 focus:border-emerald-500 text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none bg-slate-50 focus:bg-white transition-colors" />
                                    </div>
                                </div>

                                {/* Financials & Links */}
                                <div className="space-y-4 flex flex-col">
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Preferred Vendor Link</label>
                                        <select value={newItemForm.defaultSupplier} onChange={e => setNewItemForm({ ...newItemForm, defaultSupplier: e.target.value })} className="w-full border border-slate-200 focus:border-emerald-500 text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none bg-slate-50 focus:bg-white transition-colors cursor-pointer">
                                            <option value="">Any Vendor / No Default</option>
                                            <option value={CASH_LABEL}>Cash / Walk-in</option>
                                            {vendorEntities.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="mt-auto pt-4 flex justify-end">
                                        <button onClick={() => void handleSaveInventoryItem()} disabled={deployingMaterial} className="w-full bg-slate-800 text-white font-black px-6 py-3.5 rounded-xl hover:bg-slate-700 disabled:opacity-60 transition-colors shadow-lg shadow-slate-200 flex items-center justify-center gap-2"><Save size={18} /> {editingItem ? 'COMMIT CHANGES' : 'DEPLOY MATERIAL'}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {feedItems.map(item => {
                            const isLow = item.quantity <= item.reorderLevel;
                            return (
                                <div key={item.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm relative group overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                                    <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEditItem(item)} className="p-2 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 size={14} /></button>
                                        <button onClick={async () => {
                                            const ok = await confirmDialog({
                                                title: 'Archive material',
                                                message: 'Permanently archive this material?',
                                                confirmLabel: 'Archive',
                                                danger: true,
                                            });
                                            if (!ok) return;
                                            onDeleteFeed(item.id);
                                            toast.success('Material archived.');
                                        }} className="p-2 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg hover:text-red-600 hover:bg-red-50 transition-colors"><Archive size={14} /></button>
                                    </div>
                                    <div className="p-6 pb-4 border-b border-slate-50">
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md mb-2 inline-block ${item.feedType === 'GRASS' ? 'bg-emerald-100 text-emerald-800' : item.feedType === 'WANDA' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>{item.feedType || 'MATERIAL'}</span>
                                        <h4 className="font-black text-slate-800 text-lg leading-tight w-4/5">{item.name}</h4>
                                    </div>
                                    <div className="px-6 py-4 flex items-center justify-between bg-slate-50/50">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Stock</p>
                                            <div className="flex flex-col mt-0.5">
                                                <div className="flex items-end gap-1.5">
                                                    <span className={`text-2xl font-black ${isLow ? 'text-red-500' : 'text-slate-800'}`}>{item.quantity.toLocaleString()}</span>
                                                    <span className="text-sm font-bold text-slate-500 pb-0.5 uppercase">{item.unit || 'KG'}</span>
                                                </div>
                                                {['BAG', 'BUNDLE'].includes((item.unit || '').toUpperCase()) && item.weightPerUnit && item.weightPerUnit > 0 && (
                                                    <p className="text-xs font-bold text-slate-400 mt-1 bg-slate-100 px-2 py-0.5 rounded-md inline-block w-fit">
                                                        ≈ {(item.quantity * item.weightPerUnit).toLocaleString()} KG Total
                                                    </p>
                                                )}
                                            </div>
                                            {isLow && <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 mt-1"><AlertTriangle size={10} /> Restock Needed</p>}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Latest Unit Rate</p>
                                            <p className="text-sm font-black text-slate-700 mt-0.5 border border-slate-200 bg-white px-2 py-1 rounded-lg shadow-sm">PKR {item.unitCost.toLocaleString()} / {item.unit?.toUpperCase() || 'KG'}</p>
                                        </div>
                                    </div>
                                    <div className="px-6 py-4 flex gap-2">
                                        <button onClick={() => handleRecordUsage(item)} className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold text-xs py-2.5 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-colors flex items-center justify-center gap-2"><MinusCircle size={14} /> RECORD OUTGOING</button>
                                        <button onClick={() => void openInventoryMovements(item)} className="flex-1 bg-slate-800 border border-slate-800 text-white font-bold text-xs py-2.5 rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"><Activity size={14} /> STOCK CARD</button>
                                    </div>
                                    <div className="bg-slate-800 px-6 py-2.5 text-center flex justify-between items-center">
                                        <span className="text-[10px] font-medium text-slate-400">Pref Vendor:</span>
                                        <span className="text-xs font-bold text-slate-200 truncate max-w-[150px]">{getVendorName(item.defaultSupplier)}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {feedItems.length === 0 && (
                            <div className="col-span-1 md:col-span-2 xl:col-span-3 text-center py-16 bg-white rounded-3xl border border-slate-200 border-dashed">
                                <Package size={48} className="mx-auto text-slate-200 mb-4" />
                                <h3 className="text-lg font-bold text-slate-400">Inventory Empty</h3>
                                <p className="text-sm text-slate-400 font-medium">Add feed items and definitions to start managing consumption.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'SUPPLIERS' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><User className="text-blue-500" /> Vendor Directories</h3>
                            <p className="text-sm text-slate-500 font-medium mt-1">Sourced directly from central Accounting Entities model.</p>
                        </div>
                        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-blue-100">
                            Central Entities Control Enforced
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {vendorEntities.map(vendor => {
                            const relatedBills = vendorExpenses.filter(e => e.supplier === vendor.id);
                            const total = relatedBills.reduce((sum, e) => sum + e.amount, 0);
                            const paid = relatedBills.reduce((sum, e) => sum + Math.min(e.amount, Number(e.amountPaid || (e.paymentStatus === 'PAID' ? e.amount : 0))), 0);
                            const pending = Math.max(0, total - paid);

                            return (
                                <div key={vendor.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative group hover:border-blue-200 transition-colors">
                                    <div className="absolute -right-2 -top-2 bg-blue-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-sm shadow-blue-500/30">
                                        VEN-{vendor.id.slice(-4).toUpperCase()}
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800 mb-1">{vendor.name}</h3>
                                    <p className="text-xs text-slate-500 font-medium font-mono mb-5">{vendor.contact || 'No Contact Defined'}</p>

                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 grid grid-cols-2 gap-y-4 mb-5">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Volumes</p>
                                            <p className="font-black text-slate-700">PKR {(total / 1000).toFixed(1)}k</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Transactions</p>
                                            <p className="font-black text-slate-700">{relatedBills.length} Invoices</p>
                                        </div>
                                        <div className="col-span-2 pt-3 border-t border-slate-200 flex justify-between items-center">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remaining Dues</p>
                                            <p className={`font-black text-lg ${pending > 0 ? 'text-red-500' : 'text-emerald-500'}`}>PKR {(pending / 1000).toFixed(1)}k</p>
                                        </div>
                                    </div>

                                    {pending > 0 ? (
                                        <div className="w-full text-center py-3 px-3 text-xs font-bold text-amber-700 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-center gap-2">
                                            <Clock size={14} /> Settle against individual invoices in Finance &amp; Accounts
                                        </div>
                                    ) : (
                                        <div className="w-full text-center py-3 text-xs font-black tracking-wider text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-center gap-2">
                                            <CheckCircle size={14} /> ACCOUNT CLEAR
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {vendorEntities.length === 0 && (
                            <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-10 bg-white rounded-3xl border border-slate-200">
                                <User size={32} className="mx-auto text-slate-200 mb-3" />
                                <p className="text-sm font-medium text-slate-500">No active Vendors created in internal ledger.</p>
                                <p className="text-xs text-slate-400 mt-1">Please create via Financials / Ledger configuration.</p>
                            </div>
                        )}
                    </div>

                </div>
            )}

            {movementItem && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setMovementItem(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-slate-800">Stock Card: {movementItem.name}</h3>
                                <p className="text-xs text-slate-500 font-bold mt-0.5">Backend inventory movement ledger · newest first</p>
                            </div>
                            <button onClick={() => setMovementItem(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg"><X size={18} /></button>
                        </div>
                        <div className="overflow-auto max-h-[70vh]">
                            {movementsLoading && <div className="p-8 text-center text-sm font-bold text-slate-500">Loading movement history...</div>}
                            {movementsError && <div className="m-5 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{movementsError}</div>}
                            {!movementsLoading && !movementsError && inventoryMovements.length === 0 && (
                                <div className="p-10 text-center text-slate-400">
                                    <Activity size={32} className="mx-auto mb-2 opacity-40" />
                                    <p className="text-sm font-bold">No movement rows returned for this item.</p>
                                </div>
                            )}
                            {!movementsLoading && !movementsError && inventoryMovements.length > 0 && (
                                <>
                                {!inventoryMovements.some(row => ['IN', 'INCREASE'].includes(String(row.direction).toUpperCase()) && normalizeText(row.movementType ?? row.type).includes('purchase')) && (
                                    <div className="m-4 mb-0 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800">
                                        Historical purchase-IN rows are not present for this item. The stock card cannot fully reconcile until the backend ledger backfill is completed; new atomic purchases will create receipt movements.
                                    </div>
                                )}
                                <table className="w-full text-sm">
                                    <thead className="bg-white sticky top-0 border-b border-slate-100">
                                        <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                            <th className="px-5 py-3 text-left">Date</th>
                                            <th className="px-5 py-3 text-left">Movement</th>
                                            <th className="px-5 py-3 text-right">Qty</th>
                                            <th className="px-5 py-3 text-right">Value</th>
                                            <th className="px-5 py-3 text-left">Reference</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {inventoryMovements.map((row, idx) => (
                                            <tr key={row.id ?? idx} onClick={() => void openMovementAudit(row)} className="hover:bg-slate-50 cursor-pointer">
                                                <td className="px-5 py-3 font-bold text-slate-700">{row.date ?? row.createdAt ?? '-'}</td>
                                                <td className="px-5 py-3">
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${row.direction === 'OUT' || row.direction === 'DECREASE' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                                        {row.movementType ?? row.type ?? row.direction ?? 'MOVEMENT'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-right font-black text-slate-800">{Number(row.quantity ?? row.qty ?? 0).toLocaleString()} {row.unit ?? movementItem.unit}</td>
                                                <td className="px-5 py-3 text-right font-bold text-emerald-700">PKR {Number(row.totalCost ?? row.value ?? 0).toLocaleString()}</td>
                                                <td className="px-5 py-3 text-slate-500">{row.referenceType ?? '-'} {row.referenceId ? `· ${row.referenceId}` : ''}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {selectedMovement && (
                <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedMovement(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-slate-800">Movement Audit</h3>
                                <p className="text-xs text-slate-500 font-bold mt-0.5">{selectedMovement.movementType ?? selectedMovement.type ?? 'Movement'} · {selectedMovement.id ?? selectedMovement.movementId}</p>
                            </div>
                            <button onClick={() => setSelectedMovement(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg"><X size={18} /></button>
                        </div>
                        <div className="p-5 max-h-[65vh] overflow-y-auto">
                            {movementAuditLoading && <div className="text-sm font-bold text-slate-500 text-center py-8">Loading audit trail...</div>}
                            {movementAuditError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{movementAuditError}</div>}
                            {!movementAuditLoading && !movementAuditError && movementAuditRows.length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <Activity size={30} className="mx-auto mb-2 opacity-40" />
                                    <p className="text-sm font-bold">No audit rows returned for this movement.</p>
                                </div>
                            )}
                            {!movementAuditLoading && !movementAuditError && movementAuditRows.length > 0 && (
                                <div className="space-y-3">
                                    {movementAuditRows.map((row, idx) => (
                                        <div key={row.id ?? idx} className="border border-slate-100 rounded-xl p-3 bg-slate-50">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-black uppercase text-slate-700">{row.action ?? row.eventType ?? 'AUDIT'}</p>
                                                <span className="text-[10px] font-bold text-slate-400">{row.createdAt ?? row.timestamp ?? row.date ?? ''}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">{row.actorName ?? row.actor ?? row.userName ?? ''}</p>
                                            {(row.beforeValue || row.afterValue) && (
                                                <p className="text-xs text-slate-600 mt-2">Before: {String(row.beforeValue ?? '-')} · After: {String(row.afterValue ?? '-')}</p>
                                            )}
                                            {row.message && <p className="text-xs text-slate-600 mt-2">{row.message}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
