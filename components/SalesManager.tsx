
import React, { useState } from 'react';
import { AppState, Sale, Livestock, LivestockStatus } from '../types';
import { DollarSign, User, Calendar, CheckCircle, Clock, AlertTriangle, Filter, Search, PlusCircle, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export type SalesTab = 'DASHBOARD' | 'NEW_SALE' | 'HISTORY';

interface Props {
    state: AppState;
    currentFarmId?: string | null;
    currentLocationId?: string | null;
    currentTab?: SalesTab;
    onTabChange?: (tab: SalesTab) => void;
    onAddSale: (sale: Sale) => void;
    onUpdateLivestock: (animal: Livestock) => void;
    onDeleteSale?: (id: string) => void;
}

export const SalesManager: React.FC<Props> = ({ state, currentFarmId, currentLocationId, currentTab, onTabChange, onAddSale, onUpdateLivestock, onDeleteSale }) => {
    const [internalTab, setInternalTab] = useState<SalesTab>('DASHBOARD');
    const isControlled = currentTab !== undefined && onTabChange !== undefined;
    const activeTab = isControlled ? currentTab! : internalTab;
    const setActiveTab = (tab: SalesTab) => {
        if (isControlled) onTabChange!(tab);
        else setInternalTab(tab);
    };

    // New Sale Form State
    const [saleType, setSaleType] = useState<'SINGLE' | 'BULK'>('SINGLE');
    const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);
    const [buyerName, setBuyerName] = useState('');
    const [buyerContact, setBuyerContact] = useState('');
    const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
    const [pricingMethod, setPricingMethod] = useState<'PER_ANIMAL' | 'LUMP_SUM'>('PER_ANIMAL');
    const [pricePerAnimal, setPricePerAnimal] = useState<number>(0);
    const [totalAmount, setTotalAmount] = useState<number>(0);

    // Payment State
    const [amountReceived, setAmountReceived] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CHEQUE' | 'OTHER'>('CASH');

    // Filters
    const [stockSearch, setStockSearch] = useState('');

    // Derived Values
    const availableStock = state.livestock.filter(l => l.status === 'ACTIVE' && l.ownership !== 'PALAI'); // Only sell owned stock for now
    const filteredStock = availableStock.filter(l =>
        l.tagId.toLowerCase().includes(stockSearch.toLowerCase()) ||
        l.breed.toLowerCase().includes(stockSearch.toLowerCase())
    );

    const calculateTotal = () => {
        if (saleType === 'SINGLE') {
            return pricePerAnimal;
        }
        if (pricingMethod === 'PER_ANIMAL') {
            return selectedAnimalIds.length * pricePerAnimal;
        }
        return totalAmount; // Lump sum manually entered
    };

    const finalTotal = calculateTotal();
    const balance = finalTotal - amountReceived;
    const paymentStatus = balance <= 0 ? 'PAID' : (amountReceived > 0 ? 'PARTIAL' : 'PENDING');

    const handleSaleSubmit = () => {
        if (!currentFarmId && !currentLocationId) { alert("Please select a farm or city above to record a sale. Sales and animals are shown for the selected farm only."); return; }
        if (selectedAnimalIds.length === 0) { alert("Select at least one animal"); return; }
        if (finalTotal <= 0) { alert("Invalid Sale Amount"); return; }
        if (!buyerName) { alert("Buyer Name Required"); return; }

        const farmId = currentFarmId || state.livestock.find(l => l.id === selectedAnimalIds[0])?.farmId || '';
        const newSale: Sale = {
            id: Math.random().toString(36).substr(2, 9),
            farmId,
            itemType: 'ANIMAL',
            soldAnimalIds: selectedAnimalIds,
            saleType: saleType === 'SINGLE' ? 'SINGLE_ANIMAL' : 'BULK_ANIMALS',
            amount: finalTotal,
            pricingMethod: saleType === 'BULK' ? pricingMethod : undefined,
            pricePerAnimal: pricingMethod === 'PER_ANIMAL' || saleType === 'SINGLE' ? pricePerAnimal : undefined,
            paymentStatus,
            amountReceived,
            paymentMethod,
            paymentDate: saleDate,
            date: saleDate,
            buyer: buyerName,
            buyerContact,
            description: `Sale of ${selectedAnimalIds.length} animals`
        };

        onAddSale(newSale);

        // Update Animal Status
        selectedAnimalIds.forEach(id => {
            const animal = state.livestock.find(l => l.id === id);
            if (animal) {
                onUpdateLivestock({ ...animal, status: 'SOLD' });
            }
        });

        alert("Sale Recorded Successfully!");
        setActiveTab('HISTORY');
        // Reset Form
        setSelectedAnimalIds([]);
        setBuyerName('');
        setAmountReceived(0);
    };

    // Dashboard Metrics (farm-wise: state.sales/livestock already filtered by App)
    const totalSales = state.sales.reduce((sum, s) => sum + (s.amount ?? 0), 0);
    const totalReceived = state.sales.reduce((sum, s) => sum + (s.amountReceived ?? 0), 0);
    const outstanding = totalSales - totalReceived;
    const animalsSold = state.sales.reduce((sum, s) => sum + (s.soldAnimalIds?.length || 0), 0);

    const scopeLabel = currentFarmId
        ? state.farms.find(f => f.id === currentFarmId)?.name || 'Selected farm'
        : currentLocationId
            ? `All farms in ${state.locations.find(l => l.id === currentLocationId)?.name || 'selected city'}`
            : null;
    const showFarmColumn = Boolean(!currentFarmId && currentLocationId && state.farms.length > 0);
    const getFarmName = (farmId: string | undefined) => (farmId && state.farms.length) ? (state.farms.find(f => f.id === farmId)?.name ?? '—') : '—';

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {!currentFarmId && !currentLocationId && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-2">
                    <AlertTriangle size={20} />
                    <span className="text-sm font-medium">Select a farm or city above to see that farm&apos;s dashboard, record new sales, and view sales history. Animals listed are only from the selected farm.</span>
                </div>
            )}
            {scopeLabel && (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 font-medium">Showing data for:</span>
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-200">{scopeLabel}</span>
                </div>
            )}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Sales & Revenue</h2>
                    <p className="text-sm text-gray-500">Dashboard, New Sale and History are scoped to the selected farm or city. Select a farm or city in the header to view data.</p>
                </div>
                <button onClick={() => setActiveTab('NEW_SALE')} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-emerald-700 flex items-center gap-2">
                    <PlusCircle size={18} /> New Sale
                </button>
            </div>

            {/* Navigation Tab */}
            <div className="flex space-x-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm w-fit">
                {['DASHBOARD', 'NEW_SALE', 'HISTORY'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab as SalesTab)} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                        {tab.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {activeTab === 'DASHBOARD' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase">Total Revenue</p>
                        <h3 className="text-2xl font-black text-emerald-600 mt-1">PKR {totalSales.toLocaleString()}</h3>
                        <div className="mt-2 text-xs flex justify-between text-gray-500">
                            <span>Received: {totalSales > 0 ? ((totalReceived / totalSales) * 100).toFixed(0) : 0}%</span>
                            <span className="font-bold text-emerald-700">PKR {totalReceived.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm border-l-4 border-l-red-400">
                        <p className="text-xs font-bold text-gray-400 uppercase">Outstanding</p>
                        <h3 className="text-2xl font-black text-red-500 mt-1">PKR {outstanding.toLocaleString()}</h3>
                        <p className="text-xs text-gray-400 mt-1">Pending from buyers</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase">Animals Sold</p>
                        <h3 className="text-2xl font-black text-gray-800 mt-1">{animalsSold}</h3>
                        <p className="text-xs text-gray-400 mt-1">Head count this year</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase">Avg. Price / Animal</p>
                        <h3 className="text-2xl font-black text-blue-600 mt-1">PKR {(animalsSold > 0 ? totalSales / animalsSold : 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                        <p className="text-xs text-gray-400 mt-1">Based on closed deals</p>
                    </div>

                    {/* RECENT TRANSACTIONS */}
                    <div className="bg-white rounded-2xl border border-gray-200 col-span-1 md:col-span-4 overflow-hidden shadow-sm">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <span className="font-bold text-gray-700">Recent Transactions</span>
                            {scopeLabel && <span className="text-xs text-gray-500 font-medium">(farm-wise)</span>}
                        </div>
                    <table className="min-w-full text-sm">
                            <thead className="bg-white text-gray-500">
                                <tr>
                                    <th className="px-4 py-2 text-left">Date</th>
                                    {showFarmColumn && <th className="px-4 py-2 text-left">Farm</th>}
                                    <th className="px-4 py-2 text-left">Buyer</th>
                                    <th className="px-4 py-2 text-center">Items</th>
                                    <th className="px-4 py-2 text-right">Amount</th>
                                    <th className="px-4 py-2 text-right">Paid</th>
                                    <th className="px-4 py-2 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {state.sales.slice(0, 5).map(sale => (
                                    <tr key={sale.id}>
                                        <td className="px-4 py-3">{sale.date}</td>
                                        {showFarmColumn && <td className="px-4 py-3 text-sm font-medium text-slate-700">{getFarmName(sale.farmId)}</td>}
                                        <td className="px-4 py-3 font-bold text-gray-700">{sale.buyer}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">{sale.soldAnimalIds?.length || 0} Animals</span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium">PKR {(sale.amount ?? 0).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-gray-500">{(sale.amountReceived ?? 0).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sale.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {sale.paymentStatus}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'NEW_SALE' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* LEFT: FORM */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><User size={20} /> Buyer Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Buyer Name</label>
                                    <input type="text" className="w-full mt-1 p-2 border border-gray-200 rounded-lg" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="e.g. Local Market" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Contact</label>
                                    <input type="text" className="w-full mt-1 p-2 border border-gray-200 rounded-lg" value={buyerContact} onChange={e => setBuyerContact(e.target.value)} placeholder="0300-..." />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Sale Date</label>
                                    <input type="date" className="w-full mt-1 p-2 border border-gray-200 rounded-lg" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Sale Type</label>
                                    <div className="flex gap-2 mt-1">
                                        <button onClick={() => { setSaleType('SINGLE'); setSelectedAnimalIds([]); }} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${saleType === 'SINGLE' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-200 text-gray-500'}`}>Single</button>
                                        <button onClick={() => { setSaleType('BULK'); setSelectedAnimalIds([]); }} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${saleType === 'BULK' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-200 text-gray-500'}`}>Bulk</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><DollarSign size={20} /> Pricing & Payment</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {saleType === 'BULK' && (
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Pricing Method</label>
                                        <div className="flex gap-4 mt-2">
                                            <label className="flex items-center gap-2 text-sm">
                                                <input type="radio" checked={pricingMethod === 'PER_ANIMAL'} onChange={() => setPricingMethod('PER_ANIMAL')} />
                                                Per Animal Rate
                                            </label>
                                            <label className="flex items-center gap-2 text-sm">
                                                <input type="radio" checked={pricingMethod === 'LUMP_SUM'} onChange={() => setPricingMethod('LUMP_SUM')} />
                                                Total Lump Sum
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {(saleType === 'SINGLE' || pricingMethod === 'PER_ANIMAL') && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Price Per Animal</label>
                                        <input type="number" className="w-full mt-1 p-2 border border-gray-200 rounded-lg" value={pricePerAnimal} onChange={e => setPricePerAnimal(Number(e.target.value))} />
                                    </div>
                                )}

                                {pricingMethod === 'LUMP_SUM' && saleType === 'BULK' && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Total Sale Amount</label>
                                        <input type="number" className="w-full mt-1 p-2 border border-gray-200 rounded-lg" value={totalAmount} onChange={e => setTotalAmount(Number(e.target.value))} />
                                    </div>
                                )}

                                <div className="col-span-2 border-t border-gray-100 pt-4 mt-2">
                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-bold text-gray-600">Total Sale Value</span>
                                            <span className="text-xl font-black text-gray-800">PKR {finalTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500">Amount Received</label>
                                                <input type="number" className="w-full mt-1 p-2 border border-gray-200 rounded-lg bg-white" value={amountReceived} onChange={e => setAmountReceived(Number(e.target.value))} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500">Balance</label>
                                                <div className={`mt-1 p-2 rounded-lg font-bold text-right ${balance > 0 ? 'text-red-500 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                                                    {balance.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button onClick={handleSaleSubmit} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2">
                                <CheckCircle size={20} /> CONFIRM SALE
                            </button>
                        </div>
                    </div>

                    {/* RIGHT: ANIMAL SELECTION */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[600px]">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold text-gray-700">Select Animals</h3>
                            <p className="text-xs text-gray-400 mb-2">{selectedAnimalIds.length} Selected {scopeLabel && `— from ${scopeLabel} only`}</p>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                <input type="text" className="w-full pl-9 p-2 text-sm border border-gray-200 rounded-lg" placeholder="Search Tag or Breed..." value={stockSearch} onChange={e => setStockSearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {filteredStock.length === 0 && <p className="text-center text-gray-400 text-sm mt-10">No active stock found.</p>}
                            {filteredStock.map(animal => {
                                const isSelected = selectedAnimalIds.includes(animal.id);
                                return (
                                    <div key={animal.id}
                                        onClick={() => {
                                            if (saleType === 'SINGLE') {
                                                setSelectedAnimalIds([animal.id]);
                                            } else {
                                                setSelectedAnimalIds(prev => isSelected ? prev.filter(id => id !== animal.id) : [...prev, animal.id]);
                                            }
                                        }}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${isSelected ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'hover:bg-gray-50 border-gray-100'}`}>
                                        <div>
                                            <div className="font-bold text-sm text-gray-800">{animal.tagId}</div>
                                            <div className="text-xs text-gray-500">{animal.breed} • {animal.weight}kg</div>
                                        </div>
                                        {isSelected && <CheckCircle size={16} className="text-emerald-600" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'HISTORY' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                    {scopeLabel && <div className="px-6 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">Sales history for: <span className="text-emerald-700 font-bold">{scopeLabel}</span></div>}
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                {showFarmColumn && <th className="px-6 py-4">Farm</th>}
                                <th className="px-6 py-4">Buyer</th>
                                <th className="px-6 py-4">Details</th>
                                <th className="px-6 py-4 text-right">Total Amount</th>
                                <th className="px-6 py-4 text-center">Payment</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {state.sales.map(sale => (
                                <tr key={sale.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">{sale.date}</td>
                                    {showFarmColumn && <td className="px-6 py-4 text-sm font-medium text-slate-700">{getFarmName(sale.farmId)}</td>}
                                    <td className="px-6 py-4 font-bold text-gray-800">{sale.buyer}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-gray-600">{sale.saleType === 'SINGLE_ANIMAL' ? 'Single Sale' : 'Bulk Sale'}</div>
                                        <div className="text-xs text-gray-400">{sale.soldAnimalIds?.length} animals</div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-800">PKR {(sale.amount ?? 0).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${sale.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : (sale.paymentStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}`}>
                                            {sale.paymentStatus}
                                        </span>
                                        {sale.paymentStatus !== 'PAID' && <div className="text-[10px] text-red-500 font-bold mt-1">Due: {((sale.amount ?? 0) - (sale.amountReceived ?? 0)).toLocaleString()}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button className="text-gray-400 hover:text-red-500 transition-colors" onClick={() => onDeleteSale && onDeleteSale(sale.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
