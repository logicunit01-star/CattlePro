import React, { useState, useMemo, useEffect } from 'react';
import { Expense, ExpenseCategory, Sale, Livestock, Entity, Farm, Infrastructure } from '../types';
import { Plus, DollarSign, Truck, Wrench, Syringe, Briefcase, Home, Stethoscope, Dna, ArrowLeft, Trash2, Store, User, Share2, AlertTriangle, Building2, BookOpen, Activity, Search, Filter, ArrowUpDown, PieChart as PieChartIcon, LineChart as LineChartIcon, CheckCircle2, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { backendService } from '../services/backendService';

interface Props {
    expenses: Expense[];
    sales: Sale[];
    livestockList?: Livestock[];
    entities: Entity[];
    infrastructure?: Infrastructure[];
    farms?: Farm[];
    locations?: { id: string; name: string }[];
    currentFarmId?: string | null;
    currentLocationId?: string | null;
    onAddExpense: (e: Expense) => void | Promise<void>;
    onUpdateExpense?: (e: Expense) => void | Promise<void>;
    onAddSale: (s: Sale) => void;
    onDeleteExpense: (id: string) => void;
    onDeleteSale: (id: string) => void;
}

type FinancialView = 'LIST' | 'ADD_EXPENSE' | 'ADD_SALE';

export const Financials: React.FC<Props> = ({ expenses, sales, livestockList = [], entities, infrastructure = [], farms = [], locations = [], currentFarmId, currentLocationId, onAddExpense, onUpdateExpense, onAddSale, onDeleteExpense, onDeleteSale }) => {
    const [activeTab, setActiveTab] = useState<'EXPENSES' | 'SALES' | 'LEDGER'>('EXPENSES');
    const [expenseTab, setExpenseTab] = useState<'LIST' | 'DASHBOARD' | 'VENDOR_BILLS'>('LIST');
    const [viewMode, setViewMode] = useState<FinancialView>('LIST');
    const [dateFilter, setDateFilter] = useState<'7_DAYS' | '30_DAYS' | '90_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
    const [expandedVendors, setExpandedVendors] = useState<string[]>([]);
    const [financialsKpis, setFinancialsKpis] = useState<{ totalRevenue: number; totalExpenses: number; netProfit: number } | null>(null);
    const [expensesPage, setExpensesPage] = useState<{ content: Expense[]; totalElements: number; totalPages: number; number: number; size: number } | null>(null);
    const [salesPage, setSalesPage] = useState<{ content: Sale[]; totalElements: number; totalPages: number; number: number; size: number } | null>(null);
    const [ledgerPage, setLedgerPage] = useState<{ content: { id: string; date: string; description: string; type: string; amount: number; balanceAfter: number; refId: string }[]; totalElements: number; totalPages: number; number: number; size: number } | null>(null);
    const [expensesPageNum, setExpensesPageNum] = useState(0);
    const [salesPageNum, setSalesPageNum] = useState(0);
    const [ledgerPageNum, setLedgerPageNum] = useState(0);
    const [customCategories, setCustomCategories] = useState<{ id: string; name: string; type: string }[]>([]);
    const [vendorSummary, setVendorSummary] = useState<{ supplierId: string; supplierName: string; totalBills: number; totalAmount: number; paidAmount: number; balanceDue: number }[] | null>(null);
    const [expenseAnalytics, setExpenseAnalytics] = useState<{ byCategory: { category: string; totalCost: number }[]; byDay: { date: string; totalCost: number }[] } | null>(null);
    const pageSize = 50;

    const toggleVendor = (id: string) => setExpandedVendors(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);

    const dateRangeFromFilter = useMemo(() => {
        const now = new Date();
        let start: string | undefined;
        let end: string | undefined;
        const endStr = now.toISOString().split('T')[0];
        if (dateFilter === '7_DAYS') {
            const d = new Date(now); d.setDate(d.getDate() - 7);
            start = d.toISOString().split('T')[0];
        } else if (dateFilter === '30_DAYS') {
            const d = new Date(now); d.setDate(d.getDate() - 30);
            start = d.toISOString().split('T')[0];
        } else if (dateFilter === '90_DAYS') {
            const d = new Date(now); d.setDate(d.getDate() - 90);
            start = d.toISOString().split('T')[0];
        } else if (dateFilter === 'THIS_MONTH') {
            start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        } else if (dateFilter === 'LAST_MONTH') {
            const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
            const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
            start = new Date(y, m, 1).toISOString().split('T')[0];
            end = new Date(y, m + 1, 0).toISOString().split('T')[0];
        }
        if (!end) end = endStr;
        return { startDate: start, endDate: end };
    }, [dateFilter]);

    useEffect(() => {
        backendService.getFinancialsKpis({ farmId: currentFarmId || undefined, ...dateRangeFromFilter })
            .then(setFinancialsKpis)
            .catch(() => setFinancialsKpis(null));
    }, [currentFarmId, dateRangeFromFilter.startDate, dateRangeFromFilter.endDate]);

    useEffect(() => { setExpensesPageNum(0); }, [dateFilter, searchTerm]);
    useEffect(() => { setSalesPageNum(0); }, [dateFilter, searchTerm]);
    useEffect(() => { setLedgerPageNum(0); }, [dateFilter]);

    useEffect(() => {
        backendService.getFinancialsExpenses({
            farmId: currentFarmId || undefined,
            ...dateRangeFromFilter,
            search: searchTerm || undefined,
            page: expensesPageNum,
            limit: pageSize,
            sortBy: sortConfig.key,
            sortDirection: sortConfig.direction,
        }).then(setExpensesPage).catch(() => setExpensesPage(null));
    }, [currentFarmId, dateRangeFromFilter.startDate, dateRangeFromFilter.endDate, searchTerm, expensesPageNum, sortConfig.key, sortConfig.direction]);

    useEffect(() => {
        backendService.getFinancialsSales({
            farmId: currentFarmId || undefined,
            ...dateRangeFromFilter,
            search: searchTerm || undefined,
            page: salesPageNum,
            limit: pageSize,
            sortBy: sortConfig.key,
            sortDirection: sortConfig.direction,
        }).then(setSalesPage).catch(() => setSalesPage(null));
    }, [currentFarmId, dateRangeFromFilter.startDate, dateRangeFromFilter.endDate, searchTerm, salesPageNum, sortConfig.key, sortConfig.direction]);

    useEffect(() => {
        backendService.getFinancialsLedger({
            farmId: currentFarmId || undefined,
            ...dateRangeFromFilter,
            page: ledgerPageNum,
            limit: pageSize,
        }).then(setLedgerPage).catch(() => setLedgerPage(null));
    }, [currentFarmId, dateRangeFromFilter.startDate, dateRangeFromFilter.endDate, ledgerPageNum]);

    useEffect(() => {
        backendService.getCategories('EXPENSE').then(setCustomCategories).catch(() => setCustomCategories([]));
    }, []);

    useEffect(() => {
        const params: { farmId?: string; startDate?: string; endDate?: string; dateFilter?: string } = { farmId: currentFarmId || undefined, ...dateRangeFromFilter };
        if (dateFilter !== 'ALL') params.dateFilter = dateFilter;
        backendService.getVendorSummary(params).then(setVendorSummary).catch(() => setVendorSummary(null));
    }, [currentFarmId, dateRangeFromFilter.startDate, dateRangeFromFilter.endDate, dateFilter]);

    useEffect(() => {
        const params: { farmId?: string; startDate?: string; endDate?: string; dateFilter?: string } = { farmId: currentFarmId || undefined, ...dateRangeFromFilter };
        if (dateFilter !== 'ALL') params.dateFilter = dateFilter;
        backendService.getExpenseAnalytics(params).then(setExpenseAnalytics).catch(() => setExpenseAnalytics(null));
    }, [currentFarmId, dateRangeFromFilter.startDate, dateRangeFromFilter.endDate, dateFilter]);

    const isDateInRange = (dateStr: string | undefined | null) => {
        if (!dateStr || dateFilter === 'ALL') return true;
        const days = (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
        if (dateFilter === '7_DAYS') return days <= 7;
        if (dateFilter === '30_DAYS') return days <= 30;
        if (dateFilter === '90_DAYS') return days <= 90;
        if (dateFilter === 'THIS_MONTH') {
            const d = new Date(dateStr);
            const today = new Date();
            return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        }
        if (dateFilter === 'LAST_MONTH') {
            const d = new Date(dateStr);
            const today = new Date();
            const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
            const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
            return d.getMonth() === lastMonth && d.getFullYear() === year;
        }
        return true;
    };

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const ledgerEntries = useMemo(() => {
        const entries = [
            ...expenses.map(e => ({
                id: `exp_${e.id}`,
                date: e.date || '',
                description: e.description || `Expense: ${e.category}`,
                type: 'EXPENSE',
                amount: e.amount || 0,
                refId: e.id,
                farmId: e.farmId
            })),
            ...sales.map(s => ({
                id: `sale_${s.id}`,
                date: s.date || '',
                description: s.description || `Sale: ${s.itemType || 'ANIMAL'}`,
                type: 'SALE',
                amount: s.amount || 0,
                refId: s.id,
                farmId: s.farmId
            }))
        ];

        // Sort by date chronological (oldest to newest for running balance calculation)
        entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let balance = 0;
        const fullyCalculated = entries.map(entry => {
            if (entry.type === 'SALE') {
                balance += entry.amount;
            } else {
                balance -= entry.amount;
            }
            return { ...entry, balance };
        }).reverse(); // Reverse back for latest first

        // Filter the pre-calculated ledger for display based on search and date
        return fullyCalculated.filter(entry => {
            const matchesDate = isDateInRange(entry.date);
            const matchesSearch = searchTerm ? entry.description.toLowerCase().includes(searchTerm.toLowerCase()) || entry.type.toLowerCase().includes(searchTerm.toLowerCase()) : true;
            return matchesDate && matchesSearch;
        });
    }, [expenses, sales, dateFilter, searchTerm]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            const matchesDate = isDateInRange(e.date);
            const matchesSearch = searchTerm ? (e.description?.toLowerCase().includes(searchTerm.toLowerCase()) || e.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) || e.category.toLowerCase().includes(searchTerm.toLowerCase())) : true;
            return matchesDate && matchesSearch;
        }).sort((a, b) => {
            if (sortConfig.key === 'date') return sortConfig.direction === 'asc' ? new Date(a.date).getTime() - new Date(b.date).getTime() : new Date(b.date).getTime() - new Date(a.date).getTime();
            if (sortConfig.key === 'amount') return sortConfig.direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
            return 0;
        });
    }, [expenses, dateFilter, searchTerm, sortConfig]);

    const filteredSales = useMemo(() => {
        return sales.filter(s => {
            const matchesDate = isDateInRange(s.date);
            const matchesSearch = searchTerm ? (s.buyer?.toLowerCase().includes(searchTerm.toLowerCase()) || s.description?.toLowerCase().includes(searchTerm.toLowerCase()) || s.itemType.toLowerCase().includes(searchTerm.toLowerCase())) : true;
            return matchesDate && matchesSearch;
        }).sort((a, b) => {
            if (sortConfig.key === 'date') return sortConfig.direction === 'asc' ? new Date(a.date).getTime() - new Date(b.date).getTime() : new Date(b.date).getTime() - new Date(a.date).getTime();
            if (sortConfig.key === 'amount') return sortConfig.direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
            return 0;
        });
    }, [sales, dateFilter, searchTerm, sortConfig]);

    const scopeLabel = currentFarmId
        ? farms.find(f => f.id === currentFarmId)?.name || 'Selected farm'
        : currentLocationId
            ? `All farms in ${locations.find(l => l.id === currentLocationId)?.name || 'selected city'}`
            : null;
    const showFarmColumn = Boolean(!currentFarmId && currentLocationId && farms.length > 0);
    const getFarmName = (farmId: string | undefined) => (farmId && farms.length) ? (farms.find(f => f.id === farmId)?.name ?? '—') : '—';

    // Forms State
    const [newExpense, setNewExpense] = useState<Partial<Expense>>({
        amount: 0, category: ExpenseCategory.OTHER, date: new Date().toISOString().split('T')[0], description: ''
    });

    const [newSale, setNewSale] = useState<Partial<Sale>>({
        amount: 0, date: new Date().toISOString().split('T')[0], buyer: '', weightAtSale: 0, animalId: '', itemType: 'ANIMAL', quantity: 0, description: '', soldAnimalIds: [], saleType: 'SINGLE_ANIMAL'
    });
    const [livestockSaleMode, setLivestockSaleMode] = useState<'SINGLE' | 'BULK'>('SINGLE');
    const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);

    const getCategoryIcon = (cat: ExpenseCategory) => {
        switch (cat) {
            case ExpenseCategory.TRANSPORT: return <Truck size={16} />;
            case ExpenseCategory.MAINTENANCE: return <Wrench size={16} />;
            case ExpenseCategory.VACCINE: return <Syringe size={16} />;
            case ExpenseCategory.MEDICAL: return <Stethoscope size={16} />;
            case ExpenseCategory.BREEDING: return <Dna size={16} />;
            case ExpenseCategory.LABOR: return <Briefcase size={16} />;
            case ExpenseCategory.INFRASTRUCTURE: return <Home size={16} />;
            default: return <DollarSign size={16} />;
        }
    };

    const handleSaveExpense = async () => {
        if (!newExpense.amount || !newExpense.description) return alert("Amount and Description required");
        const categoryValue = newExpense.category && Object.values(ExpenseCategory).includes(newExpense.category as ExpenseCategory) ? newExpense.category : ExpenseCategory.OTHER;
        const expense: Expense = {
            id: Math.random().toString(36).substr(2, 9),
            farmId: currentFarmId || '',
            category: categoryValue as ExpenseCategory,
            amount: Number(newExpense.amount),
            date: newExpense.date || new Date().toISOString().split('T')[0],
            description: newExpense.description,
            location: newExpense.location,
            relatedAnimalId: newExpense.relatedAnimalId,
            supplier: newExpense.supplier,
            paymentStatus: newExpense.supplier ? 'PENDING' : 'PAID', // Default to pending if vendor selected
            amountPaid: 0
        };
        try {
            await onAddExpense(expense);
            setViewMode('LIST');
            setNewExpense({ amount: 0, category: ExpenseCategory.OTHER, date: new Date().toISOString().split('T')[0], description: '' });
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveSale = () => {
        if (!newSale.amount || !newSale.buyer) return alert("Amount and Buyer required");
        const itemType = newSale.itemType || 'ANIMAL';

        if (itemType === 'ANIMAL') {
            if (!currentFarmId && !currentLocationId) return alert("Please select a farm above to record livestock sales (only animals from the selected farm can be sold).");
            if (livestockSaleMode === 'SINGLE') {
                if (!newSale.animalId) return alert("Please select the sold animal.");
                onAddSale({
                    id: Math.random().toString(36).substr(2, 9),
                    amount: Number(newSale.amount),
                    buyer: newSale.buyer,
                    date: newSale.date || new Date().toISOString().split('T')[0],
                    animalId: newSale.animalId,
                    soldAnimalIds: [newSale.animalId],
                    saleType: 'SINGLE_ANIMAL',
                    itemType,
                    weightAtSale: Number(newSale.weightAtSale) || 0,
                    description: newSale.description || ''
                });
            } else {
                if (!selectedAnimalIds.length) return alert("Please select at least one animal for bulk sale.");
                onAddSale({
                    id: Math.random().toString(36).substr(2, 9),
                    amount: Number(newSale.amount),
                    buyer: newSale.buyer,
                    date: newSale.date || new Date().toISOString().split('T')[0],
                    soldAnimalIds: selectedAnimalIds,
                    saleType: 'BULK_ANIMALS',
                    itemType,
                    weightAtSale: Number(newSale.weightAtSale) || undefined,
                    description: newSale.description || `Bulk sale: ${selectedAnimalIds.length} animals`
                });
            }
        } else {
            let description = '';
            if (itemType === 'MILK') description = `Milk Sale: ${Number(newSale.quantity) || 0} L`;
            else if (itemType === 'MANURE') description = (newSale.description && newSale.description.trim()) || 'Manure / Compost Sale';
            else if (itemType === 'OTHER') description = (newSale.description && newSale.description.trim()) || 'Other Income';
            else description = newSale.description || '';

            onAddSale({
                id: Math.random().toString(36).substr(2, 9),
                amount: Number(newSale.amount),
                buyer: newSale.buyer,
                date: newSale.date || new Date().toISOString().split('T')[0],
                itemType,
                quantity: Number(newSale.quantity) || 0,
                description
            });
        }
        setViewMode('LIST');
        setNewSale({ amount: 0, date: new Date().toISOString().split('T')[0], buyer: '', weightAtSale: 0, animalId: '', itemType: 'ANIMAL', quantity: 0, description: '', soldAnimalIds: [], saleType: 'SINGLE_ANIMAL' });
        setSelectedAnimalIds([]);
        setLivestockSaleMode('SINGLE');
    };

    const totalExpensesCalc = financialsKpis != null ? financialsKpis.totalExpenses : filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSalesCalc = financialsKpis != null ? financialsKpis.totalRevenue : filteredSales.reduce((sum, s) => sum + s.amount, 0);
    const expensesForList = expensesPage?.content ?? filteredExpenses;
    const salesForList = salesPage?.content ?? filteredSales;
    const ledgerForList = ledgerPage?.content ?? ledgerEntries;
    const expenseCategoriesForDropdown = useMemo(() => {
        const builtIn = Object.values(ExpenseCategory);
        const custom = customCategories.filter(c => c.type === 'EXPENSE').map(c => c.name);
        return [...builtIn, ...custom];
    }, [customCategories]);

    const saleTypeLabel = (itemType: string) => {
        switch (itemType) {
            case 'ANIMAL': return 'Livestock';
            case 'MILK': return 'Milk / Produce';
            case 'MANURE': return 'Manure / Compost';
            case 'OTHER': return 'Other Income';
            default: return itemType || '—';
        }
    };
    const saleItemDisplay = (sale: Sale) => {
        const type = sale.itemType || 'ANIMAL';
        if (type === 'ANIMAL') {
            const ids = sale.soldAnimalIds;
            if (ids && ids.length > 1) return `${ids.length} animals`;
            const id = (sale as any).animalId ?? (ids && ids[0]);
            return id ? `ID: ${id}` : '—';
        }
        if (type === 'MILK') return sale.quantity ? `${sale.quantity} L` : (sale.description || '—');
        if (type === 'MANURE' || type === 'OTHER') return sale.description || saleTypeLabel(type);
        return sale.description || '—';
    };
    const saleQtyWeightDisplay = (sale: Sale) => {
        const type = sale.itemType || 'ANIMAL';
        if (type === 'ANIMAL') return sale.weightAtSale != null ? `${sale.weightAtSale} kg` : '—';
        if (type === 'MILK') return sale.quantity != null ? `${sale.quantity} L` : '—';
        return '—';
    };

    const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    // RENDER
    if (viewMode === 'ADD_EXPENSE') {
        return (
            <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
                <div className="flex items-center gap-4">
                    <button onClick={() => setViewMode('LIST')} className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800">Log Expense</h2>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (PKR)</label>
                        <input type="number" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newExpense.category ?? ''} onChange={e => setNewExpense({ ...newExpense, category: (e.target.value as ExpenseCategory) || ExpenseCategory.OTHER })}>
                                {expenseCategoriesForDropdown.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input type="date" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <textarea className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 h-24 resize-none" value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="Expense details..."></textarea>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Flock/Group (Cost Centre)</label>
                            <select className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 bg-white" value={newExpense.location || ''} onChange={e => setNewExpense({ ...newExpense, location: e.target.value })}>
                                <option value="">Select Location/Barn (Optional)</option>
                                {infrastructure.filter(i => i.category === 'BUILDING' || i.category === 'PASTURE').map(i => (
                                    <option key={i.id} value={i.id}>{i.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Individual Animal</label>
                            <select className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 bg-white" value={newExpense.relatedAnimalId || ''} onChange={e => setNewExpense({ ...newExpense, relatedAnimalId: e.target.value })}>
                                <option value="">Select Animal (Optional)</option>
                                {livestockList.filter(l => l.status === 'ACTIVE').map(l => (
                                    <option key={l.id} value={l.id}>{l.tagId} ({l.category})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor / Payee</label>
                            <select
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                                value={newExpense.supplier || ''}
                                onChange={e => setNewExpense({ ...newExpense, supplier: e.target.value })}
                            >
                                <option value="">Select Vendor...</option>
                                <option value="CASH">Cash / Petty Cash</option>
                                {entities.filter(e => e.type === 'VENDOR').map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-400 mt-1">Manage Vendors in "Entity Registry"</p>
                        </div>

                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setViewMode('LIST')} className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium">Cancel</button>
                        <button onClick={handleSaveExpense} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">Save Expense</button>
                    </div>
                </div>
            </div>
        );
    }

    if (viewMode === 'ADD_SALE') {
        return (
            <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
                <div className="flex items-center gap-4">
                    <button onClick={() => setViewMode('LIST')} className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800">Record Sale</h2>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sale Type</label>
                            <select className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newSale.itemType || 'ANIMAL'} onChange={e => { setNewSale({ ...newSale, itemType: e.target.value as any, animalId: '' }); setSelectedAnimalIds([]); }}>
                                <option value="ANIMAL">Livestock</option>
                                <option value="MILK">Milk / Produce</option>
                                <option value="MANURE">Manure / Compost</option>
                                <option value="OTHER">Other Income</option>
                            </select>
                        </div>
                        <div>
                            {(!newSale.itemType || newSale.itemType === 'ANIMAL') ? (
                                <>
                                    <p className="text-xs text-gray-500 mb-1">Animals shown are from the selected farm only.</p>
                                    <div className="flex gap-2 mb-2">
                                        <button type="button" onClick={() => { setLivestockSaleMode('SINGLE'); setSelectedAnimalIds([]); }} className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${livestockSaleMode === 'SINGLE' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-200 text-gray-500'}`}>Single</button>
                                        <button type="button" onClick={() => { setLivestockSaleMode('BULK'); setNewSale({ ...newSale, animalId: '' }); }} className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${livestockSaleMode === 'BULK' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-200 text-gray-500'}`}>Bulk</button>
                                    </div>
                                    {livestockSaleMode === 'SINGLE' ? (
                                        <>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Sold Animal</label>
                                            <select className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newSale.animalId} onChange={e => setNewSale({ ...newSale, animalId: e.target.value })}>
                                                <option value="">Select Animal...</option>
                                                {livestockList.filter(c => c.status === 'ACTIVE').map(c => (
                                                    <option key={c.id} value={c.id}>[{c.species}] {c.tagId} - {c.breed}</option>
                                                ))}
                                            </select>
                                        </>
                                    ) : (
                                        <>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Animals ({selectedAnimalIds.length} selected)</label>
                                            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50 space-y-1">
                                                {livestockList.filter(c => c.status === 'ACTIVE').length === 0 ? (
                                                    <p className="text-xs text-gray-500 py-2">No active animals in selected farm. Select a farm above.</p>
                                                ) : (
                                                    livestockList.filter(c => c.status === 'ACTIVE').map(c => (
                                                        <label key={c.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-white rounded px-2">
                                                            <input type="checkbox" checked={selectedAnimalIds.includes(c.id)} onChange={e => setSelectedAnimalIds(prev => e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id))} className="rounded border-gray-300" />
                                                            <span className="text-sm">[{c.species}] {c.tagId} - {c.breed}</span>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : newSale.itemType === 'MILK' ? (
                                <>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (Liters)</label>
                                    <input type="number" step="any" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newSale.quantity ?? ''} onChange={e => setNewSale({ ...newSale, quantity: parseFloat(e.target.value) || 0 })} placeholder="e.g. 50" />
                                </>
                            ) : (newSale.itemType === 'MANURE' || newSale.itemType === 'OTHER') ? (
                                <>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{newSale.itemType === 'MANURE' ? 'Details (e.g. 200 kg compost)' : 'Description (e.g. Other income)'}</label>
                                    <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newSale.description ?? ''} onChange={e => setNewSale({ ...newSale, description: e.target.value })} placeholder={newSale.itemType === 'MANURE' ? 'e.g. 200 kg compost' : 'e.g. Rental income'} />
                                </>
                            ) : null}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sale Amount (PKR)</label>
                            <input type="number" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newSale.amount} onChange={e => setNewSale({ ...newSale, amount: parseFloat(e.target.value) })} />
                        </div>
                        <div>
                            {(newSale.itemType || 'ANIMAL') === 'ANIMAL' && (
                                <>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight at sale (kg)</label>
                                    <input type="number" step="any" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newSale.weightAtSale ?? ''} onChange={e => setNewSale({ ...newSale, weightAtSale: parseFloat(e.target.value) || 0 })} />
                                </>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Buyer (Customer)</label>
                            <select
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                                value={newSale.buyer}
                                onChange={e => setNewSale({ ...newSale, buyer: e.target.value })}
                            >
                                <option value="">Select Customer...</option>
                                <option value="Walk-In">Walk-In Customer</option>
                                {entities.filter(e => e.type === 'CUSTOMER' || e.type === 'PALAI_CLIENT').map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input type="date" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newSale.date} onChange={e => setNewSale({ ...newSale, date: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setViewMode('LIST')} className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium">Cancel</button>
                        <button onClick={handleSaveSale} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">Confirm Sale</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {scopeLabel && (
                <div className="flex items-center gap-2 text-sm">
                    <Building2 size={18} className="text-emerald-600" />
                    <span className="text-gray-500 font-medium">Showing data for:</span>
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-200">{scopeLabel}</span>
                </div>
            )}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight font-display">Financial Management</h2>
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex-1 md:w-40 premium-card">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Filtered Revenue</p>
                        <p className="text-xl font-extrabold text-emerald-600">PKR {totalSalesCalc.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex-1 md:w-40 premium-card">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Filtered Expenses</p>
                        <p className="text-xl font-extrabold text-red-500">PKR {totalExpensesCalc.toLocaleString()}</p>
                    </div>
                    <div className={`p-4 rounded-2xl shadow-lg flex-1 md:w-48 text-white ${(totalSalesCalc - totalExpensesCalc) >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-200' : 'bg-gradient-to-br from-red-500 to-pink-600 shadow-red-200'}`}>
                        <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-1">Filtered Profit</p>
                        <p className="text-2xl font-extrabold">PKR {(totalSalesCalc - totalExpensesCalc).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Advanced Filters and Navigation */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6">
                <div className="flex bg-slate-100/50 p-1.5 rounded-xl gap-2 w-full md:w-fit">
                    <button
                        onClick={() => setActiveTab('EXPENSES')}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'EXPENSES'
                            ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                            }`}
                    >
                        Expenses
                    </button>
                    <button
                        onClick={() => setActiveTab('SALES')}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'SALES'
                            ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                            }`}
                    >
                        Sales
                    </button>
                    <button
                        onClick={() => setActiveTab('LEDGER')}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'LEDGER'
                            ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                            }`}
                    >
                        <BookOpen size={16} /> Ledger
                    </button>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search records..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
                        />
                    </div>
                    <select
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 text-sm font-bold text-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                        <option value="ALL">All Time</option>
                        <option value="THIS_MONTH">This Month</option>
                        <option value="LAST_MONTH">Last Month</option>
                        <option value="7_DAYS">Last 7 Days</option>
                        <option value="30_DAYS">Last 30 Days</option>
                        <option value="90_DAYS">Last 90 Days</option>
                    </select>
                </div>
            </div>

            {activeTab === 'SALES' && !currentFarmId && !currentLocationId && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-2 mb-4">
                    <AlertTriangle size={20} />
                    <span className="text-sm font-medium">Select a farm or city above to see only that farm&apos;s sales history and to record sales for animals from that farm (single or bulk).</span>
                </div>
            )}

            {activeTab === 'EXPENSES' ? (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                        <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm text-sm">
                            <button onClick={() => setExpenseTab('LIST')} className={`px-4 py-1.5 rounded-lg font-bold transition-all ${expenseTab === 'LIST' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Records</button>
                            <button onClick={() => setExpenseTab('DASHBOARD')} className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${expenseTab === 'DASHBOARD' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}><PieChartIcon size={16} /> Reports</button>
                            <button onClick={() => setExpenseTab('VENDOR_BILLS')} className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${expenseTab === 'VENDOR_BILLS' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}><Store size={16} /> Payables & Bills</button>
                        </div>
                        <button
                            onClick={() => setViewMode('ADD_EXPENSE')}
                            className="flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-emerald-200 shadow-md"
                        >
                            <Plus size={18} /> Log Expense
                        </button>
                    </div>

                    {expenseTab === 'DASHBOARD' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                            {/* Expense By Category */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 premium-card">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 font-display"><PieChartIcon size={20} className="text-emerald-500" /> Expenses by Category (Filtered)</h3>
                                <div className="h-64 mb-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {(() => {
                                            const categoryData = expenseAnalytics?.byCategory?.length
                                                ? expenseAnalytics.byCategory.map(c => ({ name: c.category, value: c.totalCost }))
                                                : filteredExpenses.reduce((acc, curr) => {
                                                    const existing = acc.find(x => x.name === curr.category);
                                                    if (existing) existing.value += curr.amount;
                                                    else acc.push({ name: curr.category, value: curr.amount });
                                                    return acc;
                                                }, [] as any[]).sort((a, b) => b.value - a.value);

                                            return (
                                                <PieChart>
                                                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                                        {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                    </Pie>
                                                    <RechartsTooltip formatter={(value: number) => `PKR ${value.toLocaleString()}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                                </PieChart>
                                            )
                                        })()}
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {(expenseAnalytics?.byCategory ?? filteredExpenses.reduce((acc, curr) => {
                                        const existing = acc.find(x => x.name === curr.category);
                                        if (existing) existing.value += curr.amount;
                                        else acc.push({ name: curr.category, value: curr.amount });
                                        return acc;
                                    }, [] as any[]).map(c => ({ category: c.name, totalCost: c.value }))).slice(0, 6).map((cat: { category?: string; name?: string; totalCost?: number; value?: number }, idx: number) => {
                                        const name = cat.category ?? cat.name ?? '';
                                        const cost = cat.totalCost ?? cat.value ?? 0;
                                        return (
                                        <div key={idx} className="flex justify-between p-1">
                                            <span className="text-slate-600 font-bold flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div> {name}</span>
                                            <span className="font-black">{(totalExpensesCalc > 0 ? (cost / totalExpensesCalc * 100) : 0).toFixed(1)}%</span>
                                        </div>
                                    ); })}
                                </div>
                            </div>

                            {/* Expenses Trend Date-Wise */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 premium-card">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 font-display"><LineChartIcon size={20} className="text-blue-500" /> Daily Expense Trend</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {(() => {
                                            const dateData = expenseAnalytics?.byDay?.length
                                                ? expenseAnalytics.byDay.map(d => ({ date: d.date.slice(5), fullDate: d.date, cost: d.totalCost })).sort((a, b) => a.fullDate.localeCompare(b.fullDate))
                                                : filteredExpenses.reduce((acc, curr) => {
                                                    const existing = acc.find(x => x.date === curr.date?.substring(5));
                                                    if (existing) existing.cost += curr.amount;
                                                    else acc.push({ date: (curr.date || '').substring(5), fullDate: curr.date || '', cost: curr.amount });
                                                    return acc;
                                                }, [] as any[]).sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());

                                            return (
                                                <BarChart data={dateData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} />
                                                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                                    <Bar dataKey="cost" name="Total Expense" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                                </BarChart>
                                            )
                                        })()}
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {expenseTab === 'VENDOR_BILLS' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in premium-card">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 font-display">
                                    <Store className="text-indigo-600" size={20} />
                                    Vendor Payables & Credit Bills
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">To log a bill, select a Vendor when adding an expense.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-white">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vendor</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bill Info</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Billed</th>
                                            <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {(() => {
                                            const useServerSummary = vendorSummary && vendorSummary.length > 0;
                                            const vendorBills = filteredExpenses.filter(e => e.supplier);
                                            const billsByVendor = useServerSummary
                                                ? null
                                                : vendorBills.reduce((acc, exp) => {
                                                    if (!acc[exp.supplier!]) acc[exp.supplier!] = { vendorId: exp.supplier!, bills: [], total: 0, pending: 0, paid: 0 };
                                                    acc[exp.supplier!].bills.push(exp);
                                                    acc[exp.supplier!].total += exp.amount;
                                                    if (exp.paymentStatus === 'PAID') acc[exp.supplier!].paid += exp.amount;
                                                    else acc[exp.supplier!].pending += exp.amount;
                                                    return acc;
                                                }, {} as Record<string, { vendorId: string, bills: Expense[], total: number, pending: number, paid: number }>);

                                            const hasVendors = useServerSummary || (billsByVendor && Object.keys(billsByVendor).length > 0);
                                            if (!hasVendors) {
                                                return (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                                            <Store className="mx-auto mb-3 opacity-30 text-indigo-500" size={40} />
                                                            <p className="font-bold text-slate-600">No vendor bills found</p>
                                                            <p className="text-xs text-slate-400 mt-1">When adding an expense, select a Vendor to see it here as a payable bill.</p>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return (useServerSummary ? vendorSummary!.map((v) => ({
                                                vendorId: v.supplierId,
                                                bills: [] as Expense[],
                                                totalBills: v.totalBills,
                                                total: v.totalAmount,
                                                pending: v.balanceDue,
                                                paid: v.paidAmount,
                                            })) : Object.values(billsByVendor!).map(({ vendorId, bills, total, pending, paid }) => ({ vendorId, bills, totalBills: bills.length, total, pending, paid }))).map(({ vendorId, bills, totalBills, pending, paid, total }) => {
                                                const vendor = entities.find(v => v.id === vendorId);
                                                const vendorName = (useServerSummary ? (vendorSummary!.find(v => v.supplierId === vendorId)?.supplierName ?? vendor?.name) : (vendor ? vendor.name : 'Unknown Vendor')) ?? vendorId;
                                                const isExpanded = expandedVendors.includes(vendorId);

                                                return (
                                                    <React.Fragment key={vendorId}>
                                                        {/* Vendor Summary Row */}
                                                        <tr onClick={() => !useServerSummary && toggleVendor(vendorId)} className={`hover:bg-indigo-50/50 transition-colors ${!useServerSummary ? 'cursor-pointer' : ''} bg-slate-50/80 border-b-2 border-slate-100 group`}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800 flex items-center gap-2">
                                                                <div className={`p-1.5 rounded-md transition-colors ${isExpanded ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white shadow-sm text-slate-500 group-hover:bg-indigo-100'}`}>
                                                                    <Store size={16} />
                                                                </div>
                                                                {vendorName}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-bold">
                                                                {totalBills ?? bills.length} Invoices
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                <span className="text-emerald-600 font-extrabold bg-emerald-100/50 border border-emerald-100 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider">Paid: PKR {paid.toLocaleString()}</span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                {pending > 0 ? <span className="text-rose-600 font-extrabold bg-rose-100/50 border border-rose-100 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider animate-pulse transition-none">Pending: PKR {pending.toLocaleString()}</span> : <span className="text-slate-400 font-bold text-xs p-1"><CheckCircle2 size={14} className="inline mr-1 text-emerald-500" />Settled</span>}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                                <div><span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5 mt-[-4px]">Total</span> <span className="font-extrabold text-indigo-700 text-lg">PKR {total.toLocaleString()}</span></div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-[11px] font-black uppercase tracking-widest text-indigo-500 group-hover:text-indigo-700 transition-colors">
                                                                {isExpanded ? 'Hide Details' : 'View Details'}
                                                            </td>
                                                        </tr>
                                                        {/* Expanded Bills list (client-side only; when using server vendor-summary no per-bill list) */}
                                                        {isExpanded && bills.length > 0 && bills.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((exp, idx) => {
                                                            const isPaid = exp.paymentStatus === 'PAID';
                                                            return (
                                                                <tr key={exp.id} className={`bg-white hover:bg-slate-50 transition-colors border-l-4 ${isPaid ? 'border-l-emerald-400' : 'border-l-indigo-500'} ${idx === bills.length - 1 ? 'border-b-4 border-b-slate-100' : 'border-b border-b-gray-50'}`}>
                                                                    <td className="px-6 py-3 whitespace-nowrap text-xs font-bold text-slate-500 pl-10 border-b border-gray-50">{exp.date}</td>
                                                                    <td colSpan={2} className="px-6 py-3 text-sm text-slate-600 border-b border-gray-50">
                                                                        <span className="font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs mr-2">{exp.category}</span>
                                                                        <span className="text-sm font-medium text-slate-500">{exp.description}</span>
                                                                    </td>
                                                                    <td className="px-6 py-3 whitespace-nowrap border-b border-gray-50">
                                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700 shadow-sm'}`}>
                                                                            {isPaid ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                                                            {exp.paymentStatus || 'PENDING'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-extrabold text-slate-700 border-b border-gray-50">
                                                                        PKR {exp.amount.toLocaleString()}
                                                                    </td>
                                                                    <td className="px-6 py-3 whitespace-nowrap text-right text-sm border-b border-gray-50">
                                                                        {!isPaid && onUpdateExpense && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (confirm(`Mark bill from ${vendorName} as fully PAID in cash/bank?`)) {
                                                                                        onUpdateExpense({ ...exp, paymentStatus: 'PAID', amountPaid: exp.amount, paymentDate: new Date().toISOString().split('T')[0] });
                                                                                    }
                                                                                }}
                                                                                className="px-4 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white text-indigo-700 font-extrabold text-[11px] uppercase tracking-wider rounded-lg transition-all shadow-sm"
                                                                            >
                                                                                Pay
                                                                            </button>
                                                                        )}
                                                                        {isPaid && onUpdateExpense && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (confirm(`Revert bill payment status to UNPAID?`)) {
                                                                                        onUpdateExpense({ ...exp, paymentStatus: 'PENDING', amountPaid: 0, paymentDate: undefined });
                                                                                    }
                                                                                }}
                                                                                className="px-2 py-1 text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase underline transition-colors"
                                                                            >
                                                                                Revert
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </React.Fragment>
                                                )
                                            })
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {expenseTab === 'LIST' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th onClick={() => handleSort('date')} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"><div className="flex items-center gap-1">Date <ArrowUpDown size={12} /></div></th>
                                            {showFarmColumn && <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Farm</th>}
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                                            <th onClick={() => handleSort('amount')} className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"><div className="flex items-center justify-end gap-1">Amount <ArrowUpDown size={12} /></div></th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {expensesForList.map((expense) => (
                                            <tr key={expense.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{expense.date}</td>
                                                {showFarmColumn && <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">{getFarmName(expense.farmId)}</td>}
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${expense.category === ExpenseCategory.VACCINE ? 'bg-blue-100 text-blue-800' : expense.category === ExpenseCategory.MEDICAL ? 'bg-orange-100 text-orange-800' : expense.category === ExpenseCategory.BREEDING ? 'bg-pink-100 text-pink-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {getCategoryIcon(expense.category)}
                                                        {expense.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{expense.description}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-800">
                                                    PKR {expense.amount.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <button
                                                        onClick={() => { if (confirm('Delete this expense?')) onDeleteExpense(expense.id); }}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {expensesForList.length === 0 && (
                                            <tr>
                                                <td colSpan={showFarmColumn ? 6 : 5} className="text-center py-16 bg-slate-50/50">
                                                    <Activity className="mx-auto mb-4 opacity-30 text-red-500" size={48} />
                                                    <p className="font-bold text-slate-600 text-lg">No expenses recorded yet</p>
                                                    <p className="text-sm text-slate-400 mt-1">Click the 'Log Expense' button to register an expense.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {expensesPage && expensesPage.totalPages > 1 && (
                                <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                                    <span className="text-sm text-gray-600">Page {expensesPage.number + 1} of {expensesPage.totalPages} ({expensesPage.totalElements} total)</span>
                                    <div className="flex gap-2">
                                        <button type="button" disabled={expensesPage.number === 0} onClick={() => setExpensesPageNum(p => Math.max(0, p - 1))} className="px-3 py-1 rounded border border-gray-200 text-sm font-medium disabled:opacity-50">Prev</button>
                                        <button type="button" disabled={expensesPage.number >= expensesPage.totalPages - 1} onClick={() => setExpensesPageNum(p => p + 1)} className="px-3 py-1 rounded border border-gray-200 text-sm font-medium disabled:opacity-50">Next</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : activeTab === 'SALES' ? (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-end">
                        <button
                            onClick={() => setViewMode('ADD_SALE')}
                            className="flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-emerald-200 shadow-md"
                        >
                            <Plus size={18} /> Record New Sale
                        </button>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th onClick={() => handleSort('date')} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"><div className="flex items-center gap-1">Date <ArrowUpDown size={12} /></div></th>
                                        {showFarmColumn && <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Farm</th>}
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Buyer</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item / Reference</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Qty / Weight</th>
                                        <th onClick={() => handleSort('amount')} className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"><div className="flex items-center justify-end gap-1">Amount <ArrowUpDown size={12} /></div></th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {salesForList.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sale.date}</td>
                                            {showFarmColumn && <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">{getFarmName(sale.farmId)}</td>}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${sale.itemType === 'ANIMAL' ? 'bg-blue-100 text-blue-800' : sale.itemType === 'MILK' ? 'bg-amber-100 text-amber-800' : sale.itemType === 'MANURE' ? 'bg-stone-100 text-stone-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {saleTypeLabel(sale.itemType || 'ANIMAL')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{sale.buyer}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 max-w-[180px] truncate" title={saleItemDisplay(sale)}>{saleItemDisplay(sale)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{saleQtyWeightDisplay(sale)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                                                +PKR {sale.amount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button
                                                    onClick={async () => {
                                                        const inv = await backendService.getSaleInvoice(sale.id);
                                                        const text = inv
                                                            ? `*INVOICE ${inv.invoiceNumber}*\n\nDate: ${inv.date}\nBuyer: ${inv.buyer}\nType: ${inv.itemType}\n${inv.description ? `Details: ${inv.description}\n` : ''}Amount: PKR ${inv.amount.toLocaleString()}\nPaid: PKR ${inv.amountPaid.toLocaleString()}\nBalance: PKR ${inv.balanceDue.toLocaleString()}\nStatus: ${inv.paymentStatus}\n\nThank you for your business!`
                                                            : `*INVOICE*\n\nDate: ${sale.date}\nBuyer: ${sale.buyer}\nAmount: PKR ${sale.amount.toLocaleString()}\nStatus: ${(sale.amountReceived ?? 0) >= sale.amount ? 'PAID' : 'PENDING'}\n\nThank you!`;
                                                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                                    }}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors mr-2"
                                                    title="Share Invoice"
                                                >
                                                    <Share2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => { if (confirm('Delete this sale?')) onDeleteSale(sale.id); }}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {salesForList.length === 0 && (
                                        <tr>
                                            <td colSpan={showFarmColumn ? 8 : 7} className="text-center py-16 bg-slate-50/50">
                                                <DollarSign className="mx-auto mb-4 opacity-30 text-emerald-600" size={48} />
                                                <p className="font-bold text-slate-600 text-lg">No sales recorded yet</p>
                                                <p className="text-sm text-slate-400 mt-1">Click the 'Record New Sale' button to register revenue.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {salesPage && salesPage.totalPages > 1 && (
                            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                                <span className="text-sm text-gray-600">Page {salesPage.number + 1} of {salesPage.totalPages} ({salesPage.totalElements} total)</span>
                                <div className="flex gap-2">
                                    <button type="button" disabled={salesPage.number === 0} onClick={() => setSalesPageNum(p => Math.max(0, p - 1))} className="px-3 py-1 rounded border border-gray-200 text-sm font-medium disabled:opacity-50">Prev</button>
                                    <button type="button" disabled={salesPage.number >= salesPage.totalPages - 1} onClick={() => setSalesPageNum(p => p + 1)} className="px-3 py-1 rounded border border-gray-200 text-sm font-medium disabled:opacity-50">Next</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : activeTab === 'LEDGER' ? (
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden premium-card">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 font-display">
                                <BookOpen className="text-emerald-600" size={20} />
                                Chronological Double-Entry Ledger
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                                        {showFarmColumn && <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Farm</th>}
                                        <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest text-emerald-600">Credit (In)</th>
                                        <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest text-red-500">Debit (Out)</th>
                                        <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Running Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {ledgerForList.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">{entry.date}</td>
                                            <td className="px-6 py-4 text-sm text-slate-800 font-medium">
                                                <div className="flex flex-col">
                                                    <span>{entry.description}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{entry.type} • ID: {entry.refId.substring(0, 6)}</span>
                                                </div>
                                            </td>
                                            {showFarmColumn && <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{getFarmName(entry.farmId)}</td>}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-emerald-600">
                                                {entry.type === 'SALE' ? `+ PKR ${entry.amount.toLocaleString()}` : '—'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-red-500">
                                                {entry.type === 'EXPENSE' ? `- PKR ${entry.amount.toLocaleString()}` : '—'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-black text-slate-800">
                                                PKR {(entry.balance ?? (entry as any).balanceAfter ?? 0).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {ledgerForList.length === 0 && (
                                        <tr>
                                            <td colSpan={showFarmColumn ? 6 : 5} className="px-6 py-12 text-center text-slate-400">
                                                <BookOpen className="mx-auto mb-3 opacity-50" size={32} />
                                                <p>No transactions found for the ledger.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {ledgerPage && ledgerPage.totalPages > 1 && (
                            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                                <span className="text-sm text-gray-600">Page {ledgerPage.number + 1} of {ledgerPage.totalPages} ({ledgerPage.totalElements} total)</span>
                                <div className="flex gap-2">
                                    <button type="button" disabled={ledgerPage.number === 0} onClick={() => setLedgerPageNum(p => Math.max(0, p - 1))} className="px-3 py-1 rounded border border-gray-200 text-sm font-medium disabled:opacity-50">Prev</button>
                                    <button type="button" disabled={ledgerPage.number >= ledgerPage.totalPages - 1} onClick={() => setLedgerPageNum(p => p + 1)} className="px-3 py-1 rounded border border-gray-200 text-sm font-medium disabled:opacity-50">Next</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
};
