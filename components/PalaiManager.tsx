import React, { useState, useEffect } from 'react';
import { AppState, Livestock, Entity } from '../types';
import { User, ClipboardList, TrendingUp, ArrowRight, Activity, Loader2 } from 'lucide-react';
import { backendService } from '../services/backendService';
import { FeedSkeleton, WidgetSkeleton } from './Skeleton';

interface Props {
    state: AppState;
    onUpdateLivestock: (animal: Livestock) => void;
    onAddExpense: (expense: any) => void;
}

export const PalaiManager: React.FC<Props> = ({ state, onUpdateLivestock, onAddExpense }) => {
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CUSTOMERS' | 'ANIMALS' | 'PACKAGES'>('OVERVIEW');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [customerTab, setCustomerTab] = useState<'ANIMALS' | 'LEDGER' | 'INVOICE'>('ANIMALS');

    const [palaiClients, setPalaiClients] = useState<Entity[]>([]);
    const [palaiSummary, setPalaiSummary] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Form States
    const [invoiceDateRange, setInvoiceDateRange] = useState({ start: '', end: '' });
    const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

    const [customerLedger, setCustomerLedger] = useState<any[]>([]);
    const [isLoadingLedger, setIsLoadingLedger] = useState(false);

    const [paymentAmount, setPaymentAmount] = useState(0);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    useEffect(() => {
        fetchPalaiData();
    }, [state.currentFarmId]);

    const fetchPalaiData = async () => {
        try {
            setIsLoading(true);
            const farmId = state.currentFarmId || undefined;
            const [clients, summary] = await Promise.all([
                backendService.getPalaiClients(farmId).catch(() => []),
                backendService.getPalaiSummary(farmId).catch(() => null)
            ]);
            setPalaiClients(clients);
            setPalaiSummary(summary);
        } catch (err) {
            console.error("Failed to fetch Palai data", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateInvoice = async () => {
        if (!selectedCustomerId || !invoiceDateRange.start || !invoiceDateRange.end) return;
        setIsGeneratingInvoice(true);
        try {
            const payload: any = {
                entityId: selectedCustomerId,
                invoiceDate: new Date().toISOString(),
                // @ts-ignore - Temporary custom field for API engine hook
                dateRange: invoiceDateRange,
                items: [],
                totalAmount: 0 // Will be calculated by backend engine
            };
            await backendService.createPalaiInvoice(payload);
            alert("Invoice generated successfully! The engine has calculated the total based on animal plans.");
            setCustomerTab('LEDGER');
            handleViewLedger(selectedCustomerId);
            fetchPalaiData();
        } catch (err) {
            console.error(err);
            alert("Failed to generate invoice");
        } finally {
            setIsGeneratingInvoice(false);
        }
    };

    const handleViewLedger = async (customerId: string) => {
        setCustomerTab('LEDGER');
        setIsLoadingLedger(true);
        try {
            const records = await backendService.getEntityLedger(customerId);
            setCustomerLedger(records);
        } catch (err) {
            console.error("Failed to load ledger", err);
        } finally {
            setIsLoadingLedger(false);
        }
    };

    const handleRecordPayment = async () => {
        if (!selectedCustomerId || paymentAmount <= 0) return;
        setIsProcessingPayment(true);
        try {
            await backendService.createPayment({
                entityId: selectedCustomerId,
                amount: paymentAmount,
                date: new Date().toISOString(),
                notes: 'Palai Service Payment'
            });
            alert("Payment recorded successfully!");
            setPaymentAmount(0);
            handleViewLedger(selectedCustomerId);
            fetchPalaiData();
        } catch (err) {
            console.error(err);
            alert("Failed to record payment");
        } finally {
            setIsProcessingPayment(false);
        }
    };

    // Derived from global state to maintain realtime sync for animals
    const palaiAnimals = state.livestock.filter(l => l.ownership === 'PALAI');

    const customerStats = palaiClients.map(cust => {
        const animals = palaiAnimals.filter(l => l.palaiCustomerId === cust.id);
        const totalWeight = animals.reduce((sum, a) => sum + a.weight, 0);
        const rate = 15000; // Mock default rate per animal
        const totalFees = animals.length * rate;

        // Uses entity's current balance from backend
        const outstanding = cust.currentBalance || 0;

        return { ...cust, animalCount: animals.length, totalWeight, totalFees, animals, outstanding };
    });

    const totalPalaiRevenue = palaiSummary?.totalProjectedRevenue || customerStats.reduce((sum, c) => sum + c.totalFees, 0);
    const totalOutstanding = palaiSummary?.totalOutstanding || customerStats.reduce((sum, c) => sum + c.outstanding, 0);
    const avgWeightGain = palaiSummary?.avgWeightGain || 0.8;

    if (isLoading) {
        return (
            <div className="space-y-6 animate-fade-in pb-10 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <WidgetSkeleton />
                    <WidgetSkeleton />
                    <WidgetSkeleton />
                </div>
                <FeedSkeleton />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Palai Management (Third-Party)</h2>
                    <p className="text-sm text-gray-500">Manage customer animals, fattening plans, and third-party billing.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 text-xs font-bold text-emerald-800 shadow-sm">
                        Proj. Monthly Revenue: <span className="text-emerald-600 text-sm ml-1">PKR {totalPalaiRevenue.toLocaleString()}</span>
                    </div>
                    <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-100 text-xs font-bold text-red-800 shadow-sm">
                        Outstanding: <span className="text-red-600 text-sm ml-1">PKR {totalOutstanding.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Navigation Tab */}
            <div className="flex space-x-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm w-fit">
                {['OVERVIEW', 'CUSTOMERS', 'ANIMALS', 'PACKAGES'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'OVERVIEW' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Total Palai Animals</p>
                                <h3 className="text-3xl font-black text-gray-800 mt-1">{palaiSummary?.totalAnimals || palaiAnimals.length}</h3>
                            </div>
                            <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Activity size={24} /></div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded font-bold text-gray-500">{palaiAnimals.filter(a => a.species === 'CATTLE').length} Cattle</span>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded font-bold text-gray-500">{palaiAnimals.filter(a => a.species === 'GOAT').length} Goats</span>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Active Customers</p>
                                <h3 className="text-3xl font-black text-gray-800 mt-1">{palaiSummary?.activeCustomers || customerStats.filter(c => c.animalCount > 0).length}</h3>
                            </div>
                            <div className="bg-purple-50 p-2 rounded-lg text-purple-600"><User size={24} /></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{palaiClients.length} total registered</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Avg. Weight Gain</p>
                                <h3 className="text-3xl font-black text-emerald-600 mt-1">+{avgWeightGain} <span className="text-sm text-gray-400 font-medium">kg/day</span></h3>
                            </div>
                            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600"><TrendingUp size={24} /></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Based on last 30 days weighing</p>
                    </div>

                    {/* Active Customers List (Mini) */}
                    <div className="bg-white rounded-2xl border border-gray-200 col-span-1 md:col-span-3 overflow-hidden shadow-sm">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700">Active Palai Customers</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                            {customerStats.filter(c => c.animalCount > 0).map(cust => (
                                <div key={cust.id} onClick={() => { setSelectedCustomerId(cust.id); setActiveTab('CUSTOMERS'); }} className="border border-gray-100 rounded-xl p-4 hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer group">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-800 group-hover:text-emerald-700">{cust.name}</h4>
                                        <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{cust.animalCount} Animals</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">{cust.contact}</p>
                                    <div className="flex justify-between items-center text-xs font-medium text-gray-400 pt-2 border-t border-gray-50">
                                        <div className="flex flex-col">
                                            <span>Est. Monthly: <strong className="text-gray-700">PKR {cust.totalFees.toLocaleString()}</strong></span>
                                            {cust.outstanding > 0 && <span className="text-red-500">Due: PKR {cust.outstanding.toLocaleString()}</span>}
                                        </div>
                                        <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'CUSTOMERS' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Customer List */}
                    <div className="col-span-1 space-y-4">
                        {customerStats.map(cust => (
                            <div key={cust.id} onClick={() => setSelectedCustomerId(cust.id)} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedCustomerId === cust.id ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-gray-200 hover:border-emerald-300'}`}>
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-gray-800">{cust.name}</h4>
                                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded font-bold">{cust.id}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{cust.contact}</p>
                                <div className="mt-3 flex gap-2">
                                    <span className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded font-medium">{cust.animalCount} Animals</span>
                                    {cust.outstanding > 0 ? (
                                        <span className="text-[10px] bg-red-50 border border-red-100 text-red-600 px-2 py-1 rounded font-bold">Due: {cust.outstanding.toLocaleString()}</span>
                                    ) : (
                                        <span className="text-[10px] bg-green-50 border border-green-100 text-green-600 px-2 py-1 rounded font-bold">All Paid</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Customer Detail View */}
                    {selectedCustomerId && (
                        <div className="col-span-1 lg:col-span-2 space-y-6">
                            {(() => {
                                const cust = customerStats.find(c => c.id === selectedCustomerId)!;
                                return (
                                    <>
                                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <h3 className="text-2xl font-black text-gray-800">{cust.name}</h3>
                                                    <p className="text-sm text-gray-500">{cust.address} • {cust.contact}</p>
                                                </div>
                                                <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
                                                    {['ANIMALS', 'LEDGER', 'INVOICE'].map(tab => (
                                                        <button key={tab} onClick={() => { setCustomerTab(tab as any); if (tab === 'LEDGER') handleViewLedger(cust.id); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${customerTab === tab ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>
                                                            {tab}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl">
                                                <div><p className="text-xs font-bold text-gray-400 uppercase">Animals</p><p className="text-xl font-black text-gray-800">{cust.animalCount}</p></div>
                                                <div><p className="text-xs font-bold text-gray-400 uppercase">Total Weight</p><p className="text-xl font-black text-gray-800">{cust.totalWeight} kg</p></div>
                                                <div><p className="text-xs font-bold text-gray-400 uppercase">Est. Monthly</p><p className="text-xl font-black text-gray-800">PKR {cust.totalFees.toLocaleString()}</p></div>
                                                <div><p className="text-xs font-bold text-gray-400 uppercase">Outstanding</p><p className={`text-xl font-black ${cust.outstanding > 0 ? 'text-red-500' : 'text-emerald-600'}`}>PKR {cust.outstanding.toLocaleString()}</p></div>
                                            </div>
                                        </div>

                                        {customerTab === 'ANIMALS' && (
                                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                                <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700">Owned Animals</div>
                                                <table className="min-w-full text-sm">
                                                    <thead className="bg-white border-b border-gray-200">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left font-bold text-gray-500">Tag ID</th>
                                                            <th className="px-4 py-3 text-left font-bold text-gray-500">Breed</th>
                                                            <th className="px-4 py-3 text-right font-bold text-gray-500">Weight</th>
                                                            <th className="px-4 py-3 text-right font-bold text-gray-500">Start Date</th>
                                                            <th className="px-4 py-3 text-right font-bold text-gray-500">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {cust.animals.map(animal => (
                                                            <tr key={animal.id} className="hover:bg-gray-50">
                                                                <td className="px-4 py-3 font-bold text-gray-800">{animal.tagId}</td>
                                                                <td className="px-4 py-3 text-gray-500">{animal.breed}</td>
                                                                <td className="px-4 py-3 text-right font-medium">{animal.weight} kg</td>
                                                                <td className="px-4 py-3 text-right text-gray-500">{animal.palaiProfile?.startDate || 'N/A'}</td>
                                                                <td className="px-4 py-3 text-right"><span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">ACTIVE</span></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {customerTab === 'LEDGER' && (
                                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                                <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700 flex justify-between items-center">
                                                    <span>Customer Ledger & Transactions</span>
                                                </div>
                                                <div className="p-4">
                                                    {isLoadingLedger ? (
                                                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
                                                    ) : customerLedger.length === 0 ? (
                                                        <p className="text-center text-gray-500 py-8">No past transactions or invoices found for this customer.</p>
                                                    ) : (
                                                        <table className="min-w-full text-sm">
                                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                                <tr>
                                                                    <th className="px-4 py-3 text-left font-bold text-gray-500">Date</th>
                                                                    <th className="px-4 py-3 text-left font-bold text-gray-500">Description</th>
                                                                    <th className="px-4 py-3 text-right font-bold text-gray-500">Amount</th>
                                                                    <th className="px-4 py-3 text-right font-bold text-gray-500">Balance</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {customerLedger.map((record, i) => (
                                                                    <tr key={i} className="hover:bg-gray-50">
                                                                        <td className="px-4 py-3 text-gray-600">{new Date(record.date).toLocaleDateString()}</td>
                                                                        <td className="px-4 py-3">
                                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded mr-2 ${record.type === 'INVOICE' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                                                {record.type}
                                                                            </span>
                                                                            {record.description}
                                                                        </td>
                                                                        <td className={`px-4 py-3 text-right font-bold ${record.type === 'INVOICE' ? 'text-red-500' : 'text-green-600'}`}>
                                                                            {record.type === 'INVOICE' ? '+' : '-'} PKR {record.amount.toLocaleString()}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right font-medium">PKR {record.balanceAfter.toLocaleString()}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {customerTab === 'INVOICE' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                                    <div className="bg-emerald-600 p-4 text-white font-bold flex justify-between items-center">
                                                        <span>Generate Palai Invoice</span>
                                                    </div>
                                                    <div className="p-6 space-y-4">
                                                        <p className="text-sm text-gray-600">Select the timeframe to generate the invoice for this customer. Fees are auto-calculated from packages.</p>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                                                            <input type="date" value={invoiceDateRange.start} onChange={e => setInvoiceDateRange({ ...invoiceDateRange, start: e.target.value })} className="w-full border-b-2 border-gray-100 focus:border-emerald-500 py-2 outline-none" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
                                                            <input type="date" value={invoiceDateRange.end} onChange={e => setInvoiceDateRange({ ...invoiceDateRange, end: e.target.value })} className="w-full border-b-2 border-gray-100 focus:border-emerald-500 py-2 outline-none" />
                                                        </div>
                                                        <div className="pt-2 flex justify-end">
                                                            <button onClick={handleGenerateInvoice} disabled={isGeneratingInvoice} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 flex items-center">
                                                                {isGeneratingInvoice ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                                                                Generate Invoice
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                                    <div className="bg-blue-600 p-4 text-white font-bold flex justify-between items-center">
                                                        <span>Record Payment Received</span>
                                                    </div>
                                                    <div className="p-6 space-y-4">
                                                        <p className="text-sm text-gray-600">Log a manual payment received from {cust.name} to clear their outstanding balance.</p>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount Received (PKR)</label>
                                                            <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(parseFloat(e.target.value))} className="w-full border-b-2 border-gray-100 focus:border-blue-500 py-2 outline-none font-bold text-lg" placeholder="0" />
                                                        </div>
                                                        <div className="pt-2 flex justify-end">
                                                            <button onClick={handleRecordPayment} disabled={isProcessingPayment || paymentAmount <= 0} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center">
                                                                {isProcessingPayment ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                                                                Save Payment
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'ANIMALS' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700 flex justify-between items-center">
                        <span>Full Palai Animal Registry</span>
                        <div className="flex gap-2">
                            <button className="text-xs bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 font-bold text-gray-600">Bulk Actions</button>
                        </div>
                    </div>
                    {palaiAnimals.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            <ClipboardList className="mx-auto mb-2 opacity-50" size={32} />
                            <p>No Palai animals found in the system.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-white border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-bold text-gray-500">Tag ID</th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-500">Client</th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-500">Species/Breed</th>
                                        <th className="px-4 py-3 text-right font-bold text-gray-500">Current Weight</th>
                                        <th className="px-4 py-3 text-center font-bold text-gray-500">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {palaiAnimals.map(animal => {
                                        const client = customerStats.find(c => c.id === animal.palaiCustomerId);
                                        return (
                                            <tr key={animal.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-bold text-gray-800">{animal.tagId}</td>
                                                <td className="px-4 py-3 text-gray-600">{client?.name || 'Unassigned'}</td>
                                                <td className="px-4 py-3 text-gray-500">{animal.species} - {animal.breed}</td>
                                                <td className="px-4 py-3 text-right font-medium">{animal.weight} kg</td>
                                                <td className="px-4 py-3 text-center">
                                                    <button className="text-emerald-600 font-bold text-xs hover:underline">Update</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'PACKAGES' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-w-4xl">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700 flex justify-between items-center">
                        <span>Global Palai Packages & Rates</span>
                        <button className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm hover:bg-emerald-700">Add Package</button>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-gray-500 mb-6">Define standardized feed plans and monthly rates here. These packages can be applied globally to any Palai customer's animals.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-5 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-emerald-800">Basic Grazing Plan</h4>
                                    <span className="bg-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">DEFAULT</span>
                                </div>
                                <p className="text-xs text-emerald-600 mb-4">Pasture grazing + Basic Hay. Standard maintenance diet.</p>
                                <div className="text-xl font-black text-emerald-900">PKR 15,000 <span className="text-xs text-emerald-700 font-medium">/ month</span></div>
                            </div>
                            <div className="border border-blue-200 bg-blue-50 rounded-xl p-5 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-blue-800">Premium Fattening Plan</h4>
                                    <span className="bg-blue-200 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">POPULAR</span>
                                </div>
                                <p className="text-xs text-blue-600 mb-4">High Protein Grain + Specialized Supplements. Best for Eid Qurbani.</p>
                                <div className="text-xl font-black text-blue-900">PKR 25,000 <span className="text-xs text-blue-700 font-medium">/ month</span></div>
                            </div>
                            <div className="border border-purple-200 bg-purple-50 rounded-xl p-5 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-purple-800">Custom / Medical Plan</h4>
                                    <span className="bg-purple-200 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">SPECIALIZED</span>
                                </div>
                                <p className="text-xs text-purple-600 mb-4">Special diet or medical isolation as per owner instruction.</p>
                                <div className="text-xl font-black text-purple-900">Variable Rate</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
