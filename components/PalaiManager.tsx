import React, { useState, useEffect } from 'react';
import { AppState, Livestock, Entity } from '../types';
import { User, ClipboardList, TrendingUp, ArrowRight, Activity, Loader2, Receipt, RotateCcw, Shuffle, XCircle } from 'lucide-react';
import { backendService } from '../services/backendService';
import { newClientMutationId } from '../utils/mutationId';
import { FeedSkeleton, WidgetSkeleton } from './Skeleton';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';

interface Props {
    state: AppState;
    onUpdateLivestock: (animal: Livestock) => void;
    onAddExpense: (expense: any) => void;
}

export const PalaiManager: React.FC<Props> = ({ state, onUpdateLivestock, onAddExpense }) => {
    const toast = useToast();
    const { confirm: confirmDialog, prompt: promptDialog } = useConfirm();
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CUSTOMERS' | 'ANIMALS' | 'INVOICES' | 'PACKAGES'>('OVERVIEW');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [customerTab, setCustomerTab] = useState<'ANIMALS' | 'LEDGER' | 'INVOICE'>('ANIMALS');

    const [palaiClients, setPalaiClients] = useState<Entity[]>([]);
    const [palaiSummary, setPalaiSummary] = useState<any>(null);
    const [palaiInvoices, setPalaiInvoices] = useState<any[]>([]);
    const [packageHistory, setPackageHistory] = useState<any[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
    const [invoicePayments, setInvoicePayments] = useState<any[]>([]);
    const [invoicePaymentsLoading, setInvoicePaymentsLoading] = useState(false);
    const [invoicePaymentAmount, setInvoicePaymentAmount] = useState(0);
    const [invoicePaymentSaving, setInvoicePaymentSaving] = useState(false);
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
            const [clients, summary, invoices, history] = await Promise.all([
                backendService.getPalaiClients(farmId).catch(() => []),
                backendService.getPalaiSummary(farmId).catch(() => null),
                backendService.listPalaiInvoices(farmId).catch(() => []),
                backendService.getPalaiPackageHistory(farmId).catch(() => []),
            ]);
            setPalaiClients(clients);
            setPalaiSummary(summary);
            setPalaiInvoices(Array.isArray(invoices) ? invoices : []);
            setPackageHistory(Array.isArray(history) ? history : []);
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
            const payload = {
                farmId: state.currentFarmId || undefined,
                customerId: selectedCustomerId,
                billingPeriodStart: invoiceDateRange.start,
                billingPeriodEnd: invoiceDateRange.end,
                clientMutationId: newClientMutationId('palai-invoice'),
            };
            await backendService.createPalaiInvoice(payload);
            toast.success('Invoice generated. Total auto-calculated from animal plans.', { title: 'Invoice ready' });
            setCustomerTab('LEDGER');
            handleViewLedger(selectedCustomerId);
            fetchPalaiData();
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate invoice. Please try again.');
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
                notes: 'Palai Service Payment',
                clientMutationId: newClientMutationId('palai-payment'),
            });
            toast.success('Payment recorded successfully.');
            setPaymentAmount(0);
            handleViewLedger(selectedCustomerId);
            fetchPalaiData();
        } catch (err) {
            console.error(err);
            toast.error('Failed to record payment. Please try again.');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const handleVoidInvoice = async (invoiceId: string) => {
        const ok = await confirmDialog({
            title: 'Void Palai invoice',
            message: 'Void this invoice? Backend will reverse receivable and ledger impact.',
            confirmLabel: 'Void invoice',
            danger: true,
        });
        if (!ok) return;
        try {
            await backendService.voidPalaiInvoice(invoiceId);
            toast.success('Palai invoice voided.');
            fetchPalaiData();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to void Palai invoice.');
        }
    };

    const openInvoiceDetail = async (invoice: any) => {
        setSelectedInvoice(invoice);
        setInvoicePayments([]);
        setInvoicePaymentsLoading(true);
        const id = String(invoice.id ?? invoice.invoiceId ?? invoice.saleId);
        try {
            const rows = await backendService.getFinancialsPayments('PALAI_INVOICE', id).catch(() => backendService.getFinancialsPayments('SALE', id));
            setInvoicePayments(Array.isArray(rows) ? rows : []);
        } finally {
            setInvoicePaymentsLoading(false);
        }
    };

    const recordInvoicePayment = async () => {
        if (!selectedInvoice || invoicePaymentAmount <= 0) return;
        const id = String(selectedInvoice.id ?? selectedInvoice.invoiceId ?? selectedInvoice.saleId);
        setInvoicePaymentSaving(true);
        try {
            await backendService.payPalaiInvoice(id, {
                amount: invoicePaymentAmount,
                date: new Date().toISOString().split('T')[0],
                paymentMethod: 'CASH',
                notes: 'Palai invoice payment',
            });
            setInvoicePaymentAmount(0);
            await openInvoiceDetail(selectedInvoice);
            fetchPalaiData();
            toast.success('Invoice payment recorded.');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to record invoice payment.');
        } finally {
            setInvoicePaymentSaving(false);
        }
    };

    const reverseInvoicePayment = async (paymentId: string) => {
        const ok = await confirmDialog({
            title: 'Reverse payment',
            message: 'Reverse this invoice payment and its ledger impact?',
            confirmLabel: 'Reverse',
            danger: true,
        });
        if (!ok || !selectedInvoice) return;
        try {
            await backendService.reverseFinancialsPayment(paymentId);
            await openInvoiceDetail(selectedInvoice);
            fetchPalaiData();
            toast.success('Invoice payment reversed.');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to reverse invoice payment.');
        }
    };

    const handleUnassignAnimal = async (animal: Livestock) => {
        const ok = await confirmDialog({
            title: 'Unassign Palai animal',
            message: `Remove ${animal.tagId} from its Palai client? Future billing will stop for this assignment.`,
            confirmLabel: 'Unassign',
            danger: true,
        });
        if (!ok) return;
        try {
            await backendService.unassignPalai(animal.id);
            onUpdateLivestock({ ...animal, ownership: 'OWNED', palaiCustomerId: undefined, palaiProfile: undefined });
            toast.success('Palai assignment removed.');
            fetchPalaiData();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to unassign animal.');
        }
    };

    const handleTransferAnimal = async (animal: Livestock) => {
        const nextClientId = await promptDialog({
            title: 'Transfer Palai animal',
            label: 'New client',
            inputType: 'text',
            defaultValue: animal.palaiCustomerId || '',
            placeholder: 'Enter destination client ID',
            validate: value => value === animal.palaiCustomerId ? 'Choose a different client.' : null,
        });
        if (!nextClientId) return;
        try {
            await backendService.transferPalaiAssignment(animal.id, nextClientId);
            onUpdateLivestock({ ...animal, ownership: 'PALAI', palaiCustomerId: nextClientId });
            toast.success('Palai assignment transferred.');
            fetchPalaiData();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to transfer animal.');
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
            <div className="space-y-5 animate-fade-in">
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
        <div className="space-y-5 animate-fade-in">
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
                {['OVERVIEW', 'CUSTOMERS', 'ANIMALS', 'INVOICES', 'PACKAGES'].map(tab => (
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
                                                            <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)} className="w-full border-b-2 border-gray-100 focus:border-blue-500 py-2 outline-none font-bold text-lg" placeholder="0" />
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
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => void handleTransferAnimal(animal)} className="text-emerald-600 font-bold text-xs hover:underline flex items-center gap-1"><Shuffle size={12} /> Transfer</button>
                                                        <button onClick={() => void handleUnassignAnimal(animal)} className="text-red-500 font-bold text-xs hover:underline flex items-center gap-1"><XCircle size={12} /> Unassign</button>
                                                    </div>
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
            {activeTab === 'INVOICES' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700 flex justify-between items-center">
                        <span className="flex items-center gap-2"><Receipt size={16} /> Palai Invoice Register</span>
                        <button onClick={fetchPalaiData} className="text-xs bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 font-bold text-gray-600">Refresh</button>
                    </div>
                    {palaiInvoices.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            <Receipt className="mx-auto mb-2 opacity-50" size={32} />
                            <p>No Palai invoices returned by backend.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-white border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-bold text-gray-500">Invoice</th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-500">Customer</th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-500">Period</th>
                                        <th className="px-4 py-3 text-right font-bold text-gray-500">Total</th>
                                        <th className="px-4 py-3 text-center font-bold text-gray-500">Status</th>
                                        <th className="px-4 py-3 text-center font-bold text-gray-500">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {palaiInvoices.map(inv => {
                                        const id = String(inv.id ?? inv.invoiceId ?? inv.saleId);
                                        const customer = palaiClients.find(c => c.id === (inv.customerId ?? inv.clientId));
                                        return (
                                            <tr key={id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-bold text-gray-800">{inv.invoiceNumber ?? id}</td>
                                                <td className="px-4 py-3 text-gray-600">{inv.customerName ?? customer?.name ?? inv.clientName ?? 'Unknown'}</td>
                                                <td className="px-4 py-3 text-gray-500">{inv.billingPeriodStart ?? inv.startDate ?? '-'} to {inv.billingPeriodEnd ?? inv.endDate ?? '-'}</td>
                                                <td className="px-4 py-3 text-right font-black text-emerald-600">PKR {Number(inv.totalAmount ?? inv.amount ?? 0).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-center"><span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{inv.status ?? inv.paymentStatus ?? 'POSTED'}</span></td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <button onClick={() => void openInvoiceDetail(inv)} className="text-emerald-600 font-bold text-xs hover:underline">Detail</button>
                                                        <button onClick={() => void handleVoidInvoice(id)} disabled={(inv.status ?? '').toString().toUpperCase() === 'VOID'} className="text-amber-600 disabled:text-gray-300 font-bold text-xs hover:underline flex items-center gap-1">
                                                            <RotateCcw size={12} /> Void
                                                        </button>
                                                    </div>
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
                        {packageHistory.length > 0 && (
                            <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <h4 className="font-bold text-slate-700 text-sm mb-3">Recent Package History</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {packageHistory.slice(0, 6).map((row, idx) => (
                                        <div key={row.id ?? idx} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-2 border border-slate-100">
                                            <span className="font-bold text-slate-700">{row.livestockTag ?? row.tagId ?? row.livestockId ?? 'Animal'}</span>
                                            <span className="text-slate-500">{row.packageName ?? row.feedPlan ?? row.action ?? 'Package update'}</span>
                                            <span className="text-slate-400">{row.createdAt ?? row.date ?? ''}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
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
            {selectedInvoice && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedInvoice(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-slate-800">Palai Invoice Detail</h3>
                                <p className="text-xs text-slate-500 font-bold">{selectedInvoice.invoiceNumber ?? selectedInvoice.id ?? selectedInvoice.invoiceId}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => window.print()} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600">Print</button>
                                <button onClick={() => setSelectedInvoice(null)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-bold text-slate-600">Close</button>
                            </div>
                        </div>
                        <div className="p-6 space-y-5 overflow-y-auto max-h-[72vh]">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] font-bold text-slate-400 uppercase">Customer</p><p className="font-black text-slate-800">{selectedInvoice.customerName ?? selectedInvoice.clientName ?? selectedInvoice.customerId ?? 'Unknown'}</p></div>
                                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] font-bold text-slate-400 uppercase">Status</p><p className="font-black text-slate-800">{selectedInvoice.status ?? selectedInvoice.paymentStatus ?? 'POSTED'}</p></div>
                                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] font-bold text-slate-400 uppercase">Total</p><p className="font-black text-emerald-700">PKR {Number(selectedInvoice.totalAmount ?? selectedInvoice.amount ?? 0).toLocaleString()}</p></div>
                                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] font-bold text-slate-400 uppercase">Paid</p><p className="font-black text-blue-700">PKR {Number(selectedInvoice.amountPaid ?? selectedInvoice.paidAmount ?? 0).toLocaleString()}</p></div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 font-bold text-sm text-slate-700">Invoice Items</div>
                                {(selectedInvoice.items || selectedInvoice.lineItems || []).length > 0 ? (
                                    <div className="divide-y divide-slate-100">
                                        {(selectedInvoice.items || selectedInvoice.lineItems).map((item: any, idx: number) => (
                                            <div key={idx} className="px-4 py-3 flex items-center justify-between text-sm">
                                                <span className="font-bold text-slate-700">{item.description ?? item.name ?? 'Invoice item'}</span>
                                                <span className="font-black text-slate-800">PKR {Number(item.amount ?? item.total ?? 0).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="px-4 py-6 text-center text-sm font-bold text-slate-400">No line items returned.</div>
                                )}
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                    <span className="font-bold text-sm text-slate-700">Payment History</span>
                                    <div className="flex items-center gap-2">
                                        <input type="number" value={invoicePaymentAmount || ''} onChange={e => setInvoicePaymentAmount(Number(e.target.value) || 0)} placeholder="Amount" className="w-28 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold" />
                                        <button onClick={recordInvoicePayment} disabled={invoicePaymentSaving || invoicePaymentAmount <= 0} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50">{invoicePaymentSaving ? 'Saving...' : 'Pay'}</button>
                                    </div>
                                </div>
                                {invoicePaymentsLoading ? <div className="p-6 text-center text-sm font-bold text-slate-400">Loading payments...</div> : (
                                    invoicePayments.length > 0 ? invoicePayments.map((payment, idx) => (
                                        <div key={payment.id ?? idx} className="px-4 py-3 flex items-center justify-between border-b border-slate-100 text-sm">
                                            <span className="font-bold text-slate-700">{payment.date ?? payment.createdAt ?? '-'}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-black text-emerald-700">PKR {Number(payment.amount ?? 0).toLocaleString()}</span>
                                                {payment.id && <button onClick={() => void reverseInvoicePayment(payment.id)} className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-1 rounded-lg hover:bg-amber-100">Reverse</button>}
                                            </div>
                                        </div>
                                    )) : <div className="p-6 text-center text-sm font-bold text-slate-400">No payments returned.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
