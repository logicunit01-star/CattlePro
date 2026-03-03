
import React, { useState } from 'react';
import { AppState, Livestock, Expense, Sale } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { FileText, Download, Filter, TrendingUp, DollarSign, Activity, Calendar } from 'lucide-react';

interface Props {
    state: AppState;
}

export const Reports: React.FC<Props> = ({ state }) => {
    const [activeReport, setActiveReport] = useState<'FINANCIAL' | 'HERD' | 'OPERATIONS' | 'DETAILED_LOGS' | 'FEED'>('FINANCIAL');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [logPeriod, setLogPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
    const [logCategory, setLogCategory] = useState<'MILK' | 'FINANCE'>('MILK');

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
            // Raw cash expenses
            const monthExpensesRaw = expenses.filter(e => e.date.startsWith(month)).reduce((sum, e) => sum + e.amount, 0);
            const monthSales = sales.filter(s => s.date.startsWith(month)).reduce((sum, s) => sum + s.amount, 0);

            // Calculate Inventory Delta (Purchases - Consumption)
            // Identify procurement expenses (excluding auto-generated consumption logs)
            const inventoryPurchased = expenses
                .filter(e => e.date.startsWith(month) &&
                    !e.description?.includes('Consumption') &&
                    !e.description?.includes('Treatment Application') &&
                    (e.category === 'FEED' || e.category === 'MEDICAL' || e.category === 'PURCHASE' || e.category === 'INFRASTRUCTURE'))
                .reduce((sum, e) => sum + e.amount, 0);

            const inventoryConsumed =
                (state.consumptionLogs?.filter(l => l.date.startsWith(month)).reduce((sum, l) => sum + l.cost, 0) || 0) +
                (state.treatmentLogs?.filter(l => l.date.startsWith(month)).reduce((sum, l) => sum + l.cost, 0) || 0);

            // Change in value of inventory/assets on hand
            const inventoryDelta = inventoryPurchased - inventoryConsumed;

            // Accrual Expenses = Cash Expenses - Inventory Built Up (or + Inventory Depleted)
            // This prevents bulk purchases from artificially tanking the Net Profit for the month
            const accrualExpenses = monthExpensesRaw - inventoryDelta;

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
                <button onClick={() => setActiveReport('FEED')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeReport === 'FEED' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}>Feed Consumption</button>
                <button onClick={() => setActiveReport('OPERATIONS')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeReport === 'OPERATIONS' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}>Operations</button>
                <button onClick={() => setActiveReport('DETAILED_LOGS')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeReport === 'DETAILED_LOGS' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}>Detailed Logs</button>
            </div>

            {/* --- FEED REPORT --- */}
            {activeReport === 'FEED' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1. Consumption by Item (Pie/Table) */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Activity size={18} /> Feed Usage by Ingredient</h3>
                            <div className="overflow-y-auto max-h-72">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Ingredient</th>
                                            <th className="px-4 py-2 text-right">Total Qty</th>
                                            <th className="px-4 py-2 text-right">Total Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const usage = new Map<string, { name: string, qty: number, cost: number, unit: string }>();
                                            state.consumptionLogs?.forEach(log => {
                                                const existing = usage.get(log.itemId) || { name: state.feed.find(f => f.id === log.itemId)?.name || 'Unknown', qty: 0, cost: 0, unit: log.unit };
                                                usage.set(log.itemId, { ...existing, qty: existing.qty + log.quantityUsed, cost: existing.cost + log.cost });
                                            });

                                            return Array.from(usage.values()).map((u, idx) => (
                                                <tr key={idx} className="border-b">
                                                    <td className="px-4 py-3 font-medium text-gray-700">{u.name}</td>
                                                    <td className="px-4 py-3 text-right">{u.qty.toFixed(1)} {u.unit}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-700">PKR {u.cost.toLocaleString()}</td>
                                                </tr>
                                            ));
                                        })()}
                                        {(state.consumptionLogs || []).length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="text-center py-10 bg-gray-50/50">
                                                    <Activity className="mx-auto mb-3 opacity-30 text-gray-500" size={32} />
                                                    <p className="font-bold text-gray-500">No feed usage logged</p>
                                                    <p className="text-xs text-gray-400 mt-1">Consumption logs will appear here when diet plans are active.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 2. Consumption by Diet Plan */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><TrendingUp size={18} /> Cost by Diet Plan</h3>
                            <div className="overflow-y-auto max-h-72">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Plan Name</th>
                                            <th className="px-4 py-2 text-right">Total Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const planCost = new Map<string, number>();
                                            state.consumptionLogs?.forEach(log => {
                                                const name = state.dietPlans.find(p => p.id === log.dietPlanId)?.name || 'Unknown Plan';
                                                planCost.set(name, (planCost.get(name) || 0) + log.cost);
                                            });

                                            return Array.from(planCost.entries()).sort((a, b) => b[1] - a[1]).map(([name, cost], idx) => (
                                                <tr key={idx} className="border-b">
                                                    <td className="px-4 py-3 font-medium text-gray-700">{name}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-emerald-600">PKR {cost.toLocaleString()}</td>
                                                </tr>
                                            ));
                                        })()}
                                        {(state.consumptionLogs || []).length === 0 && (
                                            <tr>
                                                <td colSpan={2} className="text-center py-10 bg-gray-50/50">
                                                    <TrendingUp className="mx-auto mb-3 opacity-30 text-emerald-600" size={32} />
                                                    <p className="font-bold text-gray-500">No diet plan data</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- FINANCIAL REPORT --- */}
            {activeReport === 'FINANCIAL' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm premium-card group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Net Profit (6 Mo)</p>
                                    <h3 className="text-3xl font-black text-emerald-600 font-display group-hover:scale-105 transition-transform origin-left">PKR {monthlyData.reduce((acc, m) => acc + m.Profit, 0).toLocaleString()}</h3>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors"><TrendingUp size={24} /></div>
                            </div>
                            <p className="text-xs text-slate-400 mt-2 font-medium">Total revenue minus expenses</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm premium-card group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Total Revenue (6 Mo)</p>
                                    <h3 className="text-3xl font-black text-slate-800 font-display group-hover:scale-105 transition-transform origin-left">PKR {monthlyData.reduce((acc, m) => acc + m.Revenue, 0).toLocaleString()}</h3>
                                </div>
                                <div className="p-3 bg-sky-50 rounded-xl text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors"><DollarSign size={24} /></div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm premium-card group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Total Expenses (6 Mo)</p>
                                    <h3 className="text-3xl font-black text-red-500 font-display group-hover:scale-105 transition-transform origin-left">PKR {monthlyData.reduce((acc, m) => acc + m.Expenses, 0).toLocaleString()}</h3>
                                </div>
                                <div className="p-3 bg-red-50 rounded-xl text-red-500 group-hover:bg-red-600 group-hover:text-white transition-colors"><Activity size={24} /></div>
                            </div>
                        </div>
                    </div>

                    {/* P&L Chart */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><TrendingUp size={18} /> Profit & Loss Trend</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value: number) => `PKR ${value.toLocaleString()}`} />
                                    <Legend />
                                    <Bar dataKey="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* --- PROCUREMENT & PAYABLE REPORT --- */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-6">
                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><DollarSign size={18} /> Payable Analysis (Grass/Feed)</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Supplier</th>
                                        <th className="px-4 py-2 text-right">Total Billed</th>
                                        <th className="px-4 py-2 text-right">Paid</th>
                                        <th className="px-4 py-2 text-right">Outstanding</th>
                                        <th className="px-4 py-2 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from(new Set(state.expenses.filter(e => e.category === 'FEED' && e.supplier).map(e => e.supplier!))).map(supplier => {
                                        const bills = state.expenses.filter(e => e.supplier === supplier);
                                        const total = bills.reduce((sum, e) => sum + e.amount, 0);
                                        const paid = bills.filter(e => e.paymentStatus === 'PAID').reduce((sum, e) => sum + e.amount, 0);
                                        const pending = total - paid;
                                        if (total === 0) return null;

                                        return (
                                            <tr key={supplier} className="border-b">
                                                <td className="px-4 py-3 font-medium text-gray-800">{supplier}</td>
                                                <td className="px-4 py-3 text-right">PKR {total.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right text-emerald-600">PKR {paid.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right font-black text-red-500">PKR {pending.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {pending <= 0 ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">CLEARED</span> : <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">DUE</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Transactions Table (Recent) */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold text-gray-700">Recent Transactions</h3>
                        </div>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {[...state.sales.map(s => ({ ...s, type: 'INCOME' })), ...state.expenses.map(e => ({ ...e, type: 'EXPENSE' }))]
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .slice(0, 10)
                                    .map((t: any, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600">{t.date}</td>
                                            <td className="px-6 py-2 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'INCOME' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{t.type}</span>
                                            </td>
                                            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-800">{t.description || t.buyer || t.category}</td>
                                            <td className={`px-6 py-2 whitespace-nowrap text-sm font-bold text-right ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>
                                                {t.type === 'INCOME' ? '+' : '-'} {t.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                {(state.sales.length + state.expenses.length === 0) && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-12 bg-gray-50/50">
                                            <DollarSign className="mx-auto mb-3 opacity-30 text-emerald-600" size={40} />
                                            <p className="font-bold text-gray-500">No financial transactions recorded.</p>
                                            <p className="text-xs text-gray-400 mt-1">Add sales or expenses to generate profit & loss insights.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
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
