
import React, { useState } from 'react';
import { AppState, Livestock, LivestockStatus } from '../types';
import { User, ClipboardList, Scale, DollarSign, Activity, Calendar, Search, ArrowRight, TrendingUp, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
    state: AppState;
    onUpdateLivestock: (animal: Livestock) => void;
    onAddExpense: (expense: any) => void;
}

export const PalaiManager: React.FC<Props> = ({ state, onUpdateLivestock, onAddExpense }) => {
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CUSTOMERS' | 'ANIMALS'>('OVERVIEW');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    // Filter animals that are marked as PALAI
    const palaiAnimals = state.livestock.filter(l => l.ownership === 'PALAI');

    // AGGREGATED DATA
    const customerStats = state.customers.map(cust => {
        const animals = palaiAnimals.filter(l => l.palaiCustomerId === cust.id);
        const totalWeight = animals.reduce((sum, a) => sum + a.weight, 0);
        // Calculate fees based on active animals and rate (mock rate for now)
        const rate = 15000; // Default monthly rate per animal if not specified
        const totalFees = animals.length * rate;

        // Calculate outstanding balance
        const customerInvoices = state.invoices.filter(inv => inv.customerId === cust.id);
        const totalBilled = customerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const totalPaid = customerInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
        const outstanding = totalBilled - totalPaid;

        return { ...cust, animalCount: animals.length, totalWeight, totalFees, animals, outstanding };
    });

    const totalPalaiRevenue = customerStats.reduce((sum, c) => sum + c.totalFees, 0);
    const totalOutstanding = customerStats.reduce((sum, c) => sum + c.outstanding, 0);

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
                {['OVERVIEW', 'CUSTOMERS', 'ANIMALS'].map(tab => (
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
                                <h3 className="text-3xl font-black text-gray-800 mt-1">{palaiAnimals.length}</h3>
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
                                <h3 className="text-3xl font-black text-gray-800 mt-1">{customerStats.filter(c => c.animalCount > 0).length}</h3>
                            </div>
                            <div className="bg-purple-50 p-2 rounded-lg text-purple-600"><User size={24} /></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{state.customers.length} total registered</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Avg. Weight Gain</p>
                                <h3 className="text-3xl font-black text-emerald-600 mt-1">+0.8 <span className="text-sm text-gray-400 font-medium">kg/day</span></h3>
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
                                                <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700">GENERATE INVOICE</button>
                                            </div>
                                            <div className="grid grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl">
                                                <div><p className="text-xs font-bold text-gray-400 uppercase">Animals</p><p className="text-xl font-black text-gray-800">{cust.animalCount}</p></div>
                                                <div><p className="text-xs font-bold text-gray-400 uppercase">Total Weight</p><p className="text-xl font-black text-gray-800">{cust.totalWeight} kg</p></div>
                                                <div><p className="text-xs font-bold text-gray-400 uppercase">Est. Monthly</p><p className="text-xl font-black text-gray-800">PKR {cust.totalFees.toLocaleString()}</p></div>
                                                <div><p className="text-xs font-bold text-gray-400 uppercase">Outstanding</p><p className={`text-xl font-black ${cust.outstanding > 0 ? 'text-red-500' : 'text-emerald-600'}`}>PKR {cust.outstanding.toLocaleString()}</p></div>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                            <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700">Owned Animals</div>
                                            <table className="min-w-full text-sm">
                                                <thead className="bg-white">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">Tag ID</th>
                                                        <th className="px-4 py-2 text-left">Breed</th>
                                                        <th className="px-4 py-2 text-right">Current Weight</th>
                                                        <th className="px-4 py-2 text-right">Start Date</th>
                                                        <th className="px-4 py-2 text-right">Status</th>
                                                        <th className="px-4 py-2 text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {cust.animals.map(animal => (
                                                        <tr key={animal.id}>
                                                            <td className="px-4 py-3 font-bold text-gray-800">{animal.tagId}</td>
                                                            <td className="px-4 py-3 text-gray-500">{animal.breed} ({animal.category})</td>
                                                            <td className="px-4 py-3 text-right font-medium">{animal.weight} kg</td>
                                                            <td className="px-4 py-3 text-right text-gray-500">{animal.palaiProfile?.startDate || 'N/A'}</td>
                                                            <td className="px-4 py-3 text-right"><span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">ACTIVE</span></td>
                                                            <td className="px-4 py-3 text-center">
                                                                <button className="text-blue-600 font-bold text-xs hover:underline">VIEW</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'ANIMALS' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
                    <ClipboardList className="mx-auto text-gray-300 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-gray-600">Full Palai Animal Registry</h3>
                    <p className="text-gray-400 max-w-sm mx-auto mt-2">This view will provide a searchable, sortable list of all 3rd-party animals with bulk actions for weighing and medical checks.</p>
                    <button className="mt-6 bg-gray-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-700">COMING SOON</button>
                </div>
            )}
        </div>
    );
};
