import React, { useState, useMemo, useEffect } from 'react';
import { Expense, ExpenseCategory, Sale, Livestock, Entity, Farm, Infrastructure } from '../types';
import { Plus, DollarSign, Truck, Wrench, Syringe, Briefcase, Home, Stethoscope, Dna, ArrowLeft, Trash2, Store, User, Share2, AlertTriangle, Building2, BookOpen, Activity, Search, Filter, ArrowUpDown, PieChart as PieChartIcon, LineChart as LineChartIcon, CheckCircle2, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { backendService } from '../services/backendService';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';

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
    onAddSale: (s: Sale) => void | Promise<void>;
    onDeleteExpense: (id: string) => void;
    onDeleteSale: (id: string) => void;
    onRecordSalePayment?: (saleId: string, payment: { amount: number; date: string; paymentMethod?: string; notes?: string }) => void | Promise<void>;
    onAfterPaymentMutation?: () => void | Promise<void>;
    refreshKey?: number;
}

type FinancialView = 'LIST' | 'ADD_EXPENSE' | 'ADD_SALE';
type FinancialPayment = { id: string; refType: string; refId: string; amount: number; date: string; paymentMethod?: string; notes?: string; status?: string };

const normalizeFinanceText = (value: unknown) => String(value ?? '').trim().toLowerCase();
const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const isSystemFeedConsumption = (expense: Expense) => {
    const description = normalizeFinanceText(expense.description);
    const referenceType = normalizeFinanceText(expense.referenceType);
    return expense.category === ExpenseCategory.FEED && (
        expense.isSystemGenerated === true
        || normalizeFinanceText(expense.supplier) === 'internal inventory'
        || referenceType.includes('diet')
        || referenceType.includes('consumption')
        || description.includes('daily feed')
        || description.includes('diet consumption')
        || description.includes('feed consumption')
    );
};
const isFeedInventoryPurchase = (expense: Expense) => expense.category === ExpenseCategory.FEED && !isSystemFeedConsumption(expense);
const isAssetAcquisition = (expense: Expense) => expense.category === ExpenseCategory.PURCHASE
    || expense.category === ExpenseCategory.INFRASTRUCTURE
    || isFeedInventoryPurchase(expense)
    || (expense.category === ExpenseCategory.MEDICAL && normalizeFinanceText(expense.description).includes('purchase of medicine'));
