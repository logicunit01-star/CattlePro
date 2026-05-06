
import React, { useState, useMemo, useEffect } from 'react';
import { AppState, Sale } from '../types';
import { backendService } from '../services/backendService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { FileText, Download, Filter, TrendingUp, DollarSign, Activity, Calendar, Package, AlertTriangle, CheckCircle, Layers } from 'lucide-react';

interface Props {
    state: AppState;
    currentFarmId: string | null;
}

export const Reports: React.FC<Props> = ({ state, currentFarmId }) => {
    const [activeReport, setActiveReport] = useState<'FINANCIAL' | 'HERD' | 'OPERATIONS' | 'DETAILED_LOGS' | 'FEED' | 'INVENTORY'>('FINANCIAL');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [logPeriod, setLogPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
    const [logCategory, setLogCategory] = useState<'MILK' | 'FINANCE'>('MILK');

    // --- FEED REPORT STATE ---
    const [feedPeriod, setFeedPeriod] = useState<'7_DAYS' | '30_DAYS' | '90_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL'>('THIS_MONTH');
    const [feedCategoryFilter, setFeedCategoryFilter] = useState<string>('ALL');

    // --- INVENTORY REPORT STATE ---
    const [invSub, setInvSub] = useState<'VALUATION' | 'MOVEMENT'>('VALUATION');
    const [invPeriod, setInvPeriod] = useState<'7_DAYS' | '30_DAYS' | '90_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL'>('THIS_MONTH');
    const [invCategoryFilter, setInvCategoryFilter] = useState<string>('ALL');

    // --- FINANCIAL REPORT STATE ---
    const [finPeriod, setFinPeriod] = useState<'7_DAYS' | '30_DAYS' | '90_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL'>('ALL');
    const [finSub, setFinSub] = useState<'OVERVIEW' | 'ANIMAL_PROFITABILITY' | 'CUSTOM_EXPENSE'>('OVERVIEW');
    const [finAccrual, setFinAccrual] = useState<boolean>(true);
    const [finAnimalStatus, setFinAnimalStatus] = useState<string>('ALL');

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
    const feedTotalQty = useMemo(() => filteredFeedLogs.reduce((s, l) => s + l.quantityUsed, 0), [filteredFeedLogs]);
    const feedAvgCostPerUnit = feedTotalQty > 0 ? feedTotalCost / feedTotalQty : 0;

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

    // Diet plan efficiency (cost per animal per day)
    const feedPlanEfficiency = useMemo(() => {
        return state.dietPlans.map(plan => {
            const planLogs = filteredFeedLogs.filter(l => l.dietPlanId === plan.id);
            const totalCost = planLogs.reduce((s, l) => s + l.cost, 0);
            const days = new Set(planLogs.map(l => l.date)).size || 1;
            const animals = plan.totalAnimals || 1;
            return { name: plan.name, totalCost: Math.round(totalCost), days, costPerAnimalPerDay: Math.round(totalCost / days / animals) };
        }).filter(p => p.totalCost > 0);
    }, [filteredFeedLogs, state.dietPlans]);

    // Purchased vs consumed reconciliation (all-time)
    const feedReconciliation = useMemo(() => {
        const feedOnlyItems = state.feed.filter(f => f.category === 'FEED' || !f.category || f.feedType);
        return feedOnlyItems.map(item => {
            const purchased = state.expenses.filter(e => e.feedItemId === item.id).reduce((s, e) => s + e.amount, 0);
            const consumed = (state.consumptionLogs || []).filter(l => l.itemId === item.id).reduce((s, l) => s + l.cost, 0);
            return { name: item.name, type: item.feedType || '—', purchased: Math.round(purchased), consumed: Math.round(consumed), variance: Math.round(purchased - consumed) };
        }).filter(r => r.purchased > 0 || r.consumed > 0);
    }, [state.feed, state.expenses, state.consumptionLogs]);

    // Inventory Valuation
    const inventoryValuation = useMemo(() => {
        const feedOnlyItems = state.feed.filter(f => f.category === 'FEED' || !f.category || f.feedType);
        return feedOnlyItems.map(item => {
            const stockValue = item.quantity * item.unitCost;
            // Average daily consumption from all logs
            const allLogs = (state.consumptionLogs || []).filter(l => l.itemId === item.id);
            const days = new Set(allLogs.map(l => l.date)).size || 1;
            const totalQtyConsumed = allLogs.reduce((s, l) => s + l.quantityUsed, 0);
            const avgDailyConsumption = totalQtyConsumed / days;
            const daysRemaining = avgDailyConsumption > 0 ? Math.floor(item.quantity / avgDailyConsumption) : null;
            const isLow = item.quantity <= item.reorderLevel;
            const isOut = item.quantity === 0;
            return { name: item.name, type: item.feedType || '—', qty: item.quantity, unit: item.unit || 'KG', unitCost: item.unitCost, stockValue: Math.round(stockValue), reorderLevel: item.reorderLevel, daysRemaining, isLow, isOut };
        });
    }, [state.feed, state.consumptionLogs]);

    const invTotalValue = inventoryValuation.reduce((s, i) => s + i.stockValue, 0);
    const invLowCount = inventoryValuation.filter(i => i.isLow && !i.isOut).length;
    const invOutCount = inventoryValuation.filter(i => i.isOut).length;
    const invCritical = inventoryValuation.filter(i => i.daysRemaining !== null && i.daysRemaining <= 3);

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
            }).filter(Boolean) as { name: string; type: string; unit: string; openingStock: number; qtyReceived: number; qtyConsumed: number; closingStock: number; variance: number }[];
        }
        return inventoryMovementClient;
    }, [currentFarmId, invMovementServer, inventoryMovementClient, state.feed, invCategoryFilter]);

    const FEED_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];

    // --- FINANCIAL CALCS (ACCRUAL ADJUSTED) ---
    const calculateFinancials = () => {
        const expenses = state.expenses;
        const sales = state.sales;

        // Group by Month (Last 6 Months)
        const months = Array.from({ length: 6 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            return d.toISOString().slice(0, 7); // YYYY-MM
        }).reverse();

        const monthlyData = months.map(month => {
            const monthExpensesRaw = expenses.filter(e => e.date.startsWith(month)).reduce((sum, e) => sum + e.amount, 0);
            const monthSales = sales.filter(s => s.date.startsWith(month)).reduce((sum, s) => sum + s.amount, 0);
            const inventoryPurchased = expenses
                .filter(e => e.date.startsWith(month) && !e.description?.includes('Consumption') && !e.description?.includes('Treatment Application') && (e.category === 'FEED' || e.category === 'MEDICAL' || e.category === 'PURCHASE' || e.category === 'INFRASTRUCTURE'))
                .reduce((sum, e) => sum + e.amount, 0);
            const inventoryConsumed =
                (state.consumptionLogs?.filter(l => l.date.startsWith(month)).reduce((sum, l) => sum + l.cost, 0) || 0) +
                (state.treatmentLogs?.filter(l => l.date.startsWith(month)).reduce((sum, l) => sum + l.cost, 0) || 0);

            const inventoryDelta = inventoryPurchased - inventoryConsumed;
            const accrualExpenses = finAccrual ? (monthExpensesRaw - inventoryDelta) : monthExpensesRaw;

            return {
                name: month,
                Revenue: monthSales,
                Expenses: accrualExpenses,
                Profit: monthSales - accrualExpenses
            };
        });

        return { monthlyData };
    };

    const { monthlyData } = calculateFinancials();

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
        let cashExp = expenses.reduce((sum, e) => sum + e.amount, 0);

        let accrualExp = cashExp;
        if (finAccrual) {
            const inventoryPurchased = expenses
                .filter(e => !e.description?.includes('Consumption') && !e.description?.includes('Treatment Application') && (e.category === 'FEED' || e.category === 'MEDICAL' || e.category === 'PURCHASE' || e.category === 'INFRASTRUCTURE'))
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

    const monthlyChartData = useMemo(() => {
        if (finOverviewServer?.timeSeries?.length) {
            return finOverviewServer.timeSeries.map(t => ({
                name: t.period,
                Revenue: t.revenue,
                Expenses: t.expenses,
                Profit: t.profit,
            }));
        }
        return monthlyData;
    }, [finOverviewServer, monthlyData]);

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

    // --- HERD CALCS ---
    const calculateHerdStats = () => {
        const active = state.livestock.filter(l => l.status === 'ACTIVE');
        const sold = state.livestock.filter(l => l.status === 'SOLD');
        const deceased = state.livestock.filter(l => l.status === 'DECEASED');

        // Age Distribution (Simplified)
        const ageDist = [
            { name: 'Calf (<1yr)', value: active.filter(l => l.category === 'Calf').length },
            { name: 'Heifer (1-2yr)', value: active.filter(l => l.category === 'Heifer').length },
            { name: 'Adult Cow', value: active.filter(l => l.category === 'Cow' || l.category === 'Bull').length },
        ];

        return { active, sold, deceased, ageDist };
    };

    const { active, sold, deceased, ageDist } = calculateHerdStats();
    const COLORS = ['#059669', '#10B981', '#34D399', '#6EE7B7'];

    return (
        <div className="space-y-6 animate-fade-in p-2">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight font-display">Business Reports</h2>
                    <p className="text-sm text-slate-500 font-medium">Standardized insights for farm analysis and export</p>
                </div>
                <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-700 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-slate-200">
                    <Download size={18} /> Export / Print
                </button>
            </div>

            {/* Navigation Tab */}
            <div className="flex bg-slate-100/50 p-1.5 rounded-xl gap-2 w-full md:w-fit mb-8 overflow-x-auto no-scrollbar">
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
                                <select value={feedPeriod} onChange={e => setFeedPeriod(e.target.value as any)}
                                    className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500">
                                    <option value="ALL">All Time</option>
                                    <option value="THIS_MONTH">This Month</option>
                                    <option value="LAST_MONTH">Last Month</option>
                                    <option value="30_DAYS">Last 30 Days</option>
                                    <option value="90_DAYS">Last 90 Days</option>
                                    <option value="7_DAYS">Last 7 Days</option>
                                </select>
                                {/* Feed category */}
                                <select value={feedCategoryFilter} onChange={e => setFeedCategoryFilter(e.target.value)}
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
                                    <p className="text-2xl font-black mt-1">PKR {feedTotalCost.toLocaleString()}</p>
                                    <p className="text-[10px] text-emerald-200 mt-1">{feedPeriod.replace('_', ' ')}</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty Consumed</p>
                                    <p className="text-2xl font-black text-slate-800 mt-1">{feedTotalQty.toFixed(1)}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">units across all items</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Cost / Unit</p>
                                    <p className="text-2xl font-black text-blue-600 mt-1">PKR {feedAvgCostPerUnit.toFixed(0)}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">weighted average</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Diet Plans</p>
                                    <p className="text-2xl font-black text-purple-600 mt-1">{state.dietPlans.filter(p => p.status === 'ACTIVE').length}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">{feedByDietPlan.length} with logs</p>
                                </div>
                            </div>

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                {/* Category Pie */}
                                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2"><Layers size={16} className="text-emerald-500" /> Cost by Feed Category</h3>
                                    {feedByCategory.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-40 text-slate-300">
                                            <Activity size={36} /><p className="text-xs mt-2 text-slate-400">No consumption data</p>
                                        </div>
                                    ) : (
                                        <div className="h-48">
                                            <ResponsiveContainer width="100%" height="100%">
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
                                <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2"><TrendingUp size={16} className="text-blue-500" /> Daily Feed Cost Trend</h3>
                                    {feedDailyTrend.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-48 text-slate-300">
                                            <Calendar size={36} /><p className="text-xs mt-2 text-slate-400">No daily data in selected period</p>
                                        </div>
                                    ) : (
                                        <div className="h-48">
                                            <ResponsiveContainer width="100%" height="100%">
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
                                                        <td className="px-4 py-2.5 text-right text-slate-500">{u.qty.toFixed(1)} {u.unit}</td>
                                                        <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{u.cost.toLocaleString()}</td>
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
                                                    <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">PKR/Animal/Day</th>
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
                                                        <td className="px-4 py-2.5 text-right text-emerald-600 font-bold">{p.totalCost.toLocaleString()}</td>
                                                        <td className="px-4 py-2.5 text-right font-black text-purple-600">{p.costPerAnimalPerDay.toLocaleString()}</td>
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
                                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Filter size={15} className="text-blue-500" /> Purchased vs Consumed Reconciliation <span className="text-[10px] font-medium text-slate-400 ml-1">(All Time)</span></h3>
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
                                <select value={invPeriod} onChange={e => setInvPeriod(e.target.value as any)} className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500">
                                    <option value="ALL">All Time</option>
                                    <option value="THIS_MONTH">This Month</option>
                                    <option value="LAST_MONTH">Last Month</option>
                                    <option value="30_DAYS">Last 30 Days</option>
                                    <option value="90_DAYS">Last 90 Days</option>
                                    <option value="7_DAYS">Last 7 Days</option>
                                </select>
                                <select value={invCategoryFilter} onChange={e => setInvCategoryFilter(e.target.value)} className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500">
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
                                        <p className="font-bold text-red-700 text-sm">Critical: {invCritical.length} item(s) running out in ≤ 3 days</p>
                                        <p className="text-xs text-red-500 mt-1">{invCritical.map(i => `${i.name} (${i.daysRemaining}d)`).join(' · ')}</p>
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
                                                <th className="px-4 py-2.5 text-center font-bold text-slate-500 uppercase text-[10px]">Days Left</th>
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
                                                        <td className="px-4 py-3 text-right font-bold text-slate-700">{item.qty.toLocaleString()} {item.unit}</td>
                                                        <td className="px-4 py-3 text-right text-slate-500">PKR {item.unitCost.toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-right font-black text-amber-600">PKR {item.stockValue.toLocaleString()}</td>
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
                                        <h3 className="font-bold text-amber-800 text-sm flex items-center gap-2"><AlertTriangle size={15} /> Restock Priority List</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-xs">
                                            <thead className="bg-amber-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left font-bold text-amber-600 uppercase text-[10px]">Item</th>
                                                    <th className="px-4 py-2.5 text-right font-bold text-amber-600 uppercase text-[10px]">Current Qty</th>
                                                    <th className="px-4 py-2.5 text-right font-bold text-amber-600 uppercase text-[10px]">Reorder Level</th>
                                                    <th className="px-4 py-2.5 text-right font-bold text-amber-600 uppercase text-[10px]">Suggested Order</th>
                                                    <th className="px-4 py-2.5 text-center font-bold text-amber-600 uppercase text-[10px]">Days Left</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-amber-50">
                                                {inventoryValuation.filter(i => i.isLow)
                                                    .sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999))
                                                    .map((item, i) => (
                                                    <tr key={i} className="hover:bg-amber-50/30">
                                                        <td className="px-4 py-2.5 font-semibold text-slate-700">{item.name}</td>
                                                        <td className="px-4 py-2.5 text-right font-bold text-red-500">{item.qty.toLocaleString()} {item.unit}</td>
                                                        <td className="px-4 py-2.5 text-right text-slate-500">{item.reorderLevel.toLocaleString()} {item.unit}</td>
                                                        <td className="px-4 py-2.5 text-right font-black text-amber-600">{Math.max(0, item.reorderLevel * 2 - item.qty).toLocaleString()} {item.unit}</td>
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
                                                <tr><td colSpan={7} className="py-12 text-center text-slate-400">No data found in period</td></tr>
                                            ) : inventoryMovement.map((item, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-semibold text-slate-700">{item.name}</td>
                                                    <td className="px-4 py-3"><span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{item.type}</span></td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-500">{item.openingStock.toLocaleString()} {item.unit}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-blue-600">+{item.qtyReceived.toLocaleString()} {item.unit}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-amber-600">-{item.qtyConsumed.toLocaleString()} {item.unit}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-400">{item.variance}</td>
                                                    <td className="px-4 py-3 text-right font-black text-emerald-600">{item.closingStock.toLocaleString()} {item.unit}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══ CUSTOM EXPENSE SUB-TAB ══ */}
                    {invSub === 'CUSTOM_EXPENSE' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                                <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2"><Filter size={18} className="text-emerald-500"/> Custom Procurement & Expense Builder</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                                        <input type="date" className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={customExpenseStartDate} onChange={e => setCustomExpenseStartDate(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                                        <input type="date" className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={customExpenseEndDate} onChange={e => setCustomExpenseEndDate(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category / Type</label>
                                        <select className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={customExpenseType} onChange={e => setCustomExpenseType(e.target.value)}>
                                            <option value="ALL">All Categories</option>
                                            <option value="FEED">Feed</option>
                                            <option value="VACCINE">Vaccine / Medical</option>
                                            <option value="LABOR">Labor</option>
                                            <option value="MAINTENANCE">Maintenance</option>
                                            <option value="INFRASTRUCTURE">Infrastructure</option>
                                            <option value="OTHER">Other Expenses</option>
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <button onClick={() => {
                                            const csvHeader = "Date,Category,Description,Amount\n";
                                            const csvContent = state.expenses.filter(e => {
                                                if (customExpenseStartDate && e.date < customExpenseStartDate) return false;
                                                if (customExpenseEndDate && e.date > customExpenseEndDate) return false;
                                                if (customExpenseType !== 'ALL' && e.category !== customExpenseType) return false;
                                                return true;
                                            }).map(e => `${e.date},${e.category},"${e.description || ''}",${e.amount}`).join('\n');
                                            
                                            const blob = new Blob([csvHeader + csvContent], { type: 'text/csv' });
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.setAttribute('hidden', '');
                                            a.setAttribute('href', url);
                                            a.setAttribute('download', `custom_expenses_${new Date().getTime()}.csv`);
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                        }} className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex justify-center items-center gap-2 shadow-sm hover:bg-emerald-700 transition-colors">
                                            <Download size={16}/> EXPORT CSV
                                        </button>
                                    </div>
                                </div>

                                {(() => {
                                    const filtered = state.expenses.filter(e => {
                                        if (customExpenseStartDate && e.date < customExpenseStartDate) return false;
                                        if (customExpenseEndDate && e.date > customExpenseEndDate) return false;
                                        if (customExpenseType !== 'ALL' && e.category !== customExpenseType) return false;
                                        return true;
                                    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                    const total = filtered.reduce((s,x) => s + x.amount, 0);

                                    return (
                                        <>
                                            <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                                                <span className="text-sm font-bold text-slate-500 uppercase">Total Selected Expenses</span>
                                                <span className="text-2xl font-black text-emerald-600">PKR {total.toLocaleString()}</span>
                                            </div>
                                            <div className="max-h-[500px] overflow-y-auto border border-slate-100 rounded-xl">
                                                <table className="min-w-full text-xs">
                                                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm shadow-slate-100">
                                                        <tr>
                                                            <th className="px-4 py-2.5 text-left font-bold text-slate-500 uppercase text-[10px]">Date</th>
                                                            <th className="px-4 py-2.5 text-left font-bold text-slate-500 uppercase text-[10px]">Category</th>
                                                            <th className="px-4 py-2.5 text-left font-bold text-slate-500 uppercase text-[10px]">Description</th>
                                                            <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase text-[10px]">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {filtered.map(e => (
                                                            <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                                                                <td className="px-4 py-3 font-semibold text-slate-700">{e.date}</td>
                                                                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-200 text-slate-700">{e.category}</span></td>
                                                                <td className="px-4 py-3 text-slate-500">{e.description || '-'}</td>
                                                                <td className="px-4 py-3 text-right font-bold text-slate-800">PKR {e.amount.toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                        {filtered.length === 0 && (
                                                            <tr>
                                                                <td colSpan={4} className="px-4 py-10 text-center text-slate-400 font-bold">No expenses found for the selected criteria.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    );
                                })()}
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
                        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                            <button onClick={() => setFinSub('OVERVIEW')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${ finSub === 'OVERVIEW' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700' }`}>
                                <Activity size={14} /> Financial Overview
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
                            <select value={finPeriod} onChange={e => setFinPeriod(e.target.value as any)} className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500">
                                <option value="ALL">All Time</option>
                                <option value="THIS_MONTH">This Month</option>
                                <option value="LAST_MONTH">Last Month</option>
                                <option value="30_DAYS">Last 30 Days</option>
                                <option value="90_DAYS">Last 90 Days</option>
                                <option value="7_DAYS">Last 7 Days</option>
                            </select>
                        </div>
                    </div>

                    {finSub === 'OVERVIEW' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm premium-card group">
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Net Profit</p>
                                    <h3 className={`text-2xl font-black font-display group-hover:scale-105 transition-transform origin-left ${finMetrics.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        PKR {finMetrics.profit.toLocaleString()}
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
                                        PKR {finMetrics.revenue.toLocaleString()}
                                    </h3>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm premium-card group">
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Total Expenses</p>
                                    <h3 className="text-2xl font-black text-red-500 font-display group-hover:scale-105 transition-transform origin-left">
                                        PKR {finMetrics.expenses.toLocaleString()}
                                    </h3>
                                </div>
                            </div>
                            
                            {/* Charts Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* P&L Bar Chart (Historical) */}
                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="font-bold text-gray-800 mb-4 text-sm flex items-center gap-2"><TrendingUp size={15} className="text-emerald-500"/> Profit & Loss Trend (Last 6 Mo)</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={monthlyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} width={60} tickFormatter={val => `Rs${val/1000}k`} />
                                                <Tooltip formatter={(value: number) => `PKR ${value.toLocaleString()}`} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                                <Legend iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                                                <Area type="monotone" dataKey="Revenue" stroke="#10B981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={3} />
                                                <Line type="monotone" dataKey="Expenses" stroke="#EF4444" strokeWidth={3} dot={{r: 4}} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Revenue & Expense Breakdown */}
                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 h-full">
                                    <div className="flex-1 min-h-[250px] flex flex-col">
                                        <h3 className="font-bold text-gray-800 mb-2 text-sm text-center">Revenue by Category</h3>
                                        {finRevenueByCategory.length > 0 ? (
                                        <div className="flex-1 relative min-h-[200px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={finRevenueByCategory} innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                                                        {finRevenueByCategory.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={['#10B981', '#34D399', '#6EE7B7', '#059669'][index % 4]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value: number) => `PKR ${value.toLocaleString()}`} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        ) : <div className="flex-1 flex items-center justify-center text-xs text-slate-400">No revenue data</div>}
                                    </div>
                                    <div className="w-px bg-slate-100 hidden md:block"></div>
                                    <div className="flex-1 min-h-[250px] flex flex-col">
                                        <h3 className="font-bold text-gray-800 mb-2 text-sm text-center">Expense by Category</h3>
                                        {finExpenseByCategory.length > 0 ? (
                                        <div className="flex-1 relative min-h-[200px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={finExpenseByCategory} innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                                                        {finExpenseByCategory.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={['#EF4444', '#F87171', '#FCA5A5', '#DC2626', '#B91C1C'][index % 5]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value: number) => `PKR ${value.toLocaleString()}`} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        ) : <div className="flex-1 flex items-center justify-center text-xs text-slate-400">No expense data</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {finSub === 'ANIMAL_PROFITABILITY' && (
                        <div className="space-y-6 animate-fade-in-up">
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
                            <h3 className="text-4xl font-extrabold text-indigo-600 font-display">{state.livestock.reduce((acc, curr) => acc + (curr.birthRecordHistory?.length || 0), 0)}</h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Total Births</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center premium-card hover:-translate-y-1 transition-transform">
                            <h3 className="text-4xl font-extrabold text-slate-600 font-display">{sold.length + deceased.length}</h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Exits (Sold/Dead)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Activity size={18} /> Herd Age Structure</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
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
                            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Calendar size={18} /> Inventory Status (Feed)</h3>
                            <div className="overflow-y-auto max-h-72">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Item</th>
                                            <th className="px-4 py-2 text-right">Quantity</th>
                                            <th className="px-4 py-2 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {state.feed.map(f => (
                                            <tr key={f.id} className="border-b">
                                                <td className="px-4 py-3">{f.name}</td>
                                                <td className="px-4 py-3 text-right">{f.quantity} {f.unit || 'Kg'}</td>
                                                <td className="px-4 py-3 text-right">
                                                    {f.quantity <= f.reorderLevel ?
                                                        <span className="text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded">LOW</span> :
                                                        <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded">OK</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- OPERATIONS REPORT placeholder for future exp. --- */}
            {activeReport === 'OPERATIONS' && (
                <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <Activity size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-600">Operations Report</h3>
                    <p className="text-gray-400 max-w-md mx-auto mt-2">Detailed analysis of vaccination compliance, breeding efficiency intervals, and employee performance metrics will appear here.</p>
                </div>
            )}

            {/* --- DETAILED LOGS REPORT --- */}
            {activeReport === 'DETAILED_LOGS' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Controls */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 premium-card">
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setLogCategory('MILK')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${logCategory === 'MILK' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Milk Logs</button>
                            <button onClick={() => setLogCategory('FINANCE')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${logCategory === 'FINANCE' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Financial Logs</button>
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
                                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-xs tracking-wider">Income</th>
                                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-xs tracking-wider">Expense</th>
                                                <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-xs tracking-wider">Net Profit</th>
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
                                                state.expenses.forEach(e => {
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
                                                        <td className="px-6 py-4 text-right font-bold text-emerald-600 group-hover:text-emerald-700">+PKR {data.income.toLocaleString()}</td>
                                                        <td className="px-6 py-4 text-right font-bold text-red-500 group-hover:text-red-600">-PKR {data.expense.toLocaleString()}</td>
                                                        <td className={`px-6 py-4 text-right font-black ${data.income - data.expense >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            PKR {(data.income - data.expense).toLocaleString()}
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
