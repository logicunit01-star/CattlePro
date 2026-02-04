
import React, { useState } from 'react';
import { AppState, Livestock, Expense, Sale } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { FileText, Download, Filter, TrendingUp, DollarSign, Activity, Calendar } from 'lucide-react';

interface Props {
    state: AppState;
}

export const Reports: React.FC<Props> = ({ state }) => {
    const [activeReport, setActiveReport] = useState<'FINANCIAL' | 'HERD' | 'OPERATIONS'>('FINANCIAL');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // --- FINANCIAL CALCS ---
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
            const monthExpenses = expenses.filter(e => e.date.startsWith(month)).reduce((sum, e) => sum + e.amount, 0);
            const monthSales = sales.filter(s => s.date.startsWith(month)).reduce((sum, s) => sum + s.amount, 0);
            return {
                name: month,
                Revenue: monthSales,
                Expenses: monthExpenses,
                Profit: monthSales - monthExpenses
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
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Business Reports</h2>
                    <p className="text-sm text-gray-500">Standardized reports for farm analysis and export</p>
                </div>
                <button onClick={() => window.print()} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
                    <Download size={16} /> Export / Print
                </button>
            </div>

            {/* Navigation Tab */}
            <div className="flex space-x-4 border-b border-gray-200">
                <button onClick={() => setActiveReport('FINANCIAL')} className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeReport === 'FINANCIAL' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Financial Performance</button>
                <button onClick={() => setActiveReport('HERD')} className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeReport === 'HERD' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Herd Demographics</button>
                <button onClick={() => setActiveReport('OPERATIONS')} className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeReport === 'OPERATIONS' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Operational Health</button>
            </div>

            {/* --- FINANCIAL REPORT --- */}
            {activeReport === 'FINANCIAL' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-gray-500 text-xs font-bold uppercase mb-2">Net Profit (6 Mo)</p>
                            <h3 className="text-3xl font-black text-emerald-600">PKR {monthlyData.reduce((acc, m) => acc + m.Profit, 0).toLocaleString()}</h3>
                            <p className="text-xs text-gray-400 mt-1">Total revenue minus expenses</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-gray-500 text-xs font-bold uppercase mb-2">Total Revenue (6 Mo)</p>
                            <h3 className="text-3xl font-black text-gray-800">PKR {monthlyData.reduce((acc, m) => acc + m.Revenue, 0).toLocaleString()}</h3>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-gray-500 text-xs font-bold uppercase mb-2">Total Expenses (6 Mo)</p>
                            <h3 className="text-3xl font-black text-red-500">PKR {monthlyData.reduce((acc, m) => acc + m.Expenses, 0).toLocaleString()}</h3>
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
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- HERD REPORT --- */}
            {activeReport === 'HERD' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                            <h3 className="text-4xl font-black text-emerald-600">{active.length}</h3>
                            <p className="text-gray-500 text-xs font-bold uppercase mt-1">Active Animals</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                            <h3 className="text-4xl font-black text-blue-600">{active.filter(a => a.gender === 'F').length}</h3>
                            <p className="text-gray-500 text-xs font-bold uppercase mt-1">Females</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                            <h3 className="text-4xl font-black text-indigo-600">{state.livestock.reduce((acc, curr) => acc + (curr.birthRecordHistory?.length || 0), 0)}</h3>
                            <p className="text-gray-500 text-xs font-bold uppercase mt-1">Total Births</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                            <h3 className="text-4xl font-black text-gray-600">{sold.length + deceased.length}</h3>
                            <p className="text-gray-500 text-xs font-bold uppercase mt-1">Exits (Sold/Dead)</p>
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
        </div>
    );
};
