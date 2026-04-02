import React, { useState, useMemo } from 'react';
import { AppState, Expense, FeedInventory, ExpenseCategory } from '../types';
import { Truck, ShoppingCart, User, AlertTriangle, CheckCircle, Clock, Search, Layers, Archive, Activity, RefreshCw, MinusCircle, Edit2, X, Save, Plus, Package, TrendingUp, BarChart, DollarSign, ArrowRight, Filter, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart as RechartsBarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface Props {
    state: AppState;
    onAddExpense: (e: Expense) => void | Promise<void>;
    onUpdateExpense: (e: Expense) => void | Promise<void>;
    onAddFeed: (f: FeedInventory) => void;
    onUpdateInventory: (item: FeedInventory) => void;
    onDeleteFeed: (id: string) => void;
}

const FEED_TYPES = ['GRASS', 'TMR', 'WANDA', 'OTHER'];
const UNIT_OPTIONS = ['KG', 'TON', 'BUNDLE', 'BAG'];

export const Procurement: React.FC<Props> = ({ state, onAddExpense, onUpdateExpense, onAddFeed, onUpdateInventory, onDeleteFeed }) => {
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

    // Filtered Feed items
    const feedItems = useMemo(() => state.feed.filter(f => f.category === 'FEED'), [state.feed]);

    // Derived dashboard data
    const totalStockValue = feedItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    const lowStockCount = feedItems.filter(i => i.quantity <= i.reorderLevel).length;
    const [searchTerm, setSearchTerm] = useState('');

    const vendorExpenses = useMemo(() => {
        let expenses = state.expenses.filter(e => e.category === 'FEED');
        if (searchTerm) {
            expenses = expenses.filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [state.expenses, searchTerm]);

    const dashboardVendorExpenses = state.expenses.filter(e => e.category === 'FEED');
    const pendingBills = dashboardVendorExpenses.filter(e => e.paymentStatus === 'PENDING' || e.paymentStatus === 'PARTIAL').reduce((sum, e) => sum + e.amount, 0);
    const monthlySpend = dashboardVendorExpenses.filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7))).reduce((sum, e) => sum + e.amount, 0);

    const priceTrendData = useMemo(() => {
        const grouped: Record<string, any> = {};
        vendorExpenses.forEach(e => {
            const item = state.feed.find(f => f.id === e.feedItemId);
            if (!item) return;
            const key = new Date(e.date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }); // e.g. Oct 26
            if (!grouped[key]) grouped[key] = { name: key };
            const ratePerKg = e.weight > 0 ? (e.amount / e.weight) : e.rate;
            if (!grouped[key][item.name]) grouped[key][item.name] = { sum: 0, count: 0 };
            grouped[key][item.name].sum += ratePerKg;
            grouped[key][item.name].count += 1;
        });
        return Object.values(grouped).map(g => {
            const finalObj: any = { name: g.name };
            Object.keys(g).forEach(k => { if (k !== 'name') finalObj[k] = Math.round(g[k].sum / g[k].count); });
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
            const ratePerKg = e.weight > 0 ? (e.amount / e.weight) : e.rate;

            if (!itemVendors[item.name]) itemVendors[item.name] = { name: item.name };
            if (!itemVendors[item.name][`${vendorName}_sum`]) {
                itemVendors[item.name][`${vendorName}_sum`] = 0;
                itemVendors[item.name][`${vendorName}_count`] = 0;
            }
            itemVendors[item.name][`${vendorName}_sum`] += ratePerKg;
            itemVendors[item.name][`${vendorName}_count`] += 1;
        });

        const chartData = Object.values(itemVendors).map((iv: any) => {
            const finalObj: any = { name: iv.name };
            vendorsSet.forEach((v: string) => {
                if (iv[`${v}_count`]) {
                    finalObj[v] = Math.round(iv[`${v}_sum`] / iv[`${v}_count`]);
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
        return Array.from(m.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([month, Total]) => ({ name: month, Total })).slice(-12);
    }, [vendorExpenses]);

    const topPurchasedItems = useMemo(() => {
        const m = new Map<string, { qty: number, cost: number, bg: string }>();
        vendorExpenses.forEach(e => {
            const item = state.feed.find(f => f.id === e.feedItemId);
            if (!item) return;
            const ex = m.get(item.name) || { qty: 0, cost: 0, bg: item.feedType === 'GRASS' ? 'bg-emerald-500' : item.feedType === 'TMR' ? 'bg-blue-500' : 'bg-amber-500' };
            m.set(item.name, { ...ex, qty: ex.qty + (e.weight || e.quantity || 0), cost: ex.cost + e.amount });
        });
        return Array.from(m.entries()).map(([name, data]) => ({ name, ...data })).sort((a,b) => b.cost - a.cost).slice(0, 5);
    }, [vendorExpenses, state.feed]);

    const vendorSpendDist = useMemo(() => {
        const m = new Map<string, number>();
        vendorExpenses.forEach(e => {
            const vendorName = e.supplier === CASH_LABEL ? 'Cash' : (vendorEntities.find(v => v.id === e.supplier)?.name || 'Unknown');
            m.set(vendorName, (m.get(vendorName) || 0) + e.amount);
        });
        return Array.from(m.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    }, [vendorExpenses, vendorEntities]);

    const payablesAging = useMemo(() => {
        const pending = vendorExpenses.filter(e => e.paymentStatus !== 'PAID');
        const now = new Date().getTime();
        let current = 0, days30 = 0, days60 = 0, days90 = 0;
        pending.forEach(e => {
            const diff = (now - new Date(e.date).getTime()) / (1000 * 3600 * 24);
            if (diff <= 30) current += e.amount;
            else if (diff <= 60) days30 += e.amount;
            else if (diff <= 90) days60 += e.amount;
            else days90 += e.amount;
        });
        return [
            { name: '0-30 Days', amount: current, fill: '#10b981' },
            { name: '31-60 Days', amount: days30, fill: '#f59e0b' },
            { name: '61-90 Days', amount: days60, fill: '#f97316' },
            { name: '> 90 Days', amount: days90, fill: '#ef4444' }
        ].filter(x => x.amount > 0);
    }, [vendorExpenses]);

    // Available items for procurement depending on category
    const availableProcurementItems = feedItems.filter(f => f.feedType === procurementForm.feedCategory || (!f.feedType && procurementForm.feedCategory === 'OTHER'));

    // --- ACTIONS ---

    const handleProcurementSubmit = async () => {
        if (!state.currentFarmId) return alert("Please select a farm context.");
        if (!procurementForm.vendorId || !procurementForm.rate || !procurementForm.feedTypeId) return alert("Please fill all required highlighted fields.");

        const selectedItem = state.feed.find(f => f.id === procurementForm.feedTypeId);
        if (!selectedItem) return alert("Invalid Feed Item Selected.");

        // Define unit behavior: BAG/BUNDLE (or WANDA/TMR) = quantity in native unit (bags); else weight in kg.
        const isQtyBased = ['BAG', 'BUNDLE'].includes((selectedItem.unit || '').toUpperCase()) || ['WANDA', 'TMR'].includes(selectedItem.feedType || '');
        const addedValue = isQtyBased ? procurementForm.quantity : procurementForm.weight;
        const assumedWeightPerUnit = selectedItem.weightPerUnit || 40;

        // If they left weight blank but filled quantity (for legacy data), auto compute it
        if (isQtyBased && procurementForm.quantity && !procurementForm.weight) {
            procurementForm.weight = procurementForm.quantity * assumedWeightPerUnit;
        }

        if (isQtyBased && (!procurementForm.quantity || !procurementForm.weight)) return alert("Quantity (Bags/Bundles) and Total Weight are required.");
        if (!isQtyBased && !procurementForm.weight) return alert("Total Weight is required.");

        // CORRECTED COST FORMULA:
        // If it's bag-based, the user enters Rate per Bag. If KG-based, Rate per KG.
        const totalCost = isQtyBased && procurementForm.quantity > 0
            ? procurementForm.quantity * procurementForm.rate
            : procurementForm.weight * procurementForm.rate;

        const desc = isQtyBased ? `Purchase: ${selectedItem.name} (Qty: ${procurementForm.quantity} ${selectedItem.unit}s, Wt: ${procurementForm.weight} kg)` : `Purchase: ${selectedItem.name} (${procurementForm.weight} kg)`;

        const expense: Expense = {
            id: Math.random().toString(36).substr(2, 9),
            farmId: state.currentFarmId,
            category: ExpenseCategory.FEED,
            amount: totalCost,
            date: procurementForm.date,
            description: desc,
            supplier: procurementForm.vendorId, // We strictly store vendor ID here, allowing tight linkage
            paymentStatus: procurementForm.paymentStatus as 'PAID' | 'PENDING' | 'PARTIAL',
            location: procurementForm.location,
            feedCategory: procurementForm.feedCategory,
            feedItemId: selectedItem.id,
            weight: procurementForm.weight,
            quantity: isQtyBased ? procurementForm.quantity : undefined,
            rate: procurementForm.rate
        };

        try {
            await onAddExpense(expense);

            // Auto-update inventory (Keep unitCost native to the Unit e.g. Per Bag)
            onUpdateInventory({
                ...selectedItem,
                quantity: selectedItem.quantity + (isQtyBased ? procurementForm.quantity : addedValue),
                unitCost: procurementForm.rate,
                defaultSupplier: procurementForm.vendorId !== CASH_LABEL ? procurementForm.vendorId : selectedItem.defaultSupplier
            });

            const vName = procurementForm.vendorId === CASH_LABEL ? "Cash" : vendorEntities.find(v => v.id === procurementForm.vendorId)?.name;
            alert(`Procurement Recorded from ${vName}!`);
            setProcurementForm({ ...procurementForm, weight: 0, quantity: 0 });
        } catch (e) {
            return alert("Failed to save expense.");
        }
    };

    const handleUpdateExpenseSubmit = async () => {
        if (!editingExpense || !state.currentFarmId) return;

        if (!procurementForm.vendorId || !procurementForm.rate || !procurementForm.feedTypeId) return alert("Missing required fields.");

        const selectedItem = state.feed.find(f => f.id === procurementForm.feedTypeId);
        if (!selectedItem) return;

        const isQtyBased = ['BAG', 'BUNDLE'].includes((selectedItem.unit || '').toUpperCase()) || ['WANDA', 'TMR'].includes(selectedItem.feedType || '');
        const newAddedValue = procurementForm.weight;
        const assumedWeightPerUnit = selectedItem.weightPerUnit || 40;

        if (isQtyBased && procurementForm.quantity && !procurementForm.weight) {
            procurementForm.weight = procurementForm.quantity * assumedWeightPerUnit;
        }

        if (isQtyBased && (!procurementForm.quantity || !procurementForm.weight)) return alert("Quantity and Weight missing.");
        if (!isQtyBased && !procurementForm.weight) return alert("Weight is required.");

        // CORRECTED COST FORMULA:
        const totalCost = isQtyBased && procurementForm.quantity > 0
            ? procurementForm.quantity * procurementForm.rate
            : procurementForm.weight * procurementForm.rate;

        const desc = isQtyBased ? `Purchase: ${selectedItem.name} (Qty: ${procurementForm.quantity} ${selectedItem.unit}s, Wt: ${procurementForm.weight} kg)` : `Purchase: ${selectedItem.name} (${procurementForm.weight} kg)`;

        const updated: Expense = {
            ...editingExpense,
            date: procurementForm.date,
            description: desc,
            supplier: procurementForm.vendorId,
            amount: totalCost,
            paymentStatus: procurementForm.paymentStatus as 'PAID' | 'PENDING' | 'PARTIAL',
            feedCategory: procurementForm.feedCategory,
            feedItemId: selectedItem.id,
            weight: procurementForm.weight,
            quantity: isQtyBased ? procurementForm.quantity : undefined,
            rate: procurementForm.rate
        };

        try {
            await onUpdateExpense(updated);

            // Fetch explicitly what it was before updating to reverse the impact accurately
            const prevItem = state.feed.find(f => f.id === editingExpense.feedItemId);
            let prevAddedValue = 0;

            if (prevItem) {
                prevAddedValue = isQtyBased ? (editingExpense.quantity || 0) : (editingExpense.weight || 0);

                // If it's modifying the exact same item ID
                if (prevItem.id === selectedItem.id) {
                    onUpdateInventory({
                        ...selectedItem,
                        quantity: selectedItem.quantity - prevAddedValue + (isQtyBased ? procurementForm.quantity : newAddedValue),
                        unitCost: procurementForm.rate,
                        defaultSupplier: procurementForm.vendorId !== CASH_LABEL ? procurementForm.vendorId : selectedItem.defaultSupplier
                    });
                } else {
                    // Item changed completely, revert old item, supply fresh item
                    onUpdateInventory({ ...prevItem, quantity: prevItem.quantity - prevAddedValue });
                    onUpdateInventory({
                        ...selectedItem,
                        quantity: selectedItem.quantity + (isQtyBased ? procurementForm.quantity : newAddedValue),
                        unitCost: procurementForm.rate,
                        defaultSupplier: procurementForm.vendorId !== CASH_LABEL ? procurementForm.vendorId : selectedItem.defaultSupplier
                    });
                }
            } else {
                // If it was somehow not linked accurately before, just add to the new item
                onUpdateInventory({
                    ...selectedItem,
                    quantity: selectedItem.quantity + (isQtyBased ? procurementForm.quantity : newAddedValue),
                    unitCost: procurementForm.rate,
                    defaultSupplier: procurementForm.vendorId !== CASH_LABEL ? procurementForm.vendorId : selectedItem.defaultSupplier
                });
            }

            setEditingExpense(null);
            setProcurementForm({ ...procurementForm, weight: 0, quantity: 0 });
            alert("Record updated successfully!");
        } catch (e) {
            console.error(e);
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

    const handleSaveInventoryItem = () => {
        if (!newItemForm.name) return alert("Item Name is required.");
        if (editingItem) {
            onUpdateInventory({ ...editingItem, ...newItemForm } as FeedInventory);
            setEditingItem(null);
        } else {
            onAddFeed({ ...newItemForm, id: Math.random().toString(36).substr(2, 9), farmId: state.currentFarmId! } as FeedInventory);
        }
        setIsAddingItem(false);
        setNewItemForm({ name: '', category: 'FEED', feedType: 'TMR', quantity: 0, unit: 'KG', weightPerUnit: 0, unitCost: 0, reorderLevel: 100, location: 'Feed Store', defaultSupplier: '' });
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

    const handleRecordUsage = (item: FeedInventory) => {
        const isQtyBased = ['BAG', 'BUNDLE'].includes((item.unit || '').toUpperCase());
        const wpu = item.weightPerUnit || 40;
        const stockDisplay = isQtyBased
            ? `${item.quantity.toLocaleString()} ${item.unit}s (≈ ${(item.quantity * wpu).toLocaleString()} KG total)`
            : `${item.quantity.toLocaleString()} KG`;
        const qtyStr = prompt(`Current stock: ${stockDisplay}\n\nEnter amount of ${item.name} consumed in KG:`);
        if (!qtyStr) return;
        const consumedKg = parseFloat(qtyStr);
        if (isNaN(consumedKg) || consumedKg <= 0) return alert("Invalid amount");
        const toDeduct = isQtyBased ? consumedKg / wpu : consumedKg;
        if (toDeduct > (item.quantity ?? 0)) return alert("Cannot consume more than available stock!");
        onUpdateInventory({ ...item, quantity: (item.quantity ?? 0) - toDeduct });
        alert(`Successfully deducted ${consumedKg} KG${isQtyBased ? ` (${toDeduct.toFixed(3)} ${item.unit}s)` : ''} of ${item.name}.`);
    };

    // Helper: Map Vendor ID to display Name
    const getVendorName = (id?: string) => {
        if (id === CASH_LABEL) return 'Cash / Walk-in';
        const v = vendorEntities.find(ent => ent.id === id);
        return v ? v.name : (id || 'Unknown');
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
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
                        TOTAL STOCK VALUE: <span className="text-emerald-400 text-sm">PKR {totalStockValue.toLocaleString()}</span>
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
                            <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider relative z-10">Monthly Feed Spend</p>
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
                                    <h3 className="text-3xl font-black text-amber-500 mt-2">{lowStockCount} items <span className="text-sm font-medium text-slate-400 animate-pulse">Critical</span></h3>
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

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500" /> Monthly Procurement Spend</h3>
                            <div className="h-64">
                                {monthlySpendTrend.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={monthlySpendTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(value) => `v${value >= 1000 ? (value/1000).toFixed(0)+'k' : value}`} />
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
                                {['GRASS', 'TMR', 'WANDA'].map(cat => {
                                    const value = feedItems.filter(f => f.feedType === cat).reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
                                    const percentage = totalStockValue ? (value / totalStockValue) * 100 : 0;
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
                            <div className="mt-8 space-y-4">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm"><Layers size={16} className="text-blue-500" /> Top Purchased Items</h3>
                                {topPurchasedItems.map(item => (
                                    <div key={item.name}>
                                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                            <span>{item.name}</span>
                                            <span>PKR {(item.cost/1000).toFixed(1)}k</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                                            <div className={`${item.bg} h-1.5 rounded-full`} style={{ width: `${Math.min(100, (item.cost / (topPurchasedItems[0]?.cost || 1)) * 100)}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'ANALYTICS' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Price Trend Chart */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500" /> Item Price Trend (PKR)</h3>
                            <div className="h-72">
                                {priceTrendData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={priceTrendData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip contentStyle={{ borderRadius: '12px' }} />
                                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                                            {feedItems.map((item, idx) => (
                                                <Line key={item.id} type="monotone" dataKey={item.name} stroke={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'][idx % 5]} strokeWidth={3} dot={{ r: 4 }} connectNulls activeDot={{ r: 6 }} />
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
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Clock size={18} className="text-red-500" /> Payables Aging Summary</h3>
                            <div className="h-72">
                                {payablesAging.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsBarChart data={payablesAging} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" tickFormatter={(v) => `\${v >= 1000 ? v/1000+'k' : v}`} />
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
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><BarChart size={18} className="text-purple-500" /> Vendor Item Rate Comparison</h3>
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
                            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Archive size={16} /> Procurement History Detail</h3>
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
                                <p className="text-sm text-slate-500 font-medium mt-1">Select materials, vendor and record weight to update inventory automatically.</p>
                            </div>
                            {editingExpense && (
                                <button onClick={() => setEditingExpense(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-bold transition-colors flex items-center gap-2"><X size={16} /> Cancel Edit</button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Col 1: Material Selection */}
                            <div className="space-y-4">
                                <div className="p-1 bg-slate-100 rounded-xl flex items-center justify-between">
                                    {['GRASS', 'TMR', 'WANDA'].map(type => (
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
                                    const isQtyBased = selectedItem && (['BAG', 'BUNDLE'].includes((selectedItem.unit || '').toUpperCase()) || ['WANDA', 'TMR'].includes(selectedItem.feedType || ''));
                                    const assumedWeightPerUnit = selectedItem?.weightPerUnit || 40;

                                    if (isQtyBased) {
                                        return (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Qty ({selectedItem?.unit === 'kg' ? 'BAGs' : (selectedItem?.unit || 'BAGs')}) <span className="text-red-500">*</span></label>
                                                    <input type="number" min={0} value={procurementForm.quantity || ''} onChange={e => {
                                                        const q = parseFloat(e.target.value) || 0;
                                                        setProcurementForm(p => ({ ...p, quantity: q, weight: q * assumedWeightPerUnit }));
                                                    }} className="w-full border border-slate-200 focus:border-emerald-500 text-sm font-bold text-slate-700 rounded-xl px-3 py-2 outline-none" placeholder="0" />
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
                                        <button type="button" onClick={handleUpdateExpenseSubmit} className="w-full bg-slate-800 text-white font-bold py-2.5 rounded-xl hover:bg-slate-700 flex items-center justify-center gap-2 shadow-md transition-all z-10"><Save size={16} /> Update</button>
                                    ) : (
                                        <button type="button" onClick={handleProcurementSubmit} className="w-full bg-emerald-600 text-white font-black py-2.5 rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-md hover:shadow-emerald-200/50 transition-all z-10"><Plus size={16} /> RECORD ENTRY</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Procurement Logs - Full Width */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">Inventory Pipeline & History</h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Detailed view of all store restocks and material received</p>
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
                                                <button onClick={() => {
                                                    startEditExpense(e);
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }} className="text-slate-400 hover:text-emerald-600 bg-white shadow-sm border border-slate-100 p-2 rounded-xl transition-colors"><Edit2 size={16} /></button>
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
                        <button onClick={() => { setIsAddingItem(!isAddingItem); setEditingItem(null); setNewItemForm({ name: '', category: 'FEED', feedType: 'TMR', quantity: 0, unit: 'KG', weightPerUnit: 0, unitCost: 0, reorderLevel: 100, location: 'Feed Store', defaultSupplier: '' }); }} className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-black tracking-wider hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/30">
                            {isAddingItem ? 'CANCEL' : <><Plus size={16} /> NEW MATERIAL DEFINITION</>}
                        </button>
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
                                        <button onClick={handleSaveInventoryItem} className="w-full bg-slate-800 text-white font-black px-6 py-3.5 rounded-xl hover:bg-slate-700 transition-colors shadow-lg shadow-slate-200 flex items-center justify-center gap-2"><Save size={18} /> {editingItem ? 'COMMIT CHANGES' : 'DEPLOY MATERIAL'}</button>
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
                                        <button onClick={() => { if (confirm("Permanently archive material?")) onDeleteFeed(item.id); }} className="p-2 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg hover:text-red-600 hover:bg-red-50 transition-colors"><Archive size={14} /></button>
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
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Moving Cost</p>
                                            <p className="text-sm font-black text-slate-700 mt-0.5 border border-slate-200 bg-white px-2 py-1 rounded-lg shadow-sm">PKR {item.unitCost.toLocaleString()} / {item.unit?.toUpperCase() || 'KG'}</p>
                                        </div>
                                    </div>
                                    <div className="px-6 py-4 flex gap-2">
                                        <button onClick={() => handleRecordUsage(item)} className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold text-xs py-2.5 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-colors flex items-center justify-center gap-2"><MinusCircle size={14} /> RECORD OUTGOING</button>
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
                            const paid = relatedBills.filter(e => e.paymentStatus === 'PAID').reduce((sum, e) => sum + e.amount, 0);
                            const pending = total - paid;

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
                                        <button onClick={() => {
                                            if (!confirm(`Log artificial payment clearing ${pending.toLocaleString()} dues? (Accounting Ledger unaffected)`)) return;
                                            relatedBills.filter(b => b.paymentStatus !== 'PAID').forEach(b => onUpdateExpense({ ...b, paymentStatus: 'PAID', paymentDate: new Date().toISOString().split('T')[0] }));
                                        }} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-xs font-black tracking-wider flex items-center justify-center gap-2 shadow-md transition-colors">
                                            <CheckCircle size={14} /> FORCE SETTLEMENT
                                        </button>
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

                    {/* Detailed Vendor Analytics */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
                        {priceTrendData.length > 0 && (
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><TrendingUp className="text-emerald-500" /> Date Variation Analytics (Cost/KG)</h3>
                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={priceTrendData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(val) => `PKR ${val}`} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                                labelStyle={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }} />
                                            {Array.from(new Set(state.feed.map(f => f.name))).map((name, i) => (
                                                <Line key={name} type="monotone" dataKey={name} name={name} stroke={`hsl(${i * 45 + 150}, 70%, 50%)`} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls />
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-xs font-medium text-slate-500 mt-4 text-center">Averaged per-KG rates across recent invoices dynamically graphed per product.</p>
                            </div>
                        )}

                        {itemVendorComparisonData.data.length > 0 && (
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><BarChart className="text-blue-500" /> Vendor Price Comparison per Item (Cost/KG)</h3>
                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsBarChart data={itemVendorComparisonData.data}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(val) => `PKR ${val}`} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                cursor={{ fill: '#f8fafc' }}
                                                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                                labelStyle={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }} />
                                            {itemVendorComparisonData.vendors.map((v, i) => (
                                                <Bar key={v} dataKey={v} name={v} fill={`hsl(${i * 60 + 200}, 75%, 60%)`} radius={[4, 4, 0, 0]} maxBarSize={50} />
                                            ))}
                                        </RechartsBarChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-xs font-medium text-slate-500 mt-4 text-center">Visualizes base pricing differentials to support economic purchasing.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