const isOperatingExpense = (expense: Expense) => !isAssetAcquisition(expense);
const paidExpenseAmount = (expense: Expense) => Math.min(
    Number(expense.amount) || 0,
    Number(expense.amountPaid || (expense.paymentStatus === 'PAID' ? expense.amount : 0))
);
const receivedSaleAmount = (sale: Sale) => Math.min(
    Number(sale.amount) || 0,
    Number(sale.amountReceived || (sale.paymentStatus === 'PAID' ? sale.amount : 0))
);
const newFinanceMutationId = (prefix: string) => typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const Financials: React.FC<Props> = ({ expenses, sales, livestockList = [], entities, infrastructure = [], farms = [], locations = [], currentFarmId, currentLocationId, onAddExpense, onAddSale, onDeleteExpense, onDeleteSale, onRecordSalePayment, onAfterPaymentMutation, refreshKey }) => {
    const toast = useToast();
    const { confirm: confirmDialog, prompt: promptDialog } = useConfirm();
    const [activeTab, setActiveTab] = useState<'EXPENSES' | 'SALES' | 'LEDGER'>('EXPENSES');
    const [expenseTab, setExpenseTab] = useState<'LIST' | 'DASHBOARD' | 'VENDOR_BILLS'>('LIST');
    const [viewMode, setViewMode] = useState<FinancialView>('LIST');
    const [dateFilter, setDateFilter] = useState<'7_DAYS' | '30_DAYS' | '90_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
    const [expandedVendors, setExpandedVendors] = useState<string[]>([]);
    const [expensesPage, setExpensesPage] = useState<{ content: Expense[]; totalElements: number; totalPages: number; number: number; size: number } | null>(null);
    const [salesPage, setSalesPage] = useState<{ content: Sale[]; totalElements: number; totalPages: number; number: number; size: number } | null>(null);
    const [ledgerPage, setLedgerPage] = useState<{ content: { id: string; date: string; description: string; type: string; amount: number; balanceAfter: number; refId: string }[]; totalElements: number; totalPages: number; number: number; size: number } | null>(null);
    const [expensesPageNum, setExpensesPageNum] = useState(0);
    const [salesPageNum, setSalesPageNum] = useState(0);
    const [ledgerPageNum, setLedgerPageNum] = useState(0);
    const [customCategories, setCustomCategories] = useState<{ id: string; name: string; type: string }[]>([]);
    const [paymentPanel, setPaymentPanel] = useState<{ refType: 'EXPENSE' | 'SALE'; refId: string; title: string } | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<FinancialPayment[]>([]);
    const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
    const [paymentHistoryError, setPaymentHistoryError] = useState<string | null>(null);
    const pageSize = 50;

    const toggleVendor = (id: string) => setExpandedVendors(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);

    const openPaymentHistory = async (panel: { refType: 'EXPENSE' | 'SALE'; refId: string; title: string }) => {
        setPaymentPanel(panel);
        setPaymentHistory([]);
        setPaymentHistoryError(null);
        setPaymentHistoryLoading(true);
        try {
            const rows = await backendService.getFinancialsPayments(panel.refType, panel.refId);
            setPaymentHistory(Array.isArray(rows) ? rows : []);
        } catch (e: any) {
            setPaymentHistoryError(e?.message || 'Unable to load payment history.');
        } finally {
            setPaymentHistoryLoading(false);
        }
    };

    const refreshOpenPaymentHistory = async () => {
        if (!paymentPanel) return;
        await openPaymentHistory(paymentPanel);
    };

    const reversePayment = async (paymentId: string) => {
        const ok = await confirmDialog({ title: 'Reverse payment', message: 'Reverse this payment and its ledger impact?', confirmLabel: 'Reverse', danger: true });
        if (!ok) return;
        try {
            await backendService.reverseFinancialsPayment(paymentId);
            await refreshOpenPaymentHistory();
            await onAfterPaymentMutation?.();
            toast.success('Payment reversed.');
        } catch (e: any) {
            toast.error(e?.message || 'Failed to reverse payment.');
        }
    };

    const recordSalePayment = async (sale: Sale) => {
        if (!onRecordSalePayment) return;
        const due = Math.max(0, sale.amount - (sale.amountReceived || 0));
        const amountRaw = await promptDialog({
            title: 'Record sale payment',
            label: `Amount for ${sale.buyer}`,
            message: `Balance due: PKR ${due.toLocaleString()}`,
            inputType: 'number',
            defaultValue: due > 0 ? String(due) : '',
            validate: value => {
                const amount = Number(value);
                if (!Number.isFinite(amount) || amount <= 0) return 'Enter a valid payment amount.';
                if (amount > due) return 'Payment cannot exceed the outstanding balance.';
                return null;
            },
        });
        if (!amountRaw) return;
        const amount = Number(amountRaw);
        const date = await promptDialog({ title: 'Payment date', label: 'Date', inputType: 'date', defaultValue: new Date().toISOString().split('T')[0] }) || new Date().toISOString().split('T')[0];
        await onRecordSalePayment(sale.id, {
            amount,
            date,
            paymentMethod: sale.paymentMethod || 'CASH',
            notes: `Sale payment from Financials for ${sale.buyer}`
        });
    };

    const recordExpensePayment = async (expense: Expense, vendorName: string) => {
        const due = Math.max(0, Number(expense.amount) - paidExpenseAmount(expense));
        if (due <= 0) { toast.warning('This bill has no outstanding balance.'); return; }
        const amountRaw = await promptDialog({
            title: 'Record vendor payment',
            label: `Amount for ${vendorName}`,
            message: `Balance due: PKR ${due.toLocaleString()}`,
            inputType: 'number',
            defaultValue: String(due),
            validate: value => {
                const amount = Number(value);
                if (!Number.isFinite(amount) || amount <= 0) return 'Enter a valid payment amount.';
                if (amount > due) return 'Payment cannot exceed the outstanding balance.';
                return null;
            }
        });
        if (!amountRaw) return;
        const date = await promptDialog({ title: 'Payment date', label: 'Date', inputType: 'date', defaultValue: localDateKey(new Date()) });
        if (!date) return;
        const methodRaw = await promptDialog({
            title: 'Payment method',
            label: 'Method (CASH, BANK, CHEQUE or OTHER)',
            defaultValue: 'CASH',
            validate: value => ['CASH', 'BANK', 'CHEQUE', 'OTHER'].includes(value.trim().toUpperCase()) ? null : 'Use CASH, BANK, CHEQUE or OTHER.'
        });
        if (!methodRaw) return;
        try {
            await backendService.addFinancialsPayment({
                refType: 'EXPENSE',
                refId: expense.id,
                amount: Number(amountRaw),
                date,
                paymentMethod: methodRaw.trim().toUpperCase(),
                notes: `Vendor payment from Finance & Accounts for ${vendorName}`,
                clientMutationId: newFinanceMutationId('expense-payment')
            });
            await onAfterPaymentMutation?.();
            toast.success('Vendor payment recorded with audit history.');
        } catch (e: any) {
            toast.error(e?.message || 'Failed to record vendor payment.');
        }
    };

    const dateRangeFromFilter = useMemo(() => {
        const now = new Date();
        let start: string | undefined;
        let end: string | undefined;
        const endStr = localDateKey(now);
        if (dateFilter === '7_DAYS') {
            const d = new Date(now); d.setDate(d.getDate() - 6);
            start = localDateKey(d);
        } else if (dateFilter === '30_DAYS') {
            const d = new Date(now); d.setDate(d.getDate() - 29);
            start = localDateKey(d);
        } else if (dateFilter === '90_DAYS') {
            const d = new Date(now); d.setDate(d.getDate() - 89);
            start = localDateKey(d);
        } else if (dateFilter === 'THIS_MONTH') {
            start = localDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
        } else if (dateFilter === 'LAST_MONTH') {
            const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
            const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
            start = localDateKey(new Date(y, m, 1));
            end = localDateKey(new Date(y, m + 1, 0));
        }
        if (!end) end = endStr;
        return { startDate: start, endDate: end };
    }, [dateFilter]);

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
    }, [currentFarmId, dateRangeFromFilter.startDate, dateRangeFromFilter.endDate, searchTerm, expensesPageNum, sortConfig.key, sortConfig.direction, refreshKey]);

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
    }, [currentFarmId, dateRangeFromFilter.startDate, dateRangeFromFilter.endDate, searchTerm, salesPageNum, sortConfig.key, sortConfig.direction, refreshKey]);

    useEffect(() => {
        backendService.getFinancialsLedger({
            farmId: currentFarmId || undefined,
            ...dateRangeFromFilter,
            page: ledgerPageNum,
            limit: pageSize,
        }).then(setLedgerPage).catch(() => setLedgerPage(null));
    }, [currentFarmId, dateRangeFromFilter.startDate, dateRangeFromFilter.endDate, ledgerPageNum, refreshKey]);

    useEffect(() => {
        backendService.getCategories('EXPENSE').then(setCustomCategories).catch(() => setCustomCategories([]));
    }, []);

    const isDateInRange = (dateStr: string | undefined | null) => {
        if (!dateStr) return false;
        if (dateFilter === 'ALL') return true;
        return (!dateRangeFromFilter.startDate || dateStr >= dateRangeFromFilter.startDate)
            && (!dateRangeFromFilter.endDate || dateStr <= dateRangeFromFilter.endDate);
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
    }, [expenses, sales, dateFilter, searchTerm, dateRangeFromFilter.startDate, dateRangeFromFilter.endDate]);

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
    }, [expenses, dateFilter, searchTerm, sortConfig, dateRangeFromFilter.startDate, dateRangeFromFilter.endDate]);

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
    }, [sales, dateFilter, searchTerm, sortConfig, dateRangeFromFilter.startDate, dateRangeFromFilter.endDate]);

    const scopeLabel = currentFarmId
        ? farms.find(f => f.id === currentFarmId)?.name || 'Selected farm'
        : currentLocationId
            ? `All farms in ${locations.find(l => l.id === currentLocationId)?.name || 'selected city'}`
            : null;
    const showFarmColumn = Boolean(!currentFarmId && currentLocationId && farms.length > 0);
    const getFarmName = (farmId: string | undefined) => (farmId && farms.length) ? (farms.find(f => f.id === farmId)?.name ?? '—') : '—';

    // Forms State
    const [newExpense, setNewExpense] = useState<Partial<Expense>>({
        amount: 0, category: ExpenseCategory.OTHER, date: localDateKey(new Date()), description: ''
    });

    const [newSale, setNewSale] = useState<Partial<Sale>>({
        amount: 0, date: localDateKey(new Date()), buyer: '', weightAtSale: 0, animalId: '', itemType: 'ANIMAL', quantity: 0, description: '', soldAnimalIds: [], saleType: 'SINGLE_ANIMAL', paymentStatus: 'PAID', amountReceived: 0, paymentMethod: 'CASH'
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
        if (!newExpense.amount || !newExpense.description) {
            toast.warning('Amount and description are required.');
            return;
        }
        if (newExpense.date) {
            const d = new Date(newExpense.date);
            const today = new Date(); today.setHours(23, 59, 59, 999);
            if (Number.isNaN(d.getTime())) { toast.warning('Expense date is not a valid date.'); return; }
            if (d > today) { toast.warning('Expense date cannot be in the future.'); return; }
        }
        if (!(Number(newExpense.amount) > 0)) {
            toast.warning('Expense amount must be greater than zero.');
            return;
        }
        const categoryValue = newExpense.category && Object.values(ExpenseCategory).includes(newExpense.category as ExpenseCategory) ? newExpense.category : ExpenseCategory.OTHER;
        const expense: Expense = {
            id: Math.random().toString(36).substr(2, 9),
            farmId: currentFarmId || '',
            category: categoryValue as ExpenseCategory,
            amount: Number(newExpense.amount),
            date: newExpense.date || localDateKey(new Date()),
            description: newExpense.description,
            location: newExpense.location,
            relatedAnimalId: newExpense.relatedAnimalId,
            supplier: newExpense.supplier,
            paymentStatus: newExpense.supplier && newExpense.supplier !== 'CASH' ? 'PENDING' : 'PAID',
            amountPaid: newExpense.supplier && newExpense.supplier !== 'CASH' ? 0 : Number(newExpense.amount)
        };
        try {
            await onAddExpense(expense);
            setViewMode('LIST');
            setNewExpense({ amount: 0, category: ExpenseCategory.OTHER, date: localDateKey(new Date()), description: '' });
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveSale = async () => {
        if (!newSale.amount || !newSale.buyer) {
            toast.warning('Amount and buyer are required.');
            return;
        }
        if (!(Number(newSale.amount) > 0)) {
            toast.warning('Sale amount must be greater than zero.');
            return;
        }
        if (newSale.date) {
            const d = new Date(newSale.date);
            const today = new Date(); today.setHours(23, 59, 59, 999);
            if (Number.isNaN(d.getTime())) { toast.warning('Sale date is not a valid date.'); return; }
            if (d > today) { toast.warning('Sale date cannot be in the future.'); return; }
        }
        const itemType = newSale.itemType || 'ANIMAL';
        const paymentStatus = newSale.paymentStatus === 'PENDING' ? 'PENDING' : 'PAID';
        const paymentFields = {
            paymentStatus,
            amountReceived: paymentStatus === 'PAID' ? Number(newSale.amount) : 0,
            paymentMethod: newSale.paymentMethod || 'CASH'
        };

        if (itemType === 'ANIMAL') {
            if (!currentFarmId && !currentLocationId) {
                toast.warning('Select a farm above to record livestock sales (only animals from the selected farm can be sold).');
                return;
            }
            if (livestockSaleMode === 'SINGLE') {
                if (!newSale.animalId) {
                    toast.warning('Select the sold animal.');
                    return;
                }
                await onAddSale({
                    id: Math.random().toString(36).substr(2, 9),
                    amount: Number(newSale.amount),
                    buyer: newSale.buyer,
                    date: newSale.date || localDateKey(new Date()),
                    animalId: newSale.animalId,
                    soldAnimalIds: [newSale.animalId],
                    saleType: 'SINGLE_ANIMAL',
                    itemType,
                    weightAtSale: Number(newSale.weightAtSale) || 0,
                    description: newSale.description || '',
                    ...paymentFields
                });
            } else {
                if (!selectedAnimalIds.length) {
                    toast.warning('Select at least one animal for bulk sale.');
                    return;
                }
                await onAddSale({
                    id: Math.random().toString(36).substr(2, 9),
                    amount: Number(newSale.amount),
                    buyer: newSale.buyer,
                    date: newSale.date || localDateKey(new Date()),
                    soldAnimalIds: selectedAnimalIds,
                    saleType: 'BULK_ANIMALS',
                    itemType,
                    weightAtSale: Number(newSale.weightAtSale) || undefined,
                    description: newSale.description || `Bulk sale: ${selectedAnimalIds.length} animals`,
                    ...paymentFields
                });
            }
        } else {
            let description = '';
            if (itemType === 'MILK') description = `Milk Sale: ${Number(newSale.quantity) || 0} L`;
            else if (itemType === 'MANURE') description = (newSale.description && newSale.description.trim()) || 'Manure / Compost Sale';
            else if (itemType === 'OTHER') description = (newSale.description && newSale.description.trim()) || 'Other Income';
            else description = newSale.description || '';

            await onAddSale({
                id: Math.random().toString(36).substr(2, 9),
                amount: Number(newSale.amount),
                buyer: newSale.buyer,
                date: newSale.date || localDateKey(new Date()),
                itemType,
                quantity: Number(newSale.quantity) || 0,
                description,
                ...paymentFields
            });
        }
        setViewMode('LIST');
        setNewSale({ amount: 0, date: localDateKey(new Date()), buyer: '', weightAtSale: 0, animalId: '', itemType: 'ANIMAL', quantity: 0, description: '', soldAnimalIds: [], saleType: 'SINGLE_ANIMAL', paymentStatus: 'PAID', amountReceived: 0, paymentMethod: 'CASH' });
        setSelectedAnimalIds([]);
        setLivestockSaleMode('SINGLE');
    };

    const operatingExpenses = useMemo(() => filteredExpenses.filter(isOperatingExpense), [filteredExpenses]);
    const acquisitionExpenses = useMemo(() => filteredExpenses.filter(isAssetAcquisition), [filteredExpenses]);
    const totalExpensesCalc = operatingExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const totalAcquisitionsCalc = acquisitionExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const totalSalesCalc = filteredSales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);
    const cashReceivedCalc = filteredSales.reduce((sum, sale) => sum + receivedSaleAmount(sale), 0);
    const receivablesCalc = Math.max(0, totalSalesCalc - cashReceivedCalc);
    const operatingResultCalc = totalSalesCalc - totalExpensesCalc;
    const acquisitionBreakdown = useMemo(() => {
        const rows = new Map<string, { label: string; count: number; amount: number }>();
        acquisitionExpenses.forEach(expense => {
            const key = isFeedInventoryPurchase(expense)
                ? 'FEED_INVENTORY'
                : expense.category === ExpenseCategory.PURCHASE
                    ? 'LIVESTOCK'
                    : expense.category === ExpenseCategory.INFRASTRUCTURE
                        ? 'INFRASTRUCTURE'
                        : 'MEDICINE_INVENTORY';
            const label = key === 'FEED_INVENTORY' ? 'Feed inventory purchases'
                : key === 'LIVESTOCK' ? 'Livestock acquisitions'
                    : key === 'INFRASTRUCTURE' ? 'Infrastructure acquisitions'
                        : 'Medicine inventory purchases';
            const row = rows.get(key) || { label, count: 0, amount: 0 };
            row.count += 1;
            row.amount += Number(expense.amount || 0);
            rows.set(key, row);
        });
        return Array.from(rows.values()).sort((a, b) => b.amount - a.amount);
    }, [acquisitionExpenses]);
    const operatingCategoryData = useMemo(() => {
        const grouped = new Map<string, number>();
        operatingExpenses.forEach(expense => grouped.set(expense.category, (grouped.get(expense.category) || 0) + Number(expense.amount || 0)));
        return Array.from(grouped.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [operatingExpenses]);
    const operatingDailyData = useMemo(() => {
        const grouped = new Map<string, number>();
        operatingExpenses.forEach(expense => grouped.set(expense.date, (grouped.get(expense.date) || 0) + Number(expense.amount || 0)));
        return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([fullDate, cost]) => ({ fullDate, date: fullDate.slice(5), cost }));
    }, [operatingExpenses]);
    const expensesForList = expensesPage?.content ?? filteredExpenses;
    const salesForList = salesPage?.content ?? filteredSales;
    const ledgerForList = searchTerm ? ledgerEntries : (ledgerPage?.content ?? ledgerEntries);
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
                        <input type="number" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })} />
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
                            <input type="number" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newSale.amount} onChange={e => setNewSale({ ...newSale, amount: parseFloat(e.target.value) || 0 })} />
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice state</label>
                            <select
                                aria-label="Sale invoice state"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                                value={newSale.paymentStatus || 'PAID'}
                                onChange={e => setNewSale({ ...newSale, paymentStatus: e.target.value as 'PAID' | 'PENDING' })}
                            >
                                <option value="PAID">Paid now</option>
                                <option value="PENDING">Credit / receivable</option>
                            </select>
                            <p className="text-xs text-slate-400 mt-1">Credit sales remain outstanding until a payment is recorded.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
                            <select
                                aria-label="Sale payment method"
                                disabled={newSale.paymentStatus === 'PENDING'}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                                value={newSale.paymentMethod || 'CASH'}
                                onChange={e => setNewSale({ ...newSale, paymentMethod: e.target.value as Sale['paymentMethod'] })}
                            >
                                <option value="CASH">Cash</option>
                                <option value="BANK">Bank</option>
                                <option value="CHEQUE">Cheque</option>
                                <option value="OTHER">Other</option>
                            </select>
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
            <div className="space-y-4 mb-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight font-display">Financial Management</h2>
                    <p className="text-xs text-slate-500 mt-1">Management view: purchases of feed, medicine, livestock and infrastructure are separated from operating expenses.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 w-full">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 premium-card">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Invoice Revenue</p>
                        <p className="text-xl font-extrabold text-emerald-600">PKR {totalSalesCalc.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 premium-card">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Operating Expenses</p>
                        <p className="text-xl font-extrabold text-red-500">PKR {totalExpensesCalc.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 premium-card">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Asset &amp; Inventory Purchases</p>
                        <p className="text-xl font-extrabold text-indigo-600">PKR {totalAcquisitionsCalc.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 premium-card">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Accounts Receivable</p>
                        <p className="text-xl font-extrabold text-amber-600">PKR {receivablesCalc.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Received: PKR {cashReceivedCalc.toLocaleString()}</p>
                    </div>
                    <div className={`p-4 rounded-2xl shadow-lg text-white ${operatingResultCalc >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-200' : 'bg-gradient-to-br from-red-500 to-pink-600 shadow-red-200'}`}>
                        <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-1">Result Before Livestock COGS</p>
                        <p className="text-xl font-extrabold">PKR {operatingResultCalc.toLocaleString()}</p>
                        <p className="text-[10px] text-white/75 mt-1">Not final net profit until sold-animal cost is posted.</p>
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
                                <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2 font-display"><PieChartIcon size={20} className="text-emerald-500" /> Operating Expenses by Category</h3>
                                <p className="text-xs text-slate-500 mb-5">Inventory and asset acquisitions are excluded to prevent double-counting.</p>
                                <div className="h-64 mb-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {(() => {
                                            return (
                                                <PieChart>
                                                    <Pie data={operatingCategoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                                        {operatingCategoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                    </Pie>
                                                    <RechartsTooltip formatter={(value: number) => `PKR ${value.toLocaleString()}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                                </PieChart>
                                            )
                                        })()}
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {operatingCategoryData.map((cat, idx) => {
                                        const name = cat.name;
                                        const cost = cat.value;
                                        return (
                                            <div key={idx} className="flex justify-between p-1">
                                                <span className="text-slate-600 font-bold flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div> {name}</span>
                                                <span className="font-black">{(totalExpensesCalc > 0 ? (cost / totalExpensesCalc * 100) : 0).toFixed(1)}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Expenses Trend Date-Wise */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 premium-card">
                                <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2 font-display"><LineChartIcon size={20} className="text-blue-500" /> Daily Operating Expense Trend</h3>
                                <p className="text-xs text-slate-500 mb-5">Uses the complete selected period and the same scope as the operating-expense KPI.</p>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {(() => {
                                            return (
                                                <BarChart data={operatingDailyData}>
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
                            <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden premium-card">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Building2 size={18} className="text-indigo-500" /> Asset &amp; Inventory Purchase Register</h3>
                                        <p className="text-xs text-slate-500 mt-1">Shown separately from operating expenses. These amounts require inventory, livestock or fixed-asset accounting.</p>
                                    </div>
                                    <p className="font-black text-indigo-700">PKR {totalAcquisitionsCalc.toLocaleString()}</p>
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="border-b border-slate-100">
                                        <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                                            <th className="px-5 py-3 text-left">Classification</th>
                                            <th className="px-5 py-3 text-right">Transactions</th>
                                            <th className="px-5 py-3 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {acquisitionBreakdown.map(row => (
                                            <tr key={row.label}>
                                                <td className="px-5 py-3 font-bold text-slate-700">{row.label}</td>
                                                <td className="px-5 py-3 text-right text-slate-500">{row.count}</td>
                                                <td className="px-5 py-3 text-right font-black text-indigo-700">PKR {row.amount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {acquisitionBreakdown.length === 0 && <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">No asset or inventory purchases in this scope.</td></tr>}
                                    </tbody>
                                </table>
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
                                <p className="text-xs text-slate-500 font-medium">External vendor bills only. Internal feed-consumption postings are excluded.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-white">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vendor / Date</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoices / Category</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Settlements</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Status</th>
                                            <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billed Amount</th>
                                            <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {(() => {
                                            const vendorBills = filteredExpenses.filter(e => e.supplier
                                                && e.supplier !== 'CASH'
                                                && normalizeFinanceText(e.supplier) !== 'internal inventory'
                                                && !isSystemFeedConsumption(e));
                                            const billsByVendor = vendorBills.reduce((acc, exp) => {
                                                if (!acc[exp.supplier!]) acc[exp.supplier!] = { vendorId: exp.supplier!, bills: [], total: 0, pending: 0, paid: 0 };
                                                acc[exp.supplier!].bills.push(exp);
                                                acc[exp.supplier!].total += exp.amount;
                                                const paid = paidExpenseAmount(exp);
                                                acc[exp.supplier!].paid += paid;
                                                acc[exp.supplier!].pending += Math.max(0, Number(exp.amount) - paid);
                                                return acc;
                                            }, {} as Record<string, { vendorId: string, bills: Expense[], total: number, pending: number, paid: number }>);

                                            const hasVendors = billsByVendor && Object.keys(billsByVendor).length > 0;
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

                                            return Object.values(billsByVendor).map((v) => ({ vendorId: v.vendorId, bills: v.bills, totalBills: v.bills.length, total: v.total, pending: v.pending, paid: v.paid })).map(({ vendorId, bills, totalBills, pending, paid, total }) => {
                                                const vendor = entities.find(v => v.id === vendorId);
                                                let vendorName = vendor?.name;

                                                if (!vendorName) {
                                                    vendorName = `Archived / Unlinked Vendor (${vendorId.slice(0, 6)}...)`;
                                                }

                                                const isExpanded = expandedVendors.includes(vendorId);

                                                return (
                                                    <React.Fragment key={vendorId}>
                                                        {/* Vendor Summary Row */}
                                                        <tr onClick={() => toggleVendor(vendorId)} className={`hover:bg-indigo-50/50 transition-colors cursor-pointer bg-slate-50/80 border-b-2 border-slate-100 group`}>
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
                                                        {/* Expanded Bills list */}
                                                        {isExpanded && bills.length > 0 && bills.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((exp, idx) => {
                                                            const isPaid = paidExpenseAmount(exp) >= Number(exp.amount);
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
                                                                        {!isPaid && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    void recordExpensePayment(exp, vendorName);
                                                                                }}
                                                                                className="px-4 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white text-indigo-700 font-extrabold text-[11px] uppercase tracking-wider rounded-lg transition-all shadow-sm"
                                                                            >
                                                                                Pay
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                openPaymentHistory({ refType: 'EXPENSE', refId: exp.id, title: `${vendorName} - ${exp.description}` });
                                                                            }}
                                                                            className="ml-2 px-2 py-1 text-indigo-500 hover:text-indigo-700 font-bold text-[10px] uppercase underline transition-colors"
                                                                        >
                                                                            Payments
                                                                        </button>
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
                                                        onClick={async () => {
                                                            const ok = await confirmDialog({
                                                                title: 'Delete expense',
                                                                message: 'Delete this expense? This cannot be undone.',
                                                                confirmLabel: 'Delete',
                                                                danger: true,
                                                            });
                                                            if (!ok) return;
                                                            onDeleteExpense(expense.id);
                                                            toast.success('Expense deleted.');
                                                        }}
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
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Received</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Balance</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
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
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-emerald-600">PKR {receivedSaleAmount(sale).toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-amber-600">PKR {Math.max(0, sale.amount - receivedSaleAmount(sale)).toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-black ${receivedSaleAmount(sale) >= sale.amount ? 'bg-emerald-100 text-emerald-700' : receivedSaleAmount(sale) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                    {receivedSaleAmount(sale) >= sale.amount ? 'PAID' : receivedSaleAmount(sale) > 0 ? 'PARTIAL' : 'PENDING'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                {onRecordSalePayment && (sale.paymentStatus !== 'PAID' || (sale.amountReceived || 0) < sale.amount) && (
                                                    <button
                                                        onClick={() => recordSalePayment(sale)}
                                                        className="px-2 py-1 rounded-lg text-[10px] font-black uppercase text-emerald-700 hover:bg-emerald-50 transition-colors mr-2"
                                                        title="Record Payment"
                                                    >
                                                        Pay
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openPaymentHistory({ refType: 'SALE', refId: sale.id, title: `${sale.buyer} - ${saleItemDisplay(sale)}` })}
                                                    className="px-2 py-1 rounded-lg text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50 transition-colors mr-2"
                                                    title="Payment History"
                                                >
                                                    Payments
                                                </button>
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
                                                    onClick={async () => {
                                                        const ok = await confirmDialog({
                                                            title: 'Delete sale',
                                                            message: 'Delete this sale? This cannot be undone.',
                                                            confirmLabel: 'Delete',
                                                            danger: true,
                                                        });
                                                        if (!ok) return;
                                                        onDeleteSale(sale.id);
                                                        toast.success('Sale deleted.');
                                                    }}
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
                                            <td colSpan={showFarmColumn ? 11 : 10} className="text-center py-16 bg-slate-50/50">
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
                                Financial Transaction Register
                            </h3>
                            <p className="text-xs text-slate-500">Accrual sales and recorded expenses with an all-time cumulative net position. This is not a general ledger or cash-book.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                                        {showFarmColumn && <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Farm</th>}
                                        <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest text-emerald-600">Invoiced Revenue</th>
                                        <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest text-red-500">Recorded Expense</th>
                                        <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cumulative Net Position</th>
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
                        {ledgerPage && !searchTerm && ledgerPage.totalPages > 1 && (
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
            {paymentPanel && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={() => setPaymentPanel(null)}>
                    <div className="h-full w-full max-w-lg bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Payment History</h3>
                                <p className="text-xs text-slate-500 truncate max-w-sm">{paymentPanel.title}</p>
                            </div>
                            <button onClick={() => setPaymentPanel(null)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200">Close</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50">
                            {paymentHistoryLoading && <div className="bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-500">Loading payments...</div>}
                            {paymentHistoryError && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">{paymentHistoryError}</div>}
                            {!paymentHistoryLoading && !paymentHistoryError && paymentHistory.length === 0 && (
                                <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                                    <DollarSign size={32} className="mx-auto text-slate-300 mb-3" />
                                    <p className="text-sm font-bold text-slate-500">No payment records returned for this item.</p>
                                </div>
                            )}
                            {paymentHistory.map(payment => (
                                <div key={payment.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-lg font-black text-slate-800">PKR {payment.amount.toLocaleString()}</p>
                                            <p className="text-xs text-slate-500 font-medium">{payment.date} • {payment.paymentMethod || 'Method not set'}</p>
                                            {payment.notes && <p className="text-xs text-slate-400 mt-2">{payment.notes}</p>}
                                            {payment.status && <span className="inline-block mt-2 px-2 py-1 rounded-md bg-slate-100 text-slate-500 text-[10px] font-black uppercase">{payment.status}</span>}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button onClick={() => reversePayment(payment.id)} className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-black uppercase hover:bg-amber-100">Reverse</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
