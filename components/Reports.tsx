
import React, { useState, useMemo, useEffect } from 'react';
import { AppState, Sale } from '../types';
import { backendService } from '../services/backendService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { FileText, Download, Filter, TrendingUp, DollarSign, Activity, Calendar, Package, AlertTriangle, CheckCircle, Layers } from 'lucide-react';
import { formatCurrency, formatNumber, formatQuantity, periodLabel, roundOrderQuantity } from '../utils/format';

interface Props {
    state: AppState;
    currentFarmId: string | null;
}

const isSystemUsageExpense = (expense: AppState['expenses'][number]) => {
    const description = expense.description?.toLowerCase() || '';
    return Boolean(expense.isSystemGenerated || description.includes('consumption') || description.includes('daily feed:') || description.includes('treatment application'));
};

export const Reports: React.FC<Props> = ({ state, currentFarmId }) => {
    const [activeReport, setActiveReport] = useState<'FINANCIAL' | 'HERD' | 'OPERATIONS' | 'DETAILED_LOGS' | 'FEED' | 'INVENTORY'>('FINANCIAL');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [logPeriod, setLogPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
    const [logCategory, setLogCategory] = useState<'MILK' | 'FINANCE'>('FINANCE');

    // --- FEED REPORT STATE ---
    const [feedPeriod, setFeedPeriod] = useState<'7_DAYS' | '30_DAYS' | '90_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL'>('ALL');
    const [feedCategoryFilter, setFeedCategoryFilter] = useState<string>('ALL');

    // --- INVENTORY REPORT STATE ---
    const [invSub, setInvSub] = useState<'VALUATION' | 'MOVEMENT'>('VALUATION');
    const [invPeriod, setInvPeriod] = useState<'7_DAYS' | '30_DAYS' | '90_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL'>('THIS_MONTH');
    const [invCategoryFilter, setInvCategoryFilter] = useState<string>('ALL');

    // --- FINANCIAL REPORT STATE ---
    const [finPeriod, setFinPeriod] = useState<'7_DAYS' | '30_DAYS' | '90_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL'>('ALL');
    const [finSub, setFinSub] = useState<'OVERVIEW' | 'MONTHLY_MANAGEMENT' | 'ANIMAL_PROFITABILITY' | 'CUSTOM_EXPENSE'>('OVERVIEW');
    const [finAccrual, setFinAccrual] = useState<boolean>(true);
    const [finAnimalStatus, setFinAnimalStatus] = useState<string>('ALL');
    const [managementRange, setManagementRange] = useState<'6' | '12' | '24' | 'ALL'>('12');

    const [customExpenseStartDate, setCustomExpenseStartDate] = useState<string>('');
    const [customExpenseEndDate, setCustomExpenseEndDate] = useState<string>('');
    const [customExpenseType, setCustomExpenseType] = useState<string>('ALL');

    const [finOverviewServer, setFinOverviewServer] = useState<Awaited<ReturnType<typeof backendService.getReportsFinancialOverview>> | null>(null);
    const [invMovementServer, setInvMovementServer] = useState<Awaited<ReturnType<typeof backendService.getReportsInventoryMovement>> | undefined>(undefined);
    const [animalPlServer, setAnimalPlServer] = useState<Awaited<ReturnType<typeof backendService.getReportsAnimalProfitability>> | undefined>(undefined);
    const [reportsLoading, setReportsLoading] = useState<{ financial?: boolean; movement?: boolean; animalPl?: boolean }>({});

    // Compute date window for feed reports
    const feedDateWindow = useMemo(() => {
        const now = new Date();
        const end = now.toISOString().split('T')[0];
        if (feedPeriod === 'ALL') return { start: '2000-01-01', end };
        const d = new Date(now);
        if (feedPeriod === '7_DAYS') d.setDate(d.getDate() - 7);
        else if (feedPeriod === '30_DAYS') d.setDate(d.getDate() - 30);
        else if (feedPeriod === '90_DAYS') d.setDate(d.getDate() - 90);
        else if (feedPeriod === 'THIS_MONTH') d.setDate(1);
        else if (feedPeriod === 'LAST_MONTH') {
            const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const le = new Date(now.getFullYear(), now.getMonth(), 0);
            return { start: lm.toISOString().split('T')[0], end: le.toISOString().split('T')[0] };
        }
        return { start: d.toISOString().split('T')[0], end };
    }, [feedPeriod]);

    // Filtered consumption logs for feed report
    const filteredFeedLogs = useMemo(() => {
        return (state.consumptionLogs || []).filter(log => {
            const inWindow = log.date >= feedDateWindow.start && log.date <= feedDateWindow.end;
            if (!inWindow) return false;
            if (feedCategoryFilter === 'ALL') return true;
            const item = state.feed.find(f => f.id === log.itemId);
            return item?.feedType === feedCategoryFilter;
        });
    }, [state.consumptionLogs, state.feed, feedDateWindow, feedCategoryFilter]);

    // Feed KPIs
    const feedTotalCost = useMemo(() => filteredFeedLogs.reduce((s, l) => s + l.cost, 0), [filteredFeedLogs]);
    const activeHeadCount = state.livestock.filter(animal => animal.status === 'ACTIVE').length;
    const feedCostPerActiveHead = activeHeadCount > 0 ? feedTotalCost / activeHeadCount : 0;

    // Consumption by ingredient
    const feedByIngredient = useMemo(() => {
        const map = new Map<string, { name: string; qty: number; cost: number; unit: string }>();
        filteredFeedLogs.forEach(log => {
            const item = state.feed.find(f => f.id === log.itemId);
            const name = item?.name || 'Unknown';
            const ex = map.get(log.itemId) || { name, qty: 0, cost: 0, unit: log.unit };
            map.set(log.itemId, { ...ex, qty: ex.qty + log.quantityUsed, cost: ex.cost + log.cost });
        });
        return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
    }, [filteredFeedLogs, state.feed]);
    const feedIngredientCount = feedByIngredient.length;

    // Consumption by feed category (GRASS/TMR/WANDA/OTHER)
    const feedByCategory = useMemo(() => {
        const map = new Map<string, number>();
        filteredFeedLogs.forEach(log => {
            const item = state.feed.find(f => f.id === log.itemId);
            const cat = item?.feedType || 'OTHER';
            map.set(cat, (map.get(cat) || 0) + log.cost);
        });
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    }, [filteredFeedLogs, state.feed]);

    // Cost by diet plan
    const feedByDietPlan = useMemo(() => {
        const map = new Map<string, number>();
        filteredFeedLogs.forEach(log => {
            const planName = state.dietPlans.find(p => p.id === log.dietPlanId)?.name || 'Unknown Plan';
            map.set(planName, (map.get(planName) || 0) + log.cost);
        });
        return Array.from(map.entries()).map(([name, cost]) => ({ name, cost })).sort((a, b) => b.cost - a.cost);
    }, [filteredFeedLogs, state.dietPlans]);

    // Daily consumption trend (last 30 days max)
    const feedDailyTrend = useMemo(() => {
        const map = new Map<string, number>();
        filteredFeedLogs.forEach(log => { map.set(log.date, (map.get(log.date) || 0) + log.cost); });
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-30).map(([date, cost]) => ({ date: date.slice(5), cost: Math.round(cost) }));
    }, [filteredFeedLogs]);

    // Per-animal feed cost
    const feedPerAnimal = useMemo(() => {
        const map = new Map<string, number>();
        filteredFeedLogs.forEach(log => { if (log.animalId) map.set(log.animalId, (map.get(log.animalId) || 0) + log.cost); });
        return Array.from(map.entries()).map(([id, cost]) => {
            const animal = state.livestock.find(l => l.id === id);
            return { tag: animal?.tagId || id, category: animal?.category || '—', breed: animal?.breed || '—', cost: Math.round(cost) };
        }).sort((a, b) => b.cost - a.cost).slice(0, 20);
    }, [filteredFeedLogs, state.livestock]);

    // Diet plan efficiency uses processed ledger head-days, not mixed inventory units.
    const feedPlanEfficiency = useMemo(() => {
        return state.dietPlans.map(plan => {
            const planLogs = filteredFeedLogs.filter(l => l.dietPlanId === plan.id);
            const totalCost = planLogs.reduce((s, l) => s + l.cost, 0);
            const ledgers = (state.processedFeedLedgers || []).filter(ledger => ledger.status === 'PROCESSED' && ledger.dietPlanId === plan.id && ledger.date >= feedDateWindow.start && ledger.date <= feedDateWindow.end);
            const animalDays = ledgers.reduce((sum, ledger) => sum + Math.max(0, ledger.totalAnimalsFed || 0), 0);
            const ledgerCost = ledgers.reduce((sum, ledger) => sum + Math.max(0, ledger.totalCost || 0), 0);
            const ledgerCoverage = totalCost > 0 ? ledgerCost / totalCost : 0;
            const hasComparableLedgerCoverage = animalDays > 0 && ledgerCoverage >= 0.9 && ledgerCoverage <= 1.1;
            return { name: plan.name, totalCost: Math.round(totalCost), animalDays, costPerAnimalPerDay: hasComparableLedgerCoverage ? ledgerCost / animalDays : null };
        }).filter(plan => plan.totalCost > 0);
    }, [filteredFeedLogs, state.dietPlans, state.processedFeedLedgers, feedDateWindow]);

    // Purchased vs consumed reconciliation uses the same period/category contract as every feed widget.
    const feedReconciliation = useMemo(() => {
        const feedOnlyItems = state.feed.filter(f => (f.category === 'FEED' || !f.category || f.feedType) && (feedCategoryFilter === 'ALL' || f.feedType === feedCategoryFilter));
        return feedOnlyItems.map(item => {
            const purchased = state.expenses.filter(e => e.feedItemId === item.id && e.date >= feedDateWindow.start && e.date <= feedDateWindow.end).reduce((s, e) => s + e.amount, 0);
            const consumed = filteredFeedLogs.filter(l => l.itemId === item.id).reduce((s, l) => s + l.cost, 0);
            return { name: item.name, type: item.feedType || '—', purchased: Math.round(purchased), consumed: Math.round(consumed), variance: Math.round(purchased - consumed) };
        }).filter(r => r.purchased > 0 || r.consumed > 0);
    }, [state.feed, state.expenses, filteredFeedLogs, feedDateWindow, feedCategoryFilter]);

    // Inventory Valuation
    const inventoryValuation = useMemo(() => {
        const feedOnlyItems = state.feed.filter(f => f.category === 'FEED' || !f.category || f.feedType);
        const recentStart = new Date();
        recentStart.setDate(recentStart.getDate() - 30);
        const recentStartKey = recentStart.toISOString().slice(0, 10);
        return feedOnlyItems.map(item => {
            const stockValue = item.quantity * item.unitCost;
            const recentLogs = (state.consumptionLogs || []).filter(l => l.itemId === item.id && l.date >= recentStartKey);
            const totalQtyConsumed = recentLogs.reduce((s, l) => s + l.quantityUsed, 0);
            const avgDailyConsumption = totalQtyConsumed / 30;
            const daysRemaining = avgDailyConsumption > 0 ? Math.floor(item.quantity / avgDailyConsumption) : null;
            const isLow = item.quantity <= item.reorderLevel;
            const isOut = item.quantity === 0;
            return { name: item.name, type: item.feedType || '—', qty: item.quantity, unit: item.unit || 'KG', unitCost: item.unitCost, stockValue: Math.round(stockValue), reorderLevel: item.reorderLevel, daysRemaining, isLow, isOut };
        });
    }, [state.feed, state.consumptionLogs]);

    const invTotalValue = inventoryValuation.reduce((s, i) => s + i.stockValue, 0);
    const invLowCount = inventoryValuation.filter(i => i.isLow && !i.isOut).length;
    const invOutCount = inventoryValuation.filter(i => i.isOut).length;
    const invCritical = inventoryValuation.filter(i => i.isOut || (i.daysRemaining !== null && i.daysRemaining <= 3));

    const invDateWindow = useMemo(() => {
        const now = new Date();
        const end = now.toISOString().split('T')[0];
        if (invPeriod === 'ALL') return { start: '2000-01-01', end };
        const d = new Date(now);
        if (invPeriod === '7_DAYS') d.setDate(d.getDate() - 7);
        else if (invPeriod === '30_DAYS') d.setDate(d.getDate() - 30);
        else if (invPeriod === '90_DAYS') d.setDate(d.getDate() - 90);
        else if (invPeriod === 'THIS_MONTH') d.setDate(1);
        else if (invPeriod === 'LAST_MONTH') {
            const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const le = new Date(now.getFullYear(), now.getMonth(), 0);
            return { start: lm.toISOString().split('T')[0], end: le.toISOString().split('T')[0] };
        }
        return { start: d.toISOString().split('T')[0], end };
    }, [invPeriod]);

    const inventoryMovementClient = useMemo(() => {
        const feedItems = state.feed.filter(f => f.category === 'FEED' || !f.category || f.feedType);
        return feedItems.filter(f => invCategoryFilter === 'ALL' || f.feedType === invCategoryFilter).map(item => {
            const expensesInPeriod = state.expenses.filter(e => e.feedItemId === item.id && e.date >= invDateWindow.start && e.date <= invDateWindow.end);
            const consInPeriod = (state.consumptionLogs || []).filter(l => l.itemId === item.id && l.date >= invDateWindow.start && l.date <= invDateWindow.end);
            const qtyReceived = expensesInPeriod.reduce((s, e) => s + (e.weight || e.quantity || 0), 0);
            const qtyConsumed = consInPeriod.reduce((s, l) => s + l.quantityUsed, 0);
            const openingStock = item.quantity - qtyReceived + qtyConsumed;
            return { name: item.name, type: item.feedType || '—', unit: item.unit || 'KG', openingStock: Math.max(0, openingStock), qtyReceived, qtyConsumed, closingStock: item.quantity, variance: 0 };
        });
    }, [state.feed, state.expenses, state.consumptionLogs, invDateWindow, invCategoryFilter]);

    const inventoryMovement = useMemo(() => {
        if (currentFarmId && Array.isArray(invMovementServer)) {
            return invMovementServer.map(row => {
                const item = state.feed.find(f => f.id === row.feedItemId);
                const type = item?.feedType || '—';
                if (invCategoryFilter !== 'ALL' && type !== invCategoryFilter) return null;
                return {
                    name: row.name,
                    type,
                    unit: item?.unit || 'KG',
                    openingStock: row.openingStock,
                    qtyReceived: row.qtyReceived,
                    qtyConsumed: row.qtyConsumed,
                    closingStock: row.closingStock,
                    variance: row.variance,
                };
            }).filter(row => row != null && (row.qtyReceived !== 0 || row.qtyConsumed !== 0 || row.variance !== 0)) as { name: string; type: string; unit: string; openingStock: number; qtyReceived: number; qtyConsumed: number; closingStock: number; variance: number }[];
        }
        return inventoryMovementClient.filter(row => row.qtyReceived !== 0 || row.qtyConsumed !== 0 || row.variance !== 0);
    }, [currentFarmId, invMovementServer, inventoryMovementClient, state.feed, invCategoryFilter]);

    const FEED_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];

    const finDateWindow = useMemo(() => {
        const now = new Date();
        const end = now.toISOString().split('T')[0];
        if (finPeriod === 'ALL') return { start: '2000-01-01', end };
        const d = new Date(now);
        if (finPeriod === '7_DAYS') d.setDate(d.getDate() - 7);
        else if (finPeriod === '30_DAYS') d.setDate(d.getDate() - 30);
        else if (finPeriod === '90_DAYS') d.setDate(d.getDate() - 90);
        else if (finPeriod === 'THIS_MONTH') d.setDate(1);
        else if (finPeriod === 'LAST_MONTH') {
            const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const le = new Date(now.getFullYear(), now.getMonth(), 0);
            return { start: lm.toISOString().split('T')[0], end: le.toISOString().split('T')[0] };
        }
        return { start: d.toISOString().split('T')[0], end };
    }, [finPeriod]);

    useEffect(() => {
        if (activeReport !== 'FINANCIAL' || finSub !== 'OVERVIEW') {
            setFinOverviewServer(null);
            return;
        }
        let cancelled = false;
        setReportsLoading(p => ({ ...p, financial: true }));
        backendService.getReportsFinancialOverview({
            farmId: currentFarmId || undefined,
            interval: 'monthly',
            startDate: finDateWindow.start,
            endDate: finDateWindow.end,
            accrual: finAccrual,
        })
            .then(data => { if (!cancelled) setFinOverviewServer(data); })
            .catch(() => { if (!cancelled) setFinOverviewServer(null); })
            .finally(() => { if (!cancelled) setReportsLoading(p => ({ ...p, financial: false })); });
        return () => { cancelled = true; };
    }, [activeReport, finSub, currentFarmId, finDateWindow.start, finDateWindow.end, finAccrual]);

    useEffect(() => {
        if (activeReport !== 'INVENTORY' || invSub !== 'MOVEMENT' || !currentFarmId) {
            setInvMovementServer(undefined);
            return;
        }
        let cancelled = false;
        setReportsLoading(p => ({ ...p, movement: true }));
        backendService.getReportsInventoryMovement({
            farmId: currentFarmId,
            startDate: invDateWindow.start,
            endDate: invDateWindow.end,
        })
            .then(data => { if (!cancelled) setInvMovementServer(data); })
            .catch(() => { if (!cancelled) setInvMovementServer(undefined); })
            .finally(() => { if (!cancelled) setReportsLoading(p => ({ ...p, movement: false })); });
        return () => { cancelled = true; };
    }, [activeReport, invSub, currentFarmId, invDateWindow.start, invDateWindow.end]);

    useEffect(() => {
        if (activeReport !== 'FINANCIAL' || finSub !== 'ANIMAL_PROFITABILITY' || !currentFarmId) {
            setAnimalPlServer(undefined);
            return;
        }
        let cancelled = false;
        setReportsLoading(p => ({ ...p, animalPl: true }));
        backendService.getReportsAnimalProfitability({ farmId: currentFarmId, status: finAnimalStatus })
            .then(data => { if (!cancelled) setAnimalPlServer(data); })
            .catch(() => { if (!cancelled) setAnimalPlServer(undefined); })
            .finally(() => { if (!cancelled) setReportsLoading(p => ({ ...p, animalPl: false })); });
        return () => { cancelled = true; };
    }, [activeReport, finSub, currentFarmId, finAnimalStatus]);

    const { finMetrics: finMetricsClient, finRevenueByCategory: finRevClient, finExpenseByCategory: finExpClient } = useMemo(() => {
        const expenses = state.expenses.filter(e => e.date >= finDateWindow.start && e.date <= finDateWindow.end);
        const sales = state.sales.filter(s => s.date >= finDateWindow.start && s.date <= finDateWindow.end);

        let cashRev = sales.reduce((sum, s) => sum + s.amount, 0);
        const cashExpenses = expenses.filter(expense => !isSystemUsageExpense(expense));
        let cashExp = cashExpenses.reduce((sum, e) => sum + e.amount, 0);

        let accrualExp = cashExp;
        if (finAccrual) {
            const inventoryPurchased = cashExpenses
                .filter(e => e.category === 'FEED' || e.category === 'MEDICAL' || e.category === 'VACCINE' || e.category === 'PURCHASE' || e.category === 'INFRASTRUCTURE')
                .reduce((sum, e) => sum + e.amount, 0);

            const inventoryConsumed =
                (state.consumptionLogs || []).filter(l => l.date >= finDateWindow.start && l.date <= finDateWindow.end).reduce((sum, l) => sum + l.cost, 0) +
                (state.treatmentLogs || []).filter(l => l.date >= finDateWindow.start && l.date <= finDateWindow.end).reduce((sum, l) => sum + l.cost, 0);

            accrualExp = cashExp - (inventoryPurchased - inventoryConsumed);
        }

        const revCats = sales.reduce((acc, s) => {
            const key = (s as Sale & { category?: string }).category ?? s.itemType ?? 'OTHER';
            acc[key] = (acc[key] || 0) + s.amount;
            return acc;
        }, {} as Record<string, number>);
        const expCats = expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {} as Record<string, number>);

        const revData = Object.keys(revCats).map(name => ({ name, value: revCats[name] }));
        const expData = Object.keys(expCats).map(name => ({ name, value: expCats[name] }));

        return { finMetrics: { revenue: cashRev, expenses: accrualExp, profit: cashRev - accrualExp }, finRevenueByCategory: revData, finExpenseByCategory: expData };
    }, [state.expenses, state.sales, finDateWindow, finAccrual, state.consumptionLogs, state.treatmentLogs]);

    const finMetrics = finOverviewServer != null && finOverviewServer.metrics
        ? { revenue: finOverviewServer.metrics.totalRevenue, expenses: finOverviewServer.metrics.totalExpenses, profit: finOverviewServer.metrics.profit }
        : finMetricsClient;
    const finRevenueByCategory = finOverviewServer != null && finOverviewServer.revenueByCategory ? finOverviewServer.revenueByCategory : finRevClient;
    const finExpenseByCategory = finOverviewServer != null && finOverviewServer.expenseByCategory ? finOverviewServer.expenseByCategory : finExpClient;

    const monthlyManagementData = useMemo(() => {
        const monthKeys = [
            ...state.expenses.map(item => item.date?.slice(0, 7)),
            ...state.sales.map(item => item.date?.slice(0, 7)),
            ...(state.consumptionLogs || []).map(item => item.date?.slice(0, 7)),
        ].filter((month): month is string => /^\d{4}-\d{2}$/.test(month || ''));

        const now = new Date();
        const latestMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const earliestRecorded = monthKeys.length > 0 ? [...monthKeys].sort()[0] : latestMonth;
        const requestedMonths = managementRange === 'ALL' ? null : Number(managementRange);
        const startDate = requestedMonths
            ? new Date(now.getFullYear(), now.getMonth() - requestedMonths + 1, 1)
            : new Date(Number(earliestRecorded.slice(0, 4)), Number(earliestRecorded.slice(5, 7)) - 1, 1);
        const months: string[] = [];
        const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth(), 1);
        while (cursor <= endDate) {
            months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
            cursor.setMonth(cursor.getMonth() + 1);
        }

        const isFeedPurchase = (expense: AppState['expenses'][number]) =>
            !isSystemUsageExpense(expense) && Boolean(expense.feedItemId || expense.category === 'FEED');
        const isOtherPurchase = (expense: AppState['expenses'][number]) =>
            !isSystemUsageExpense(expense) && !isFeedPurchase(expense) && ['PURCHASE', 'MEDICAL', 'VACCINE', 'INFRASTRUCTURE'].includes(expense.category);

        return months.map(month => {
            const expenses = state.expenses.filter(item => item.date?.startsWith(month));
            const sales = state.sales.filter(item => item.date?.startsWith(month));
            const consumption = (state.consumptionLogs || []).filter(item => item.date?.startsWith(month));
            const totalExpenses = expenses.filter(expense => !isSystemUsageExpense(expense)).reduce((sum, item) => sum + item.amount, 0);
            const feedPurchases = expenses.filter(isFeedPurchase).reduce((sum, item) => sum + item.amount, 0);
            const otherPurchases = expenses.filter(isOtherPurchase).reduce((sum, item) => sum + item.amount, 0);
            const salesRevenue = sales.reduce((sum, item) => sum + item.amount, 0);
            const feedConsumed = consumption.reduce((sum, item) => sum + item.cost, 0);
            return {
                month,
                label: new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' }),
                totalExpenses,
                feedPurchases,
                otherPurchases,
                totalPurchases: feedPurchases + otherPurchases,
                feedConsumed,
                salesRevenue,
                cashResult: salesRevenue - totalExpenses,
            };
        });
    }, [state.expenses, state.sales, state.consumptionLogs, managementRange]);

    const monthlyManagementTotals = useMemo(() => monthlyManagementData.reduce((totals, row) => ({
        totalExpenses: totals.totalExpenses + row.totalExpenses,
        feedPurchases: totals.feedPurchases + row.feedPurchases,
        otherPurchases: totals.otherPurchases + row.otherPurchases,
        feedConsumed: totals.feedConsumed + row.feedConsumed,
        salesRevenue: totals.salesRevenue + row.salesRevenue,
        cashResult: totals.cashResult + row.cashResult,
    }), { totalExpenses: 0, feedPurchases: 0, otherPurchases: 0, feedConsumed: 0, salesRevenue: 0, cashResult: 0 }), [monthlyManagementData]);

    const animalProfitabilityClient = useMemo(() => {
        return state.livestock.filter(a => finAnimalStatus === 'ALL' || a.status === finAnimalStatus).map(animal => {
            const feedCost = (state.consumptionLogs || []).filter(l => l.animalId === animal.id || l.animalId === animal.tagId).reduce((sum, l) => sum + l.cost, 0);
            const medicalCost = (state.treatmentLogs || []).filter(l => l.animalId === animal.id || l.animalId === animal.tagId).reduce((sum, l) => sum + l.cost, 0);
            const purchaseCost = animal.purchasePrice ?? 0;
            const totalCost = purchaseCost + feedCost + medicalCost;
            let saleValue = 0;
            if (animal.status === 'SOLD') {
                const saleRecord = state.sales.find(s => s.itemType === 'ANIMAL' && (s.soldAnimalIds?.includes(animal.id) || (animal.tagId && s.description?.includes(animal.tagId))));
                saleValue = saleRecord ? saleRecord.amount : 0;
            }
            return {
                id: animal.tagId, category: animal.category, status: animal.status,
                feedCost, medicalCost, purchaseCost, totalCost, saleValue, profit: saleValue - totalCost
            };
        }).sort((a,b) => b.profit - a.profit);
    }, [state.livestock, state.consumptionLogs, state.treatmentLogs, state.sales, finAnimalStatus]);

    const animalProfitability = useMemo(() => {
        if (currentFarmId && Array.isArray(animalPlServer)) {
            return animalPlServer.map(r => ({
                id: r.tagId || r.animalId,
                category: r.category,
                status: r.status,
                purchaseCost: r.purchaseCost,
                feedCost: r.feedCost,
                medicalCost: r.medicalCost,
                totalCost: r.totalCost,
                saleValue: r.saleValue,
                profit: r.profit,
            }));
        }
        return animalProfitabilityClient;
    }, [currentFarmId, animalPlServer, animalProfitabilityClient]);

    const animalCostCoverage = animalProfitability.length > 0
        ? Math.round((animalProfitability.filter(item => item.purchaseCost > 0 || item.feedCost > 0 || item.medicalCost > 0).length / animalProfitability.length) * 100)
        : 100;
    const allocatedOperatingCostCoverage = animalProfitability.length > 0
        ? Math.round((animalProfitability.filter(item => item.feedCost > 0 || item.medicalCost > 0).length / animalProfitability.length) * 100)
        : 100;

    // --- HERD CALCS ---
    const calculateHerdStats = () => {
        const active = state.livestock.filter(l => l.status === 'ACTIVE');
        const sold = state.livestock.filter(l => l.status === 'SOLD');
        const deceased = state.livestock.filter(l => l.status === 'DECEASED');

        // Age Distribution (Simplified)
        const goatOnly = active.length > 0 && active.every(l => l.species === 'GOAT');
        const ageYears = (dob: string) => {
            const timestamp = dob ? Date.parse(dob) : NaN;
            return Number.isFinite(timestamp) ? (Date.now() - timestamp) / (365.25 * 24 * 60 * 60 * 1000) : null;
        };
        const ageDist = goatOnly ? [
            { name: 'Kids (<1yr)', value: active.filter(l => (ageYears(l.dob) ?? 99) < 1).length },
            { name: 'Yearlings (1-2yr)', value: active.filter(l => { const age = ageYears(l.dob); return age != null && age >= 1 && age < 2; }).length },
            { name: 'Adult Does', value: active.filter(l => (ageYears(l.dob) ?? 0) >= 2 && l.gender === 'FEMALE').length },
            { name: 'Adult Bucks', value: active.filter(l => (ageYears(l.dob) ?? 0) >= 2 && l.gender === 'MALE').length },
            { name: 'Unknown Age', value: active.filter(l => ageYears(l.dob) == null).length },
        ] : [
            { name: 'Calves (<1yr)', value: active.filter(l => (ageYears(l.dob) ?? 99) < 1).length },
            { name: 'Youngstock (1-2yr)', value: active.filter(l => { const age = ageYears(l.dob); return age != null && age >= 1 && age < 2; }).length },
            { name: 'Adult Females', value: active.filter(l => (ageYears(l.dob) ?? 0) >= 2 && l.gender === 'FEMALE').length },
            { name: 'Adult Males', value: active.filter(l => (ageYears(l.dob) ?? 0) >= 2 && l.gender === 'MALE').length },
            { name: 'Unknown Age', value: active.filter(l => ageYears(l.dob) == null).length },
        ];
        const ageRecorded = active.filter(l => ageYears(l.dob) != null).length;
        type HerdCategoryRow = { category: string; total: number; females: number; males: number; weightTotal: number; weightRecords: number };
        const categoryMap = new Map<string, HerdCategoryRow>();
        active.forEach(animal => {
            const key = animal.category || 'Uncategorized';
            const row = categoryMap.get(key) || { category: key, total: 0, females: 0, males: 0, weightTotal: 0, weightRecords: 0 };
            row.total += 1;
            if (animal.gender === 'FEMALE') row.females += 1;
            if (animal.gender === 'MALE') row.males += 1;
            if (animal.weight > 0) { row.weightTotal += animal.weight; row.weightRecords += 1; }
            categoryMap.set(key, row);
        });
        const categorySummary: HerdCategoryRow[] = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);

        return { active, sold, deceased, ageDist, ageRecorded, categorySummary };
    };

    const { active, sold, deceased, ageDist, ageRecorded, categorySummary } = calculateHerdStats();
    const today = new Date().toISOString().slice(0, 10);
    const medicalRecords = state.livestock.flatMap(animal => (animal.medicalHistory || []).map(record => ({ ...record, animalTag: animal.tagId })));
    const overdueHealth = medicalRecords.filter(record => record.nextDueDate && record.nextDueDate < today);
    const vaccinationRecords = medicalRecords.filter(record => record.type === 'VACCINATION');
    const vaccinatedAnimalIds = new Set(state.livestock.filter(animal => animal.medicalHistory?.some(record => record.type === 'VACCINATION')).map(animal => animal.id));
    const vaccinationCoverage = active.length > 0 ? Math.round((active.filter(animal => vaccinatedAnimalIds.has(animal.id)).length / active.length) * 100) : 100;
    const confirmedPregnancies = active.filter(animal => animal.breedingHistory?.some(record => record.status === 'CONFIRMED')).length;
    const performerActivity = Array.from((state.treatmentLogs || []).reduce((map, log) => {
        const performer = log.performedBy?.trim() || 'Unassigned';
        const current = map.get(performer) || { treatments: 0, cost: 0 };
        map.set(performer, { treatments: current.treatments + 1, cost: current.cost + log.cost });
        return map;
    }, new Map<string, { treatments: number; cost: number }>()).entries()).sort((a, b) => b[1].treatments - a[1].treatments);
    const COLORS = ['#059669', '#10B981', '#34D399', '#6EE7B7', '#94A3B8'];

    return (
        <div className="space-y-6 animate-fade-in p-2">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight font-display">Business Reports</h2>
                    <p className="text-sm text-slate-500 font-medium">Standardized insights for farm analysis and export</p>
                </div>
                <button onClick={() => window.print()} className="flex items-center justify-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-700 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-slate-200">
                    <Download size={18} /> Export / Print
                </button>
            </div>

            {/* Navigation Tab */}
            <label htmlFor="mobile-report-section" className="md:hidden block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Report section</label>
            <select id="mobile-report-section" aria-label="Report section" value={activeReport} onChange={e => setActiveReport(e.target.value as typeof activeReport)} className="md:hidden w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 mb-6">
                <option value="FINANCIAL">Financial Performance</option>
                <option value="HERD">Herd Demographics</option>
                <option value="INVENTORY">Inventory</option>
                <option value="FEED">Feed Consumption</option>
                <option value="OPERATIONS">Operations</option>
                <option value="DETAILED_LOGS">Detailed Logs</option>
            </select>
            <div className="hidden md:flex bg-slate-100/50 p-1.5 rounded-xl gap-2 w-full md:w-fit mb-8 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveReport('FINANCIAL')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeReport === 'FINANCIAL' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}>Financial Performance</button>
                <button onClick={() => setActiveReport('HERD')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeReport === 'HERD' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}>Herd Demographics</button>
                <button onClick={() => setActiveReport('INVENTORY')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeReport === 'INVENTORY' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}>Inventory</button>
                <button onClick={() => setActiveReport('FEED')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeReport === 'FEED' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}>Feed Consumption</button>
                <button onClick={() => setActiveReport('OPERATIONS')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeReport === 'OPERATIONS' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}>Operations</button>
                <button onClick={() => setActiveReport('DETAILED_LOGS')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeReport === 'DETAILED_LOGS' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}>Detailed Logs</button>
            </div>

            {/* ─────────────────── FEED REPORTS ─────────────────── */}
            {activeReport === 'FEED' && (
                <div className="space-y-6 animate-fade-in">

                    {/* ── Controls Bar ── */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-end items-start md:items-center gap-4">
                        <div className="flex flex-wrap gap-2">
                            {/* Date period */}
                                <select aria-label="Feed report period" value={feedPeriod} onChange={e => setFeedPeriod(e.target.value as any)}
                                    className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500">
                                    <option value="ALL">All Time</option>
                                    <option value="THIS_MONTH">This Month</option>
                                    <option value="LAST_MONTH">Last Month</option>
                                    <option value="30_DAYS">Last 30 Days</option>
                                    <option value="90_DAYS">Last 90 Days</option>
                                    <option value="7_DAYS">Last 7 Days</option>
                                </select>
                                {/* Feed category */}
                                <select aria-label="Feed category" value={feedCategoryFilter} onChange={e => setFeedCategoryFilter(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500">
                                    <option value="ALL">All Categories</option>
                                    <option value="GRASS">Grass</option>
                                    <option value="TMR">TMR</option>
                                    <option value="WANDA">Wanda</option>
                                    <option value="OTHER">Other</option>
                                </select>
                                 <button onClick={() => {
                                    const rows = feedByIngredient.map(u => ({ Ingredient: u.name, 'Total Qty': u.qty.toFixed(1) + ' ' + u.unit, 'Total Cost (PKR)': u.cost }));
                                    const h = Object.keys(rows[0] || {});
                                    const b = [h.join(','), ...rows.map(r => h.map(k => JSON.stringify((r as any)[k])).join(','))].join('\n');
                                    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([b], { type: 'text/csv' })); a.download = 'feed_consumption.csv'; a.click();
                                }} className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-all">
                                    <Download size={13} /> Export CSV
                                </button>
                            </div>
                    </div>

                    {/* ══ CONSUMPTION ══ */}
                    <div className="space-y-6">

                            {/* KPI Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 rounded-2xl text-white shadow-lg">
                                    <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Total Feed Cost</p>
                                    <p className="text-2xl font-black mt-1">{formatCurrency(feedTotalCost)}</p>
                                    <p className="text-[10px] text-emerald-200 mt-1">{periodLabel(feedPeriod)}</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingredients Used</p>
                                    <p className="text-2xl font-black text-slate-800 mt-1">{feedIngredientCount}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">distinct inventory items</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cost / Active Head</p>
                                    <p className="text-2xl font-black text-blue-600 mt-1">{formatCurrency(feedCostPerActiveHead)}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">{activeHeadCount} active animals</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Diet Plans</p>
                                    <p className="text-2xl font-black text-purple-600 mt-1">{state.dietPlans.filter(p => p.status === 'ACTIVE').length}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">{feedByDietPlan.length} with logs</p>
                                </div>
                            </div>

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-w-0">
                                {/* Category Pie */}
                                <div className="lg:col-span-2 min-w-0 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2"><Layers size={16} className="text-emerald-500" /> Cost by Feed Category</h3>
                                    {feedByCategory.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-40 text-slate-300">
                                            <Activity size={36} /><p className="text-xs mt-2 text-slate-400">No consumption data</p>
                                        </div>
                                    ) : (
                                        <div className="h-48 min-w-0 min-h-[192px]">
                                            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 192 }}>
                                                <PieChart>
                                                    <Pie data={feedByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                                                        {feedByCategory.map((_, i) => <Cell key={i} fill={FEED_COLORS[i % FEED_COLORS.length]} />)}
                                                    </Pie>
                                                    <Tooltip formatter={(v: number) => `PKR ${v.toLocaleString()}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="flex flex-wrap gap-2 mt-1 justify-center">
                                                {feedByCategory.map((c, i) => (
                                                    <span key={i} className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                                                        <span className="w-2 h-2 rounded-full" style={{ background: FEED_COLORS[i % FEED_COLORS.length] }} />{c.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Daily Trend */}
                                <div className="lg:col-span-3 min-w-0 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><TrendingUp size={16} className="text-blue-500" /> Recent Recorded Feed-Cost Days</h3>
                                    <p className="text-[10px] text-slate-400 mt-1 mb-4">Up to the latest 30 days that contain consumption records.</p>
                                    {feedDailyTrend.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-48 text-slate-300">
                                            <Calendar size={36} /><p className="text-xs mt-2 text-slate-400">No daily data in selected period</p>
                                        </div>
                                    ) : (
                                        <div className="h-48 min-w-0 min-h-[192px]">
                                            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 192 }}>
                                                <AreaChart data={feedDailyTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="feedGrad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                                    <Tooltip formatter={(v: number) => [`PKR ${v.toLocaleString()}`, 'Feed Cost']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                                    <Area type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} fill="url(#feedGrad)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tables Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* By Ingredient */}
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Activity size={15} className="text-emerald-500" /> Feed Usage by Ingredient</h3>
                                        <span className="text-xs font-bold text-slate-400">{feedByIngredient.length} items</span>
                                    </div>
                                    <div className="overflow-y-auto max-h-64">
                                        <table className="min-w-full text-xs">
                                            <thead className="bg-slate-50 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left font-bold text-slate-500 uppercase text-[10px]">Ingredient</th>
                                                    <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">Qty</th>
                                                    <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">Cost (PKR)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {feedByIngredient.length === 0 ? (
                                                    <tr><td colSpan={3} className="py-10 text-center text-slate-400">
                                                        <Activity className="mx-auto mb-2 opacity-30" size={28} />
                                                        <p className="font-bold text-xs">No consumption data in selected period</p>
                                                    </td></tr>
                                                ) : feedByIngredient.map((u, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-2.5 font-semibold text-slate-700">{u.name}</td>
                                                        <td className="px-4 py-2.5 text-right text-slate-500">{formatQuantity(u.qty, u.unit)}</td>
                                                        <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{formatNumber(u.cost)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* By Diet Plan */}
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><TrendingUp size={15} className="text-purple-500" /> Diet Plan Efficiency</h3>
                                    </div>
                                    <div className="overflow-y-auto max-h-64">
                                        <table className="min-w-full text-xs">
                                            <thead className="bg-slate-50 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left font-bold text-slate-500 uppercase text-[10px]">Plan</th>
                                                    <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">Total Cost</th>
                                                    <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">Cost / Head-Day</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {feedPlanEfficiency.length === 0 ? (
                                                    <tr><td colSpan={3} className="py-10 text-center text-slate-400">
                                                        <TrendingUp className="mx-auto mb-2 opacity-30 text-purple-400" size={28} />
                                                        <p className="font-bold text-xs">No diet plan logs in period</p>
                                                    </td></tr>
                                                ) : feedPlanEfficiency.map((p, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-2.5 font-semibold text-slate-700">{p.name}</td>
                                                        <td className="px-4 py-2.5 text-right text-emerald-600 font-bold">{formatCurrency(p.totalCost)}</td>
                                                        <td className="px-4 py-2.5 text-right font-black text-purple-600">{p.costPerAnimalPerDay == null ? <span className="text-slate-400 font-medium" title="No processed head-count ledger for this plan and period">Not available</span> : formatCurrency(p.costPerAnimalPerDay)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Per-Animal Feed Cost */}
                            {feedPerAnimal.length > 0 && (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><DollarSign size={15} className="text-amber-500" /> Per-Animal Feed Cost</h3>
                                        <span className="text-xs font-bold text-slate-400">{feedPerAnimal.length} animals tracked</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-xs">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left font-bold text-slate-500 uppercase text-[10px]">Tag ID</th>
                                                    <th className="px-4 py-2.5 text-left font-bold text-slate-500 uppercase text-[10px]">Category</th>
                                                    <th className="px-4 py-2.5 text-left font-bold text-slate-500 uppercase text-[10px]">Breed</th>
                                                    <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">Feed Cost (PKR)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {feedPerAnimal.map((a, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-2.5 font-bold text-slate-700">{a.tag}</td>
                                                        <td className="px-4 py-2.5 text-slate-500">{a.category}</td>
                                                        <td className="px-4 py-2.5 text-slate-500">{a.breed}</td>
                                                        <td className="px-4 py-2.5 text-right font-black text-amber-600">{a.cost.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Purchased vs Consumed Reconciliation */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-100 bg-slate-50">
                                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Filter size={15} className="text-blue-500" /> Purchased vs Consumed Reconciliation <span className="text-[10px] font-medium text-slate-400 ml-1">({periodLabel(feedPeriod)})</span></h3>
                                    {feedReconciliation.some(item => item.variance < 0) && (
                                        <p className="mt-2 text-xs text-amber-700">Negative variance means recorded consumption exceeds purchases in this period. Check opening stock and missing purchase entries before treating it as a loss.</p>
                                    )}
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left font-bold text-slate-500 uppercase text-[10px]">Item</th>
                                                <th className="px-4 py-2.5 text-left font-bold text-slate-500 uppercase text-[10px]">Type</th>
                                                <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">Purchased (PKR)</th>
                                                <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">Consumed (PKR)</th>
                                                <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">Variance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {feedReconciliation.length === 0 ? (
                                                <tr><td colSpan={5} className="py-10 text-center text-slate-400">
                                                    <p className="font-medium text-xs">No reconciliation data yet</p>
                                                </td></tr>
                                            ) : feedReconciliation.map((r, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-2.5 font-semibold text-slate-700">{r.name}</td>
                                                    <td className="px-4 py-2.5">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${ r.type === 'GRASS' ? 'bg-emerald-100 text-emerald-700' : r.type === 'TMR' ? 'bg-blue-100 text-blue-700' : r.type === 'WANDA' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600' }`}>{r.type}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right text-blue-600 font-bold">{r.purchased.toLocaleString()}</td>
                                                    <td className="px-4 py-2.5 text-right text-amber-600 font-bold">{r.consumed.toLocaleString()}</td>
                                                    <td className={`px-4 py-2.5 text-right font-black ${ r.variance >= 0 ? 'text-emerald-600' : 'text-red-500' }`}>{r.variance >= 0 ? '+' : ''}{r.variance.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                </div>
            )}

            {/* ─────────────────── INVENTORY REPORTS ─────────────────── */}
            {activeReport === 'INVENTORY' && (
                <div className="space-y-6 animate-fade-in">
                    {/* ── Controls Bar ── */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                            <button onClick={() => setInvSub('VALUATION')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${ invSub === 'VALUATION' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700' }`}>
                                <Package size={14} /> Inventory Valuation
                            </button>
                            <button onClick={() => setInvSub('MOVEMENT')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${ invSub === 'MOVEMENT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700' }`}>
                                <Layers size={14} /> Movement Report
                            </button>
                        </div>
                        {invSub === 'MOVEMENT' && (
                            <div className="flex flex-wrap gap-2">
                                <select aria-label="Inventory movement period" value={invPeriod} onChange={e => setInvPeriod(e.target.value as any)} className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500">
                                    <option value="ALL">All Time</option>
                                    <option value="THIS_MONTH">This Month</option>
                                    <option value="LAST_MONTH">Last Month</option>
                                    <option value="30_DAYS">Last 30 Days</option>
                                    <option value="90_DAYS">Last 90 Days</option>
                                    <option value="7_DAYS">Last 7 Days</option>
                                </select>
                                <select aria-label="Inventory movement category" value={invCategoryFilter} onChange={e => setInvCategoryFilter(e.target.value)} className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500">
                                    <option value="ALL">All Categories</option>
                                    <option value="GRASS">Grass</option>
                                    <option value="TMR">TMR</option>
                                    <option value="WANDA">Wanda</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* ══ INVENTORY VALUATION SUB-TAB ══ */}
                    {invSub === 'VALUATION' && (
                        <div className="space-y-6">

                            {/* KPI Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-5 rounded-2xl text-white shadow-lg">
                                    <p className="text-xs font-bold text-amber-100 uppercase tracking-wider">Total Stock Value</p>
                                    <p className="text-2xl font-black mt-1">PKR {invTotalValue.toLocaleString()}</p>
                                    <p className="text-[10px] text-amber-200 mt-1">{inventoryValuation.length} feed items</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Healthy Items</p>
                                    <p className="text-2xl font-black text-emerald-600 mt-1">{inventoryValuation.filter(i => !i.isLow).length}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">above reorder level</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Low Stock</p>
                                    <p className="text-2xl font-black text-amber-500 mt-1">{invLowCount}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">below reorder level</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Out of Stock</p>
                                    <p className="text-2xl font-black text-red-500 mt-1">{invOutCount}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">qty = 0</p>
                                </div>
                            </div>

                            {/* Critical Alert */}
                            {invCritical.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                                    <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-red-700 text-sm">Critical: {invCritical.length} item(s) out of stock or estimated at ≤ 3 days</p>
                                        <p className="text-xs text-red-500 mt-1">{invCritical.map(i => `${i.name} (${i.isOut ? 'out' : `${i.daysRemaining}d`})`).join(' · ')}</p>
                                    </div>
                                </div>
                            )}

                            {/* Inventory Status Table */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-100 bg-slate-50">
                                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Package size={15} className="text-amber-500" /> Feed Stock Status</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left font-bold text-slate-500 uppercase text-[10px]">Item</th>
                                                <th className="px-4 py-2.5 text-left font-bold text-slate-500 uppercase text-[10px]">Type</th>
                                                <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">Qty</th>
                                                <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">Unit Cost</th>
                                                <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">Stock Value</th>
                                                <th className="px-4 py-2.5 text-center font-bold text-slate-500 uppercase text-[10px]">Days Left (30d Rate)</th>
                                                <th className="px-4 py-2.5 text-center font-bold text-slate-500 uppercase text-[10px]">Stock Health</th>
                                                <th className="px-4 py-2.5 text-center font-bold text-slate-500 uppercase text-[10px]">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {inventoryValuation.length === 0 ? (
                                                <tr><td colSpan={8} className="py-12 text-center text-slate-400">
                                                    <Package className="mx-auto mb-2 opacity-30" size={32} />
                                                    <p className="font-bold text-xs">No feed inventory items found</p>
                                                </td></tr>
                                            ) : inventoryValuation.map((item, i) => {
                                                const healthPct = item.reorderLevel > 0 ? Math.min(100, (item.qty / item.reorderLevel) * 50) : 50;
                                                return (
                                                    <tr key={i} className={`hover:bg-slate-50 transition-colors ${ item.isOut ? 'bg-red-50/30' : item.isLow ? 'bg-amber-50/30' : '' }`}>
                                                        <td className="px-4 py-3 font-semibold text-slate-700">{item.name}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${ item.type === 'GRASS' ? 'bg-emerald-100 text-emerald-700' : item.type === 'TMR' ? 'bg-blue-100 text-blue-700' : item.type === 'WANDA' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600' }`}>{item.type}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-slate-700">{formatQuantity(item.qty, item.unit)}</td>
                                                        <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(item.unitCost)}</td>
                                                        <td className="px-4 py-3 text-right font-black text-amber-600">{formatCurrency(item.stockValue)}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            {item.daysRemaining !== null ? (
                                                                <span className={`font-black ${ item.daysRemaining <= 3 ? 'text-red-600' : item.daysRemaining <= 7 ? 'text-amber-600' : 'text-emerald-600' }`}>{item.daysRemaining}d</span>
                                                            ) : <span className="text-slate-300">—</span>}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="w-20 bg-slate-100 rounded-full h-1.5 mx-auto">
                                                                <div className={`h-1.5 rounded-full ${ item.isOut ? 'bg-red-500' : item.isLow ? 'bg-amber-400' : 'bg-emerald-500' }`} style={{ width: `${Math.min(100, healthPct)}%` }} />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {item.isOut ? (
                                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700">OUT</span>
                                                            ) : item.isLow ? (
                                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">LOW</span>
                                                            ) : (
                                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">OK</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Reorder Priority List */}
                            {inventoryValuation.some(i => i.isLow) && (
                                <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
                                    <div className="p-4 border-b border-amber-100 bg-amber-50">
                                        <h3 className="font-bold text-amber-800 text-sm flex items-center gap-2"><AlertTriangle size={15} /> Restock Review</h3>
                                        <p className="mt-1 text-[10px] text-amber-700">Target gap uses 2× the configured reorder level. Verify reorder settings, supplier lead time, and storage capacity before ordering.</p>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-xs">
                                            <thead className="bg-amber-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left font-bold text-amber-600 uppercase text-[10px]">Item</th>
                                                    <th className="px-4 py-2.5 text-right font-bold text-amber-600 uppercase text-[10px]">Current Qty</th>
                                                    <th className="px-4 py-2.5 text-right font-bold text-amber-600 uppercase text-[10px]">Reorder Level</th>
                                                    <th className="px-4 py-2.5 text-right font-bold text-amber-600 uppercase text-[10px]">Target Gap</th>
                                                    <th className="px-4 py-2.5 text-center font-bold text-amber-600 uppercase text-[10px]">Days Left (30d Rate)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-amber-50">
                                                {inventoryValuation.filter(i => i.isLow)
                                                    .sort((a, b) => Number(b.isOut) - Number(a.isOut) || (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999))
                                                    .map((item, i) => (
                                                    <tr key={i} className="hover:bg-amber-50/30">
                                                        <td className="px-4 py-2.5 font-semibold text-slate-700">{item.name}</td>
                                                        <td className="px-4 py-2.5 text-right font-bold text-red-500">{formatQuantity(item.qty, item.unit)}</td>
                                                        <td className="px-4 py-2.5 text-right text-slate-500">{formatQuantity(item.reorderLevel, item.unit)}</td>
                                                        <td className="px-4 py-2.5 text-right font-black text-amber-600">{formatQuantity(roundOrderQuantity(Math.max(0, item.reorderLevel * 2 - item.qty), item.unit), item.unit)}</td>
                                                        <td className="px-4 py-2.5 text-center">
                                                            {item.daysRemaining !== null ? (
                                                                <span className={`font-black ${ item.daysRemaining <= 3 ? 'text-red-600' : 'text-amber-600' }`}>{item.daysRemaining}d</span>
                                                            ) : <span className="text-slate-300">—</span>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                    {/* ══ INVENTORY MOVEMENT SUB-TAB ══ */}
                    {invSub === 'MOVEMENT' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Activity size={15} className="text-blue-500"/> Inventory Movement Activity</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left font-bold text-slate-500 uppercase text-[10px]">Item</th>
                                                <th className="px-4 py-2.5 text-left font-bold text-slate-500 uppercase text-[10px]">Type</th>
                                                <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">Opening Stock</th>
                                                <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">+ Received</th>
                                                <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">- Consumed</th>
                                                <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">Variance</th>
                                                <th className="px-4 py-2.5 text-right font-bold text-emerald-600 uppercase text-[10px]">Closing Stock</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {inventoryMovement.length === 0 ? (
                                                <tr><td colSpan={7} className="py-12 text-center text-slate-400"><p className="font-bold">No inventory movement in this period</p><p className="mt-1 text-[10px]">Items with unchanged stock are intentionally hidden.</p></td></tr>
                                            ) : inventoryMovement.map((item, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-semibold text-slate-700">{item.name}</td>
                                                    <td className="px-4 py-3"><span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{item.type}</span></td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-500">{formatQuantity(item.openingStock, item.unit)}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-blue-600">+{formatQuantity(item.qtyReceived, item.unit)}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-amber-600">-{formatQuantity(item.qtyConsumed, item.unit)}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-400">{formatNumber(item.variance)}</td>
                                                    <td className="px-4 py-3 text-right font-black text-emerald-600">{formatQuantity(item.closingStock, item.unit)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            )}

            {/* --- FINANCIAL REPORT --- */}
            {activeReport === 'FINANCIAL' && (
                <div className="space-y-6 animate-fade-in">

                    {/* Controls Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <label className="md:hidden w-full text-xs font-bold text-slate-500">Financial report<select aria-label="Financial report type" value={finSub} onChange={event => setFinSub(event.target.value as typeof finSub)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700"><option value="OVERVIEW">Financial Overview</option><option value="MONTHLY_MANAGEMENT">Monthly Management</option><option value="ANIMAL_PROFITABILITY">Animal P&amp;L</option><option value="CUSTOM_EXPENSE">Custom Expense Report</option></select></label>
                        <div className="hidden md:flex w-full md:w-auto overflow-x-auto bg-slate-100 p-1 rounded-xl gap-1">
                            <button onClick={() => setFinSub('OVERVIEW')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${ finSub === 'OVERVIEW' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700' }`}>
                                <Activity size={14} /> Financial Overview
                            </button>
                            <button onClick={() => setFinSub('MONTHLY_MANAGEMENT')} className={`whitespace-nowrap px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${ finSub === 'MONTHLY_MANAGEMENT' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700' }`}>
                                <Calendar size={14} /> Monthly Management
                            </button>
                            <button onClick={() => setFinSub('ANIMAL_PROFITABILITY')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${ finSub === 'ANIMAL_PROFITABILITY' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700' }`}>
                                <Package size={14} /> Animal P&L
                            </button>
                            <button onClick={() => setFinSub('CUSTOM_EXPENSE')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${ finSub === 'CUSTOM_EXPENSE' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700' }`}>
                                <Filter size={14} /> Custom Report
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            {finSub === 'OVERVIEW' && (
                                <button onClick={() => setFinAccrual(!finAccrual)} className={`text-[10px] font-bold px-3 py-2 rounded-lg border flex items-center gap-1.5 transition-all ${finAccrual ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                    Accrual Accounting {finAccrual ? '(ON)' : '(OFF)'}
                                </button>
                            )}
                            {finSub === 'OVERVIEW' && <select aria-label="Financial overview period" value={finPeriod} onChange={e => setFinPeriod(e.target.value as any)} className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500">
                                <option value="ALL">All Time</option>
                                <option value="THIS_MONTH">This Month</option>
                                <option value="LAST_MONTH">Last Month</option>
                                <option value="30_DAYS">Last 30 Days</option>
                                <option value="90_DAYS">Last 90 Days</option>
                                <option value="7_DAYS">Last 7 Days</option>
                            </select>}
                        </div>
                    </div>

                    {finSub === 'OVERVIEW' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm premium-card group">
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">{finAccrual ? 'Accrual' : 'Cash'} Net Result</p>
                                    <h3 className={`text-2xl font-black font-display group-hover:scale-105 transition-transform origin-left ${finMetrics.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {formatCurrency(finMetrics.profit)}
                                    </h3>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm premium-card group">
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Profit Margin</p>
                                    <h3 className={`text-2xl font-black font-display group-hover:scale-105 transition-transform origin-left ${finMetrics.revenue > 0 && finMetrics.profit > 0 ? 'text-blue-600' : 'text-slate-500'}`}>
                                        {finMetrics.revenue > 0 ? ((finMetrics.profit / finMetrics.revenue) * 100).toFixed(1) + '%' : '0%'}
                                    </h3>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm premium-card group">
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Total Revenue</p>
                                    <h3 className="text-2xl font-black text-slate-800 font-display group-hover:scale-105 transition-transform origin-left">
                                        {formatCurrency(finMetrics.revenue)}
                                    </h3>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm premium-card group">
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">{finAccrual ? 'Accrual Expenses' : 'Cash Expenses'}</p>
                                    <h3 className="text-2xl font-black text-red-500 font-display group-hover:scale-105 transition-transform origin-left">
                                        {formatCurrency(finMetrics.expenses)}
                                    </h3>
                                </div>
                            </div>
                            
                            <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs text-indigo-800">
                                <span className="font-bold">Accounting basis:</span> {finAccrual ? 'Inventory purchases are adjusted to recorded feed and medicine consumption.' : 'Revenue and expenses are shown when recorded.'} Category lists below show the underlying recorded entries, so their expense total can differ from the accrual-adjusted KPI.
                            </div>

                            <div className="grid min-w-0 grid-cols-1 lg:grid-cols-2 gap-6">
                                {[
                                    { title: 'Revenue by Category', data: finRevenueByCategory, total: finRevenueByCategory.reduce((sum, item) => sum + item.value, 0), color: 'bg-emerald-500', empty: 'No revenue entries in this period' },
                                    { title: 'Recorded Expenses by Category', data: finExpenseByCategory, total: finExpenseByCategory.reduce((sum, item) => sum + item.value, 0), color: 'bg-red-500', empty: 'No expense entries in this period' },
                                ].map(section => (
                                    <div key={section.title} className="min-w-0 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                                        <h3 className="font-bold text-slate-800 text-sm">{section.title}</h3>
                                        <div className="mt-4 space-y-4">
                                            {[...section.data].sort((a, b) => b.value - a.value).map(item => {
                                                const share = section.total > 0 ? (item.value / section.total) * 100 : 0;
                                                return <div key={item.name}><div className="flex items-center justify-between gap-4 text-xs"><span className="font-semibold text-slate-700 truncate">{item.name}</span><span className="font-bold text-slate-800 whitespace-nowrap">{formatCurrency(item.value)} <span className="text-slate-400 font-medium">({share.toFixed(1)}%)</span></span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${section.color}`} style={{ width: `${Math.min(100, share)}%` }} /></div></div>;
                                            })}
                                            {section.data.length === 0 && <p className="py-8 text-center text-xs text-slate-400">{section.empty}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {finSub === 'MONTHLY_MANAGEMENT' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
                                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Calendar size={19} className="text-indigo-600" /> Monthly Management Report</h3>
                                        <p className="mt-1 text-xs text-slate-500 max-w-3xl">Cash-basis comparison of recorded sales, cash expenses, purchases, and feed consumed. System-generated feed and treatment usage entries are excluded from cash expenses; consumption is shown separately and is not subtracted again.</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                                        <select aria-label="Monthly management report range" value={managementRange} onChange={event => setManagementRange(event.target.value as '6' | '12' | '24' | 'ALL')} className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500">
                                            <option value="6">Last 6 months</option>
                                            <option value="12">Last 12 months</option>
                                            <option value="24">Last 24 months</option>
                                            <option value="ALL">All recorded months</option>
                                        </select>
                                        <button onClick={() => {
                                            const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
                                            const headers = ['Month', 'Sales', 'Cash Expenses', 'Feed Purchases', 'Other Purchases', 'Total Purchases', 'Feed Consumed Cost', 'Cash Result'];
                                            const rows = monthlyManagementData.map(row => [row.month, row.salesRevenue, row.totalExpenses, row.feedPurchases, row.otherPurchases, row.totalPurchases, row.feedConsumed, row.cashResult]);
                                            const csv = [headers, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n');
                                            const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.download = `cattlepro-monthly-management-${today}.csv`;
                                            link.click();
                                            URL.revokeObjectURL(url);
                                        }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"><Download size={15} /> Export CSV</button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sales</p><p className="mt-2 text-lg sm:text-2xl font-black text-emerald-600">{formatCurrency(monthlyManagementTotals.salesRevenue)}</p></div>
                                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cash expenses</p><p className="mt-2 text-lg sm:text-2xl font-black text-red-500">{formatCurrency(monthlyManagementTotals.totalExpenses)}</p></div>
                                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Feed purchases</p><p className="mt-2 text-lg sm:text-2xl font-black text-blue-600">{formatCurrency(monthlyManagementTotals.feedPurchases)}</p></div>
                                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Feed consumed</p><p className="mt-2 text-lg sm:text-2xl font-black text-amber-600">{formatCurrency(monthlyManagementTotals.feedConsumed)}</p></div>
                                <div className="col-span-2 lg:col-span-1 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cash result</p><p className={`mt-2 text-lg sm:text-2xl font-black ${monthlyManagementTotals.cashResult >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(monthlyManagementTotals.cashResult)}</p></div>
                            </div>

                            <div className="min-w-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
                                <h4 className="font-bold text-slate-800 text-sm">Monthly cash inflow versus outflow</h4>
                                <p className="mt-1 text-[10px] text-slate-400">Feed purchase and consumption detail remains in the reconciliation table below.</p>
                                <div className="mt-4 h-80 min-w-0 min-h-[320px]">
                                    <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 320 }}>
                                        <BarChart data={monthlyManagementData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={62} tickFormatter={value => `Rs${Math.round(value / 1000)}k`} />
                                            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                                            <Bar dataKey="salesRevenue" name="Sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="totalExpenses" name="Cash expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-[1050px] w-full text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-100"><tr><th className="px-4 py-3 text-left">Month</th><th className="px-4 py-3 text-right">Sales</th><th className="px-4 py-3 text-right">Cash Expenses</th><th className="px-4 py-3 text-right">Feed Purchases</th><th className="px-4 py-3 text-right">Other Purchases</th><th className="px-4 py-3 text-right">Total Purchases</th><th className="px-4 py-3 text-right">Feed Consumed</th><th className="px-4 py-3 text-right">Cash Result</th></tr></thead>
                                        <tbody className="divide-y divide-slate-100">{[...monthlyManagementData].reverse().map(row => <tr key={row.month} className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-700">{row.label}</td><td className="px-4 py-3 text-right font-bold text-emerald-600">{formatCurrency(row.salesRevenue)}</td><td className="px-4 py-3 text-right font-bold text-red-500">{formatCurrency(row.totalExpenses)}</td><td className="px-4 py-3 text-right text-blue-600">{formatCurrency(row.feedPurchases)}</td><td className="px-4 py-3 text-right text-slate-600">{formatCurrency(row.otherPurchases)}</td><td className="px-4 py-3 text-right font-semibold text-slate-700">{formatCurrency(row.totalPurchases)}</td><td className="px-4 py-3 text-right text-amber-600">{formatCurrency(row.feedConsumed)}</td><td className={`px-4 py-3 text-right font-black ${row.cashResult >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(row.cashResult)}</td></tr>)}</tbody>
                                        <tfoot className="bg-slate-50 border-t-2 border-slate-200"><tr><td className="px-4 py-3 font-black text-slate-700">Selected total</td><td className="px-4 py-3 text-right font-black text-emerald-600">{formatCurrency(monthlyManagementTotals.salesRevenue)}</td><td className="px-4 py-3 text-right font-black text-red-500">{formatCurrency(monthlyManagementTotals.totalExpenses)}</td><td className="px-4 py-3 text-right font-black text-blue-600">{formatCurrency(monthlyManagementTotals.feedPurchases)}</td><td className="px-4 py-3 text-right font-bold text-slate-600">{formatCurrency(monthlyManagementTotals.otherPurchases)}</td><td className="px-4 py-3 text-right font-black text-slate-700">{formatCurrency(monthlyManagementTotals.feedPurchases + monthlyManagementTotals.otherPurchases)}</td><td className="px-4 py-3 text-right font-black text-amber-600">{formatCurrency(monthlyManagementTotals.feedConsumed)}</td><td className={`px-4 py-3 text-right font-black ${monthlyManagementTotals.cashResult >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(monthlyManagementTotals.cashResult)}</td></tr></tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {finSub === 'ANIMAL_PROFITABILITY' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${allocatedOperatingCostCoverage < 80 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                <div>
                                    <p className={`text-sm font-bold ${allocatedOperatingCostCoverage < 80 ? 'text-amber-900' : 'text-emerald-900'}`}>Cost allocation coverage: {allocatedOperatingCostCoverage}%</p>
                                    <p className={`text-xs mt-1 ${allocatedOperatingCostCoverage < 80 ? 'text-amber-700' : 'text-emerald-700'}`}>{allocatedOperatingCostCoverage < 80 ? 'Net P&L is provisional: feed or medical costs are not allocated to most animals. Treat this as direct recorded margin until allocation is complete.' : 'Most animals include allocated feed or medical costs.'}</p>
                                </div>
                                <span className="shrink-0 text-xs font-black px-3 py-1.5 rounded-full bg-white/80 text-slate-700">Any cost recorded: {animalCostCoverage}%</span>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-wrap gap-4">
                                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                        <DollarSign size={15} className="text-blue-500"/> Animal P&L Drill-down
                                    </h3>
                                    <div className="flex gap-2">
                                        <select value={finAnimalStatus} onChange={e => setFinAnimalStatus(e.target.value)} className="bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500">
                                            <option value="ALL">All Statuses</option>
                                            <option value="ACTIVE">Active Only</option>
                                            <option value="SOLD">Sold Only</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="overflow-x-auto max-h-[600px]">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm shadow-slate-100">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left font-bold text-slate-500 uppercase text-[10px]">Animal ID</th>
                                                <th className="px-4 py-2.5 text-left font-bold text-slate-500 uppercase text-[10px]">Status</th>
                                                <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">Purchase Cost</th>
                                                <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">Feed Cost</th>
                                                <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">Med Cost</th>
                                                <th className="px-4 py-2.5 text-right font-bold text-blue-600 uppercase text-[10px]">Total Cost</th>
                                                <th className="px-4 py-2.5 text-right font-bold text-emerald-600 uppercase text-[10px]">Sale Value</th>
                                                <th className="px-4 py-2.5 text-right font-bold text-slate-800 uppercase text-[10px]">Net P&L</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {animalProfitability.map((item, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-semibold text-slate-700">{item.id} <span className="text-[10px] text-slate-400 font-normal">({item.category})</span></td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${item.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : item.status === 'SOLD' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{item.status}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-slate-500">{item.purchaseCost.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-right font-medium text-slate-500">{item.feedCost.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-right font-medium text-slate-500">{item.medicalCost.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-700 border-l border-slate-100">{item.totalCost.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{item.saleValue > 0 ? item.saleValue.toLocaleString() : '—'}</td>
                                                    <td className={`px-4 py-3 text-right font-black ${item.profit > 0 ? 'text-emerald-600' : item.profit < 0 ? 'text-red-500' : 'text-slate-400'} border-l border-slate-100`}>
                                                        {item.profit > 0 ? '+' : ''}{item.profit.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            {animalProfitability.length === 0 && (
                                                <tr><td colSpan={8} className="py-8 text-center text-slate-400">No animals match filter.</td></tr>
                                            )}
                                        </tbody>
                                        <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                            <tr>
                                                <td colSpan={5} className="px-4 py-3 text-right font-bold text-slate-600 text-[10px] uppercase">Totals:</td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-700">{animalProfitability.reduce((s, a) => s + a.totalCost, 0).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right font-bold text-emerald-600">{animalProfitability.reduce((s, a) => s + a.saleValue, 0).toLocaleString()}</td>
                                                <td className={`px-4 py-3 text-right font-black ${animalProfitability.reduce((s, a) => s + a.profit, 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{animalProfitability.reduce((s, a) => s + a.profit, 0).toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {finSub === 'CUSTOM_EXPENSE' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Filter size={18} className="text-emerald-500"/> Custom Expense Report</h3>
                                        <p className="text-xs text-slate-500 mt-1">Filter recorded expenses by date and category, then export the exact result.</p>
                                    </div>
                                    <button onClick={() => {
                                        const selected = state.expenses.filter(e => (!customExpenseStartDate || e.date >= customExpenseStartDate) && (!customExpenseEndDate || e.date <= customExpenseEndDate) && (customExpenseType === 'ALL' || e.category === customExpenseType));
                                        const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
                                        const csv = ['Date,Category,Description,Amount', ...selected.map(e => [e.date, e.category, escapeCsv(e.description), e.amount].join(','))].join('\n');
                                        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = `cattlepro-expenses-${today}.csv`;
                                        link.click();
                                        URL.revokeObjectURL(url);
                                    }} className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700"><Download size={16}/> Export CSV</button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                                    <label className="text-xs font-bold text-slate-500">Start date<input aria-label="Custom report start date" type="date" value={customExpenseStartDate} onChange={e => setCustomExpenseStartDate(e.target.value)} className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg font-normal text-slate-700" /></label>
                                    <label className="text-xs font-bold text-slate-500">End date<input aria-label="Custom report end date" type="date" value={customExpenseEndDate} onChange={e => setCustomExpenseEndDate(e.target.value)} className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg font-normal text-slate-700" /></label>
                                    <label className="text-xs font-bold text-slate-500">Category<select aria-label="Custom report category" value={customExpenseType} onChange={e => setCustomExpenseType(e.target.value)} className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg font-normal text-slate-700"><option value="ALL">All categories</option>{Array.from(new Set(state.expenses.map(e => e.category))).sort().map(category => <option key={category} value={category}>{category}</option>)}</select></label>
                                </div>
                                {(() => {
                                    const selected = state.expenses.filter(e => (!customExpenseStartDate || e.date >= customExpenseStartDate) && (!customExpenseEndDate || e.date <= customExpenseEndDate) && (customExpenseType === 'ALL' || e.category === customExpenseType)).sort((a, b) => b.date.localeCompare(a.date));
                                    const total = selected.reduce((sum, expense) => sum + expense.amount, 0);
                                    return <>
                                        <div className="grid grid-cols-2 gap-3 mb-4"><div className="bg-slate-50 rounded-xl p-4"><p className="text-[10px] uppercase font-bold text-slate-400">Records</p><p className="text-2xl font-black text-slate-800">{selected.length}</p></div><div className="bg-emerald-50 rounded-xl p-4"><p className="text-[10px] uppercase font-bold text-emerald-600">Selected total</p><p className="text-xl sm:text-2xl font-black text-emerald-700">{formatCurrency(total)}</p></div></div>
                                        <div className="overflow-x-auto rounded-xl border border-slate-100"><table className="min-w-[680px] w-full text-xs"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-left">Description</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{selected.map(expense => <tr key={expense.id}><td className="px-4 py-3 font-semibold">{expense.date}</td><td className="px-4 py-3">{expense.category}</td><td className="px-4 py-3 text-slate-500">{expense.description || '—'}</td><td className="px-4 py-3 text-right font-bold">{formatCurrency(expense.amount)}</td></tr>)}{selected.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-slate-400">No expenses match these filters.</td></tr>}</tbody></table></div>
                                    </>;
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- HERD REPORT --- */}
            {activeReport === 'HERD' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center premium-card hover:-translate-y-1 transition-transform">
                            <h3 className="text-4xl font-extrabold text-emerald-600 font-display">{active.length}</h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Active Animals</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center premium-card hover:-translate-y-1 transition-transform">
                            <h3 className="text-4xl font-extrabold text-blue-600 font-display">{active.filter(a => a.gender === 'FEMALE').length}</h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Females</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center premium-card hover:-translate-y-1 transition-transform">
                            <h3 className="text-4xl font-extrabold text-indigo-600 font-display">{active.length > 0 ? Math.round((ageRecorded / active.length) * 100) : 100}%</h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Age Data Recorded</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center premium-card hover:-translate-y-1 transition-transform">
                            <h3 className="text-4xl font-extrabold text-slate-600 font-display">{sold.length + deceased.length}</h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Exits (Sold/Dead)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Activity size={18} /> Herd Age Structure</h3>
                            <div className="h-72 min-w-0 min-h-[288px]">
                                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 480, height: 288 }}>
                                    <PieChart>
                                        <Pie data={ageDist} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                            {ageDist.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><Layers size={18} /> Active Herd Composition</h3>
                            <p className="text-xs text-slate-400 mb-4">Operational groups with gender mix and share of the active herd.</p>
                            <div className="overflow-y-auto max-h-72">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Category</th>
                                            <th className="px-4 py-2 text-right">Total</th>
                                            <th className="px-4 py-2 text-right">Female / Male</th>
                                            <th className="px-4 py-2 text-right">Herd Share</th>
                                        </tr>
                                    </thead>
                                    <tbody>{categorySummary.map(row => <tr key={row.category} className="border-b border-slate-100"><td className="px-4 py-3 font-semibold text-slate-700">{row.category}</td><td className="px-4 py-3 text-right font-bold">{row.total}</td><td className="px-4 py-3 text-right text-slate-600">{row.females} / {row.males}</td><td className="px-4 py-3 text-right text-slate-600">{active.length > 0 ? `${((row.total / active.length) * 100).toFixed(1)}%` : '0%'}</td></tr>)}{categorySummary.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-slate-400">No active animals.</td></tr>}</tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- OPERATIONS REPORT --- */}
            {activeReport === 'OPERATIONS' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                        <div><h3 className="text-xl font-bold text-slate-800">Operations Report</h3><p className="text-sm text-slate-500">Health compliance, breeding workload and recorded treatment activity.</p></div>
                        <p className="text-xs text-slate-400">Updated {new Date().toLocaleString()}</p>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[10px] font-bold uppercase text-slate-400">Vaccination coverage</p><p className={`text-3xl font-black mt-2 ${vaccinationCoverage >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{vaccinationCoverage}%</p><p className="text-xs text-slate-400 mt-1">{vaccinationRecords.length} records</p></div>
                        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm"><p className="text-[10px] font-bold uppercase text-red-500">Overdue health actions</p><p className="text-3xl font-black text-red-600 mt-2">{overdueHealth.length}</p><p className="text-xs text-slate-400 mt-1">Follow-ups before {today}</p></div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[10px] font-bold uppercase text-slate-400">Confirmed pregnancies</p><p className="text-3xl font-black text-indigo-600 mt-2">{confirmedPregnancies}</p><p className="text-xs text-slate-400 mt-1">Active herd</p></div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[10px] font-bold uppercase text-slate-400">Treatment logs</p><p className="text-3xl font-black text-blue-600 mt-2">{state.treatmentLogs?.length || 0}</p><p className="text-xs text-slate-400 mt-1">{formatCurrency((state.treatmentLogs || []).reduce((sum, log) => sum + log.cost, 0))}</p></div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100"><h4 className="font-bold text-slate-800 flex items-center gap-2"><AlertTriangle size={16} className="text-red-500"/> Overdue care queue</h4></div>
                            <div className="max-h-80 overflow-auto"><table className="w-full text-xs"><thead className="bg-slate-50 sticky top-0"><tr><th className="px-4 py-2 text-left">Animal</th><th className="px-4 py-2 text-left">Action</th><th className="px-4 py-2 text-right">Due</th></tr></thead><tbody className="divide-y divide-slate-100">{overdueHealth.sort((a,b) => String(a.nextDueDate).localeCompare(String(b.nextDueDate))).map(record => <tr key={`${record.animalTag}-${record.id}`}><td className="px-4 py-3 font-bold">{record.animalTag}</td><td className="px-4 py-3 text-slate-600">{record.medicineName || record.type}</td><td className="px-4 py-3 text-right font-bold text-red-600">{record.nextDueDate}</td></tr>)}{overdueHealth.length === 0 && <tr><td colSpan={3} className="p-10 text-center text-slate-400">No overdue health actions.</td></tr>}</tbody></table></div>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100"><h4 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={16} className="text-blue-500"/> Recorded employee activity</h4><p className="text-[11px] text-slate-400 mt-1">Based on treatment logs; unrecorded work is not included.</p></div>
                            <div className="max-h-80 overflow-auto"><table className="w-full text-xs"><thead className="bg-slate-50 sticky top-0"><tr><th className="px-4 py-2 text-left">Performed by</th><th className="px-4 py-2 text-right">Treatments</th><th className="px-4 py-2 text-right">Recorded cost</th></tr></thead><tbody className="divide-y divide-slate-100">{performerActivity.map(([name, values]) => <tr key={name}><td className="px-4 py-3 font-semibold">{name}</td><td className="px-4 py-3 text-right font-bold">{values.treatments}</td><td className="px-4 py-3 text-right">{formatCurrency(values.cost)}</td></tr>)}{performerActivity.length === 0 && <tr><td colSpan={3} className="p-10 text-center text-slate-400">No treatment activity recorded.</td></tr>}</tbody></table></div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- DETAILED LOGS REPORT --- */}
            {activeReport === 'DETAILED_LOGS' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Controls */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 premium-card">
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setLogCategory('MILK')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${logCategory === 'MILK' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Milk Logs</button>
                            <button onClick={() => setLogCategory('FINANCE')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${logCategory === 'FINANCE' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Cash Summary</button>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setLogPeriod('DAILY')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${logPeriod === 'DAILY' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>DAILY</button>
                            <button onClick={() => setLogPeriod('WEEKLY')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${logPeriod === 'WEEKLY' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>WEEKLY</button>
                            <button onClick={() => setLogPeriod('MONTHLY')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${logPeriod === 'MONTHLY' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>MONTHLY</button>
                        </div>
                    </div>

                    {/* Report Table Content */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden premium-card">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">Period</th>
                                        {logCategory === 'MILK' ? (
                                            <>
                                                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">Records</th>
                                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-xs tracking-wider">Total Yield (L)</th>
                                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-xs tracking-wider">Avg/Record</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-xs tracking-wider">Cash Income</th>
                                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-xs tracking-wider">Cash Expense</th>
                                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-xs tracking-wider">Cash Result</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {/* GENERATE ROWS DYNAMICALLY */}
                                    {(() => {
                                        // Helper to group data
                                        const groupData = () => {
                                            const map = new Map();

                                            if (logCategory === 'MILK') {
                                                state.livestock.forEach(animal => {
                                                    animal.milkProductionHistory?.forEach(record => {
                                                        let key = record.date;
                                                        if (logPeriod === 'MONTHLY') key = record.date.slice(0, 7); // YYYY-MM
                                                        if (logPeriod === 'WEEKLY') {
                                                            const d = new Date(record.date);
                                                            const day = d.getDay();
                                                            const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
                                                            const monday = new Date(d.setDate(diff)).toISOString().slice(0, 10);
                                                            key = `Week of ${monday}`;
                                                        }

                                                        const existing = map.get(key) || { count: 0, total: 0 };
                                                        map.set(key, { count: existing.count + 1, total: existing.total + record.quantity });
                                                    });
                                                });
                                            } else {
                                                // FINANCE
                                                state.sales.forEach(s => {
                                                    let key = s.date;
                                                    if (logPeriod === 'MONTHLY') key = s.date.slice(0, 7);
                                                    if (logPeriod === 'WEEKLY') {
                                                        const d = new Date(s.date);
                                                        const day = d.getDay();
                                                        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                                                        const monday = new Date(d.setDate(diff)).toISOString().slice(0, 10);
                                                        key = `Week of ${monday}`;
                                                    }
                                                    const existing = map.get(key) || { income: 0, expense: 0 };
                                                    map.set(key, { ...existing, income: existing.income + s.amount });
                                                });
                                                state.expenses.filter(expense => !isSystemUsageExpense(expense)).forEach(e => {
                                                    let key = e.date;
                                                    if (logPeriod === 'MONTHLY') key = e.date.slice(0, 7);
                                                    if (logPeriod === 'WEEKLY') {
                                                        const d = new Date(e.date);
                                                        const day = d.getDay();
                                                        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                                                        const monday = new Date(d.setDate(diff)).toISOString().slice(0, 10);
                                                        key = `Week of ${monday}`;
                                                    }

                                                    const existing = map.get(key) || { income: 0, expense: 0 };
                                                    map.set(key, { ...existing, expense: existing.expense + e.amount });
                                                });
                                            }
                                            return Array.from(map.entries()).sort().reverse(); // Newest first
                                        };

                                        const rows = groupData();

                                        if (rows.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-16 text-center bg-slate-50/50">
                                                        <FileText className="mx-auto mb-4 opacity-30 text-slate-500" size={48} />
                                                        <p className="font-bold text-slate-600 text-lg">No records found for this period</p>
                                                        <p className="text-sm text-slate-400 mt-1">Change the category or period to see detailed insights.</p>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return rows.map(([period, data]) => (
                                            <tr key={period} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-6 py-4 font-bold text-slate-700">{period}</td>
                                                {logCategory === 'MILK' ? (
                                                    <>
                                                        <td className="px-6 py-4 font-medium text-slate-600">{data.count} Records</td>
                                                        <td className="px-6 py-4 text-right font-black text-sky-600 group-hover:scale-105 transition-transform origin-right">{data.total.toFixed(1)} L</td>
                                                        <td className="px-6 py-4 text-right font-bold text-slate-400">{(data.total / data.count).toFixed(1)} L</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-6 py-4 text-right font-bold text-emerald-600 group-hover:text-emerald-700">{formatCurrency(data.income)}</td>
                                                        <td className="px-6 py-4 text-right font-bold text-red-500 group-hover:text-red-600">{formatCurrency(data.expense)}</td>
                                                        <td className={`px-6 py-4 text-right font-black ${data.income - data.expense >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            {formatCurrency(data.income - data.expense)}
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
