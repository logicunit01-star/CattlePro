
import React, { useState } from 'react';
import { AppState, Expense, FeedInventory, ExpenseCategory } from '../types';
import { Calendar, DollarSign, Truck, ShoppingCart, User, AlertTriangle, CheckCircle, Clock, Search, Layers, Archive, Activity, RefreshCw } from 'lucide-react';

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
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PROCUREMENT' | 'INVENTORY' | 'SUPPLIERS'>('DASHBOARD');

    // PROCUREMENT STATE (Consolidated)
    const [procurementForm, setProcurementForm] = useState({
        date: new Date().toISOString().split('T')[0],
        supplier: '',
        feedTypeId: '', // ID of the FeedInventory Master Item
        feedCategory: 'GRASS' as 'GRASS' | 'TMR' | 'WANDA', // For filtering
        weight: 0,       // Weight (kg) – used for GRASS only; for TMR/WANDA used with quantity
        quantity: 0,     // Quantity (bags/bundles) – TMR & WANDA only
        rate: 0,
        location: 'Feed Store',
        paymentStatus: 'PENDING'
    });

    // INVENTORY MASTER FORM
    const [newItemForm, setNewItemForm] = useState<Partial<FeedInventory>>({
        name: '', category: 'FEED', feedType: 'TMR', quantity: 0, unit: 'KG', unitCost: 0, reorderLevel: 100, location: 'Feed Store', defaultSupplier: ''
    });
    const [isAddingItem, setIsAddingItem] = useState(false);

    // Edit procurement (expense) entry
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    // --- DERIVED DATA ---
    const feedItems = state.feed.filter(f => f.category === 'FEED');
    const grassItems = feedItems.filter(f => f.feedType === 'GRASS' || f.name.toLowerCase().includes('grass') || f.name.toLowerCase().includes('fodder'));
    const tmrItems = feedItems.filter(f => f.feedType === 'TMR' || f.name.toLowerCase().includes('tmr'));
    const wandaItems = feedItems.filter(f => f.feedType === 'WANDA' || f.name.toLowerCase().includes('wanda'));

    // Suppliers (Derived from Expenses & Default Suppliers in Inventory)
    const suppliers = Array.from(new Set([
        ...state.expenses.map(e => e.supplier).filter(Boolean),
        ...state.feed.map(f => f.defaultSupplier).filter(Boolean)
    ])) as string[];

    // --- ACTIONS ---

    const handleProcurementSubmit = async () => {
        if (!state.currentFarmId) return alert("Please select a farm above to record procurement.");
        if (!procurementForm.supplier || !procurementForm.rate || !procurementForm.feedTypeId) return alert("Required fields missing.");

        const isGrass = procurementForm.feedCategory === 'GRASS';
        const isTmrOrWanda = procurementForm.feedCategory === 'TMR' || procurementForm.feedCategory === 'WANDA';

        if (isGrass && !procurementForm.weight) return alert("Weight (kg) is required for Grass.");
        if (isTmrOrWanda && (!procurementForm.quantity || !procurementForm.weight)) return alert("Quantity and Weight are both required for TMR / WANDA.");

        const selectedItem = state.feed.find(f => f.id === procurementForm.feedTypeId);
        if (!selectedItem) return alert("Invalid Feed Item Selected");

        const totalCost = procurementForm.weight * procurementForm.rate;
        const descGrass = `Purchase: ${selectedItem.name} (${procurementForm.weight} ${selectedItem.unit || 'kg'})`;
        const descTmrWanda = `Purchase: ${selectedItem.name} (Qty: ${procurementForm.quantity}, Weight: ${procurementForm.weight} ${selectedItem.unit || 'kg'})`;

        // 1. Create Expense (scoped to selected farm)
        const expense: Expense = {
            id: Math.random().toString(36).substr(2, 9),
            farmId: state.currentFarmId,
            category: ExpenseCategory.FEED,
            amount: totalCost,
            date: procurementForm.date,
            description: isGrass ? descGrass : descTmrWanda,
            supplier: procurementForm.supplier,
            paymentStatus: procurementForm.paymentStatus as 'PAID' | 'PENDING' | 'PARTIAL',
            location: procurementForm.location
        };
        try {
            await onAddExpense(expense);
        } catch (e) {
            console.error(e);
            alert("Failed to save expense. Please try again.");
            return;
        }

        // 2. Update Inventory (add weight in kg to stock)
        onUpdateInventory({
            ...selectedItem,
            quantity: selectedItem.quantity + procurementForm.weight,
            unitCost: procurementForm.rate,
            defaultSupplier: procurementForm.supplier
        });

        alert("Procurement Recorded Successfully!");
        setProcurementForm({ ...procurementForm, weight: 0, quantity: 0 });
    };

    const handleSaveEditExpense = async () => {
        if (!editingExpense) return;
        if (!editingExpense.amount || editingExpense.amount <= 0 || !editingExpense.description?.trim()) {
            alert("Amount and Description are required.");
            return;
        }
        try {
            await onUpdateExpense(editingExpense);
            setEditingExpense(null);
        } catch (e) {
            // Error already shown by parent
        }
    };

    const handleAddItem = () => {
        if (!newItemForm.name) return alert("Name required");
        onAddFeed({ ...newItemForm, id: Math.random().toString(36).substr(2, 9) } as FeedInventory);
        setIsAddingItem(false);
        setNewItemForm({ name: '', category: 'FEED', feedType: 'TMR', quantity: 0, unit: 'KG', unitCost: 0, reorderLevel: 100, location: 'Feed Store', defaultSupplier: '' });
    };

    // --- CALCULATIONS FOR DASHBOARD ---
    const totalStockValue = feedItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    const lowStockCount = feedItems.filter(i => i.quantity <= i.reorderLevel).length;
    const pendingBills = state.expenses.filter(e => e.supplier && e.paymentStatus === 'PENDING').reduce((sum, e) => sum + e.amount, 0);
    const monthlySpend = state.expenses.filter(e => e.category === 'FEED' && e.date.startsWith(new Date().toISOString().slice(0, 7))).reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {!state.currentFarmId && !state.currentLocationId && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-2">
                    <AlertTriangle size={20} />
                    <span className="text-sm font-medium">Select a farm or city above to view and record procurement, inventory, and suppliers for that context.</span>
                </div>
            )}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Supply Chain & Inventory</h2>
                    <p className="text-sm text-gray-500">Centralized Feed Procurement, Rations, and Supplier Management — scoped to selected farm</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-500 shadow-sm">
                        Stock Value: <span className="text-emerald-600 text-sm">PKR {totalStockValue.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Navigation Tab */}
            <div className="flex space-x-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm w-fit">
                {['DASHBOARD', 'PROCUREMENT', 'INVENTORY', 'SUPPLIERS'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'DASHBOARD' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Monthly Feed Cost</p>
                                <h3 className="text-2xl font-black text-gray-800 mt-1">PKR {monthlySpend.toLocaleString()}</h3>
                            </div>
                            <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Activity size={20} /></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Outstanding Bills</p>
                                <h3 className="text-2xl font-black text-red-500 mt-1">PKR {pendingBills.toLocaleString()}</h3>
                            </div>
                            <div className="bg-red-50 p-2 rounded-lg text-red-500"><AlertTriangle size={20} /></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Low Stock Alerts</p>
                                <h3 className="text-2xl font-black text-amber-500 mt-1">{lowStockCount} Items</h3>
                            </div>
                            <div className="bg-amber-50 p-2 rounded-lg text-amber-500"><Layers size={20} /></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Active Suppliers</p>
                                <h3 className="text-2xl font-black text-emerald-600 mt-1">{suppliers.length}</h3>
                            </div>
                            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600"><User size={20} /></div>
                        </div>
                    </div>

                    {/* Consumption Trend Placeholder */}
                    <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center h-64">
                        <Activity className="text-gray-300 mb-4" size={48} />
                        <h3 className="font-bold text-gray-600">Consumption Trends</h3>
                        <p className="text-gray-400 text-sm max-w-sm">Detailed consumption analytics will appear here once Diet Plan usage history is populated.</p>
                    </div>
                </div>
            )}

            {activeTab === 'PROCUREMENT' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Entry Form */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm sticky top-6">
                            <h3 className="font-bold text-emerald-800 mb-6 flex items-center gap-2"><Truck size={18} /> New Purchase Entry</h3>

                            <div className="space-y-4">
                                {/* Feed Category Toggle */}
                                <div className="flex bg-white rounded-lg p-1 border border-emerald-100 mb-4">
                                    {['GRASS', 'TMR', 'WANDA'].map(type => (
                                        <button key={type} onClick={() => setProcurementForm({ ...procurementForm, feedCategory: type as 'GRASS' | 'TMR' | 'WANDA', feedTypeId: '', quantity: 0 })} className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${procurementForm.feedCategory === type ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
                                            {type}
                                        </button>
                                    ))}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Select Item</label>
                                    <select value={procurementForm.feedTypeId} onChange={e => {
                                        const item = state.feed.find(f => f.id === e.target.value);
                                        setProcurementForm({ ...procurementForm, feedTypeId: e.target.value, rate: item?.unitCost || 0, supplier: item?.defaultSupplier || '' })
                                    }} className="w-full border border-emerald-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                                        <option value="">Select Feed...</option>
                                        {feedItems.filter(f => f.feedType === procurementForm.feedCategory).map(f => (
                                            <option key={f.id} value={f.id}>{f.name} ({f.unit})</option>
                                        ))}
                                    </select>
                                    {feedItems.filter(f => f.feedType === procurementForm.feedCategory).length === 0 && (
                                        <p className="text-[10px] text-red-500 mt-1">No items found. Add in 'Inventory' tab.</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Date</label>
                                        <input type="date" value={procurementForm.date} onChange={e => setProcurementForm({ ...procurementForm, date: e.target.value })} className="w-full border border-emerald-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Supplier</label>
                                        <select
                                            value={procurementForm.supplier}
                                            onChange={e => setProcurementForm({ ...procurementForm, supplier: e.target.value })}
                                            className="w-full border border-emerald-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                        >
                                            <option value="">Select Vendor...</option>
                                            {state.entities.filter(e => e.type === 'VENDOR').map(v => (
                                                <option key={v.id} value={v.id}>{v.name}</option>
                                            ))}
                                            <option value="CASH">Cash / Walk-in</option>
                                        </select>
                                    </div>
                                </div>

                                {/* GRASS: Weight only. TMR & WANDA: Quantity + Weight */}
                                {procurementForm.feedCategory === 'GRASS' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Weight (kg)</label>
                                            <input type="number" min={0} step={0.1} value={procurementForm.weight || ''} onChange={e => setProcurementForm({ ...procurementForm, weight: parseFloat(e.target.value) || 0 })} className="w-full border border-emerald-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="kg" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Rate (PKR/kg)</label>
                                            <input type="number" min={0} value={procurementForm.rate || ''} onChange={e => setProcurementForm({ ...procurementForm, rate: parseFloat(e.target.value) || 0 })} className="w-full border border-emerald-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
                                        </div>
                                    </div>
                                )}
                                {(procurementForm.feedCategory === 'TMR' || procurementForm.feedCategory === 'WANDA') && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Quantity (Bags/Bundles)</label>
                                                <input type="number" min={0} value={procurementForm.quantity || ''} onChange={e => setProcurementForm({ ...procurementForm, quantity: parseFloat(e.target.value) || 0 })} className="w-full border border-emerald-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="No. of units" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Weight (kg)</label>
                                                <input type="number" min={0} step={0.1} value={procurementForm.weight || ''} onChange={e => setProcurementForm({ ...procurementForm, weight: parseFloat(e.target.value) || 0 })} className="w-full border border-emerald-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Total kg" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Rate (PKR/kg)</label>
                                            <input type="number" min={0} value={procurementForm.rate || ''} onChange={e => setProcurementForm({ ...procurementForm, rate: parseFloat(e.target.value) || 0 })} className="w-full border border-emerald-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Payment Status</label>
                                    <select value={procurementForm.paymentStatus} onChange={e => setProcurementForm({ ...procurementForm, paymentStatus: e.target.value })} className="w-full border border-emerald-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                                        <option value="PENDING">Pending (Credit)</option>
                                        <option value="PAID">Paid (Cash)</option>
                                        <option value="PARTIAL">Partial</option>
                                    </select>
                                </div>

                                <div className="pt-4 border-t border-emerald-100">
                                    <div className="flex justify-between items-end mb-4">
                                        <span className="text-sm font-medium text-emerald-700">Total Payable</span>
                                        <span className="text-2xl font-black text-emerald-800">PKR {((procurementForm.weight || 0) * (procurementForm.rate || 0)).toLocaleString()}</span>
                                    </div>
                                    <button onClick={handleProcurementSubmit} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-shadow shadow-lg shadow-emerald-100">RECORD PROCUREMENT</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: History Log */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-700">Procurement History</h3>
                            </div>

                            {/* Inline edit form when editing */}
                            {editingExpense && (
                                <div className="p-4 bg-emerald-50 border-b border-emerald-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-bold text-emerald-800">Edit entry</span>
                                        <button type="button" onClick={() => setEditingExpense(null)} className="text-gray-500 hover:text-gray-700 p-1"><X size={18} /></button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                                        <div className="lg:col-span-2">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Date</label>
                                            <input type="date" value={editingExpense.date} onChange={e => setEditingExpense({ ...editingExpense, date: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                                        </div>
                                        <div className="lg:col-span-4">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Description</label>
                                            <input type="text" value={editingExpense.description} onChange={e => setEditingExpense({ ...editingExpense, description: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" placeholder="Item / description" />
                                        </div>
                                        <div className="lg:col-span-2">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Supplier</label>
                                            <input type="text" value={editingExpense.supplier ?? ''} onChange={e => setEditingExpense({ ...editingExpense, supplier: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                                        </div>
                                        <div className="lg:col-span-2">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Amount (PKR)</label>
                                            <input type="number" min={0} value={editingExpense.amount} onChange={e => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                                        </div>
                                        <div className="lg:col-span-2">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Payment</label>
                                            <select value={editingExpense.paymentStatus ?? 'PENDING'} onChange={e => setEditingExpense({ ...editingExpense, paymentStatus: e.target.value as 'PAID' | 'PENDING' | 'PARTIAL' })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
                                                <option value="PENDING">Pending</option>
                                                <option value="PAID">Paid</option>
                                                <option value="PARTIAL">Partial</option>
                                            </select>
                                        </div>
                                        <div className="sm:col-span-2 lg:col-span-12 flex gap-2">
                                            <button type="button" onClick={handleSaveEditExpense} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-emerald-700"><Save size={14} /> Save</button>
                                            <button type="button" onClick={() => setEditingExpense(null)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-300">Cancel</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Date</th>
                                        <th className="px-4 py-2 text-left">Item / Description</th>
                                        <th className="px-4 py-2 text-left">Supplier</th>
                                        <th className="px-4 py-2 text-right">Amount</th>
                                        <th className="px-4 py-2 text-center">Payment</th>
                                        <th className="px-4 py-2 text-right w-20">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {state.expenses.filter(e => e.category === 'FEED').slice(0, 50).map(e => (
                                        <tr key={e.id} className={`hover:bg-gray-50 ${editingExpense?.id === e.id ? 'bg-emerald-50' : ''}`}>
                                            <td className="px-4 py-3 text-gray-500">{e.date}</td>
                                            <td className="px-4 py-3 font-medium text-gray-800">{e.description}</td>
                                            <td className="px-4 py-3 text-gray-600">{e.supplier}</td>
                                            <td className="px-4 py-3 text-right font-bold">PKR {e.amount.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${e.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : e.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{e.paymentStatus || 'PENDING'}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button type="button" onClick={() => setEditingExpense({ ...e })} className="text-gray-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors" title="Edit"><Edit2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'INVENTORY' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div>
                            <h3 className="font-bold text-gray-800">Master Rations List</h3>
                            <p className="text-xs text-gray-500">Manage all feed types, standard rates, and suppliers.</p>
                        </div>
                        <button onClick={() => setIsAddingItem(!isAddingItem)} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-700 flex items-center gap-2">
                            {isAddingItem ? 'CANCEL' : 'ADD NEW FEED ITEM'}
                        </button>
                    </div>

                    {isAddingItem && (
                        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm animate-fade-in">
                            <h4 className="font-bold text-blue-800 mb-4">Add New Ration / Feed Type</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item Name</label>
                                    <input type="text" value={newItemForm.name} onChange={e => setNewItemForm({ ...newItemForm, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none" placeholder="e.g. Maize Silage" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                                    <select value={newItemForm.feedType} onChange={e => setNewItemForm({ ...newItemForm, feedType: e.target.value as any })} className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none">
                                        {FEED_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unit</label>
                                    <select value={newItemForm.unit} onChange={e => setNewItemForm({ ...newItemForm, unit: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none">
                                        {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Std. Supplier</label>
                                    <input type="text" value={newItemForm.defaultSupplier} onChange={e => setNewItemForm({ ...newItemForm, defaultSupplier: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Std. Cost (PKR)</label>
                                    <input type="number" value={newItemForm.unitCost} onChange={e => setNewItemForm({ ...newItemForm, unitCost: parseFloat(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none" />
                                </div>
                                <div className="flex items-end">
                                    <button onClick={handleAddItem} className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-lg hover:bg-emerald-700">SAVE ITEM</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {feedItems.map(item => (
                            <div key={item.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative group">
                                <button onClick={() => { if (confirm("Delete this feed item?")) onDeleteFeed(item.id); }} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Archive size={16} />
                                </button>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <span className="text-[10px] font-black uppercase text-gray-400 border border-gray-100 px-1.5 py-0.5 rounded mr-2">{item.feedType || 'OTHER'}</span>
                                        <h4 className="font-bold text-gray-800 text-lg inline-block">{item.name}</h4>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.quantity < item.reorderLevel ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {item.quantity.toLocaleString()} {item.unit}
                                    </span>
                                    <span className="text-xs text-gray-400">@ PKR {item.unitCost}/{item.unit}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        const qty = prompt(`Amount of ${item.name} consumed (in ${item.unit})?`);
                                        if (qty && !isNaN(parseFloat(qty))) {
                                            const consumed = parseFloat(qty);
                                            onUpdateInventory({ ...item, quantity: item.quantity - consumed });
                                            alert(`Recorded utilization of ${consumed} ${item.unit}`);
                                        }
                                    }}
                                    className="w-full mb-3 bg-amber-50 text-amber-700 text-xs font-bold py-2 rounded-lg hover:bg-amber-100 flex items-center justify-center gap-2 border border-amber-200"
                                >
                                    <MinusCircle size={14} /> RECORD USAGE
                                </button>
                                <div className="pt-3 border-t border-gray-50 flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-400">Inventory Value</p>
                                        <p className="text-sm font-black text-gray-600">PKR {(item.quantity * item.unitCost).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-400 text-right">Supplier</p>
                                        <p className="text-xs font-bold text-blue-600 text-right">{item.defaultSupplier || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'SUPPLIERS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {suppliers.map(supplier => {
                        // Calculate supplier stats
                        const bills = state.expenses.filter(e => e.supplier === supplier);
                        const total = bills.reduce((sum, e) => sum + e.amount, 0);
                        const paid = bills.filter(e => e.paymentStatus === 'PAID').reduce((sum, e) => sum + e.amount, 0);
                        const pending = total - paid;

                        return (
                            <div key={supplier} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><User size={20} className="text-blue-500" /> {supplier}</h3>
                                        <p className="text-xs text-gray-400 mt-1">{bills.length} Transactions</p>
                                    </div>
                                    <button className="text-xs font-bold bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors">HISTORY</button>
                                </div>
                                <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl mb-4">
                                    <div><p className="text-[10px] font-bold text-gray-400 uppercase">Total Billed</p><p className="font-bold text-gray-800">{(total / 1000).toFixed(1)}k</p></div>
                                    <div><p className="text-[10px] font-bold text-gray-400 uppercase">Paid</p><p className="font-bold text-emerald-600">{(paid / 1000).toFixed(1)}k</p></div>
                                    <div><p className="text-[10px] font-bold text-gray-400 uppercase">Due</p><p className="font-bold text-red-500">{(pending / 1000).toFixed(1)}k</p></div>
                                </div>
                                {pending > 0 ? (
                                    <button onClick={() => {
                                        if (!confirm(`Mark all ${pending.toLocaleString()} due for ${supplier} as PAID?`)) return;
                                        bills.filter(b => b.paymentStatus !== 'PAID').forEach(b => onUpdateExpense({ ...b, paymentStatus: 'PAID', paymentDate: new Date().toISOString().split('T')[0] }));
                                    }} className="w-full bg-gray-800 text-white py-2 rounded-lg text-sm font-bold hover:bg-gray-700 flex items-center justify-center gap-2">
                                        <CheckCircle size={16} /> SETTLE OUTSTANDING
                                    </button>
                                ) : (
                                    <div className="text-center py-2 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg flex items-center justify-center gap-2">
                                        <CheckCircle size={14} /> ALL CLEAR
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {suppliers.length === 0 && (
                        <div className="col-span-2 text-center py-10 text-gray-400 italic">No suppliers found. Record a purchase to add suppliers.</div>
                    )}
                </div>
            )}
        </div>
    );
};
