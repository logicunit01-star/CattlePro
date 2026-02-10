
import React, { useState } from 'react';
import { Expense, ExpenseCategory, Sale, Livestock, Entity } from '../types';
import { Plus, DollarSign, Truck, Wrench, Syringe, Briefcase, Home, Stethoscope, Dna, ArrowLeft, Trash2, Store, User, Share2 } from 'lucide-react';

interface Props {
    expenses: Expense[];
    sales: Sale[];
    livestockList?: Livestock[];
    entities: Entity[];
    onAddExpense: (e: Expense) => void;
    onAddSale: (s: Sale) => void;
    onDeleteExpense: (id: string) => void;
    onDeleteSale: (id: string) => void;
}

type FinancialView = 'LIST' | 'ADD_EXPENSE' | 'ADD_SALE';

export const Financials: React.FC<Props> = ({ expenses, sales, livestockList = [], entities, onAddExpense, onAddSale, onDeleteExpense, onDeleteSale }) => {
    const [activeTab, setActiveTab] = useState<'EXPENSES' | 'SALES'>('EXPENSES');
    const [viewMode, setViewMode] = useState<FinancialView>('LIST');

    // Forms State
    const [newExpense, setNewExpense] = useState<Partial<Expense>>({
        amount: 0, category: ExpenseCategory.OTHER, date: new Date().toISOString().split('T')[0], description: ''
    });

    const [newSale, setNewSale] = useState<Partial<Sale>>({
        amount: 0, date: new Date().toISOString().split('T')[0], buyer: '', weightAtSale: 0, animalId: ''
    });

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

    const handleSaveExpense = () => {
        if (!newExpense.amount || !newExpense.description) return alert("Amount and Description required");
        onAddExpense({
            id: Math.random().toString(36).substr(2, 9),
            category: newExpense.category || ExpenseCategory.OTHER,
            amount: Number(newExpense.amount),
            date: newExpense.date || new Date().toISOString().split('T')[0],
            description: newExpense.description
        });
        setViewMode('LIST');
        setNewExpense({ amount: 0, category: ExpenseCategory.OTHER, date: new Date().toISOString().split('T')[0], description: '' });
    };

    const handleSaveSale = () => {
        if (!newSale.amount || !newSale.buyer) return alert("Amount and Buyer required");
        if ((!newSale.itemType || newSale.itemType === 'ANIMAL') && !newSale.animalId) return alert("Animal ID required for Livestock sales");

        onAddSale({
            id: Math.random().toString(36).substr(2, 9),
            amount: Number(newSale.amount),
            buyer: newSale.buyer,
            date: newSale.date || new Date().toISOString().split('T')[0],
            animalId: newSale.animalId,
            itemType: newSale.itemType || 'ANIMAL',
            quantity: Number(newSale.quantity) || 0,
            weightAtSale: Number(newSale.weightAtSale) || 0,
            description: newSale.itemType === 'MILK' ? `Milk Sale: ${newSale.quantity}L` : ''
        });
        setViewMode('LIST');
        setNewSale({ amount: 0, date: new Date().toISOString().split('T')[0], buyer: '', weightAtSale: 0, animalId: '' });
    };

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);

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
                            <select className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value as ExpenseCategory })}>
                                {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location / Cost Centre</label>
                            <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newExpense.location || ''} onChange={e => setNewExpense({ ...newExpense, location: e.target.value })} placeholder="e.g. Shed A" />
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
                            <select className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newSale.itemType || 'ANIMAL'} onChange={e => setNewSale({ ...newSale, itemType: e.target.value as any, animalId: '' })}>
                                <option value="ANIMAL">Livestock</option>
                                <option value="MILK">Milk / Produce</option>
                                <option value="MANURE">Manure / Compost</option>
                                <option value="OTHER">Other Income</option>
                            </select>
                        </div>
                        <div>
                            {(!newSale.itemType || newSale.itemType === 'ANIMAL') ? (
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (Liters/Kg)</label>
                                    <input type="number" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newSale.quantity} onChange={e => setNewSale({ ...newSale, quantity: parseFloat(e.target.value) })} />
                                </>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sale Amount (PKR)</label>
                            <input type="number" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newSale.amount} onChange={e => setNewSale({ ...newSale, amount: parseFloat(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (if applicable)</label>
                            <input type="number" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newSale.weightAtSale} onChange={e => setNewSale({ ...newSale, weightAtSale: parseFloat(e.target.value) })} />
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight font-display">Financial Management</h2>
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex-1 md:w-40 premium-card">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
                        <p className="text-xl font-extrabold text-emerald-600">PKR {totalSales.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex-1 md:w-40 premium-card">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Expenses</p>
                        <p className="text-xl font-extrabold text-red-500">PKR {totalExpenses.toLocaleString()}</p>
                    </div>
                    <div className={`p-4 rounded-2xl shadow-lg flex-1 md:w-48 text-white ${(totalSales - totalExpenses) >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-200' : 'bg-gradient-to-br from-red-500 to-pink-600 shadow-red-200'}`}>
                        <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-1">Net Profit</p>
                        <p className="text-2xl font-extrabold">PKR {(totalSales - totalExpenses).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-slate-100/50 p-1.5 rounded-xl gap-2 w-full md:w-fit mb-6">
                <button
                    onClick={() => setActiveTab('EXPENSES')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'EXPENSES'
                        ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                        }`}
                >
                    Expenses & Operations
                </button>
                <button
                    onClick={() => setActiveTab('SALES')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'SALES'
                        ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                        }`}
                >
                    Sales & Revenue
                </button>
            </div>

            {activeTab === 'EXPENSES' ? (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-end">
                        <button
                            onClick={() => setViewMode('ADD_EXPENSE')}
                            className="flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-emerald-200 shadow-md"
                        >
                            <Plus size={18} /> Log Expense
                        </button>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {expenses.map((expense) => (
                                        <tr key={expense.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{expense.date}</td>
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
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Related Animal</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight Sold</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sales.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sale.date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{sale.buyer}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">ID: {sale.animalId}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sale.weightAtSale} kg</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                                                +PKR {sale.amount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button
                                                    onClick={() => {
                                                        const text = `*INVOICE RECEIPT*\n\nDate: ${sale.date}\nItem: Livestock Sale (ID: ${sale.animalId})\nWeight: ${sale.weightAtSale} kg\nAmount: PKR ${sale.amount.toLocaleString()}\nStatus: ${sale.amountReceived >= sale.amount ? 'PAID' : 'PENDING'}\n\nThank you for your business!`;
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
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
