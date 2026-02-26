
import React, { useState } from 'react';
import { Expense, ExpenseCategory, Sale, Livestock } from '../types';
import { Plus, DollarSign, Truck, Wrench, Syringe, Briefcase, Home, Stethoscope, Dna, ArrowLeft, Trash2 } from 'lucide-react';

interface Props {
    expenses: Expense[];
    sales: Sale[];
    livestockList?: Livestock[];
    onAddExpense: (e: Expense) => void;
    onAddSale: (s: Sale) => void;
    onDeleteExpense: (id: string) => void;
    onDeleteSale: (id: string) => void;
}

type FinancialView = 'LIST' | 'ADD_EXPENSE' | 'ADD_SALE';

export const Financials: React.FC<Props> = ({ expenses, sales, livestockList = [], onAddExpense, onAddSale, onDeleteExpense, onDeleteSale }) => {
    const [activeTab, setActiveTab] = useState<'EXPENSES' | 'SALES'>('EXPENSES');
    const [viewMode, setViewMode] = useState<FinancialView>('LIST');

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
        const expense: Expense = {
            id: Math.random().toString(36).substr(2, 9),
            farmId: currentFarmId || '',
            category: newExpense.category || ExpenseCategory.OTHER,
            amount: Number(newExpense.amount),
            date: newExpense.date || new Date().toISOString().split('T')[0],
            description: newExpense.description
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

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);

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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Financial Management</h2>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex gap-4">
                    <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase font-bold">Revenue</p>
                        <p className="text-sm font-bold text-green-600">PKR {totalSales.toLocaleString()}</p>
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

            {activeTab === 'SALES' && !currentFarmId && !currentLocationId && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-2 mb-4">
                    <AlertTriangle size={20} />
                    <span className="text-sm font-medium">Select a farm or city above to see only that farm&apos;s sales history and to record sales for animals from that farm (single or bulk).</span>
                </div>
            )}

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
                                        {showFarmColumn && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farm</th>}
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
                                        {showFarmColumn && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farm</th>}
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item / Reference</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty / Weight</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sales.map((sale) => (
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
